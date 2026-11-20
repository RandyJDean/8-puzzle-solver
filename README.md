# 8-puzzle-solver

8-puzzle A* solver and web app visualization.

## Solver file

**The A\* solver is [`backend/solver.py`](backend/solver.py). Our group wrote it entirely by hand, with no AI-generated code.**

Every other file in this repo is visualization or glue code (the React front end in `frontend/` and the Flask API in `backend/app.py`). Generative AI was used only for that front-end/visualization part, which the assignment allows.

GitHub repository: <!-- TODO: paste the repo link here and in the report -->

## How the app talks to the solver

`backend/app.py` imports `backend/solver.py` and calls our `A_Star` function:

```python
A_Star(start) -> list of boards | None
```

- A **board** is a 3×3 grid (a list of 3 rows) with `0` as the blank, e.g.
  `[[1, 2, 3], [4, 5, 6], [7, 8, 0]]` is

  ```
  1 2 3
  4 5 6
  7 8 _
  ```
- The goal is always `[[1, 2, 3], [4, 5, 6], [7, 8, 0]]`.
- `A_Star` returns the path from `start` to the goal, **including both the start and the goal** (just `[start]` if it is already solved), or `None` if the puzzle can't be solved.
- Optional: return a dict to show search stats in the UI:
  `{"path": [...], "nodes_expanded": 1234}`

The front end sends flat lists of 9 numbers; `app.py` turns them into 3×3 grids before calling `A_Star` and flattens the boards it returns. It also checks the path: it must begin at `start`, end at the goal, and every step must slide the blank by one cell. If not, the app shows which step broke.

**Keep `solver.py` importable.** Any code that asks for `input()` or prints a test run must sit under `if __name__ == "__main__":` at the bottom of `solver.py`. Otherwise it runs when the app imports the file and would freeze the server, so the app refuses to load it and shows a banner explaining this. You can still test the solver on its own with `python backend/solver.py`.

## Running it

You need Python 3.10+ and Node 20+.

**1. Backend (Flask, port 5001).** From the repo root:

```bash
python3 -m venv .venv
```

```bash
source .venv/bin/activate
```

```bash
pip install -r backend/requirements.txt
```

```bash
python backend/app.py
```

(The app uses port 5001 because macOS uses 5000 for AirPlay Receiver.)

**2. Front end (React + Vite, port 5173).** In a second terminal:

```bash
cd frontend && npm install && npm run dev
```

Open http://localhost:5173.

## Using the app

- Enter a start state in the 3×3 grid (leave one cell empty for the blank), click **Shuffle** for a random solvable start, or pick a preset.
- Click **Solve with A\***. The board animates through the path. Use ⏮ ◀ ▶ ▶ ⏭, the speed slider, or the ← / → / space keys.
- The **All steps** strip shows every state from start to goal. Click any of them to jump there.

## Tests

`test_api.py` uses a fake solver that returns a hard-coded path, so it doesn't depend on, or contain, our A* code. `test_real_solver.py` sends a few boards (including a 31-move one) through the app to our real `solver.py` and checks the solution lengths; it is skipped while `solver.py` can't be imported.

```bash
python -m pytest backend/tests
```

## Project layout

```
backend/
  app.py            Flask API (visualization glue)
  solver.py         A* solver (written by our group)
  tests/            API tests and real-solver checks
frontend/
  src/App.jsx       page layout and state
  src/api.js        calls to the Flask API
  src/puzzle.js     board helpers (input checks, shuffle, labels)
  src/components/   Board, StateInput, PlaybackControls, StepList
```
