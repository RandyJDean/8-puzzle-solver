import { useCallback, useEffect, useMemo, useState } from 'react'
import { getHealth, solvePuzzle } from './api.js'
import { GOAL, PRESETS, describeStep, validateCells } from './puzzle.js'
import Board from './components/Board.jsx'
import StateInput, { toCells } from './components/StateInput.jsx'
import PlaybackControls from './components/PlaybackControls.jsx'
import StepList from './components/StepList.jsx'

// A fixed example for reviewing playback before the solver is connected.
const SAMPLE = {
  sample: true,
  path: [
    [1, 2, 3, 4, 0, 5, 7, 8, 6],
    [1, 2, 3, 4, 5, 0, 7, 8, 6],
    GOAL,
  ],
  moves: ['right', 'down'],
}

export default function App() {
  // Keep editable strings separate from solver results so the start board stays visible during playback.
  const [cells, setCells] = useState(() => toCells(PRESETS[1].state))
  const [result, setResult] = useState(null) // { path, moves, nodes_expanded, time_ms }
  const [status, setStatus] = useState({ kind: 'idle' }) // idle | loading | error | unsolvable
  const [health, setHealth] = useState(null)
  const [step, setStep] = useState(0)
  const [playing, setPlaying] = useState(false)
  const [speed, setSpeed] = useState(600)

  const { state: startState, error: inputError } = validateCells(cells)

  // Flask reports whether it can import the solver. This also lets the standalone preview offer its sample path.
  const refreshHealth = useCallback(() => {
    getHealth()
      .then(setHealth)
      .catch(() => setHealth({ ok: false, solver_loaded: false, error: 'Could not reach the Flask server on port 5001.' }))
  }, [])

  useEffect(refreshHealth, [refreshHealth])

  // Editing, shuffling, or picking a preset invalidates the previous solution and stops playback.
  const handleCellsChange = (next) => {
    setCells(next)
    setResult(null)
    setStatus({ kind: 'idle' })
    setPlaying(false)
    setStep(0)
  }

  const handleSolve = async () => {
    if (!startState) return
    setStatus({ kind: 'loading' })
    setResult(null)
    setPlaying(false)
    setStep(0)
    // The API supplies the full path, including the start and goal, plus the direction of each blank move.
    try {
      const data = await solvePuzzle(startState)
      if (!data.solvable) {
        setStatus({ kind: 'unsolvable', time_ms: data.time_ms })
      } else {
        setResult(data)
        setPlaying(data.path.length > 1)
        setStatus({ kind: 'idle' })
      }
    } catch (err) {
      setStatus({ kind: 'error', message: err.message, solverMissing: err.solverMissing })
    }
    refreshHealth()
  }

  // Load a matching starting board and fixed path together without sending a request to Flask.
  const handleSample = () => {
    handleCellsChange(toCells(SAMPLE.path[0]))
    setResult(SAMPLE)
    setPlaying(true)
  }

  const total = result ? result.path.length : 1
  // Manual navigation pauses playback, clamps the index, and leaves the starting board unchanged.
  const goTo = useCallback((i) => {
    setPlaying(false)
    setStep(Math.max(0, Math.min(total - 1, i)))
  }, [total])

  // Auto-play
  useEffect(() => {
    if (!playing) return
    if (step >= total - 1) {
      setPlaying(false)
      return
    }
    // Cancel the pending step when playback pauses, the speed changes, or the user jumps to another board.
    const id = setTimeout(() => setStep((s) => s + 1), speed)
    return () => clearTimeout(id)
  }, [playing, step, total, speed])

  const togglePlay = () => {
    if (!playing && step >= total - 1) setStep(0)
    setPlaying((p) => !p)
  }

  // Keyboard: ←/→ step, space play/pause (ignored while typing in an input)
  useEffect(() => {
    if (!result) return
    const onKey = (e) => {
      if (e.target instanceof HTMLInputElement) return
      if (e.key === ' ' && e.target instanceof HTMLButtonElement) return
      if (e.key === 'ArrowRight') goTo(step + 1)
      else if (e.key === 'ArrowLeft') goTo(step - 1)
      else if (e.key === ' ') {
        e.preventDefault()
        togglePlay()
      } else return
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Build the descriptions once per solution so the current step and thumbnails use the same wording.
  const labels = useMemo(() => {
    if (!result) return []
    return result.path.map((s, i) => describeStep(result.path[i - 1], s, result.moves[i - 1]))
  }, [result])

  const shownState = result ? result.path[step] : startState
  // The tile that moved was at the new blank position on the previous board.
  const movedTile = result && step > 0 ? result.path[step - 1][shownState.indexOf(0)] : null
  const solverMissing = health && !health.solver_loaded

  return (
    <div className="app">
      <header className="app-header">
        <span className="app-mark" aria-hidden="true"><i /><i /><i /><i /></span>
        <span>CSCI 355 <span className="header-divider">/</span> Project 2</span>
      </header>
      <div className="intro">
        <h1>8-Puzzle Solver</h1>
        <p>Set a starting board and watch A* slide the tiles into order.</p>
      </div>

      <main className="layout">
        <StateInput
          cells={cells}
          onCellsChange={handleCellsChange}
          onSolve={handleSolve}
          error={inputError}
          busy={status.kind === 'loading'}
        />

        <section className="panel viewer" aria-labelledby="viewer-heading">
          <h2 id="viewer-heading">{result?.sample ? 'Sample playback' : result ? 'Solution playback' : 'Board preview'}</h2>
          <div className="boards">
            <div className="current-board">
              <h3>{result && step > 0 ? (step === total - 1 ? 'Goal reached' : `Move ${step}`) : 'Start state'}</h3>
              {shownState
                ? <Board state={shownState} highlightTile={movedTile} />
                : <p className="board-placeholder">Enter a valid starting board to preview it.</p>}
            </div>
            <div className="target-board">
              <h3>Goal state</h3>
              <Board state={GOAL} size="goal" />
            </div>
          </div>

          {result && (
            <>
              <PlaybackControls
                step={step}
                total={total}
                playing={playing}
                speed={speed}
                label={labels[step]}
                onStep={goTo}
                onTogglePlay={togglePlay}
                onSpeedChange={setSpeed}
              />
              {!result.sample && <dl className="stats">
                <div><dt>Moves</dt><dd>{result.path.length - 1}</dd></div>
                <div><dt>Nodes expanded</dt><dd>{result.nodes_expanded ?? '—'}</dd></div>
                <div><dt>Solve time</dt><dd>{formatMs(result.time_ms)}</dd></div>
              </dl>}
            </>
          )}

          {status.kind === 'loading' && <p className="status">Running A*…</p>}
          {status.kind === 'unsolvable' && (
            <p className="status status--warn">The solver reports this start state has no solution.</p>
          )}
          {status.kind === 'error' && (
            <p className={`status ${status.solverMissing ? 'status--warn' : 'status--error'}`} role="alert">
              {status.message}
            </p>
          )}
          {result?.sample && <p className="status">This example uses a preset starting board and a fixed two-move path.</p>}
          {solverMissing && (
            <div className="solver-status">
              <p className="status status--warn" role="status">{health.ok ? 'The A* solver is unavailable.' : 'The Flask server is offline.'}</p>
              <button type="button" className="btn" onClick={handleSample} disabled={status.kind === 'loading'}>
                Play sample path
              </button>
            </div>
          )}
        </section>
      </main>

      {result && (
        <StepList path={result.path} labels={labels} current={step} onSelect={goTo} />
      )}

    </div>
  )
}

function formatMs(ms) {
  if (ms == null) return '—'
  return ms < 1 ? `${(ms * 1000).toFixed(0)} µs` : ms < 1000 ? `${ms.toFixed(1)} ms` : `${(ms / 1000).toFixed(2)} s`
}
