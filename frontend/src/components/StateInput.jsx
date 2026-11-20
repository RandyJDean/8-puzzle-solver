import { useState } from 'react'
import { PRESETS, shuffleFromGoal } from '../puzzle.js'

// Display the blank as an empty field and keep every other value as an editable string.
const toCells = (state) => state.map((v) => (v === 0 ? '' : String(v)))

export default function StateInput({ cells, onCellsChange, onSolve, error, busy }) {
  const [shuffleSteps, setShuffleSteps] = useState(20)

  const setCell = (i, value) => {
    // Copy the array before changing one cell so React receives a new state value.
    const next = cells.slice()
    next[i] = value.replace(/[^0-8]/g, '').slice(-1)
    onCellsChange(next)
  }

  return (
    <section className="panel input-panel" aria-labelledby="input-heading">
      <h2 id="input-heading">Start state</h2>
      <p className="hint">Type 1–8 into the cells; leave one cell empty (or 0) for the blank.</p>

      <div className="input-grid">
        {cells.map((value, i) => (
          <input
            key={i}
            className={`cell-input${value === '' || value === '0' ? ' cell-input--blank' : ''}`}
            inputMode="numeric"
            maxLength={2}
            value={value === '0' ? '' : value}
            onChange={(e) => setCell(i, e.target.value)}
            onFocus={(e) => e.target.select()}
            aria-label={`Row ${Math.floor(i / 3) + 1}, column ${(i % 3) + 1}`}
            disabled={busy}
          />
        ))}
      </div>

      {error && <p className="field-error" role="alert">{error}</p>}

      <div className="shuffle-row">
        <label htmlFor="shuffle-steps">
          Shuffle moves <strong>{shuffleSteps}</strong>
        </label>
        <input
          id="shuffle-steps"
          type="range"
          min={10}
          max={40}
          value={shuffleSteps}
          onChange={(e) => setShuffleSteps(Number(e.target.value))}
          disabled={busy}
        />
        <button
          type="button"
          className="btn"
          // Shuffling from the goal produces a starting board that can be solved.
          onClick={() => onCellsChange(toCells(shuffleFromGoal(shuffleSteps)))}
          disabled={busy}
        >
          Shuffle
        </button>
      </div>

      <div className="preset-row">
        <span className="hint">Presets</span>
        {PRESETS.map((p) => (
          <button
            key={p.label}
            type="button"
            className="btn btn--ghost"
            onClick={() => onCellsChange(toCells(p.state))}
            disabled={busy}
          >
            {p.label}
          </button>
        ))}
      </div>

      <button
        type="button"
        className="btn btn--primary btn--wide"
        onClick={onSolve}
        disabled={busy || Boolean(error)}
      >
        {busy ? 'Solving…' : 'Solve with A*'}
      </button>
    </section>
  )
}

export { toCells }
