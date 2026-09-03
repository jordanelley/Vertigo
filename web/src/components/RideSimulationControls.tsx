interface RideSimulationControlsProps {
  recording: boolean
  open: boolean
  onToggle: () => void
  // null hides the button when its route can't be built from the available trails/lifts.
  onSimulateCombined: (() => void) | null
  onSimulateBigRide: (() => void) | null
}

// The "Test: Moving" toggle and the trail picker it reveals - dev-only shortcuts for replaying a
// recorded GPX trail (or a stitched-together sequence) as if it were a live ride.
export function RideSimulationControls({
  recording,
  open,
  onToggle,
  onSimulateCombined,
  onSimulateBigRide,
}: RideSimulationControlsProps) {
  return (
    <>
      <button
        className="btn btn-secondary record-ride__test-btn"
        onClick={onToggle}
        disabled={!recording}
      >
        Test: Moving
      </button>
      {open && (
        <div className="record-ride__trail-picker">
          {onSimulateCombined && (
            <button
              className="btn btn-secondary record-ride__test-btn"
              onClick={onSimulateCombined}
            >
              Vertigo + Thunder Goat
            </button>
          )}
          {onSimulateBigRide && (
            <button className="btn btn-secondary record-ride__test-btn" onClick={onSimulateBigRide}>
              Big Ride: Hammy's → TG → Gondola → Vertigo → TG → Gondola → Hammy's → TG
            </button>
          )}
        </div>
      )}
    </>
  )
}
