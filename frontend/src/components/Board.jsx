// Renders one puzzle state. Each tile is keyed by its number and positioned
// with a CSS transform, so moving between states animates the slide.

export default function Board({ state, size = 'large', highlightTile = null }) {
  return (
    <div className={`board board--${size}`} role="img" aria-label={`Board ${formatState(state)}`}>
      {/* Skip the blank so the tray shows through. The tile number stays its React key as its position changes. */}
      {state.map((tile, index) =>
        tile === 0 ? null : (
          <div
            key={tile}
            className={`tile${tile === highlightTile ? ' tile--moved' : ''}${
              tile === index + 1 ? ' tile--home' : ''
            }`}
            style={{
              // Convert the flat board index into the offsets used by the CSS transform.
              '--row': Math.floor(index / 3),
              '--col': index % 3,
            }}
          >
            {tile}
          </div>
        ),
      )}
    </div>
  )
}

export function formatState(state) {
  return [0, 3, 6].map((r) => state.slice(r, r + 3).map((v) => v || '_').join(' ')).join(' / ')
}
