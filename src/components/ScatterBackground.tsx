'use client'

import { useMemo } from 'react'

/* Deterministic pseudo-random so SSR and client produce the same output */
function seeded(seed: number) {
  const x = Math.sin(seed + 1) * 43758.5453123
  return x - Math.floor(x)
}

const CHARS = ['A', 'R', 'B', 'M', 'A', 'T', 'R', 'I', 'X', 'A', 'R', 'B']
const COUNT = 36

interface Particle {
  char: string
  x: number
  y: number
  size: number
  delay: number
  dur: number
  lo: number
  hi: number
}

export function ScatterBackground() {
  const particles = useMemo<Particle[]>(() => {
    return Array.from({ length: COUNT }, (_, i) => {
      const r = (offset: number) => seeded(i * 13 + offset)
      const lo = 0.025 + r(0) * 0.04
      return {
        char:  CHARS[Math.floor(r(1) * CHARS.length)],
        x:     r(2) * 100,
        y:     r(3) * 100,
        size: 10 + r(4) * 12,
        delay: r(5) * 7,
        dur:   3.5 + r(6) * 4.5,
        lo,
        hi:    lo + 0.04 + r(7) * 0.06,
      }
    })
  }, [])

  return (
    <div
      aria-hidden
      className="pointer-events-none select-none overflow-hidden"
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
    >
      {particles.map((p, i) => (
        <span
          key={i}
          className="absolute font-mono font-bold leading-none animate-char-breathe"
          style={{
            left: `${p.x}%`,
            top: `${p.y}%`,
            fontSize: `${p.size}px`,
            color: 'var(--text-1)',
            opacity: 0,
            animationFillMode: 'both',
            /* CSS custom props drive the keyframe opacity range */
            ['--char-lo' as string]: p.lo,
            ['--char-hi' as string]: p.hi,
            ['--char-dur' as string]: `${p.dur}s`,
            animationDelay: `${p.delay}s`,
          } as React.CSSProperties}
        >
          {p.char}
        </span>
      ))}
    </div>
  )
}
