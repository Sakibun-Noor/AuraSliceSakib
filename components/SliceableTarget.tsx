'use client'

import { useRef, useState, useEffect, useCallback, useMemo } from 'react'
import { ThreeEvent, useFrame } from '@react-three/fiber'
import { useBox } from '@react-three/cannon'
import * as THREE from 'three'

// ── Tunables ──────────────────────────────────────────────────────────────────

const WHOLE_ARGS: [number, number, number] = [1, 1, 1]
const HALF_ARGS:  [number, number, number] = [0.5, 1, 1]
const HALF_OFFSET = 0.26

// Exterior color changed to light gray so you can easily see them!
const DARK  = '#888888'

const CYAN    = '#00e5ff'
const MAGENTA = '#ff00e5'

// ── ParticleBurst ──────────────────────────────────────────────────────────────

const PARTICLE_COUNT    = 20
const PARTICLE_LIFETIME = 1.0   // seconds

function ParticleBurst({ origin }: { origin: THREE.Vector3 }) {
  const meshRefs = useRef<(THREE.Mesh | null)[]>(new Array(PARTICLE_COUNT).fill(null))
  const ageRef   = useRef(0)
  const [dead, setDead] = useState(false)

  const velocities = useRef(
    Array.from({ length: PARTICLE_COUNT }, () =>
      new THREE.Vector3(
        (Math.random() - 0.5) * 5,
        Math.random() * 4 + 1,
        (Math.random() - 0.5) * 5,
      )
    )
  )

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

    const t     = ageRef.current / PARTICLE_LIFETIME  
    const alpha = 1 - t
    const scale = 0.1 * (1 - t * 0.55)               

    meshRefs.current.forEach((mesh, i) => {
      if (!mesh) return
      const vel = velocities.current[i]
      const age = ageRef.current

      mesh.position.set(
        origin.x + vel.x * age,
        origin.y + vel.y * age - 4.9 * age * age,
        origin.z + vel.z * age,
      )
      mesh.scale.setScalar(scale)

      const mat = mesh.material as THREE.MeshStandardMaterial
      mat.opacity           = alpha
      mat.emissiveIntensity = alpha * 5   
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
          <sphereGeometry args={[1, 7, 6]} />
          <meshStandardMaterial
            color={colors.current[i]}
            emissive={colors.current[i]}
            emissiveIntensity={5}
            toneMapped={false}    
            transparent
            opacity={1}
          />
        </mesh>
      ))}
    </>
  )
}

// ── WholeBox (Updated for Instant Click/Swipe) ────────────────────────────────

interface WholeBoxProps {
  position: [number, number, number]
  onSlice: (point: THREE.Vector3) => void   
}

function WholeBox({ position, onSlice }: WholeBoxProps) {
  const [ref] = useBox<THREE.Mesh>(() => ({
    type: 'Static',
    args: WHOLE_ARGS,
    position,
  }))

  return (
    <mesh
      ref={ref}
      castShadow
      receiveShadow
      // INSTANT SLICE: Triggers the absolute second your mouse clicks or touches it
      onPointerDown={(e) => {
        e.stopPropagation()
        onSlice(e.point.clone())
      }}
      // INSTANT SLICE: Triggers if you swipe your mouse over it
      onPointerOver={(e) => {
        e.stopPropagation()
        onSlice(e.point.clone())
      }}
    >
      <boxGeometry args={WHOLE_ARGS} />
      <meshStandardMaterial
        color={DARK}
        emissive="#1a0040"
        emissiveIntensity={0.25}   
        roughness={0.05}
        metalness={0.95}
      />
    </mesh>
  )
}

// ── HalfBox ───────────────────────────────────────────────────────────────────

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

  const materials = useMemo(() => {
    const dark = new THREE.MeshStandardMaterial({
      color: DARK,
      roughness: 0.05,
      metalness: 0.95,
    })
    const neon = new THREE.MeshStandardMaterial({
      color: neonColor,
      emissive: neonColor,
      emissiveIntensity: 5,   
      roughness: 0.02,
      metalness: 0,
      toneMapped: false,
    })
    const arr: THREE.MeshStandardMaterial[] = [dark, dark, dark, dark, dark, dark]
    arr[innerFaceIndex] = neon
    return arr
  }, [innerFaceIndex, neonColor])

  useEffect(() => {
    return () => { new Set(materials).forEach((m) => m.dispose()) }
  }, [materials])

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
  const [slicePoint, setSlicePoint] = useState<THREE.Vector3 | null>(null)

  const handleSlice = useCallback((point: THREE.Vector3) => {
    setSlicePoint(point)
  }, [])

  if (slicePoint !== null) {
    return (
      <>
        <HalfBox
          position={[position[0] - HALF_OFFSET, position[1], position[2]]}
          vx={-4}
          innerFaceIndex={0}
          neonColor={CYAN}
        />
        <HalfBox
          position={[position[0] + HALF_OFFSET, position[1], position[2]]}
          vx={4}
          innerFaceIndex={1}
          neonColor={MAGENTA}
        />
        <ParticleBurst origin={slicePoint} />
      </>
    )
  }

  return <WholeBox position={position} onSlice={handleSlice} />
}
