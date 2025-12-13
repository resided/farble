'use client';

import React, { useRef, useEffect, useState, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Physics, RigidBody, useRapier } from '@react-three/rapier';
import { OrbitControls, PerspectiveCamera, Environment, ContactShadows, Text } from '@react-three/drei';
import * as THREE from 'three';

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
  speedMultiplier,
  obstacles
}: { 
  player: Player; 
  position: [number, number, number]; 
  index: number; 
  isLeading: boolean;
  onPositionUpdate?: (pos: THREE.Vector3) => void;
  initialVelocity?: [number, number, number];
  raceStartTime: number | null;
  speedMultiplier?: number;
  obstacles?: Array<{ z: number; type: string }>;
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

  // Continuous forward force and dynamic events
  useFrame((state, delta) => {
    if (!rigidBodyRef.current || !raceStartTime) return;

    const pos = rigidBodyRef.current.translation();
    const currentVel = rigidBodyRef.current.linvel();
    
    // Calculate effective speed multiplier (default 1.0, can be modified by events)
    let effectiveMultiplier = speedMultiplier || 1.0;
    
    // Check for obstacles at current position
    if (obstacles) {
      obstacles.forEach(obstacle => {
        const distanceToObstacle = Math.abs(pos.z - obstacle.z);
        if (distanceToObstacle < 0.5) {
          if (obstacle.type === 'bump') {
            // Bump obstacle - slight upward force
            rigidBodyRef.current.applyImpulse(new THREE.Vector3(0, 0.2, 0), true);
          } else if (obstacle.type === 'slow') {
            // Slow obstacle - reduce speed
            effectiveMultiplier *= 0.5;
          } else if (obstacle.type === 'boost') {
            // Boost obstacle - increase speed
            effectiveMultiplier *= 1.5;
          }
        }
      });
    }

    // Apply continuous forward force to keep marbles moving
    const targetSpeed = baseSpeedRef.current * effectiveMultiplier;
    const currentForwardSpeed = -currentVel.z; // Negative Z is forward
    
    if (currentForwardSpeed < targetSpeed) {
      // Apply forward force to maintain speed
      const forceNeeded = (targetSpeed - currentForwardSpeed) * 10; // Adjust multiplier for responsiveness
      rigidBodyRef.current.applyImpulse(new THREE.Vector3(0, 0, -forceNeeded * delta), true);
    }

    // Update position callback
    if (onPositionUpdate) {
      const now = state.clock.elapsedTime;
      // Update position at ~20fps to avoid too many callbacks
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
      restitution={0.5}
      friction={0.2}
      linearDamping={0.1}
      angularDamping={0.15}
      mass={1}
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

// Track Component - Straight track with obstacles
function Track({ obstacles }: { obstacles?: Array<{ z: number; type: string }> }) {
  const trackRef = useRef<THREE.Group>(null);
  const trackLength = 50;
  const trackWidth = 2;

  return (
    <group ref={trackRef}>
      {/* Track base - straight track with physics */}
      <RigidBody type="fixed" position={[0, 0, -trackLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <mesh receiveShadow>
          <boxGeometry args={[trackWidth, trackLength, 0.1]} />
          <meshStandardMaterial color="#2a2a2a" roughness={0.8} metalness={0.2} />
        </mesh>
      </RigidBody>
      
      {/* Track borders - visual */}
      <mesh position={[0, 0.05, -trackLength / 2]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <boxGeometry args={[trackWidth + 0.2, trackLength, 0.05]} />
        <meshStandardMaterial color="#ffffff" roughness={0.5} />
      </mesh>
      
      {/* Center line - dashed yellow */}
      <mesh position={[0, 0.06, -trackLength / 2]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[0.1, trackLength, 0.02]} />
        <meshStandardMaterial color="#fbbf24" roughness={0.3} />
      </mesh>

      {/* Track walls as colliders */}
      <RigidBody type="fixed" position={[trackWidth / 2 + 0.15, 0.3, -trackLength / 2]}>
        <mesh>
          <boxGeometry args={[0.3, 0.6, trackLength]} />
          <meshStandardMaterial color="#888888" visible={false} />
        </mesh>
      </RigidBody>
      <RigidBody type="fixed" position={[-trackWidth / 2 - 0.15, 0.3, -trackLength / 2]}>
        <mesh>
          <boxGeometry args={[0.3, 0.6, trackLength]} />
          <meshStandardMaterial color="#888888" visible={false} />
        </mesh>
      </RigidBody>
      
      {/* Obstacles - bumps, ramps, etc. */}
      {obstacles?.map((obstacle, i) => {
        if (obstacle.type === 'bump') {
          return (
            <RigidBody key={`obstacle-${i}`} type="fixed" position={[0, 0.15, obstacle.z]}>
              <mesh>
                <boxGeometry args={[trackWidth * 0.8, 0.1, 0.3]} />
                <meshStandardMaterial color="#ff6b6b" roughness={0.5} />
              </mesh>
            </RigidBody>
          );
        } else if (obstacle.type === 'ramp') {
          return (
            <RigidBody key={`obstacle-${i}`} type="fixed" position={[0, 0.1, obstacle.z]} rotation={[0, 0, Math.PI / 12]}>
              <mesh>
                <boxGeometry args={[trackWidth * 0.9, 0.1, 0.5]} />
                <meshStandardMaterial color="#4ecdc4" roughness={0.3} />
              </mesh>
            </RigidBody>
          );
        }
        return null;
      })}
      
      {/* Finish line */}
      <mesh position={[0, 0.05, -trackLength]} rotation={[-Math.PI / 2, 0, 0]}>
        <boxGeometry args={[trackWidth, 0.3, 0.1]} />
        <meshStandardMaterial color="#000000" />
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
        // Use VRF seed to determine initial velocity (deterministic but varied)
        const seedOffset = i * 8;
        const playerSeed = parseInt(vrfSeed.slice(seedOffset, seedOffset + 8) || '1', 16);
        const speed = 0.5 + ((playerSeed % 1000) / 1000) * 0.5; // 0.5 to 1.0
        velocities.set(player.id, [0, 0, -speed]); // Negative Z is forward
        speedMultipliersRef.current.set(player.id, 1.0);
      }
    });
    return velocities;
  }, [raceStartTime, vrfSeed, players]);

  // Generate obstacles based on VRF seed
  const obstacles = useMemo(() => {
    if (!vrfSeed) return [];
    const obs: Array<{ z: number; type: string }> = [];
    // Generate obstacles at various positions along the track
    for (let i = 0; i < 8; i++) {
      const seedOffset = (i + 20) * 4; // Use different part of seed
      const obstacleSeed = parseInt(vrfSeed.slice(seedOffset, seedOffset + 4) || '1', 16);
      const zPos = -5 - (i * 5); // Spread obstacles along track
      const typeSeed = obstacleSeed % 3;
      let type = 'bump';
      if (typeSeed === 1) type = 'ramp';
      else if (typeSeed === 2) type = 'slow';
      obs.push({ z: zPos, type });
    }
    return obs;
  }, [vrfSeed]);

  // Generate dynamic events (speed bursts, slowdowns) during race
  useEffect(() => {
    if (!raceStartTime || !vrfSeed) return;

    const eventInterval = setInterval(() => {
      const now = Date.now();
      const elapsed = (now - raceStartTime) / 1000; // seconds elapsed
      
      // Clear expired events
      eventTimersRef.current.forEach((event, playerId) => {
        if (now > event.endTime) {
          eventTimersRef.current.delete(playerId);
          speedMultipliersRef.current.set(playerId, 1.0);
        }
      });

      // Generate new events based on VRF seed + time
      players.forEach((player, i) => {
        if (!player.joined) return;
        if (eventTimersRef.current.has(player.id)) return; // Already has active event

        const seedOffset = (i * 12 + Math.floor(elapsed * 2)) % (vrfSeed.length - 8);
        const eventSeed = parseInt(vrfSeed.slice(seedOffset, seedOffset + 8) || '1', 16);
        const shouldTrigger = (eventSeed % 100) < 3; // 3% chance per check

        if (shouldTrigger) {
          const eventTypeSeed = eventSeed % 3;
          let type = 'boost';
          let multiplier = 1.5;
          let duration = 1000; // 1 second

          if (eventTypeSeed === 1) {
            type = 'slow';
            multiplier = 0.5;
            duration = 1500;
          } else if (eventTypeSeed === 2) {
            type = 'bump';
            multiplier = 0.8;
            duration = 800;
          }

          eventTimersRef.current.set(player.id, { type, endTime: now + duration });
          speedMultipliersRef.current.set(player.id, multiplier);
        }
      });
    }, 500); // Check every 500ms

    return () => clearInterval(eventInterval);
  }, [raceStartTime, vrfSeed, players]);

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

    // Calculate and report progress (0 to 1)
    if (positions.size > 0 && onProgressUpdate) {
      const maxZ = Math.max(...Array.from(positions.values()).map(p => Math.abs(p.z)));
      const progress = Math.min(maxZ / 50, 1); // Track length is 50
      onProgressUpdate(progress);
    }

    // Check for winner (marble past finish line)
    if (!winnerFoundRef.current) {
      positions.forEach((pos, playerId) => {
        if (pos.z < -48) {
          const winner = players.find(p => p.id === playerId);
          if (winner && raceStartTime) {
            winnerFoundRef.current = true;
            onRaceComplete(winner);
          }
        }
      });
    }
  };

  // Initialize marble positions at start line
  useEffect(() => {
    if (raceStartTime) {
      winnerFoundRef.current = false; // Reset winner flag
      const positions = new Map<number, THREE.Vector3>();
      players.forEach((player, i) => {
        if (player.joined) {
          const pos = new THREE.Vector3((i - 2) * 0.3, 0.2, 0);
          positions.set(player.id, pos);
          positionUpdates.current.set(player.id, pos);
        }
      });
      setMarblePositions(positions);
      setLeadingMarble(new THREE.Vector3(0, 0.2, 0));
    }
  }, [raceStartTime, players]);

  return (
    <div className="w-full h-full">
      <Canvas shadows>
        <Physics gravity={[0, -9.81, 0]}>
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
          
          {/* Environment for reflections */}
          <Environment preset="sunset" />
          
          {/* Ground plane */}
          <RigidBody type="fixed">
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, -25]} receiveShadow>
              <planeGeometry args={[50, 50]} />
              <meshStandardMaterial color="#1a1a1a" roughness={0.8} />
            </mesh>
          </RigidBody>

          {/* Track */}
          <Track obstacles={obstacles} />

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
                obstacles={obstacles}
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
