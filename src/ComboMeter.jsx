// Fighting-game-style combo meter for the daily streak. The big italic number is the
// run of consecutive cleared days; the charge bar fills with today's progress (the meter
// building toward the next hit); the number pops when the streak ticks up. It heats up by
// tier: clay → amber → red, with an "ON FIRE" glow at the top.

const FLAIR = { base: 'Combo', warm: 'Heating up', hot: 'Blazing', fire: 'On fire' }
const tierOf = s => (s >= 7 ? 'fire' : s >= 5 ? 'hot' : s >= 3 ? 'warm' : 'base')

export default function ComboMeter({ streak, pulse, progress }) {
  if (!streak) return null
  const tier = tierOf(streak)
  const pct = Math.max(0, Math.min(100, Math.round((progress || 0) * 100)))
  return (
    <div className={`combo combo-${tier}`} aria-hidden="true">
      <div className="combo-label">Day streak</div>
      {/* key=pulse remounts the number so the pop animation replays on each increment */}
      <div className="combo-num" key={pulse}><span className="combo-x">×</span>{streak}</div>
      <div className="combo-charge"><span style={{ width: pct + '%' }} /></div>
      <div className="combo-flair">{FLAIR[tier]}</div>
    </div>
  )
}
