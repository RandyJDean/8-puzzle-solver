"""End-to-end checks against the group's real backend/solver.py.

These are skipped automatically when solver.py is missing or can't be
imported yet (for example while it still calls input() at import time).
They only check the output the app relies on; they don't test A* internals.
"""

import os
import sys

import pytest

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

import app as app_module  # noqa: E402

GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0]


@pytest.fixture(scope="module")
def client():
    sys.modules.pop("solver", None)
    try:
        app_module.load_solve()
    except Exception as exc:
        pytest.skip(f"real solver not usable yet: {exc}")
    app_module.app.config["TESTING"] = True
    return app_module.app.test_client()


@pytest.mark.parametrize("start, optimal_moves", [
    (GOAL, 0),
    ([1, 2, 3, 4, 5, 6, 0, 7, 8], 2),
    ([8, 6, 7, 2, 5, 4, 3, 0, 1], 31),  # one of the hardest 8-puzzle starts
])
def test_real_solver_finds_optimal_path(client, start, optimal_moves):
    res = client.post("/api/solve", json={"start": start})
    assert res.status_code == 200, res.get_json()
    data = res.get_json()
    assert data["solvable"] is True
    assert len(data["path"]) - 1 == optimal_moves
