'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, useRapier } from '@react-three/rapier';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';

// Simple spectator character - cartoony and fun
function Spectator({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {/* Head - simple sphere */}
      <mesh position={[0, 0.3, 0]} castShadow>
        <sphereGeometry args={[0.15, 16, 16]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Body - cylinder */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <cylinderGeometry args={[0.12, 0.12, 0.2, 8]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Arms - waving */}
      <mesh position={[-0.15, 0.15, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
        <boxGeometry args={[0.05, 0.15, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
      <mesh position={[0.15, 0.15, 0]} rotation={[0, 0, -Math.PI / 4]} castShadow>
        <boxGeometry args={[0.05, 0.15, 0.05]} />
        <meshStandardMaterial color={color} />
      </mesh>
    </group>
  );
}

// Spectator stand
function SpectatorStand({ position, side }: { position: [number, number, number]; side: 'left' | 'right' }) {
  const colors = ['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA', '#FCBAD3', '#FFD93D'];
  const spectatorPositions: Array<[number, number, number]> = [];
  
  // Generate spectator positions along the stand
  for (let i = 0; i < 20; i++) {
    const z = -25 + (i * 2.5); // Spread along track length
    const x = side === 'left' ? -1.8 : 1.8; // Position on left or right side
    spectatorPositions.push([x, 0.5, z]);
  }
  
  return (
    <group position={position}>
      {/* Stand structure */}
      <mesh position={[0, 0.2, -25]} receiveShadow>
        <boxGeometry args={[0.5, 0.4, 50]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Spectators */}
      {spectatorPositions.map((pos, i) => (
        <Spectator 
          key={i} 
          position={[pos[0], pos[1], pos[2]]} 
          color={colors[i % colors.length]} 
        />
      ))}
    </group>
  );
}

// Fun cartoony tree
function CartoonTree({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      {/* Trunk */}
      <mesh position={[0, 0.5, 0]} castShadow>
        <cylinderGeometry args={[0.2, 0.2, 1, 8]} />
        <meshStandardMaterial color="#8B4513" />
      </mesh>
      {/* Leaves - multiple spheres for cartoony look */}
      <mesh position={[0, 1.2, 0]} castShadow>
        <sphereGeometry args={[0.6, 16, 16]} />
        <meshStandardMaterial color="#4CAF50" />
      </mesh>
      <mesh position={[-0.3, 1.3, 0]} castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#66BB6A" />
      </mesh>
      <mesh position={[0.3, 1.3, 0]} castShadow>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#66BB6A" />
      </mesh>
    </group>
  );
}

// Fun cartoony building
function CartoonBuilding({ position, color }: { position: [number, number, number]; color: string }) {
  return (
    <group position={position}>
      {/* Main building */}
      <mesh position={[0, 1, 0]} castShadow receiveShadow>
        <boxGeometry args={[1.5, 2, 1.5]} />
        <meshStandardMaterial color={color} />
      </mesh>
      {/* Roof */}
      <mesh position={[0, 2.3, 0]} castShadow>
        <coneGeometry args={[1.2, 0.8, 4]} />
        <meshStandardMaterial color="#FF6B6B" />
      </mesh>
      {/* Windows */}
      <mesh position={[-0.4, 1.2, 0.76]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.1]} />
        <meshStandardMaterial color="#FFE66D" emissive="#FFE66D" emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0.4, 1.2, 0.76]} castShadow>
        <boxGeometry args={[0.3, 0.3, 0.1]} />
        <meshStandardMaterial color="#FFE66D" emissive="#FFE66D" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Fun cloud
function CartoonCloud({ position }: { position: [number, number, number] }) {
  return (
    <group position={position}>
      <mesh>
        <sphereGeometry args={[0.4, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[-0.3, 0, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0.3, 0, 0]}>
        <sphereGeometry args={[0.35, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
      <mesh position={[0, 0.2, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshStandardMaterial color="#ffffff" />
      </mesh>
    </group>
  );
}

interface Player {
  id: number;
  name: string;
  handle: string;
  color: string;
  colorName: string;
  joined: boolean;
  isYou?: boolean;
  pfpUrl?: string;
}

interface Race3DProps {
  players: Player[];
  raceStartTime: number | null;
  onRaceComplete: (winner: Player) => void;
  vrfSeed: string | null;
  onProgressUpdate?: (progress: number) => void;
}

// 3D Marble Component
function Marble({ 
  player, 
  position, 
  index, 
  isLeading,
  onPositionUpdate,
  initialVelocity,
  raceStartTime,
  speedMultiplier
}: { 
  player: Player; 
  position: [number, number, number]; 
  index: number; 
  isLeading: boolean;
  onPositionUpdate?: (pos: THREE.Vector3) => void;
  initialVelocity?: [number, number, number];
  raceStartTime: number | null;
  speedMultiplier?: number;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const rigidBodyRef = useRef<any>(null);
  const hasStarted = useRef(false);
  const lastUpdateTime = useRef(0);
  const baseSpeedRef = useRef(0);
  const lastVelocityRef = useRef<[number, number, number] | undefined>(undefined);

  // Calculate base speed from initial velocity
  useEffect(() => {
    if (initialVelocity) {
      baseSpeedRef.current = Math.abs(initialVelocity[2]) || 0.7;
    }
  }, [initialVelocity]);

  // Apply initial velocity when race starts
  useEffect(() => {
    if (raceStartTime && rigidBodyRef.current && !hasStarted.current && initialVelocity) {
      hasStarted.current = true;
      baseSpeedRef.current = Math.abs(initialVelocity[2]) || 0.7;
      // Use requestAnimationFrame to ensure physics is ready
      requestAnimationFrame(() => {
        if (rigidBodyRef.current) {
          rigidBodyRef.current.setLinvel({ x: initialVelocity[0], y: initialVelocity[1], z: initialVelocity[2] });
        }
      });
    }
  }, [raceStartTime, initialVelocity]);

  // Reliable forward movement - ensure marbles always move forward
  useFrame((state, delta) => {
    if (!rigidBodyRef.current || !raceStartTime) return;

    const pos = rigidBodyRef.current.translation();
    const currentVel = rigidBodyRef.current.linvel();
    
    // Calculate effective speed multiplier
    let effectiveMultiplier = speedMultiplier || 1.0;
    
    // Target speed for 10 second race (track length 30, need to finish in 10s)
    // Average speed needed: 30 / 10 = 3 units per second
    // But with variation, speeds range from 2.5 to 3.5
    const targetSpeed = baseSpeedRef.current * effectiveMultiplier;
    const currentForwardSpeed = -currentVel.z; // Negative Z is forward
    
    // Always apply forward force to ensure continuous movement
    // This ensures ALL marbles cross the finish line
    if (currentForwardSpeed < targetSpeed) {
      const speedDiff = targetSpeed - currentForwardSpeed;
      // Stronger force to ensure movement, but still smooth
      const forceNeeded = Math.min(speedDiff * 5, 0.4);
      rigidBodyRef.current.applyImpulse(new THREE.Vector3(0, 0, -forceNeeded * delta), true);
    }

    // Keep marble on track - prevent flying off
    if (pos.y > 0.4) {
      rigidBodyRef.current.applyImpulse(new THREE.Vector3(0, -0.2 * delta, 0), true);
    }

    // Prevent backwards movement - always push forward
    if (currentVel.z > 0.05) {
      rigidBodyRef.current.applyImpulse(new THREE.Vector3(0, 0, -0.1 * delta), true);
    }

    // Update position callback
    if (onPositionUpdate) {
      const now = state.clock.elapsedTime;
      if (now - lastUpdateTime.current > 0.05) {
        lastUpdateTime.current = now;
        onPositionUpdate(new THREE.Vector3(pos.x, pos.y, pos.z));
      }
    }
  });

  return (
    <RigidBody
      ref={rigidBodyRef}
      position={position}
      colliders="ball"
      restitution={0.1}
      friction={0.5}
      linearDamping={0.1}
      angularDamping={0.2}
      mass={1}
      ccd={true}
    >
      <mesh ref={meshRef} castShadow receiveShadow>
        <sphereGeometry args={[0.15, 32, 32]} />
        <meshStandardMaterial
          color={player.color}
          metalness={0.9}
          roughness={0.1}
          envMapIntensity={1.5}
          emissive={isLeading ? player.color : '#000000'}
          emissiveIntensity={isLeading ? 0.4 : 0}
        />
        {/* Glass-like outer shell */}
        <mesh>
          <sphereGeometry args={[0.16, 32, 32]} />
          <meshPhysicalMaterial
            color="#ffffff"
            transmission={0.95}
            thickness={0.015}
            roughness={0.05}
            metalness={0}
            clearcoat={1}
            clearcoatRoughness={0.05}
            ior={1.5}
          />
        </mesh>
      </mesh>
    </RigidBody>
  );
}

// Track Component - Simple, reliable straight track
function Track() {
  const trackRef = useRef<THREE.Group>(null);
  const trackLength = 30; // Shorter track for 10 second race
  const trackWidth = 2.5;

  return (
    <group ref={trackRef}>
      {/* Track base - flat, reliable surface */}
      <RigidBody type="fixed" position={[0, 0, -trackLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[trackWidth, trackLength, 0.2]} />
          <meshStandardMaterial color="#1a1a1a" roughness={0.9} metalness={0.1} />
        </mesh>
      </RigidBody>
      
      {/* Track borders - visual only */}
      <mesh position={[0, 0.1, -trackLength / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <boxGeometry args={[trackWidth + 0.3, trackLength, 0.05]} />
        <meshStandardMaterial color="#ffffff" roughness={0.6} />
      </mesh>
      
      {/* Center line */}
      <mesh position={[0, 0.11, -trackLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.15, trackLength, 0.02]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.3} />
      </mesh>

      {/* Track walls as colliders - prevent flying off */}
      <RigidBody type="fixed" position={[trackWidth / 2 + 0.2, 0.4, -trackLength / 2]}>
        <mesh>
          <boxGeometry args={[0.4, 1.0, trackLength]} />
          <meshStandardMaterial color="#888888" visible={false} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[-trackWidth / 2 - 0.2, 0.4, -trackLength / 2]}>
        <mesh>
          <boxGeometry args={[0.4, 1.0, trackLength]} />
          <meshStandardMaterial color="#888888" visible={false} />
        </mesh>
      </RigidBody>
      
      {/* Finish line - visible marker */}
      <mesh position={[0, 0.1, -trackLength + 0.5]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[trackWidth, 0.5, 0.1]} />
        <meshStandardMaterial color="#00ff00" emissive="#00ff00" emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

// Camera that follows the leading marble - behind view
function FollowCamera({ targetPosition }: { targetPosition: THREE.Vector3 }) {
  const cameraRef = useRef<THREE.PerspectiveCamera>(null);
  const { camera } = useThree();
  
  useFrame(() => {
    if (cameraRef.current) {
      const cam = cameraRef.current;
      // Behind and above the marble, looking ahead
      const idealOffset = new THREE.Vector3(0, 2, 4);
      const idealLookAt = new THREE.Vector3(0, 0, -3);
      
      const targetCameraPos = targetPosition.clone().add(idealOffset);
      const targetLookAt = targetPosition.clone().add(idealLookAt);
      
      // Smooth camera movement
      cam.position.lerp(targetCameraPos, 0.05);
      cam.lookAt(targetLookAt);
    }
  });

  return <PerspectiveCamera ref={cameraRef} makeDefault position={[0, 3, 5]} fov={70} />;
}

// Main 3D Race Scene
export default function Race3D({ players, raceStartTime, onRaceComplete, vrfSeed, onProgressUpdate }: Race3DProps) {
  const [marblePositions, setMarblePositions] = useState<Map<number, THREE.Vector3>>(new Map());
  const [leadingMarble, setLeadingMarble] = useState<THREE.Vector3>(new THREE.Vector3(0, 0.2, 0));
  const positionUpdates = useRef<Map<number, THREE.Vector3>>(new Map());
  const winnerFoundRef = useRef(false);
  const speedMultipliersRef = useRef<Map<number, number>>(new Map());
  const eventTimersRef = useRef<Map<number, { type: string; endTime: number }>>(new Map());

  // Generate initial velocities based on VRF seed - use useMemo for synchronous calculation
  const initialVelocities = useMemo(() => {
    if (!raceStartTime || !vrfSeed) {
      return new Map<number, [number, number, number]>();
    }
    
      const velocities = new Map<number, [number, number, number]>();
      players.forEach((player, i) => {
        if (player.joined) {
          // Use VRF seed to determine initial velocity
          // For 10 second race: track length 30, need speeds 2.5-3.5 units/sec
          const seedOffset = i * 8;
          const playerSeed = parseInt(vrfSeed.slice(seedOffset, seedOffset + 8) || '1', 16);
          const speed = 2.5 + ((playerSeed % 1000) / 1000) * 1.0; // 2.5 to 3.5 for 10s race
          velocities.set(player.id, [0, 0, -speed]); // Negative Z is forward
          speedMultipliersRef.current.set(player.id, 1.0);
        }
      });
    return velocities;
  }, [raceStartTime, vrfSeed, players]);

  // No obstacles - simple track for reliability

  // Simplified - no dynamic events for reliability

  // Handle position updates from marbles
  const handlePositionUpdate = (playerId: number) => (pos: THREE.Vector3) => {
    positionUpdates.current.set(playerId, pos);
    
    // Update all positions and find leader
    const positions = new Map(positionUpdates.current);
    let leadingZ = Infinity; // Most negative Z is leading (going down track)
    let leadingPos = new THREE.Vector3(0, 0.2, 0);

    positions.forEach((pos, id) => {
      if (pos.z < leadingZ) {
        leadingZ = pos.z;
        leadingPos = pos;
      }
    });

    setMarblePositions(positions);
    setLeadingMarble(leadingPos);

    // Calculate and report progress (0 to 1) - track length is 30
    if (positions.size > 0 && onProgressUpdate) {
      const maxZ = Math.max(...Array.from(positions.values()).map(p => Math.abs(p.z)));
      const progress = Math.min(maxZ / 30, 1); // Track length is 30
      onProgressUpdate(progress);
    }

    // Check for winner (marble past finish line at z = -29.5)
    if (!winnerFoundRef.current && raceStartTime) {
      const finishLineZ = -29.5; // Finish line position
      const elapsed = (Date.now() - raceStartTime) / 1000;
      
      positions.forEach((pos, playerId) => {
        if (pos.z < finishLineZ) {
          const winner = players.find(p => p.id === playerId);
          if (winner) {
            winnerFoundRef.current = true;
            onRaceComplete(winner);
          }
        }
      });
      
      // Force finish after 10 seconds - ensure race completes
      if (elapsed >= 10 && !winnerFoundRef.current) {
        // Find marble closest to finish line
        let closestZ = Infinity;
        let winnerId: number | null = null;
        positions.forEach((pos, id) => {
          if (pos.z < closestZ) {
            closestZ = pos.z;
            winnerId = id;
          }
        });
        
        if (winnerId !== null) {
          const winner = players.find(p => p.id === winnerId);
          if (winner) {
            winnerFoundRef.current = true;
            onRaceComplete(winner);
          }
        }
      }
    }
  };

  // Initialize marble positions at start line
  useEffect(() => {
    if (raceStartTime) {
      winnerFoundRef.current = false; // Reset winner flag
      const positions = new Map<number, THREE.Vector3>();
      players.forEach((player, i) => {
        if (player.joined) {
          // Start marbles in a line, slightly above track
          const pos = new THREE.Vector3((i - 2) * 0.35, 0.25, 0);
          positions.set(player.id, pos);
          positionUpdates.current.set(player.id, pos);
        }
      });
      setMarblePositions(positions);
      setLeadingMarble(new THREE.Vector3(0, 0.25, 0));
    }
  }, [raceStartTime, players]);

  return (
    <div className="w-full h-full">
      <Canvas shadows dpr={[1, 2]} gl={{ antialias: true, alpha: false }}>
        <Physics gravity={[0, -9.81, 0]} timeStep="vary">
          {/* Lighting */}
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
            shadow-camera-far={50}
            shadow-camera-left={-10}
            shadow-camera-right={10}
            shadow-camera-top={10}
            shadow-camera-bottom={-10}
          />
          <pointLight position={[-10, 10, -10]} intensity={0.5} />
          
          {/* Happy, cartoony environment */}
          <Environment preset="sunset" />
          
          {/* Bright, cheerful ground plane */}
          <RigidBody type="fixed">
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -25]} receiveShadow>
              <planeGeometry args={[50, 50]} />
              <meshStandardMaterial color="#87CEEB" roughness={0.8} /> {/* Sky blue ground */}
            </mesh>
          </RigidBody>
          
          {/* Grass patches around track */}
          {[-20, -10, 0, 10, 20].map((z, i) => (
            <mesh key={`grass-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[-3, -0.05, z - 25]} receiveShadow>
              <planeGeometry args={[2, 2]} />
              <meshStandardMaterial color="#7CB342" />
            </mesh>
          ))}
          {[-20, -10, 0, 10, 20].map((z, i) => (
            <mesh key={`grass-r-${i}`} rotation={[-Math.PI / 2, 0, 0]} position={[3, -0.05, z - 25]} receiveShadow>
              <planeGeometry args={[2, 2]} />
              <meshStandardMaterial color="#7CB342" />
            </mesh>
          ))}

          {/* Track */}
          <Track />
          
          {/* Spectator stands on both sides */}
          <SpectatorStand position={[0, 0, 0]} side="left" />
          <SpectatorStand position={[0, 0, 0]} side="right" />
          
          {/* Fun cartoony trees around the track */}
          <CartoonTree position={[-4, 0, -20]} />
          <CartoonTree position={[-4, 0, -10]} />
          <CartoonTree position={[-4, 0, 0]} />
          <CartoonTree position={[-4, 0, 10]} />
          <CartoonTree position={[-4, 0, 20]} />
          <CartoonTree position={[4, 0, -20]} />
          <CartoonTree position={[4, 0, -10]} />
          <CartoonTree position={[4, 0, 0]} />
          <CartoonTree position={[4, 0, 10]} />
          <CartoonTree position={[4, 0, 20]} />
          
          {/* Fun cartoony buildings in the background */}
          <CartoonBuilding position={[-6, 0, -15]} color="#FFB6C1" />
          <CartoonBuilding position={[-6, 0, -5]} color="#B19CD9" />
          <CartoonBuilding position={[-6, 0, 5]} color="#FFD700" />
          <CartoonBuilding position={[6, 0, -15]} color="#87CEEB" />
          <CartoonBuilding position={[6, 0, -5]} color="#FFA07A" />
          <CartoonBuilding position={[6, 0, 5]} color="#98D8C8" />
          
          {/* Happy clouds in the sky */}
          <CartoonCloud position={[-5, 8, -20]} />
          <CartoonCloud position={[5, 7, -15]} />
          <CartoonCloud position={[-3, 9, -5]} />
          <CartoonCloud position={[4, 8, 5]} />
          <CartoonCloud position={[-6, 7, 15]} />
          
          {/* Decorative flags/banners */}
          {[-25, -15, -5, 5, 15, 25].map((z, i) => (
            <group key={`flag-${i}`} position={[-1.5, 0.8, z - 25]}>
              <mesh>
                <boxGeometry args={[0.05, 0.8, 0.05]} />
                <meshStandardMaterial color="#8B4513" />
              </mesh>
              <mesh position={[0.15, 0.4, 0]}>
                <boxGeometry args={[0.3, 0.2, 0.01]} />
                <meshStandardMaterial color={['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181', '#AA96DA'][i % 6]} />
              </mesh>
            </group>
          ))}
          
          {/* Fun decorative elements - colorful balloons */}
          {[-20, -10, 0, 10, 20].map((z, i) => (
            <group key={`balloon-${i}`} position={[-2.5, 3 + (i % 2) * 0.5, z - 25]}>
              <mesh>
                <sphereGeometry args={[0.2, 16, 16]} />
                <meshStandardMaterial color={['#FF6B6B', '#4ECDC4', '#FFE66D', '#95E1D3', '#F38181'][i % 5]} />
              </mesh>
              <mesh position={[0, -0.3, 0]}>
                <cylinderGeometry args={[0.01, 0.01, 0.3, 8]} />
                <meshStandardMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}

          {/* Marbles */}
          {players.map((player, i) => {
            if (!player.joined) return null;
            const pos = marblePositions.get(player.id) || new THREE.Vector3((i - 2) * 0.3, 0.2, 0);
            const isLeading = Math.abs(leadingMarble.z - pos.z) < 0.1 && pos.z < 0;
            const velocity = initialVelocities.get(player.id) || [0, 0, -0.7];
            const speedMultiplier = speedMultipliersRef.current.get(player.id) || 1.0;
            
            return (
              <Marble
                key={player.id}
                player={player}
                position={[pos.x, pos.y, pos.z]}
                index={i}
                isLeading={isLeading}
                onPositionUpdate={handlePositionUpdate(player.id)}
                initialVelocity={velocity}
                raceStartTime={raceStartTime}
                speedMultiplier={speedMultiplier}
              />
            );
          })}

          {/* Contact shadows for marbles */}
          <ContactShadows position={[0, 0.01, 0]} opacity={0.4} scale={20} blur={2} far={10} />
        </Physics>

        {/* Camera */}
        <FollowCamera targetPosition={leadingMarble} />
      </Canvas>
    </div>
  );
}
