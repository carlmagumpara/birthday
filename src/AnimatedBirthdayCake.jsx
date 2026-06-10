import { Canvas, useFrame } from '@react-three/fiber'
import { ContactShadows } from '@react-three/drei'
import { useEffect, useMemo, useRef } from 'react'
import * as THREE from 'three'
import { RectAreaLightUniformsLib } from 'three/examples/jsm/lights/RectAreaLightUniformsLib.js'

function clamp01(n) {
  return Math.min(1, Math.max(0, n))
}

function damp(current, target, lambda, dt) {
  return THREE.MathUtils.lerp(current, target, 1 - Math.exp(-lambda * dt))
}

function easeOutCubic(t) {
  const p = clamp01(t)
  return 1 - Math.pow(1 - p, 3)
}

function easeOutBack(t) {
  const p = clamp01(t)
  const c1 = 1.70158
  const c3 = c1 + 1
  return 1 + c3 * Math.pow(p - 1, 3) + c1 * Math.pow(p - 1, 2)
}

function Flame({ litRef }) {
  const meshRef = useRef(null)
  const lightRef = useRef(null)

  useFrame((state) => {
    const m = meshRef.current
    const l = lightRef.current
    if (!m || !l) return

    const lit = clamp01(litRef.current)
    const t = state.clock.getElapsedTime()

    const flicker = 0.84 + 0.16 * Math.sin(t * 18.0 + Math.sin(t * 7.0) * 0.7)
    const intensity = lit * (1.35 + 0.95 * flicker)

    l.intensity = intensity

    const s = lit * (0.92 + 0.12 * Math.sin(t * 14.0))
    m.scale.set(0.55 * s, 1.15 * s, 0.55 * s)
    m.position.y = 0.16 + 0.03 * Math.sin(t * 11.0)
  })

  return (
    <group>
      <pointLight
        ref={lightRef}
        position={[0, 0.24, 0]}
        distance={1.9}
        decay={2}
        color={'#ffcc88'}
        intensity={0}
      />
      <mesh ref={meshRef} position={[0, 0.16, 0]}>
        <coneGeometry args={[0.06, 0.18, 18, 1, true]} />
        <meshStandardMaterial
          color={'#ffb14a'}
          emissive={'#ff7a2a'}
          emissiveIntensity={1.55}
          roughness={0.35}
          metalness={0.0}
          transparent
          opacity={0.92}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  )
}

function Candle({ index, count, buildTRef, topYRef }) {
  const groupRef = useRef(null)
  const litRef = useRef(0)

  const xz = useMemo(() => {
    const r = 0.58
    const a = (index / count) * Math.PI * 2
    return [Math.cos(a) * r, Math.sin(a) * r]
  }, [count, index])

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return

    const buildT = buildTRef.current
    const topY = topYRef.current

    const start = 5.1 + index * 0.28
    const rise = easeOutBack((buildT - start) / 0.8)
    const lit = easeOutCubic((buildT - (start + 0.4)) / 0.7)

    litRef.current = lit

    g.position.x = damp(g.position.x, xz[0], 10, dt)
    g.position.z = damp(g.position.z, xz[1], 10, dt)
    g.position.y = damp(g.position.y, topY + (-0.65 + 0.65 * rise), 12, dt)
  })

  return (
    <group ref={groupRef} position={[xz[0], -0.65, xz[1]]}>
      <mesh castShadow>
        <cylinderGeometry args={[0.05, 0.05, 0.42, 16]} />
        <meshStandardMaterial
          color={index % 2 ? '#ffd0ea' : '#cfeeff'}
          roughness={0.6}
          metalness={0.05}
        />
      </mesh>
      <mesh position={[0, 0.23, 0]} castShadow>
        <cylinderGeometry args={[0.015, 0.015, 0.06, 10]} />
        <meshStandardMaterial color={'#2b1a2b'} roughness={0.2} />
      </mesh>
      <group position={[0, 0.26, 0]}>
        <Flame litRef={litRef} />
      </group>
    </group>
  )
}

function FrostingSwirl({ buildTRef, y = 0 }) {
  const meshRef = useRef(null)

  const { geometry, drawCount } = useMemo(() => {
    const points = []
    const turns = 3.1
    const steps = 84

    for (let i = 0; i < steps; i++) {
      const p = i / (steps - 1)
      const a = p * Math.PI * 2 * turns
      const r = THREE.MathUtils.lerp(0.62, 0.12, p)
      const yy = y + 0.12 + p * 0.22
      points.push(new THREE.Vector3(Math.cos(a) * r, yy, Math.sin(a) * r))
    }

    const curve = new THREE.CatmullRomCurve3(points)
    const geom = new THREE.TubeGeometry(curve, 220, 0.052, 10, false)

    const count = geom.index ? geom.index.count : geom.attributes.position.count

    return { geometry: geom, drawCount: count }
  }, [y])

  useFrame((state) => {
    const m = meshRef.current
    if (!m) return

    const buildT = buildTRef.current
    const t = state.clock.getElapsedTime()

    const start = 4.2
    const p = clamp01((buildT - start) / 1.4)

    geometry.setDrawRange(0, Math.max(0, Math.floor(drawCount * p)))

    m.rotation.y = t * 0.15
    m.position.y = y
  })

  return (
    <mesh ref={meshRef} geometry={geometry} castShadow>
      <meshStandardMaterial
        color={'#fff4fb'}
        roughness={0.35}
        metalness={0.02}
        emissive={'#ffd2ef'}
        emissiveIntensity={0.18}
      />
    </mesh>
  )
}

function CakeLayer({ index, buildTRef, radius = 0.92, height = 0.46, yTarget = 0 }) {
  const groupRef = useRef(null)
  const velRef = useRef(0)

  useFrame((_, dt) => {
    const g = groupRef.current
    if (!g) return

    const buildT = buildTRef.current

    const start = 0.6 + index * 1.05
    const active = buildT >= start

    const float = 0.05 * Math.sin(buildT * 1.2 + index * 1.4)
    const targetY = active ? yTarget + float : yTarget + 2.2 + index * 0.25

    const y = g.position.y

    const k = 85
    const damping = 0.86

    let v = velRef.current
    v += (targetY - y) * k * dt
    v *= Math.pow(damping, dt * 60)

    g.position.y = y + v * dt
    velRef.current = v

    g.visible = buildT >= start - 0.2
  })

  return (
    <group ref={groupRef} position={[0, yTarget + 2.2, 0]}>
      <mesh castShadow receiveShadow>
        <cylinderGeometry args={[radius, radius, height, 64, 1]} />
        <meshStandardMaterial
          color={index === 0 ? '#ffd6b8' : index === 1 ? '#ffe4f3' : '#d8f3ff'}
          roughness={0.65}
          metalness={0.02}
        />
      </mesh>

      <mesh position={[0, height * 0.15, 0]} castShadow>
        <torusGeometry args={[radius * 0.86, 0.07, 12, 80]} />
        <meshStandardMaterial
          color={'#fff4fb'}
          roughness={0.35}
          metalness={0.02}
          emissive={'#ffd2ef'}
          emissiveIntensity={0.14}
        />
      </mesh>
    </group>
  )
}

function Plate({ buildTRef }) {
  const ref = useRef(null)

  useFrame((_, dt) => {
    const m = ref.current
    if (!m) return

    const buildT = buildTRef.current
    const show = easeOutCubic((buildT - 0.15) / 0.9)

    m.scale.x = damp(m.scale.x, show, 10, dt)
    m.scale.y = damp(m.scale.y, show, 10, dt)
    m.scale.z = damp(m.scale.z, show, 10, dt)
  })

  return (
    <group>
      <mesh ref={ref} receiveShadow position={[0, -0.24, 0]} scale={[0, 0, 0]}>
        <cylinderGeometry args={[1.38, 1.5, 0.1, 64]} />
        <meshStandardMaterial color={'#ffffff'} roughness={0.25} metalness={0.1} />
      </mesh>
      <mesh receiveShadow position={[0, -0.3, 0]}>
        <cylinderGeometry args={[1.1, 1.16, 0.08, 64]} />
        <meshStandardMaterial color={'#fff0fa'} roughness={0.4} metalness={0.02} />
      </mesh>
    </group>
  )
}

function Balloons() {
  const group = useRef(null)

  const balloons = useMemo(() => {
    const colors = ['#ffd0ea', '#cfeeff', '#d8ffe3', '#ffe0c1', '#d7ccff']
    const items = []
    const count = 14

    for (let i = 0; i < count; i++) {
      const a = (i / count) * Math.PI * 2
      const r = THREE.MathUtils.lerp(4.2, 5.8, Math.random())
      const x = Math.cos(a) * r
      const z = Math.sin(a) * r - 4.8
      const y = THREE.MathUtils.lerp(0.4, 3.2, Math.random())
      items.push({
        x,
        y,
        z,
        s: THREE.MathUtils.lerp(0.7, 1.1, Math.random()),
        c: colors[i % colors.length],
        phase: Math.random() * Math.PI * 2,
      })
    }

    return items
  }, [])

  useFrame((state) => {
    const g = group.current
    if (!g) return
    const t = state.clock.getElapsedTime()

    for (let i = 0; i < g.children.length; i++) {
      const child = g.children[i]
      const b = balloons[i]
      if (!b) continue

      child.position.y = b.y + 0.18 * Math.sin(t * 0.6 + b.phase)
      child.rotation.z = 0.08 * Math.sin(t * 0.7 + b.phase)
      child.rotation.x = 0.06 * Math.sin(t * 0.5 + b.phase * 1.3)
    }
  })

  return (
    <group ref={group}>
      {balloons.map((b, i) => (
        <group key={i} position={[b.x, b.y, b.z]} scale={b.s}>
          <mesh castShadow>
            <sphereGeometry args={[0.33, 28, 22]} />
            <meshStandardMaterial
              color={b.c}
              roughness={0.25}
              metalness={0.02}
              emissive={b.c}
              emissiveIntensity={0.05}
            />
          </mesh>
          <mesh position={[0, -0.55, 0]}>
            <cylinderGeometry args={[0.006, 0.006, 0.9, 10]} />
            <meshStandardMaterial color={'#ffffff'} roughness={0.6} />
          </mesh>
        </group>
      ))}
    </group>
  )
}

function Confetti({ buildTRef }) {
  const instRef = useRef(null)

  const { items, colors } = useMemo(() => {
    const palette = ['#ff7bbf', '#4fd1ff', '#66f5a5', '#ffb45c', '#8f7dff']
    const count = 220
    const data = []
    const cols = []

    for (let i = 0; i < count; i++) {
      cols.push(new THREE.Color(palette[i % palette.length]))
      data.push({
        p: new THREE.Vector3(
          THREE.MathUtils.randFloatSpread(6.2),
          THREE.MathUtils.lerp(2.2, 6.6, Math.random()),
          THREE.MathUtils.randFloatSpread(5.8) - 1.8,
        ),
        v: new THREE.Vector3(
          THREE.MathUtils.randFloat(-0.12, 0.12),
          THREE.MathUtils.randFloat(-0.85, -0.35),
          THREE.MathUtils.randFloat(-0.05, 0.12),
        ),
        r: new THREE.Vector3(
          Math.random() * Math.PI,
          Math.random() * Math.PI,
          Math.random() * Math.PI,
        ),
        rv: new THREE.Vector3(
          THREE.MathUtils.randFloat(-2.2, 2.2),
          THREE.MathUtils.randFloat(-2.2, 2.2),
          THREE.MathUtils.randFloat(-2.2, 2.2),
        ),
        s: THREE.MathUtils.lerp(0.75, 1.25, Math.random()),
      })
    }

    return { items: data, colors: cols }
  }, [])

  const tmpObj = useMemo(() => new THREE.Object3D(), [])

  useFrame((state, dt) => {
    const inst = instRef.current
    if (!inst) return

    const t = state.clock.getElapsedTime()
    const buildT = buildTRef.current
    const alpha = clamp01((buildT - 0.9) / 1.2)

    for (let i = 0; i < items.length; i++) {
      const it = items[i]

      it.p.x += it.v.x * dt * 60
      it.p.y += (it.v.y - 0.12 * Math.sin(t * 0.9 + i * 0.13)) * dt
      it.p.z += it.v.z * dt * 40

      it.r.x += it.rv.x * dt
      it.r.y += it.rv.y * dt
      it.r.z += it.rv.z * dt

      if (it.p.y < -1.2) {
        it.p.y = THREE.MathUtils.lerp(3.8, 6.8, Math.random())
        it.p.x = THREE.MathUtils.randFloatSpread(6.2)
        it.p.z = THREE.MathUtils.randFloatSpread(5.8) - 1.8
      }

      tmpObj.position.copy(it.p)
      tmpObj.rotation.set(it.r.x, it.r.y, it.r.z)
      tmpObj.scale.set(it.s, it.s, it.s)
      tmpObj.updateMatrix()

      inst.setMatrixAt(i, tmpObj.matrix)
      inst.setColorAt(i, colors[i])
    }

    inst.instanceMatrix.needsUpdate = true
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true

    const mat = inst.material
    if (mat && 'opacity' in mat) mat.opacity = 0.92 * alpha
  })

  return (
    <instancedMesh ref={instRef} args={[null, null, items.length]} castShadow>
      <planeGeometry args={[0.09, 0.16]} />
      <meshStandardMaterial
        vertexColors
        transparent
        opacity={0}
        roughness={0.4}
        metalness={0.05}
        side={THREE.DoubleSide}
      />
    </instancedMesh>
  )
}

function CinematicCameraRig({ buildTRef }) {
  useFrame(({ camera }, dt) => {
    const t = buildTRef.current

    const orbit = clamp01((t - 0.4) / 6.8)

    const settle = clamp01((t - 7.3) / 3.0)
    const settleEase = easeOutCubic(settle)

    const angle = 0.55 + orbit * Math.PI * 1.15
    const radius = THREE.MathUtils.lerp(5.4, 4.2, easeOutCubic(orbit))

    const heroAngle = 0.9
    const heroRadius = 4.0

    const a = THREE.MathUtils.lerp(angle, heroAngle, settleEase)
    const r = THREE.MathUtils.lerp(radius, heroRadius, settleEase)

    const y = THREE.MathUtils.lerp(2.55, 2.15, settleEase)

    const targetPos = new THREE.Vector3(Math.cos(a) * r, y, Math.sin(a) * r)

    camera.position.x = damp(camera.position.x, targetPos.x, 3.6, dt)
    camera.position.y = damp(camera.position.y, targetPos.y, 3.6, dt)
    camera.position.z = damp(camera.position.z, targetPos.z, 3.6, dt)

    camera.lookAt(0, 0.85, 0)

    camera.fov = damp(camera.fov, THREE.MathUtils.lerp(42, 35, settleEase), 3.6, dt)
    camera.updateProjectionMatrix()
  })

  return null
}

function Scene() {
  const buildTRef = useRef(0)

  const topYRef = useRef(1.45)

  useEffect(() => {
    // Needed for RectAreaLight to work with PBR materials.
    RectAreaLightUniformsLib.init()
  }, [])

  const layerHeights = [0.46, 0.46, 0.46]
  const yTargets = [0.15, 0.65, 1.15]

  useFrame((state, dt) => {
    buildTRef.current += dt

    const totalTop = yTargets[2] + layerHeights[2] * 0.65
    topYRef.current = totalTop + 0.1

    // Subtle whole-scene sway to keep things “alive”.
    const t = state.clock.getElapsedTime()
    state.scene.rotation.y = 0.02 * Math.sin(t * 0.35)
  })

  return (
    <>
      <color attach="background" args={['#fff7fb']} />
      <fog attach="fog" args={['#fff3fb', 7.5, 18]} />

      <ambientLight intensity={0.55} color={'#fff1fa'} />
      <hemisphereLight intensity={0.45} color={'#ffffff'} groundColor={'#f6d6ff'} />

      <directionalLight
        position={[5.5, 7.5, 3.2]}
        intensity={1.25}
        color={'#ffffff'}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-near={0.5}
        shadow-camera-far={20}
        shadow-camera-left={-6}
        shadow-camera-right={6}
        shadow-camera-top={6}
        shadow-camera-bottom={-6}
      />

      <rectAreaLight
        position={[-3.5, 2.2, 2.5]}
        width={6}
        height={3}
        intensity={4}
        color={'#ffd8f0'}
        lookAt={[0, 0.85, 0]}
      />

      <group position={[0, 0, 0]}>
        <Balloons />
        <Confetti buildTRef={buildTRef} />

        <Plate buildTRef={buildTRef} />

        <CakeLayer
          index={0}
          buildTRef={buildTRef}
          radius={0.98}
          height={0.46}
          yTarget={yTargets[0]}
        />
        <CakeLayer
          index={1}
          buildTRef={buildTRef}
          radius={0.86}
          height={0.46}
          yTarget={yTargets[1]}
        />
        <CakeLayer
          index={2}
          buildTRef={buildTRef}
          radius={0.74}
          height={0.46}
          yTarget={yTargets[2]}
        />

        <FrostingSwirl buildTRef={buildTRef} y={yTargets[2] + 0.18} />

        {Array.from({ length: 7 }).map((_, i) => (
          <Candle
            key={i}
            index={i}
            count={7}
            buildTRef={buildTRef}
            topYRef={topYRef}
          />
        ))}

        <mesh receiveShadow rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.34, 0]}>
          <planeGeometry args={[40, 40]} />
          <shadowMaterial transparent opacity={0.2} />
        </mesh>

        <ContactShadows
          position={[0, -0.33, 0]}
          scale={10}
          blur={2.2}
          opacity={0.55}
          far={2.8}
        />
      </group>

      <CinematicCameraRig buildTRef={buildTRef} />
    </>
  )
}

export default function AnimatedBirthdayCake({ playing = true }) {
  return (
    <div className="cakeRoot" aria-label="Animated Birthday Cake">
      <Canvas
        className="cakeCanvas"
        frameloop={playing ? 'always' : 'demand'}
        shadows
        dpr={[1, 2]}
        camera={{ position: [4.6, 2.6, 4.6], fov: 42, near: 0.1, far: 50 }}
        gl={{ antialias: true, alpha: true }}
      >
        <Scene />
      </Canvas>
    </div>
  )
}
