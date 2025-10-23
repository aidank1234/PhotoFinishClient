import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF } from '@react-three/drei'
import { Suspense, useEffect, useRef, useState } from 'react'
import * as THREE from 'three'
import './App.css'

function HorseModel() {
  const group = useRef<THREE.Group>(null)
  const { scene, animations } = useGLTF('/horse_run_cycle_on_place.glb')
  const mixer = useRef<THREE.AnimationMixer | null>(null)
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 480)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  useEffect(() => {
    if (scene) {
      // Hide the platform/ground that comes with the model
      scene.traverse((child) => {
        if (child instanceof THREE.Mesh) {
          // Hide any mesh that looks like a platform (usually grey/flat)
          if (child.name.toLowerCase().includes('plane') || 
              child.name.toLowerCase().includes('ground') ||
              child.name.toLowerCase().includes('platform')) {
            child.visible = false
          }
          // Also check material - if it's grey/flat, it's likely the platform
          if (child.material) {
            const material = Array.isArray(child.material) ? child.material[0] : child.material
            if (material instanceof THREE.MeshStandardMaterial || material instanceof THREE.MeshBasicMaterial) {
              // Hide grey platforms
              if (material.color && material.color.r < 0.6 && material.color.g < 0.6 && material.color.b < 0.6) {
                const boundingBox = new THREE.Box3().setFromObject(child)
                const height = boundingBox.max.y - boundingBox.min.y
                const width = boundingBox.max.x - boundingBox.min.x
                // If it's flat (wider than it is tall), it's probably the platform
                if (width > height * 3) {
                  child.visible = false
                  console.log('Hiding platform:', child.name)
                }
              }
            }
          }
        }
      })
    }
    
    if (animations && animations.length > 0 && scene) {
      console.log('Animations found:', animations.length)
      
      // Create mixer
      mixer.current = new THREE.AnimationMixer(scene)
      
      // Play all animation clips
      animations.forEach((clip, index) => {
        console.log(`Animation ${index}:`, clip.name, 'Duration:', clip.duration, 'Tracks:', clip.tracks.length)
        
        // The actual running animation is only in the last ~0.5 seconds
        // We'll trim the clip to start at 2.8 seconds and loop just that portion
        const startTime = 2.8
        const endTime = clip.duration
        const activeDuration = endTime - startTime
        
        console.log(`Trimming animation from ${startTime} to ${endTime} (${activeDuration}s)`)
        
        // Create a trimmed version of the clip
        const trimmedTracks = clip.tracks.map(track => {
          const trimmedTrack = track.clone()
          
          // Get the keyframe data for just the active portion
          const times = []
          const values = []
          
          for (let i = 0; i < track.times.length; i++) {
            if (track.times[i] >= startTime && track.times[i] <= endTime) {
              times.push(track.times[i] - startTime)
              const valueSize = track.getValueSize()
              for (let j = 0; j < valueSize; j++) {
                values.push(track.values[i * valueSize + j])
              }
            }
          }
          
          trimmedTrack.times = new Float32Array(times)
          trimmedTrack.values = new Float32Array(values)
          
          return trimmedTrack
        })
        
        const trimmedClip = new THREE.AnimationClip(clip.name + '_trimmed', activeDuration, trimmedTracks)
        
        const action = mixer.current!.clipAction(trimmedClip)
        action.setLoop(THREE.LoopRepeat, Infinity)
        action.clampWhenFinished = false
        action.timeScale = 1.0
        action.enabled = true
        action.setEffectiveTimeScale(1.0)
        action.setEffectiveWeight(1.0)
        action.play()
        
        console.log('Trimmed action started:', action)
      })
      
      console.log('Animations playing')
    }
    
    return () => {
      if (mixer.current) {
        mixer.current.stopAllAction()
        mixer.current = null
      }
    }
  }, [scene, animations])
  
  // Update mixer using React Three Fiber's frame loop
  useFrame((_state, delta) => {
    if (mixer.current) {
      mixer.current.update(delta)
    }
  })
  
  const scale = isMobile ? 0.02 : 0.04
  
  return (
    <group ref={group}>
      <primitive 
        object={scene} 
        scale={scale}
        position={[0, 0, 0]}
        rotation={[0, Math.PI / 2, 0]}
      />
    </group>
  )
}

function LuxuryPlatform() {
  const [isMobile, setIsMobile] = useState(false)
  
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 480)
    }
    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])
  
  const size = isMobile ? 0.9 : 1.8
  
  return (
    <group position={[0, -0.15, 0]}>
      {/* Subtle circular glow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <circleGeometry args={[size, 64]} />
        <meshBasicMaterial 
          color="#D4AF37"
          transparent
          opacity={0.05}
        />
      </mesh>
    </group>
  )
}

function Loader() {
  return null
}

function App() {
  return (
    <div className="app">
      <header className="header">
        <img src="/logo.png" alt="PhotoFinish" className="logo" />
        <div className="brand-text-card">
          <div className="brand-text">
            <div className="brand-title">PhotoFinish.</div>
            <div className="brand-subtitle">FUN</div>
          </div>
        </div>
      </header>

      <div className="canvas-container">
        <Canvas
          camera={{ position: [5, 0, 0], fov: 50 }}
          dpr={[1, 2]}
          gl={{ antialias: true, alpha: false }}
          frameloop="always"
          style={{ width: '100%', height: '100%' }}
        >
          <color attach="background" args={['#0B0B0C']} />
          
          <ambientLight intensity={0.8} />
          <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
          <directionalLight position={[-10, 5, -5]} intensity={0.8} />
          <spotLight position={[0, 10, 0]} angle={0.3} penumbra={1} intensity={1} />
          <pointLight position={[0, 2, 5]} intensity={0.5} color="#D4AF37" />
          
          <Suspense fallback={<Loader />}>
            <HorseModel />
          </Suspense>
          
          <LuxuryPlatform />
        </Canvas>
      </div>

      <div className="hero-content">
        <div className="hero-text">
          <div className="hero-line">Fantasy Horse Racing.</div>
          <div className="hero-line">Liquid Markets.</div>
          <div className="hero-line coming-soon">Coming Soon.</div>
        </div>
        <div className="hero-buttons">
          <button className="btn btn-primary" disabled>Presale</button>
          <button className="btn btn-secondary" disabled>Learn More</button>
        </div>
      </div>
    </div>
  )
}

export default App

