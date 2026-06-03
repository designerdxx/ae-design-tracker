// Streak speedometer: a green→red gauge whose needle sweeps to the streak level, with a
// car-startup "rev" on entrance. No panel — it sits bare in the bottom-right corner.
//
// The resting position is encoded in CSS custom props (--deg, --dash), so the gauge is
// always correct even if the entrance animation is skipped; the rev is a pure CSS
// `from`-only keyframe layered on top.

const CAP = 10 // streak that redlines the gauge (needle fully right)
const FLAIR = { t1: 'Warming up', t2: 'Cruising', t3: 'Revving', t4: 'Redline', t5: 'On fire' }
const tierOf = s => (s >= 10 ? 't5' : s >= 7 ? 't4' : s >= 5 ? 't3' : s >= 3 ? 't2' : 't1')

// Gauge geometry (SVG user units) — a top semicircle, pivot at bottom-centre.
const CX = 48, CY = 46, R = 38
const ARC_LEN = Math.PI * R
const TRACK = `M ${CX - R} ${CY} A ${R} ${R} 0 0 1 ${CX + R} ${CY}`
const polar = (r, deg) => [CX + r * Math.cos((deg * Math.PI) / 180), CY - r * Math.sin((deg * Math.PI) / 180)]
const TICKS = Array.from({ length: 9 }, (_, i) => 180 - i * 22.5) // 180°(left) → 0°(right)

export default function ComboMeter({ streak, pulse }) {
  if (!streak) return null

  const v = Math.min(streak, CAP) / CAP
  const tier = tierOf(streak)
  const deg = v * 180 - 90 // -90°=left(min), +90°=right(max)
  const dash = v * ARC_LEN

  return (
    <div className={`combo ${tier}`} aria-hidden="true">
      <div className="combo-label">Day streak</div>
      <svg className="combo-gauge" viewBox="0 0 96 58" width="96" height="58">
        <path className="g-track" d={TRACK} />
        <path className="g-val" d={TRACK} style={{ '--dash': dash, '--arc': ARC_LEN }} />
        {TICKS.map((a, i) => {
          const [x1, y1] = polar(R + 1.5, a)
          const [x2, y2] = polar(R - 4, a)
          return <line key={i} className="g-tick" x1={x1} y1={y1} x2={x2} y2={y2} />
        })}
        <g className="g-needle" style={{ '--deg': `${deg}deg` }}>
          <polygon points={`${CX - 2.4},${CY} ${CX + 2.4},${CY} ${CX},${CY - (R - 5)}`} />
        </g>
        <circle className="g-hub" cx={CX} cy={CY} r="3.6" />
      </svg>
      <div className="combo-num" key={pulse}><span className="combo-x">×</span>{streak}</div>
      <div className="combo-flair">{FLAIR[tier]}</div>
    </div>
  )
}
