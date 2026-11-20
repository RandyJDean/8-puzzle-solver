export default function PlaybackControls({
  step,
  total,
  playing,
  speed,
  label,
  onStep,
  onTogglePlay,
  onSpeedChange,
}) {
  // The path includes step zero, so the last index also equals the number of moves.
  const last = total - 1
  return (
    <div className="playback">
      <div className="playback-buttons" role="group" aria-label="Playback">
        <button type="button" className="btn" onClick={() => onStep(0)} disabled={step === 0} aria-label="First step">⇤</button>
        <button type="button" className="btn" onClick={() => onStep(step - 1)} disabled={step === 0} aria-label="Previous step">←</button>
        <button type="button" className="btn btn--primary btn--play" onClick={onTogglePlay} disabled={last === 0} aria-label={playing ? 'Pause' : 'Play'}>
          {playing ? 'Pause' : 'Play'}
        </button>
        <button type="button" className="btn" onClick={() => onStep(step + 1)} disabled={step === last} aria-label="Next step">→</button>
        <button type="button" className="btn" onClick={() => onStep(last)} disabled={step === last} aria-label="Last step">⇥</button>
      </div>

      <p className="step-label" aria-live="polite">
        Step <strong>{step}</strong> of {last} · {label}
      </p>

      <label className="speed">
        <span>Speed</span>
        <input
          type="range"
          min={100}
          max={1500}
          step={50}
          // slider right = faster, so invert the delay
          value={1600 - speed}
          onChange={(e) => onSpeedChange(1600 - Number(e.target.value))}
          aria-label="Playback speed"
        />
        <span className="speed-value">{(speed / 1000).toFixed(2)}s / step</span>
      </label>
    </div>
  )
}
