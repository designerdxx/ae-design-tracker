import { useEffect, useState } from 'react'

// Palette-matched pieces (clay / sage / amber / warm white) so the burst
// stays inside the Claude dark aesthetic instead of rainbow party colors.
const COLORS = ['var(--accent)', 'var(--done)', 'var(--running)', 'var(--text-1)', 'var(--accent-border)']

function makePieces(seed) {
  return Array.from({ length: 90 }, (_, i) => ({
    id: `${seed}-${i}`,
    left: Math.random() * 100,
    delay: Math.random() * 0.25,
    duration: 2.4 + Math.random() * 1.6,
    drift: (Math.random() - 0.5) * 140,
    rot: Math.random() * 720 - 360,
    size: 6 + Math.random() * 6,
    color: COLORS[i % COLORS.length],
    round: Math.random() > 0.6,
  }))
}

// Remounted by the parent via key={fireKey}, so pieces are built once on mount.
// The only state update lives in an async timer, which clears the burst after it falls.
export default function Confetti({ fireKey }) {
  const [pieces, setPieces] = useState(() => (fireKey ? makePieces(fireKey) : []))

  useEffect(() => {
    if (!pieces.length) return
    const t = setTimeout(() => setPieces([]), 4200)
    return () => clearTimeout(t)
  }, [pieces.length])

  if (!pieces.length) return null
  return (
    <div className="confetti" aria-hidden="true">
      {pieces.map(p => (
        <span
          key={p.id}
          className="confetti-piece"
          style={{
            left: `${p.left}%`,
            width: p.size,
            height: p.size,
            background: p.color,
            borderRadius: p.round ? '50%' : '2px',
            animationDelay: `${p.delay}s`,
            animationDuration: `${p.duration}s`,
            '--drift': `${p.drift}px`,
            '--rot': `${p.rot}deg`,
          }}
        />
      ))}
    </div>
  )
}
