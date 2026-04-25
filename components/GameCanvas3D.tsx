'use client'

import { Canvas } from '@react-three/fiber'
import { XR, createXRStore, XRButton } from '@react-three/xr'
import { Physics } from '@react-three/cannon'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import SliceableTarget from './SliceableTarget'

// One store instance shared between the canvas and the HTML button.
// Must live outside the component so it's stable across re-renders.
const xrStore = createXRStore()

// ---------------------------------------------------------------------------
// GameCanvas3D
// Mounts the full R3F <Canvas> with XR and Physics providers inside.
// Renders as a full-height/width surface; parent must set the dimensions.
// ---------------------------------------------------------------------------
export default function GameCanvas3D() {
  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* ── Three.js / R3F canvas ────────────────────────────────────────── */}
      <Canvas
        camera={{ position: [0, 1.6, 0], fov: 75, near: 0.01, far: 100 }}
        gl={{ antialias: true, powerPreference: 'high-performance' }}
        shadows
      >
        {/* Sky colour set directly on the renderer instead of a background mesh */}
        <color attach="background" args={['#0a0a0f']} />

        {/* XR wraps the entire scene so controllers/headset pose overrides the camera */}
        <XR store={xrStore}>
          {/* Physics provides a simulation context for future sliceable objects */}
          <Physics gravity={[0, -9.81, 0]}>

            {/* ── Lighting ──────────────────────────────────────────────── */}
            {/* Soft cool-purple fill */}
            <ambientLight intensity={0.35} color="#c4b5fd" />

            {/* Primary dramatic point — top-centre, purple */}
            <pointLight
              position={[0, 4, -2]}
              intensity={4}
              color="#a855f7"
              distance={14}
              decay={2}
              castShadow
              shadow-mapSize={[1024, 1024]}
            />

            {/* Accent rim — front-right, cool blue */}
            <pointLight
              position={[3, 1.5, 1]}
              intensity={1.8}
              color="#60a5fa"
              distance={10}
              decay={2}
            />

            {/* ── Scene objects ─────────────────────────────────────────── */}
            {/* Three targets spread horizontally at standing eye height.
                Drag / swipe / sweep a VR controller across any one to slice it. */}
            <SliceableTarget position={[-1.6, 1.5, -3]} />
            <SliceableTarget position={[ 0.0, 1.5, -3]} />
            <SliceableTarget position={[ 1.6, 1.5, -3]} />

          </Physics>
        </XR>

        {/* ── Post-processing ────────────────────────────────────────────── */}
        {/* Placed after XR so it captures the fully-rendered frame.
            luminanceThreshold 0.9 means only surfaces with luminance > 0.9
            contribute — the dark exteriors stay crisp while the neon cut
            faces and particles (emissiveIntensity 5, toneMapped:false) glow
            intensely. Note: Bloom may behave differently inside a WebXR
            session; it works fully on desktop and mobile. */}
        <EffectComposer>
          <Bloom
            luminanceThreshold={0.9}
            luminanceSmoothing={0.025}
            intensity={2.0}
            mipmapBlur
            radius={0.7}
          />
        </EffectComposer>
      </Canvas>

      {/* ── VR entry button — overlaid as HTML, outside the canvas ──────── */}
      <div
        style={{
          position: 'absolute',
          bottom: 28,
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 10,
        }}
      >
        <XRButton
          store={xrStore}
          mode="immersive-vr"
          style={{
            padding: '12px 36px',
            background: 'linear-gradient(135deg, #7c3aed 0%, #4f46e5 100%)',
            color: '#ffffff',
            border: '1px solid rgba(167,139,250,0.45)',
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 700,
            letterSpacing: '0.1em',
            textTransform: 'uppercase',
            cursor: 'pointer',
            boxShadow: '0 0 28px rgba(124,58,237,0.55)',
            fontFamily: 'system-ui, sans-serif',
          }}
        >
          Enter VR
        </XRButton>
      </div>
    </div>
  )
}
