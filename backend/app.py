"""Flask API that connects the React visualization to the group's A* solver.

This file is glue/visualization support code only. It contains NO search
logic. The A* solver lives in backend/solver.py and is written by the group.

Solver contract (see README.md):

    A_Star(start) -> list of boards | None

    * A board is a 3x3 grid (list of 3 rows), 0 = blank,
      e.g. [[1, 2, 3], [4, 5, 6], [7, 8, 0]].
    * Return the path from start to the goal, including both ends,
      or None if the puzzle cannot be solved.
    * Optionally return {"path": [...], "nodes_expanded": int}.

The front end works with flat lists of 9 ints, so this file converts
between flat lists and 3x3 grids on the way in and out.
"""

import builtins
import importlib
import os
import sys
import time

from flask import Flask, jsonify, request

BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))
if BACKEND_DIR not in sys.path:
    sys.path.insert(0, BACKEND_DIR)

GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0]
SOLVER_MISSING_MSG = (
    "solver.py not found. Put your A_Star(start) function in backend/solver.py."
)
INPUT_AT_IMPORT_MSG = (
    "backend/solver.py asks for keyboard input when it is imported, which "
    "would freeze the server. Put the input()/print test code at the bottom "
    'of solver.py under  if __name__ == "__main__":  so it only runs when '
    "you start solver.py yourself."
)
# Function names the app looks for in solver.py, in order.
SOLVER_FUNCTIONS = ("A_Star", "solve")

app = Flask(__name__)


class SolverUnavailable(Exception):
    """Raised when backend/solver.py or its A_Star() function is unusable."""


def _refuse_input(*_args, **_kwargs):
    raise SolverUnavailable(INPUT_AT_IMPORT_MSG)


def load_solve():
    """Import the group's solver lazily so the app runs before it exists.

    Returns the solver function. Raises SolverUnavailable with a message the
    UI can show if solver.py is missing, has no A_Star(), or calls input()
    while being imported.
    """
    real_input = builtins.input
    builtins.input = _refuse_input  # only while importing
    try:
        module = importlib.import_module("solver")
    except ModuleNotFoundError as exc:
        # Only treat it as "missing" if solver.py itself is absent, not if
        # solver.py imports something that is missing.
        if exc.name == "solver":
            raise SolverUnavailable(SOLVER_MISSING_MSG) from exc
        raise
    finally:
        builtins.input = real_input
    for name in SOLVER_FUNCTIONS:
        fn = getattr(module, name, None)
        if callable(fn):
            # A_Star takes a 3x3 grid; the older solve() contract took a flat list.
            return fn, (to_grid if name == "A_Star" else list)
    raise SolverUnavailable(
        "backend/solver.py was found but has no A_Star(start) function."
    )


def to_grid(flat):
    """[1,2,3,4,5,6,7,8,0] -> [[1,2,3],[4,5,6],[7,8,0]]"""
    return [list(flat[r:r + 3]) for r in (0, 3, 6)]


def to_flat(board):
    """Accept a 3x3 grid or a flat list of 9 and return a flat list.
    Anything else is returned unchanged so check_path can report it."""
    if (
        isinstance(board, (list, tuple))
        and len(board) == 3
        and all(isinstance(row, (list, tuple)) and len(row) == 3 for row in board)
    ):
        return [v for row in board for v in row]
    if isinstance(board, (list, tuple)):
        return list(board)
    return board


def is_valid_state(state):
    return (
        isinstance(state, list)
        and len(state) == 9
        and all(isinstance(v, int) and not isinstance(v, bool) for v in state)
        and sorted(state) == list(range(9))
    )


def blank_move(a, b):
    """Name the move the blank made from state a to state b, or None if the
    step is not a single legal slide."""
    ia, ib = a.index(0), b.index(0)
    ra, ca = divmod(ia, 3)
    rb, cb = divmod(ib, 3)
    if abs(ra - rb) + abs(ca - cb) != 1:
        return None
    expected = list(a)
    expected[ia], expected[ib] = expected[ib], expected[ia]
    if expected != b:
        return None
    if rb < ra:
        return "up"
    if rb > ra:
        return "down"
    if cb < ca:
        return "left"
    return "right"


def check_path(start, path):
    """Return (moves, error_message). Checks the solver's output only."""
    if not isinstance(path, (list, tuple)) or len(path) == 0:
        return None, "Solver returned an empty or non-list path."
    path = [to_flat(s) for s in path]
    for i, state in enumerate(path):
        if not is_valid_state(state):
            return None, f"Step {i} is not a valid state: {state!r}"
    if path[0] != start:
        return None, f"Path must start with the start state, got {path[0]}."
    if path[-1] != GOAL:
        return None, f"Path must end with the goal state, got {path[-1]}."
    moves = []
    for i in range(len(path) - 1):
        move = blank_move(path[i], path[i + 1])
        if move is None:
            return None, (
                f"Illegal step {i} -> {i + 1}: {path[i]} -> {path[i + 1]} "
                "is not a single slide of the blank."
            )
        moves.append(move)
    return (path, moves), None


@app.get("/api/health")
def health():
    try:
        load_solve()
        loaded, error = True, None
    except SolverUnavailable as exc:
        loaded, error = False, str(exc)
    except Exception as exc:  # solver.py exists but fails to import
        loaded, error = False, f"solver.py failed to import: {exc!r}"
    return jsonify({"ok": True, "solver_loaded": loaded, "error": error})


@app.post("/api/solve")
def solve_endpoint():
    body = request.get_json(silent=True) or {}
    start = body.get("start")
    if not is_valid_state(start):
        return jsonify({
            "error": "start must be a list of 9 integers using 0-8 exactly once."
        }), 400

    try:
        solve, convert_start = load_solve()
    except SolverUnavailable as exc:
        return jsonify({"error": str(exc), "solver_missing": True}), 501
    except Exception as exc:
        return jsonify({"error": f"solver.py failed to import: {exc!r}"}), 500

    t0 = time.perf_counter()
    try:
        result = solve(convert_start(start))
    except Exception as exc:
        return jsonify({"error": f"{solve.__name__}() raised {exc!r}"}), 500
    time_ms = (time.perf_counter() - t0) * 1000

    if result is None:
        return jsonify({"solvable": False, "time_ms": time_ms})

    nodes_expanded = None
    path = result
    if isinstance(result, dict):
        path = result.get("path")
        nodes_expanded = result.get("nodes_expanded")
        if path is None:
            return jsonify({"solvable": False, "time_ms": time_ms,
                            "nodes_expanded": nodes_expanded})

    checked, error = check_path(start, path)
    if error:
        return jsonify({"error": f"Invalid solver output: {error}"}), 422
    path, moves = checked

    return jsonify({
        "solvable": True,
        "path": path,
        "moves": moves,
        "nodes_expanded": nodes_expanded,
        "time_ms": time_ms,
    })


if __name__ == "__main__":
    # Port 5001 because macOS uses 5000 for AirPlay Receiver.
    app.run(debug=True, port=5001)
