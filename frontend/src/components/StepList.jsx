import { useEffect, useRef } from 'react'
import Board from './Board.jsx'

// Every state in the solution path, start to goal. Click one to jump to it.
export default function StepList({ path, labels, current, onSelect }) {
  const listRef = useRef(null)

  useEffect(() => {
    // Keep the active thumbnail in view when playback advances past the visible part of the strip.
    const el = listRef.current?.querySelector('[aria-current="step"]')
    el?.scrollIntoView({ block: 'nearest', inline: 'nearest', behavior: 'smooth' })
  }, [current])

  return (
    <section className="panel" aria-labelledby="steps-heading">
      <h2 id="steps-heading">All steps ({path.length - 1} moves)</h2>
      <ol className="step-list" ref={listRef}>
        {path.map((state, i) => (
          <li key={i}>
            <button
              type="button"
              className="step-item"
              aria-current={i === current ? 'step' : undefined}
              onClick={() => onSelect(i)}
            >
              <Board state={state} size="small" />
              <span className="step-caption">
                {i === 0 ? 'Start' : `${i} · ${labels[i].replace('Tile ', '').replace(' slides ', ' ')}`}
                {i === path.length - 1 && i > 0 && <em> · goal</em>}
              </span>
            </button>
          </li>
        ))}
      </ol>
    </section>
  )
}
