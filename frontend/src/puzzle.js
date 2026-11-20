// Board helpers for the visualization (input, shuffling, labels).
// No search logic lives here; solving is done only by backend/solver.py.

export const GOAL = [1, 2, 3, 4, 5, 6, 7, 8, 0]

const DIRS = {
  up: [-1, 0],
  down: [1, 0],
  left: [0, -1],
  right: [0, 1],
}
const OPPOSITE = { up: 'down', down: 'up', left: 'right', right: 'left' }

/** Slide the blank one cell in `dir`. Returns a new state, or null if off the board. */
export function moveBlank(state, dir) {
  const i = state.indexOf(0)
  const r = Math.floor(i / 3) + DIRS[dir][0]
  const c = (i % 3) + DIRS[dir][1]
  if (r < 0 || r > 2 || c < 0 || c > 2) return null
  const j = r * 3 + c
  const next = state.slice()
  next[i] = next[j]
  next[j] = 0
  return next
}

export function applyMoves(state, dirs) {
  return dirs.reduce((s, d) => moveBlank(s, d) ?? s, state)
}

/**
 * Random start state: apply `steps` random legal blank moves to the goal.
 * Because every move is reversible, the result is always solvable.
 */
export function shuffleFromGoal(steps) {
  let state = GOAL.slice()
  let last = null
  for (let k = 0; k < steps; k++) {
    // Skip the reverse of the last move so a shuffle does not immediately undo its previous step.
    const options = Object.keys(DIRS).filter(
      (d) => d !== OPPOSITE[last] && moveBlank(state, d),
    )
    const d = options[Math.floor(Math.random() * options.length)]
    state = moveBlank(state, d)
    last = d
  }
  return state
}

export const PRESETS = [
  { label: 'Easy', state: applyMoves(GOAL, ['left', 'left']) },
  { label: 'Medium', state: applyMoves(GOAL, ['up', 'left', 'up', 'left', 'down', 'right', 'down', 'left', 'up', 'up']) },
  { label: 'Hard (31 moves)', state: [8, 6, 7, 2, 5, 4, 3, 0, 1] },
]

/** 'ok' or an error message for a list of 9 cell strings. */
export function validateCells(cells) {
  const nums = cells.map((v) => (v.trim() === '' ? 0 : Number(v)))
  if (nums.some((n) => !Number.isInteger(n) || n < 0 || n > 8)) {
    return { error: 'Use the numbers 1–8, and 0 or an empty cell for the blank.' }
  }
  // Nine distinct values in the range 0–8 guarantee that every tile and the blank appear once.
  const seen = new Set(nums)
  if (seen.size !== 9) {
    const dupes = [...new Set(nums.filter((n, i) => nums.indexOf(n) !== i))]
    return { error: `Each number must appear once (repeated: ${dupes.map((d) => d || 'blank').join(', ')}).` }
  }
  return { state: nums }
}

/** Describe the step from `prev` to `cur` as the tile that slid. */
export function describeStep(prev, cur, blankDir) {
  if (!prev) return 'Start state'
  const tile = prev[cur.indexOf(0)]
  // A tile slides opposite the direction reported for the blank.
  return `Tile ${tile} slides ${OPPOSITE[blankDir]}`
}
