/**
 * /vr — Phase 1: 3D WebXR game canvas
 *
 * Dynamic import with ssr: false is mandatory because Three.js / WebGL
 * cannot run on the server. The loading fallback keeps the dark background
 * while the WASM physics engine initialises.
 */
import dynamic from 'next/dynamic'

const GameCanvas3D = dynamic(
  () => import('@/components/GameCanvas3D'),
  {
    ssr: false,
    loading: () => (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          color: '#a855f7',
          fontFamily: 'system-ui, sans-serif',
          fontSize: 13,
          letterSpacing: '0.18em',
          textTransform: 'uppercase',
          userSelect: 'none',
        }}
      >
        Initialising…
      </div>
    ),
  }
)

export default function VRPage() {
  return (
    // position:fixed + inset:0 makes this a true full-screen surface that
    // won't scroll or resize with the document — required for WebXR entry.
    <main
      style={{
        position: 'fixed',
        inset: 0,
        width: '100vw',
        height: '100vh',
        overflow: 'hidden',
        background: '#0a0a0f',
      }}
    >
      <GameCanvas3D />
    </main>
  )
}
