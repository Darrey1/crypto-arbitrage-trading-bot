'use client'

import { useEffect, useRef } from 'react'

export function ScatterBackground() {
  const bgRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const bg = bgRef.current
    if (!bg) return

    const UNIT = 'ArbMatrix '
    const UNIT_R = UNIT.split('').reverse().join('')
    const UL = UNIT.length
    const CW = 26
    const CH = 36

    let rows: {
      cells: HTMLDivElement[]
      cols: number
      half: number
      scroll: number
      interval: number
      delay: number
    }[] = []
    let tid: number
    let tk = 0

    function gc(str: string, idx: number) {
      return str[((idx % str.length) + str.length) % str.length]
    }
    
    function build() {
      bg!.innerHTML = ''
      rows = []
      const cols = Math.floor(bg.offsetWidth / CW)
      const numRows = Math.floor(bg.offsetHeight / CH)
      const half = Math.floor(cols / 2)

      for (let r = 0; r < numRows; r++) {
        const el = document.createElement('div')
        el.style.cssText = 'display:flex;height:40px;overflow:hidden'
        const cells: HTMLDivElement[] = []

        for (let c = 0; c < cols; c++) {
          const d = document.createElement('div')
          d.style.cssText = `
            width:26px;
            height:40px;
            display:flex;
            align-items:center;
            justify-content:center;
            font-size:18px;
            font-weight:600;
            color:#7a6810;
            letter-spacing:5px;
            flex-shrink:0;
            opacity:0;
            font-family:'Courier New',monospace;
          `
          el.appendChild(d)
          cells.push(d)
        }

        bg!.appendChild(el)
        rows.push({
          cells,
          cols,
          half,
          scroll: 0,
          interval: 10 + Math.floor(Math.random() * 20),
          delay: Math.floor(Math.random() * 80),
        })
      }
    }

    function renderRow(row: typeof rows[0]) {
      const { cells, half, cols, scroll } = row

      for (let c = 0; c < half; c++) {
        if (scroll <= c) {
          cells[c].style.opacity = '0'
          cells[c].textContent = ''
          continue
        }
        const ch = gc(UNIT, c - scroll)
        cells[c].textContent = ch === ' ' ? '' : ch
        const distBehindHead = scroll - c
        const op = Math.max(0, 1 - distBehindHead / UL)
        // cap max opacity at 0.45 so they look dim and subtle
        const finalOp = op * 0.45
        cells[c].style.opacity = finalOp < 0.02 ? '0' : finalOp.toFixed(2)
      }

      for (let c = half; c < cols; c++) {
        const mc = cols - 1 - c
        if (scroll <= mc) {
          cells[c].style.opacity = '0'
          cells[c].textContent = ''
          continue
        }
        const ch = gc(UNIT_R, mc - scroll)
        cells[c].textContent = ch === ' ' ? '' : ch
        const distBehindHead = scroll - mc
        const op = Math.max(0, 1 - distBehindHead / UL)
        const finalOp = op * 0.45
        cells[c].style.opacity = finalOp < 0.02 ? '0' : finalOp.toFixed(2)
      }
    }

    function render() {
      tk++
      rows.forEach(row => {
        if (row.delay > 0) { row.delay--; return }
        if (tk % row.interval !== 0) return

        row.scroll++

        if (row.scroll > row.half + UL * 2) {
          row.scroll = 0
          row.delay = Math.floor(10 + Math.random() * 30)
          row.cells.forEach(c => {
            c.style.opacity = '0'
            c.textContent = ''
          })
          return
        }

        renderRow(row)
      })
    }

    function loop() { render(); tid = requestAnimationFrame(loop) }

    build()
    loop()

    const observer = new ResizeObserver(build)
    observer.observe(bg)

    return () => {
      cancelAnimationFrame(tid)
      observer.disconnect()
    }
  }, [])

  return (
    <div
      ref={bgRef}
      aria-hidden
      className="pointer-events-none select-none"
      style={{ position: 'fixed', inset: 0, zIndex: 0 }}
    />
  )
}