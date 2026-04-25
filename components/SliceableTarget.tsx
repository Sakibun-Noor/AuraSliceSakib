'use client'

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { ThreeEvent, useFrame } from '@react-three/fiber'
import { useBox } from '@react-three/cannon'
import * as THREE from 'three'

// ── Tunables ──────────────────────────────────────────────────────────────────

const WHOLE_ARGS: [number, number, number] = [1, 1, 1]
const HALF_ARGS:  [number, number, number] = [0.5, 1, 1]

// Halves start just past the natural boundary so cannon doesn't see overlap.
const HALF_OFFSET = 0.26

/** Minimum speed (px/ms) for mouse & touch — ~280 px/s, fast drag not hover. */
const SLICE_PX_MS = 0.28
/** Minimum speed (world-units/s) for VR controller rays — brisk swing. */
const SLICE_WU_S  = 1.5

// Exterior: nearly-black, mirror-polished
const DARK  = '#888888'

// Interior neon colours — one per half so each reveals a different glow.
// These exceed luminance 1.0 (toneMapped:false) which is what feeds Bloom.
const CYAN    = '#00e5ff'
const MAGENTA = '#ff00e5'

// ── ParticleBurst ──────────────────────────────────────────────────────────────
// 20 small glowing spheres spawned at the slice point, flying outward under
// simulated gravity. Animated imperatively via useFrame to avoid per-sphere
// React state. Auto-unmounts after LIFETIME seconds.

const PARTICLE_COUNT    = 20
const PARTICLE_LIFETIME = 1.0   // seconds

function ParticleBurst({ origin }: { origin: THREE.Vector3 }) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>(new Array(PARTICLE_COUNT).fill(null))
  const ageRef   = useRef(0)
  const [dead, setDead] = useState(false)

  // Generate random velocities once — never recomputed.
  const velocities = useRef(
    Array.from({ length: PARTICLE_COUNT }, () =>
      new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 5,
      )
    )
  )

  // Alternate cyan / magenta to echo the two half materials.
  const colors = useRef(
    Array.from({ length: PARTICLE_COUNT }, (_, i) => (i % 2 === 0 ? CYAN : MAGENTA))
  )

  useFrame((_, dt) => {
    if (dead) return

    ageRef.current += dt
    if (ageRef.current >= PARTICLE_LIFETIME) {
      setDead(true)
      return
    }

    const t     = ageRef.current / PARTICLE_LIFETIME  // 0 → 1
    const alpha = 1 - t
    const scale = 0.1 * (1 - t * 0.55)               // shrink as they fade

    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const vel = velocities.current[i]
      const age = ageRef.current

      // Ballistic arc: constant lateral vel + parabolic vertical.
      mesh.position.set(
        origin.x + vel.x * age,
        origin.y + vel.y * age - 4.9 * age * age,
        origin.z + vel.z * age,
      )
      mesh.scale.setScalar(scale)

      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.opacity           = alpha
      mat.emissiveIntensity = alpha * 5   // stays above Bloom threshold while bright
    })
  })

  if (dead) return null

  return (
    <>
      {Array.from({ length: PARTICLE_COUNT }, (_, i) => (
        <mesh
          key={i}
          ref={(el) => { meshRefs.current[i] = el }}
          position={[origin.x, origin.y, origin.z]}
        >
          {/* Unit sphere — scale is driven by useFrame, not geometry size. */}
          <sphereGeometry args={[1, 7, 6]} />
          <meshStandardMaterial
            color={colors.current[i]}
            emissive={colors.current[i]}
            emissiveIntensity={5}
            toneMapped={false}    // luminance > 1 → feeds Bloom
            transparent
            opacity={1}
          />
        </mesh>
      ))}
    </>
  )
}

// ── WholeBox ──────────────────────────────────────────────────────────────────
// Static physics body. Listens for fast pointer movement and passes the
// exact 3-D hit point back so SliceableTarget can anchor the particle burst.

interface WholeBoxProps {
  position: [number, number, number]
  onSlice: (point: THREE.Vector3) => void   // ← now carries the hit point
}

function WholeBox({ position, onSlice }: WholeBoxProps) {
  const [ref] = useBox<THREE.Mesh>(() => ({
    type: 'Static',
    args: WHOLE_ARGS,
    position,
  }))

  const prevRef  = useRef<{ x: number; y: number; point: THREE.Vector3; t: number } | null>(null)
  const firedRef = useRef(false)  // prevents double-fire from overlapping events

  const detect = useCallback(
    (e: ThreeEvent<PointerEvent>) => {
      if (firedRef.current) return
      e.stopPropagation()

      const now  = performance.now()
      const prev = prevRef.current

      if (prev !== null) {
        const dt = Math.max(1, now - prev.t)

        // ── Path A: VR controller ray — world-space hit-point velocity ────
        const wu_s = e.point.distanceTo(prev.point) / (dt / 1000)
        if (wu_s >= SLICE_WU_S) {
          firedRef.current = true
          onSlice(e.point.clone())
          return
        }

        // ── Path B: Mouse / touch — screen-space pixel velocity ───────────
        const dx    = e.clientX - prev.x
        const dy    = e.clientY - prev.y
        const px_ms = Math.sqrt(dx * dx + dy * dy) / dt
        if (px_ms >= SLICE_PX_MS) {
          firedRef.current = true
          onSlice(e.point.clone())
          return
        }
      }

      prevRef.current = { x: e.clientX, y: e.clientY, point: e.point.clone(), t: now }
    },
    [onSlice]
  )

  return (
    <mesh
      ref={ref}
      castShadow
      receiveShadow
      onPointerMove={detect}
      onPointerEnter={detect}
    >
      <boxGeometry args={WHOLE_ARGS} />
      <meshStandardMaterial
        color={DARK}
        emissive="#1a0040"
        emissiveIntensity={0.25}   // below Bloom threshold — subtle inner glow only
        roughness={0.05}
        metalness={0.95}
      />
    </mesh>
  )
}

// ── HalfBox ───────────────────────────────────────────────────────────────────
// Dynamic physics body with a multi-material mesh: five dark exterior faces
// and one neon cut face (the freshly revealed interior).
//
// BoxGeometry group order: +X=0  −X=1  +Y=2  −Y=3  +Z=4  −Z=5
// Left  half → cut face is +X (index 0): inner edge faces right toward centre.
// Right half → cut face is −X (index 1): inner edge faces left toward centre.

interface HalfBoxProps {
  position: [number, number, number]
  vx: number
  innerFaceIndex: 0 | 1
  neonColor: string
}

function HalfBox({ position, vx, innerFaceIndex, neonColor }: HalfBoxProps) {
  const [ref, api] = useBox<THREE.Mesh>(() => ({
    mass: 1,
    args: HALF_ARGS,
    position,
    linearDamping: 0.05,
    angularDamping: 0.1,
  }))

  // Build the 6-slot material array imperatively so we can share the dark
  // material across five faces while the neon material takes exactly one slot.
  const materials = useMemo(() => {
    const dark = new THREE.MeshStandardMaterial({
      color: DARK,
      roughness: 0.05,
      metalness: 0.95,
    })
    const neon = new THREE.MeshStandardMaterial({
      color: neonColor,
      emissive: neonColor,
      emissiveIntensity: 5,   // >> 1 with toneMapped:false → Bloom-ready
      roughness: 0.02,
      metalness: 0,
      toneMapped: false,
    })
    const arr: THREE.MeshStandardMaterial[] = [dark, dark, dark, dark, dark, dark]
    arr[innerFaceIndex] = neon
    return arr
  }, [innerFaceIndex, neonColor])

  // Dispose both unique material objects (dark appears at 5 slots but is one
  // object; Set deduplicates so dispose is called exactly once per instance).
  useEffect(() => {
    return () => { new Set(materials).forEach((m) => m.dispose()) }
  }, [materials])

  // Strict-mode guard: React 18 double-invokes effects in dev.
  const boostedRef = useRef(false)
  useEffect(() => {
    if (boostedRef.current) return
    boostedRef.current = true
    api.velocity.set(vx, 3.5, (Math.random() - 0.5) * 1.5)
    api.angularVelocity.set(
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
      (Math.random() - 0.5) * 10,
    )
  }, [api, vx])

  // material prop accepts Material[] — Three.js uses group indices to select.
  return (
    <mesh ref={ref} material={materials} castShadow>
      <boxGeometry args={HALF_ARGS} />
    </mesh>
  )
}

// ── SliceableTarget ───────────────────────────────────────────────────────────

interface SliceableTargetProps {
  position: [number, number, number]
}

export default function SliceableTarget({ position }: SliceableTargetProps) {
  // null = unsliced; Vector3 = sliced, value is the exact 3-D hit point.
  const [slicePoint, setSlicePoint] = useState<THREE.Vector3 | null>(null)

  const handleSlice = useCallback((point: THREE.Vector3) => {
    setSlicePoint(point)
  }, [])

  if (slicePoint !== null) {
    return (
      <>
        {/* Left half — cyan inner face, flies left */}
        <HalfBox
          position={[position[0] - HALF_OFFSET, position[1], position[2]]}
          vx={-4}
          innerFaceIndex={0}
          neonColor={CYAN}
        />

        {/* Right half — magenta inner face, flies right */}
        <HalfBox
          position={[position[0] + HALF_OFFSET, position[1], position[2]]}
          vx={4}
          innerFaceIndex={1}
          neonColor={MAGENTA}
        />

        {/* Particle burst anchored at the exact pointer intersection */}
        <ParticleBurst origin={slicePoint} />
      </>
    )
  }

  return <WholeBox position={position} onSlice={handleSlice} />
}
