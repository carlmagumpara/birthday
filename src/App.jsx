import { useEffect, useRef, useState } from 'react'
import AnimatedBirthdayCake from './AnimatedBirthdayCake.jsx'
import './App.css'

export default function App() {
  const fireworksCanvasRef = useRef(null)
  const audioRef = useRef(null)

  const [playing, setPlaying] = useState(false)
  const [playId, setPlayId] = useState(0)

  useEffect(() => {
    document.title = 'Animated Birthday Cake'
  }, [])

  useEffect(() => {
    if (!playing) return

    const canvas = fireworksCanvasRef.current
    if (!canvas) return

    const prefersReducedMotion = window.matchMedia?.(
      '(prefers-reduced-motion: reduce)',
    )?.matches
    if (prefersReducedMotion) return

    const ctx = canvas.getContext('2d', { alpha: true })
    if (!ctx) return

    let w = 0
    let h = 0
    let dpr = 1
    let raf = 0
    let lastT = 0
    let autoTimer = 0

    const particles = []

    const rand = (min, max) => min + Math.random() * (max - min)
    const pick = (arr) => arr[(Math.random() * arr.length) | 0]

    const palette = [
      { h: 320, s: 90, l: 72 },
      { h: 205, s: 90, l: 72 },
      { h: 145, s: 85, l: 70 },
      { h: 32, s: 95, l: 72 },
      { h: 270, s: 85, l: 74 },
    ]

    const resize = () => {
      dpr = Math.max(1, Math.min(2, window.devicePixelRatio || 1))
      w = Math.max(1, window.innerWidth)
      h = Math.max(1, window.innerHeight)
      canvas.width = Math.floor(w * dpr)
      canvas.height = Math.floor(h * dpr)
      canvas.style.width = `${w}px`
      canvas.style.height = `${h}px`
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
    }

    const burst = (x, y, opts = {}) => {
      const count = opts.count ?? 56
      const base = pick(palette)
      const hueJitter = opts.hueJitter ?? 18

      for (let i = 0; i < count; i++) {
        const a = Math.random() * Math.PI * 2
        const speed = rand(170, 420) * (opts.speedScale ?? 1)
        const size = rand(1.2, 2.8)
        const life = rand(0.75, 1.35)

        const hue = base.h + rand(-hueJitter, hueJitter)
        const sat = base.s + rand(-6, 6)
        const light = base.l + rand(-8, 6)

        particles.push({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          g: rand(520, 780),
          life,
          maxLife: life,
          size,
          color: `hsla(${hue} ${sat}% ${light}% / 0.95)`,
        })
      }

      // A few small glitter sparks for texture
      const glitterCount = Math.round(count * 0.35)
      for (let i = 0; i < glitterCount; i++) {
        const a = Math.random() * Math.PI * 2
        const speed = rand(90, 240)
        const size = rand(0.8, 1.6)
        const life = rand(0.55, 1.0)

        particles.push({
          x,
          y,
          vx: Math.cos(a) * speed,
          vy: Math.sin(a) * speed,
          g: rand(420, 680),
          life,
          maxLife: life,
          size,
          color: `hsla(${rand(0, 360)} 95% 78% / 0.85)`,
        })
      }
    }

    const ensureRunning = () => {
      if (raf) return
      raf = window.requestAnimationFrame(tick)
    }

    const tick = (t) => {
      raf = 0
      const dt = Math.min(0.033, lastT ? (t - lastT) / 1000 : 0.016)
      lastT = t

      ctx.clearRect(0, 0, w, h)
      ctx.globalCompositeOperation = 'lighter'

      for (let i = particles.length - 1; i >= 0; i--) {
        const p = particles[i]
        p.life -= dt
        if (p.life <= 0) {
          particles.splice(i, 1)
          continue
        }

        const drag = Math.pow(0.985, dt * 60)
        p.vx *= drag
        p.vy *= drag
        p.vy += p.g * dt
        p.x += p.vx * dt
        p.y += p.vy * dt

        const a = Math.max(0, p.life / p.maxLife)
        ctx.globalAlpha = a * a
        ctx.fillStyle = p.color
        ctx.beginPath()
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalAlpha = 1

      if (particles.length) ensureRunning()
    }

    const onPointerDown = (e) => {
      const x = e.clientX
      const y = Math.max(0, e.clientY - 30)
      burst(x, y, { count: 64 })
      ensureRunning()
    }

    const startAuto = () => {
      if (autoTimer) return
      autoTimer = window.setInterval(() => {
        burst(rand(w * 0.2, w * 0.8), rand(h * 0.12, h * 0.44), {
          count: 46,
          speedScale: 0.95,
        })
        ensureRunning()
      }, 1350)
    }

    resize()
    startAuto()

    window.addEventListener('resize', resize)
    window.addEventListener('pointerdown', onPointerDown)

    return () => {
      if (autoTimer) window.clearInterval(autoTimer)
      window.removeEventListener('resize', resize)
      window.removeEventListener('pointerdown', onPointerDown)
      if (raf) window.cancelAnimationFrame(raf)
      particles.splice(0, particles.length)
      ctx.clearRect(0, 0, w, h)
    }
  }, [])

  const onStart = async () => {
    setPlayId((n) => n + 1)
    setPlaying(true)

    const a = audioRef.current
    if (!a) return

    try {
      a.currentTime = 0
      await a.play()
    } catch {
      // Ignore autoplay restrictions errors; user gesture should allow playback.
    }
  }

  return (
    <main className={`page ${playing ? 'isPlaying' : 'isPaused'}`}>
      <canvas
        className="fireworksCanvas"
        ref={fireworksCanvasRef}
        aria-hidden="true"
      />

      <audio
        ref={audioRef}
        src="/twisterium-happy-birthday-482411.mp3"
        preload="auto"
      />

      <header className="heroSection">
        <div className="heroSticky">
          <div className="heroScene" aria-hidden="true">
            <div className="layer sky" />
            <div className="layer glow" />
            <div className="layer clouds" />
            <div className="layer balloons" />
            <div className="layer confetti" />
            <div className="layer hills" />
          </div>

          <div className="cakeStage" aria-label="Animated Birthday Cake stage">
            <AnimatedBirthdayCake key={playId} playing={playing} />
          </div>

          <figure className="photoCard photoCardOne" aria-hidden="true">
            <img src="/photo-1.jpg" alt="" loading="eager" />
          </figure>

          {!playing && (
            <button className="startButton" type="button" onClick={onStart}>
              Start
            </button>
          )}

          <div className="heroCopy" role="presentation">
            <h1 className="title">Happy Birthday Love!, I love you</h1>
          </div>
        </div>
      </header>
    </main>
  )
}
