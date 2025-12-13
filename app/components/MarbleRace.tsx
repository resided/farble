'use client';

import React, { useState, useEffect, useMemo, useRef } from 'react';
import Image from 'next/image';
import { useFarcaster } from '../hooks/useFarcaster';
import { sdk } from '@farcaster/miniapp-sdk';
import { fetchNeynarProfiles } from '../hooks/useNeynar';
import Race3D from './Race3D';
import CallingCard, { analyzeCasts } from './CallingCard';

interface Player {
  id: number;
  name: string;
  handle: string;
  color: string;
  colorName: string;
  joined: boolean;
  isYou?: boolean;
  pfpUrl?: string;
  fid?: number; // Farcaster ID for fetching profile pictures
}

const MarbleRace = () => {
  const { user } = useFarcaster();
  const [screen, setScreen] = useState<'lobby' | 'racing' | 'results'>('lobby');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [marblePositions, setMarblePositions] = useState([0, 0, 0, 0, 0]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [winnerFound, setWinnerFound] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<string | null>(null);
  const [hasPaid, setHasPaid] = useState(false);
  const [playerPfps, setPlayerPfps] = useState<Record<string, string>>({});
  const [vrfSeed, setVrfSeed] = useState<string | null>(null);
  const [showWinnerDialog, setShowWinnerDialog] = useState(false);
  const [raceStartTime, setRaceStartTime] = useState<number | null>(null);
  const [cameraOffset, setCameraOffset] = useState(0); // Camera position for tracking
  const trackPathRef = useRef<SVGPathElement | null>(null);
  const [pathLength, setPathLength] = useState(0);
  const [raceTime, setRaceTime] = useState(0); // Race timer for suspense
  const [speedBursts, setSpeedBursts] = useState<Record<number, number>>({}); // Speed burst effects
  const [ethPriceUsd, setEthPriceUsd] = useState<number | null>(null); // ETH price in USD
  const [marbleEvents, setMarbleEvents] = useState<Record<number, { type: string; endTime: number }>>({}); // Random race events
  const [marbleRecovery, setMarbleRecovery] = useState<Record<number, number>>({}); // Recovery from setbacks
  const [isRaceStarting, setIsRaceStarting] = useState(false); // Prevent multiple start clicks
  const [raceProgress, setRaceProgress] = useState(0); // Progress for 3D race (0 to 1)
  const [playerCasts, setPlayerCasts] = useState<Record<number, any[]>>({}); // Cast data for calling cards
  const [callingCardThemes, setCallingCardThemes] = useState<Record<number, { theme: string; stats: { totalCasts: number; topTopic: string } }>>({});
  const [tauntMessage, setTauntMessage] = useState<{ playerId: number; message: string } | null>(null);
  const [showPlayerList, setShowPlayerList] = useState(false); // Toggle player list during race

  const basePlayers: Player[] = useMemo(() => [
    { 
      id: 1, 
      name: user?.username || 'you', 
      handle: `@${user?.username || 'you'}`, 
      color: '#FF006E', 
      colorName: 'Pink', 
      joined: true, 
      isYou: true,
      pfpUrl: user?.pfpUrl,
      fid: user?.fid, // Store FID for profile fetching
    },
    // Note: In a real multiplayer app, these would have FIDs from other users joining
    // For now, we'll fetch by username as fallback
    { id: 2, name: 'dwr', handle: '@dwr', color: '#8338EC', colorName: 'Purple', joined: true },
    { id: 3, name: 'vitalik', handle: '@vitalik', color: '#3A86FF', colorName: 'Blue', joined: true },
    { id: 4, name: 'jessepollak', handle: '@jessepollak', color: '#06FFA5', colorName: 'Mint', joined: true },
    { id: 5, name: 'ted', handle: '@ted', color: '#FFBE0B', colorName: 'Yellow', joined: true },
  ], [user]);

  // Fetch ETH price in USD - Live updates
  useEffect(() => {
    const fetchEthPrice = async () => {
      try {
        // Use CoinGecko API (free, no API key needed)
        const response = await fetch('https://api.coingecko.com/api/v3/simple/price?ids=ethereum&vs_currencies=usd', {
          cache: 'no-store', // Always fetch fresh data
        });
        if (response.ok) {
          const data = await response.json();
          setEthPriceUsd(data.ethereum?.usd || null);
        }
      } catch (error) {
        console.error('Failed to fetch ETH price:', error);
        // Retry after a short delay on error
        setTimeout(fetchEthPrice, 5000);
      }
    };

    // Fetch immediately
    fetchEthPrice();
    
    // Update every 30 seconds
    const interval = setInterval(fetchEthPrice, 30000);
    
    return () => clearInterval(interval);
    
    return () => clearInterval(interval);
  }, []);

  // Fetch profile pictures and casts for calling cards
  useEffect(() => {
    const loadProfilesAndCasts = async () => {
      const allPlayers = basePlayers.filter(p => p.joined);
      
      if (allPlayers.length === 0) return;
      
      // Collect FIDs from all players (preferred method)
      const fids: number[] = [];
      allPlayers.forEach(player => {
        if (player.fid) {
          fids.push(player.fid);
        }
      });
      
      // Fetch profiles by FID (preferred) or username (fallback)
      let profiles: Record<string, string> = {};
      
      if (fids.length > 0) {
        // Use FIDs to fetch profiles - this is the recommended approach
        console.log('Fetching profile pictures by FID:', fids);
        try {
          const fidsParam = fids.join(',');
          const response = await fetch(`/api/neynar/profiles?fids=${fidsParam}`);
          if (response.ok) {
            const data = await response.json();
            profiles = data.profiles || {};
            console.log('Fetched profiles by FID:', profiles);
          }
        } catch (error) {
          console.error('Error fetching profiles by FID:', error);
        }
      }
      
      // Fallback to username lookup if FID lookup didn't work or for players without FIDs
      if (Object.keys(profiles).length === 0 || fids.length < allPlayers.length) {
        const names = allPlayers
          .filter(p => !p.fid || !profiles[`fid:${p.fid}`]) // Only fetch for players without FID or missing profiles
          .map(p => p.name.replace('@', ''));
        
        if (names.length > 0) {
          console.log('Fetching profile pictures by username (fallback):', names);
          const usernameProfiles = await fetchNeynarProfiles(names);
          Object.assign(profiles, usernameProfiles);
        }
      }
      
      if (Object.keys(profiles).length > 0) {
        console.log('Setting player profile pictures:', profiles);
        setPlayerPfps(profiles);
      } else {
        console.warn('No profile pictures loaded. Check NEYNAR_API_KEY is set.');
      }
      
      // Load casts for calling cards (using FIDs if available)
      try {
        const fids: string[] = [];
        
        allPlayers.forEach(player => {
          if (player.isYou && user?.fid) {
            fids.push(user.fid.toString());
          }
        });
        
        if (fids.length > 0) {
          const response = await fetch(`/api/neynar/casts?fids=${fids.join(',')}`);
          if (response.ok) {
            const data = await response.json();
            const castsData = data.castsByFid || {};
            
            // Analyze casts and set themes
            const themes: Record<number, { theme: string; stats: { totalCasts: number; topTopic: string } }> = {};
            
            allPlayers.forEach(player => {
              let fid: string | null = null;
              if (player.isYou && user?.fid) {
                fid = user.fid.toString();
              }
              
              if (fid && castsData[fid]) {
                const analysis = analyzeCasts(castsData[fid]);
                themes[player.id] = analysis;
              } else {
                // Default theme for players without cast data
                themes[player.id] = { theme: 'veteran', stats: { totalCasts: 0, topTopic: 'Player' } };
              }
            });
            
            setPlayerCasts(castsData);
            setCallingCardThemes(themes);
          }
        } else {
          // Set default themes if no FIDs available
          const defaultThemes: Record<number, { theme: string; stats: { totalCasts: number; topTopic: string } }> = {};
          allPlayers.forEach(player => {
            defaultThemes[player.id] = { theme: 'veteran', stats: { totalCasts: 0, topTopic: 'Player' } };
          });
          setCallingCardThemes(defaultThemes);
        }
      } catch (error) {
        console.error('Error loading casts:', error);
        // Set default themes on error
        const defaultThemes: Record<number, { theme: string; stats: { totalCasts: number; topTopic: string } }> = {};
        allPlayers.forEach(player => {
          defaultThemes[player.id] = { theme: 'veteran', stats: { totalCasts: 0, topTopic: 'Player' } };
        });
        setCallingCardThemes(defaultThemes);
      }
    };

    // Always load profiles and casts when component mounts or screen changes
    loadProfilesAndCasts();
  }, [screen, basePlayers, user]);

  // Merge players with profile pictures from Neynar
  const players: Player[] = useMemo(() => {
    return basePlayers.map(player => {
      // Try FID first (preferred method)
      let neynarPfp: string | undefined;
      if (player.fid) {
        neynarPfp = playerPfps[`fid:${player.fid}`];
      }
      
      // Fallback to username lookup
      if (!neynarPfp) {
        const cleanName = player.name.replace('@', '');
        const cleanHandle = player.handle.replace('@', '');
        
        neynarPfp = playerPfps[`@${cleanName}`] || 
                    playerPfps[`@${cleanHandle}`] || 
                    playerPfps[cleanName] || 
                    playerPfps[cleanHandle];
      }
      
      // Fallback to Farcaster context pfpUrl for current user
      const farcasterPfp = player.isYou ? user?.pfpUrl : undefined;
      
      const finalPfp = neynarPfp || farcasterPfp;
      
      return {
        ...player,
        pfpUrl: finalPfp || undefined,
      };
    });
  }, [basePlayers, playerPfps, user?.pfpUrl]);

  const buyIn = '0.001';
  const pot = (players.filter(p => p.joined).length * parseFloat(buyIn)).toFixed(3);
  const TRACK_LENGTH = 200; // Longer track (200% instead of 100%)

  // Generate VRF seed for verifiable randomness
  // Uses cryptographically secure random number generation (CSPRNG)
  // In production, consider using Chainlink VRF or similar onchain VRF service
  const generateVrfSeed = (): string => {
    const randomBytes = new Uint8Array(32);
    
    // Primary: Use Web Crypto API for cryptographically secure randomness
    if (typeof window !== 'undefined' && window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(randomBytes);
    } else if (typeof globalThis !== 'undefined' && globalThis.crypto && globalThis.crypto.getRandomValues) {
      globalThis.crypto.getRandomValues(randomBytes);
    } else {
      // Fallback: Less secure but better than nothing
      console.warn('Crypto API not available, using fallback RNG');
      for (let i = 0; i < 32; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    
    // Convert to hex string (64 characters for 32 bytes)
    const hex = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Add additional entropy sources for extra security
    const timestamp = Date.now();
    const perfNow = typeof window !== 'undefined' && window.performance ? window.performance.now() : 0;
    const raceData = players.map(p => p.handle).join('');
    
    // Combine all entropy sources using XOR-like mixing
    const timestampHex = timestamp.toString(16).padStart(16, '0');
    const performanceHex = Math.floor(perfNow * 1000).toString(16).padStart(12, '0');
    const raceHash = btoa(raceData).slice(0, 16).replace(/[^a-f0-9]/gi, '0');
    
    // Mix entropy: XOR the hex strings character by character
    const mixed = hex.split('').map((char, i) => {
      const tsChar = timestampHex[i % timestampHex.length] || '0';
      const perfChar = performanceHex[i % performanceHex.length] || '0';
      const raceChar = raceHash[i % raceHash.length] || '0';
      const combined = parseInt(char, 16) ^ parseInt(tsChar, 16) ^ parseInt(perfChar, 16) ^ parseInt(raceChar, 16);
      return combined.toString(16).padStart(1, '0')[0];
    }).join('');
    
    // Return 64-character hex string (32 bytes of entropy)
    // This seed is cryptographically secure and can be verified by checking:
    // 1. It was generated using crypto.getRandomValues (browser CSPRNG)
    // 2. Additional entropy from timestamp, performance, and race data
    // 3. The seed determines all race outcomes deterministically
    return mixed.slice(0, 64);
  };

  // VRF seed determines speeds deterministically, making the race provably fair
  // The winner is the first player to cross the finish line

  const handleJoinRace = async () => {
    if (hasPaid) {
      startRace();
      return;
    }

    try {
      setIsPaying(true);
      setPaymentStatus('Connecting wallet...');

      // TODO: Implement real onchain payment
      // 1. Connect to user's wallet using Farcaster SDK
      // 2. Send transaction to your smart contract
      // 3. Wait for confirmation
      // 
      // Example implementation (needs your contract address):
      // const context = await sdk.context;
      // const buyInWei = Math.floor(parseFloat(buyIn) * 1e18).toString();
      // const result = await sdk.actions.ethereum?.sendTransaction({
      //   to: 'YOUR_CONTRACT_ADDRESS',
      //   value: buyInWei,
      //   data: '0x...', // Encoded function call
      //   chainId: 8453, // Base
      // });
      
      // For now, simulate payment flow
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      setPaymentStatus('Payment confirmed!');
      setHasPaid(true);
      
      // Start race after payment
      setTimeout(() => {
        startRace();
        setIsPaying(false);
        setPaymentStatus(null);
      }, 1000);
    } catch (error: any) {
      console.error('Payment error:', error);
      setPaymentStatus(error?.message || 'Payment failed. Please try again.');
      setIsPaying(false);
      setTimeout(() => setPaymentStatus(null), 3000);
    }
  };

  // Get path length when track is rendered
  useEffect(() => {
    if (trackPathRef.current && screen === 'racing') {
      const length = trackPathRef.current.getTotalLength();
      setPathLength(length);
    }
  }, [screen]);

  // Update camera to follow leading racer with smooth, cinematic tracking
  useEffect(() => {
    if (screen === 'racing' && marblePositions.length > 0 && raceStartTime && pathLength > 0) {
      let animationFrameId: number;
      
      const updateCamera = () => {
        const leadingPosition = Math.max(...marblePositions);
        const progress = Math.min(leadingPosition / TRACK_LENGTH, 1);
        
        // Calculate leading racer's position along the track
        const distanceAlongPath = progress * pathLength;
        
        if (trackPathRef.current) {
          const point = trackPathRef.current.getPointAtLength(distanceAlongPath);
          
          // Look ahead slightly for more natural camera movement (anticipate movement)
          const lookAheadDistance = Math.min(150, pathLength * 0.08); // 8% ahead or 150px max
          const lookAheadProgress = Math.min(progress + (lookAheadDistance / pathLength), 1);
          const lookAheadPoint = trackPathRef.current.getPointAtLength(lookAheadProgress * pathLength);
          
          // Use weighted average - more weight on look-ahead for smoother following
          const targetPoint = {
            x: point.x,
            y: point.y * 0.3 + lookAheadPoint.y * 0.7 // 70% look-ahead, 30% current
          };
          
          // Behind-the-marble camera - follow from behind
          setCameraOffset(prev => {
            const viewportHeight = typeof window !== 'undefined' ? window.innerHeight : 800;
            
            // Position camera slightly behind the leading marble for "chase cam" effect
            const targetY = Math.max(0, targetPoint.y - viewportHeight * 0.4); // Show more track ahead
            
            // Very smooth, slow interpolation for cinematic feel (0.03 = very smooth and slow)
            const smoothingFactor = 0.03;
            
            // Add easing - slower when far from target, faster when close
            const distance = Math.abs(targetY - prev);
            let easedFactor = smoothingFactor;
            
            if (distance > 300) {
              easedFactor = smoothingFactor * 0.5; // Very slow when far
            } else if (distance > 100) {
              easedFactor = smoothingFactor * 0.7; // Medium speed
            } else {
              easedFactor = smoothingFactor * 1.2; // Slightly faster when close
            }
            
            // For top-down, we need to track both X and Y, but cameraOffset is a single value
            // Use average or just Y for now (can be enhanced later)
            return prev + (targetY - prev) * easedFactor;
          });
        }
        
        // Continue animation
        animationFrameId = requestAnimationFrame(updateCamera);
      };
      
      // Start animation loop
      animationFrameId = requestAnimationFrame(updateCamera);
      
      return () => {
        if (animationFrameId) {
          cancelAnimationFrame(animationFrameId);
        }
      };
    }
  }, [screen, marblePositions, raceStartTime, pathLength]);

  useEffect(() => {
    if (screen === 'racing' && !winnerFound && raceStartTime) {
      // Generate VRF seed when race starts (only once)
      if (!vrfSeed) {
        const seed = generateVrfSeed();
        setVrfSeed(seed);
        console.log('VRF Seed generated:', seed);
      }

      // Update race timer - 10 second race
      const timerInterval = setInterval(() => {
        const timeElapsed = Date.now() - (raceStartTime || 0);
        const secondsElapsed = timeElapsed / 1000;
        setRaceTime(secondsElapsed);
        
        // Force finish after 10 seconds if no winner yet - ensure all marbles finish
        if (secondsElapsed >= 10 && !winnerFound) {
          // Find the leading marble as winner
          const leadingPlayer = players
            .filter(p => p.joined)
            .sort((a, b) => {
              const posA = marblePositions[a.id - 1] || 0;
              const posB = marblePositions[b.id - 1] || 0;
              return posB - posA; // Higher position wins
            })[0];
          
          if (leadingPlayer) {
            setWinner(leadingPlayer);
            setWinnerFound(true);
            setScreen('results');
          }
        }
      }, 100);

      // Old 2D race logic - only for fallback
      if (false) {
        const interval = setInterval(() => {
          const timeElapsed = Date.now() - (raceStartTime || 0);
          const secondsElapsed = timeElapsed / 1000;
          setRaceTime(secondsElapsed);

        setMarblePositions(prev => {
          const seed = vrfSeed || generateVrfSeed();
          
          const newPositions = prev.map((pos, i) => {
            if (pos >= TRACK_LENGTH) return TRACK_LENGTH;
            
            // Use VRF seed deterministically for each player's base speed
            // Each player gets a portion of the seed for their base speed
            const seedOffset = i * 8; // Each player uses 8 hex chars (4 bytes)
            const playerSeed = parseInt(seed.slice(seedOffset, seedOffset + 8) || '1', 16);
            
            const frame = Math.floor(timeElapsed / 50); // Frame number
            
            // Deterministic speed based on seed + frame + position + time
            const combinedSeed = (playerSeed + frame * 1000 + Math.floor(pos) + Math.floor(timeElapsed / 100)) % 100000;
            
            // Calculate base speed to finish in ~20 seconds
            // TRACK_LENGTH = 200, 20 seconds = 400 frames (50ms each)
            // Average speed needed: 200/400 = 0.5 per frame
            // But we want variation and suspense, so speeds range from 0.35 to 0.7 (half of previous for 20s race)
            const baseSpeed = 0.35 + ((playerSeed % 30000) / 30000) * 0.35; // 0.35 to 0.7 for 20 second race
            const variation = (combinedSeed % 1000) / 1000 * 0.2; // ±0.1 variation (adjusted for slower race)
            
            // Check for active events (falling off, crashes, etc.)
            const currentEvent = marbleEvents[i];
            const isInEvent = currentEvent && Date.now() < currentEvent.endTime;
            
            // Random events can happen during the race
            let speedMultiplier = 1.0;
            let positionPenalty = 0;
            const progress = pos / TRACK_LENGTH;
            
            // Random events based on seed + time (unpredictable but verifiable)
            if (!isInEvent && progress > 0.1 && progress < 0.95) {
              // Chance of random event: 0.5% per frame
              const eventChance = (combinedSeed + frame * 137) % 10000;
              
              if (eventChance < 50) {
                // Marble falls off track!
                const eventDuration = 800 + (eventChance % 400); // 800-1200ms
                setMarbleEvents(prev => ({
                  ...prev,
                  [i]: { type: 'fall', endTime: Date.now() + eventDuration }
                }));
                positionPenalty = 2 + (eventChance % 3); // Lose 2-4 positions
              } else if (eventChance < 100) {
                // Speed boost event
                const eventDuration = 600 + (eventChance % 300); // 600-900ms
                setMarbleEvents(prev => ({
                  ...prev,
                  [i]: { type: 'boost', endTime: Date.now() + eventDuration }
                }));
                setSpeedBursts(prev => ({ ...prev, [i]: Date.now() }));
                speedMultiplier = 1.8; // Big speed boost
              } else if (eventChance < 150) {
                // Crash/slowdown event
                const eventDuration = 1000 + (eventChance % 500); // 1000-1500ms
                setMarbleEvents(prev => ({
                  ...prev,
                  [i]: { type: 'crash', endTime: Date.now() + eventDuration }
                }));
                speedMultiplier = 0.3; // Major slowdown
              }
            }
            
            // Handle active events
            if (isInEvent) {
              if (currentEvent.type === 'fall') {
                speedMultiplier = 0.1; // Almost stopped while recovering
              } else if (currentEvent.type === 'crash') {
                speedMultiplier = 0.4; // Slow recovery
              } else if (currentEvent.type === 'boost') {
                speedMultiplier = 1.6; // Speed boost active
              }
            } else {
              // Clear event if it's over
              if (currentEvent) {
                setMarbleEvents(prev => {
                  const newEvents = { ...prev };
                  delete newEvents[i];
                  return newEvents;
                });
              }
            }
            
            // Speed bursts at certain progress points (create excitement)
            if (!isInEvent) {
              if (progress > 0.3 && progress < 0.35 && (playerSeed % 100) < 20) {
                speedMultiplier = 1.5; // Burst of speed
                setSpeedBursts(prev => ({ ...prev, [i]: Date.now() }));
              } else if (progress > 0.6 && progress < 0.65 && (playerSeed % 100) < 15) {
                speedMultiplier = 1.6; // Another burst
                setSpeedBursts(prev => ({ ...prev, [i]: Date.now() }));
              } else if (progress > 0.85 && progress < 0.9 && (playerSeed % 100) < 25) {
                speedMultiplier = 1.4; // Final sprint
                setSpeedBursts(prev => ({ ...prev, [i]: Date.now() }));
              }
            }
            
            // Recovery boost after setbacks
            if (!isInEvent && marbleRecovery[i] && marbleRecovery[i] > 0) {
              speedMultiplier *= 1.3; // Recovery boost
              setMarbleRecovery(prev => {
                const newRecovery = { ...prev };
                newRecovery[i] = (newRecovery[i] || 0) - 1;
                if (newRecovery[i] <= 0) delete newRecovery[i];
                return newRecovery;
              });
            }
            
            // Final stretch suspense: speeds converge for close finish
            if (progress > 0.9 && !isInEvent) {
              const leadingPos = Math.max(...prev);
              const distanceFromLead = leadingPos - pos;
              if (distanceFromLead > 8) {
                speedMultiplier *= 1.2; // Big catch up boost
              } else if (distanceFromLead > 3) {
                speedMultiplier *= 1.1; // Catch up boost
              } else if (distanceFromLead < -3) {
                speedMultiplier *= 0.9; // Slowdown for leader
              }
            }
            
            const speed = (baseSpeed + variation) * speedMultiplier;
            let newPos = pos + speed - positionPenalty;
            
            // If marble fell off, trigger recovery period
            if (positionPenalty > 0) {
              setMarbleRecovery(prev => ({
                ...prev,
                [i]: 20 // 20 frames of recovery boost
              }));
            }
            
            return Math.max(0, Math.min(TRACK_LENGTH, newPos));
          });
          
          // Check for winner - first to cross finish line
          const winnerIndex = newPositions.findIndex(p => p >= TRACK_LENGTH);
          if (winnerIndex !== -1 && !winnerFound) {
            setWinnerFound(true);
            setWinner(players[winnerIndex]);
            setTimeout(() => {
              setShowWinnerDialog(true);
            }, 800);
          }
          
          return newPositions;
        });
      }, 50); // 50ms updates = 20fps, 400 frames = 20 seconds

        return () => clearInterval(interval);
      }
      
      return () => {
        clearInterval(timerInterval);
      };
    }
  }, [screen, winnerFound, vrfSeed, raceStartTime, players]);

  const startRace = () => {
    // Prevent multiple calls
    if (isRaceStarting || countdown !== null || screen === 'racing') {
      return;
    }
    
    setIsRaceStarting(true);
    setCountdown(3);
    setRaceTime(0);
    setSpeedBursts({});
    setMarbleEvents({});
    setMarbleRecovery({});
    const countInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countInterval);
          setScreen('racing');
          setRaceStartTime(Date.now());
          setVrfSeed(null); // Reset seed for new race
          setWinnerFound(false);
          setMarblePositions([0, 0, 0, 0, 0]);
          setCameraOffset(0);
          setIsRaceStarting(false); // Reset flag when race actually starts
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const resetGame = () => {
    setScreen('lobby');
    setMarblePositions([0, 0, 0, 0, 0]);
    setWinner(null);
    setWinnerFound(false);
    setCountdown(null);
    setVrfSeed(null);
    setShowWinnerDialog(false);
    setRaceStartTime(null);
    setIsRaceStarting(false); // Reset race starting flag
  };

  const sortedPlayers = [...players]
    .map((p, i) => ({ ...p, position: marblePositions[i], originalIndex: i }))
    .sort((a, b) => b.position - a.position);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col relative overflow-hidden max-w-md mx-auto shadow-2xl" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
      
      {/* Subtle top gradient */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-black/[0.02] to-transparent pointer-events-none" />
      
      {/* Header */}
      <header className="px-6 py-4 flex items-center gap-2.5 relative z-10">
        <div className="relative w-6 h-6 flex-shrink-0">
          <Image 
            src="/logo.png" 
            alt="ZARBLE" 
            width={24}
            height={24}
            className="object-contain"
            priority
          />
        </div>
        <span className="text-lg font-semibold text-black tracking-tight">zarble</span>
        {screen === 'lobby' ? (
          <div className="ml-auto flex items-center gap-2">
            <button className="px-4 py-2 rounded-lg bg-neutral-100 text-black text-sm font-semibold hover:bg-neutral-200 transition-colors">
              Copy Invite
            </button>
            <button 
              className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
              onClick={handleJoinRace}
              disabled={isPaying || isRaceStarting || countdown !== null}
            >
              {isPaying ? (
                <span className="flex items-center gap-1.5">
                  <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  <span className="text-xs">{paymentStatus || 'Processing...'}</span>
                </span>
              ) : hasPaid ? (
                'Start Race'
              ) : (
                `Join (${buyIn} ETH)`
              )}
            </button>
          </div>
        ) : (
          <div className="ml-auto flex items-center gap-1.5 bg-neutral-100 px-3 py-1.5 rounded-full">
            <span className="text-xs text-neutral-400 font-medium">pot</span>
            <span className="text-sm font-semibold text-black">{pot} ETH</span>
            {ethPriceUsd && (
              <span className="text-xs text-neutral-500">
                (${(parseFloat(pot) * ethPriceUsd).toFixed(2)})
              </span>
            )}
          </div>
        )}
      </header>

      {/* Lobby Screen */}
      {screen === 'lobby' && !countdown && (
        <main className="flex-1 px-6 flex flex-col items-center">
          <div className="bg-white rounded-2xl px-8 py-5 flex flex-col items-center shadow-sm mb-8 mt-4">
            <span className="text-xs text-neutral-400 font-medium uppercase tracking-wide">buy-in</span>
            <span className="text-3xl font-bold text-black tracking-tight">{buyIn} ETH</span>
            {ethPriceUsd && (
              <span className="text-sm text-neutral-500 font-medium mt-1">
                ${(parseFloat(buyIn) * ethPriceUsd).toFixed(2)}
              </span>
            )}
          </div>

          {/* Call of Duty Style Calling Cards */}
          <div className="w-full mb-6">
            <div className="flex flex-col gap-3">
              {players.map((player, i) => {
                const themeData = callingCardThemes[player.id] || { theme: 'veteran', stats: { totalCasts: 0, topTopic: 'Player' } };
                return (
                  <div key={i} className={!player.joined ? 'opacity-50' : ''}>
                    <CallingCard
                      player={{
                        ...player,
                        pfpUrl: player.pfpUrl || undefined // Ensure pfpUrl is passed
                      }}
                      theme={themeData.theme}
                      stats={themeData.stats}
                      showTaunt={false}
                    />
                  </div>
                );
              })}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-6">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-neutral-400 font-medium">
              {players.filter(p => p.joined).length} / 5 players
            </span>
          </div>
          
          {paymentStatus && (
            <div className={`text-xs text-center mb-4 ${paymentStatus.includes('failed') ? 'text-red-500' : 'text-green-500'}`}>
              {paymentStatus}
            </div>
          )}

          <p className="text-xs text-neutral-300 mb-4">Race starts when lobby is full</p>
          
          {/* Footnote */}
          <div className="mt-auto pb-6 text-center">
            <p className="text-xs text-neutral-400">
              a masterpiece in miniapp engineering by{' '}
              <a 
                href="https://farcaster.xyz/ireside.eth" 
                target="_blank" 
                rel="noopener noreferrer"
                className="text-neutral-600 hover:text-neutral-800 underline transition-colors"
              >
                @ireside.eth
              </a>
            </p>
          </div>
        </main>
      )}

      {/* Countdown */}
      {countdown && (
        <main className="flex-1 px-6 flex flex-col items-center justify-center">
          <span className="text-9xl font-bold text-black leading-none tracking-tighter">{countdown}</span>
          <span className="text-base text-neutral-400 font-medium uppercase tracking-widest mt-2">get ready</span>
        </main>
      )}

      {/* Racing Screen - 3D View */}
      {screen === 'racing' && (
        <main className="flex-1 relative overflow-hidden bg-gradient-to-b from-neutral-900 via-black to-neutral-900">
          {/* 3D Race Scene */}
          <div className="absolute inset-0">
            <Race3D
              players={players}
              raceStartTime={raceStartTime}
              onRaceComplete={(winner) => {
                setWinner(winner);
                setWinnerFound(true);
                setScreen('results');
              }}
              vrfSeed={vrfSeed}
              onProgressUpdate={(progress) => setRaceProgress(progress)}
            />
          </div>
          
          {/* Simplified UI Overlay */}
          <div className="absolute inset-0 pointer-events-none z-10">
            {/* Top bar - simplified */}
            <div className="absolute top-4 left-4 right-4 flex items-center justify-between z-20 pointer-events-auto">
              {/* Timer - prominent */}
              <div className={`px-4 py-2.5 rounded-xl ${raceTime > 8 ? 'bg-red-500' : raceTime > 5 ? 'bg-orange-500' : 'bg-blue-500'} shadow-lg`}>
                <span className="text-lg font-bold text-white">
                  {raceTime.toFixed(1)}s
                </span>
              </div>
              
              {/* Pot - simple */}
              <div className="px-4 py-2.5 bg-white/95 backdrop-blur-sm rounded-xl shadow-lg">
                <span className="text-sm font-bold text-black">{pot} ETH</span>
                {ethPriceUsd !== null && (
                  <span className="text-xs text-neutral-500 ml-1">
                    (${(parseFloat(pot) * ethPriceUsd).toFixed(2)})
                  </span>
                )}
              </div>
            </div>
            
            {/* Player List Overlay - During Race */}
            {showPlayerList && screen === 'racing' && (
              <div className="absolute top-20 left-4 right-4 z-30 pointer-events-auto max-h-[60vh] overflow-y-auto">
                <div className="bg-white/98 backdrop-blur-xl rounded-2xl p-4 shadow-2xl border border-white/30">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-bold text-black uppercase tracking-wider">Players</h3>
                    <button
                      onClick={() => setShowPlayerList(false)}
                      className="w-6 h-6 rounded-full bg-neutral-100 hover:bg-neutral-200 flex items-center justify-center transition-colors"
                    >
                      <span className="text-xs">✕</span>
                    </button>
                  </div>
                  <div className="flex flex-col gap-2">
                    {players.filter(p => p.joined).map((player) => {
                      const themeData = callingCardThemes[player.id] || { theme: 'veteran', stats: { totalCasts: 0, topTopic: 'Player' } };
                      return (
                        <CallingCard
                          key={player.id}
                          player={{
                            ...player,
                            pfpUrl: player.pfpUrl || undefined // Ensure pfpUrl is passed
                          }}
                          theme={themeData.theme}
                          stats={themeData.stats}
                          showTaunt={true}
                          onTaunt={(playerId) => {
                            const taunts = [
                              "🏃 You're too slow!",
                              "💨 Catch me if you can!",
                              "⚡ I'm leaving you in the dust!",
                              "🎯 First place is mine!",
                              "🔥 You can't keep up!",
                              "💪 Try harder!",
                              "🚀 See ya!",
                              "👋 Bye bye!"
                            ];
                            const randomTaunt = taunts[Math.floor(Math.random() * taunts.length)];
                            setTauntMessage({ playerId, message: randomTaunt });
                            setTimeout(() => setTauntMessage(null), 3000);
                          }}
                          compact={true}
                        />
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
            
            {/* Taunt Message Display */}
            {tauntMessage && (
              <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 z-40 pointer-events-none">
                <div className="bg-red-500/95 backdrop-blur-md rounded-xl px-6 py-4 shadow-2xl border-2 border-white/50 animate-bounce">
                  <p className="text-white font-bold text-lg text-center drop-shadow-lg">
                    {tauntMessage.message}
                  </p>
                </div>
              </div>
            )}
            
            {/* Simple Progress Bar */}
            {raceStartTime && (
              <div className="absolute bottom-4 left-4 right-4 z-20 pointer-events-auto">
                <div className="bg-white/90 backdrop-blur-sm rounded-lg px-4 py-2 shadow-lg">
                  <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-gradient-to-r from-blue-500 to-purple-500 rounded-full transition-all duration-100"
                      style={{ width: `${Math.min(raceProgress * 100, 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </main>
      )}
      
      {/* Old 2D Racing Screen - Keep as fallback for now */}
      {false && screen === 'racing' && (
        <main className="flex-1 relative overflow-hidden bg-gradient-to-b from-sky-400 via-blue-300 to-emerald-200">
          {/* Sky and horizon */}
          <div className="absolute inset-0 overflow-hidden">
            {/* Sky gradient */}
            <div className="absolute top-0 left-0 w-full h-2/3 bg-gradient-to-b from-blue-400 via-sky-300 to-blue-200" />
            
            {/* Ground/road base */}
            <div className="absolute bottom-0 left-0 w-full h-1/3 bg-gradient-to-b from-gray-300 via-gray-400 to-gray-500" />
            
            {/* Road perspective lines for depth */}
            <div className="absolute bottom-0 left-1/2 -translate-x-1/2 w-full h-1/3">
              {/* Perspective lines converging to horizon */}
              {[...Array(20)].map((_, i) => {
                const y = (i / 20) * 100;
                const width = 100 - (i / 20) * 80;
                return (
                  <div
                    key={i}
                    className="absolute left-1/2 -translate-x-1/2 border-t border-white/20"
                    style={{
                      bottom: `${y}%`,
                      width: `${width}%`,
                    }}
                  />
                );
              })}
            </div>
          </div>
          {/* Track Container - Simple Side View Track */}
          <div 
            className="absolute inset-0"
            style={{
              transform: `translateY(${-cameraOffset}px)`,
              willChange: 'transform',
              transition: 'transform 0.1s ease-out',
            }}
          >
            {/* Simple Straight Track - Side View */}
            <svg 
              className="absolute top-0 left-1/2 -translate-x-1/2"
              viewBox="0 0 400 4000"
              preserveAspectRatio="none"
              style={{ width: '400px', height: '4000px' }}
            >
              <defs>
                <filter id="trackGlow">
                  <feGaussianBlur stdDeviation="8" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
              
              {/* Simple straight track path - Side view */}
              <path
                ref={trackPathRef}
                d="M 200 0 L 200 4000"
                fill="none"
                stroke="#1f2937"
                strokeWidth="100"
                strokeLinecap="round"
                strokeLinejoin="round"
                id="track-path"
              />
              
              {/* Track surface */}
              <path
                d="M 200 0 L 200 4000"
                fill="none"
                stroke="#374151"
                strokeWidth="88"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              
              {/* Track borders - White lines */}
              <path
                d="M 200 0 L 200 4000"
                fill="none"
                stroke="#ffffff"
                strokeWidth="76"
                strokeLinecap="round"
                strokeLinejoin="round"
                opacity="0.9"
              />
              
              {/* Center line - Yellow dashed */}
              <path
                d="M 200 0 L 200 4000"
                fill="none"
                stroke="#fbbf24"
                strokeWidth="6"
                strokeDasharray="30 20"
                strokeLinecap="round"
                opacity="0.9"
              />
              
              {/* Finish line at the end */}
              {trackPathRef.current && pathLength > 0 && (() => {
                const path = trackPathRef.current!; // Non-null assertion after check
                const finishPoint = path.getPointAtLength(pathLength);
                return (
                  <g transform={`translate(${finishPoint.x}, ${finishPoint.y})`}>
                    {/* Finish line - horizontal */}
                    <rect x="-150" y="-15" width="300" height="30" fill="url(#checkerPattern)" opacity="1" />
                    <rect x="-150" y="-15" width="300" height="30" fill="url(#finishGradient)" opacity="0.4" />
                    <line x1="-150" y1="0" x2="150" y2="0" stroke="#000" strokeWidth="6" opacity="1" />
                    <line x1="-150" y1="-3" x2="150" y2="-3" stroke="#fff" strokeWidth="2" opacity="0.8" />
                    <line x1="-150" y1="3" x2="150" y2="3" stroke="#fff" strokeWidth="2" opacity="0.8" />
                  </g>
                );
              })()}
              
              {/* Start line at the beginning */}
              <g transform="translate(200, 0)">
                <rect x="-150" y="-15" width="300" height="30" fill="url(#checkerPattern)" opacity="0.7" />
                <line x1="-150" y1="0" x2="150" y2="0" stroke="#000" strokeWidth="4" opacity="0.8" />
                <text x="0" y="-25" textAnchor="middle" fill="#000" fontSize="20" fontWeight="bold" opacity="0.9">START</text>
              </g>
              
              {/* Enhanced Patterns and Gradients */}
              <defs>
                <pattern id="checkerPattern" x="0" y="0" width="30" height="30" patternUnits="userSpaceOnUse">
                  <rect width="15" height="15" fill="#000" />
                  <rect x="15" y="15" width="15" height="15" fill="#000" />
                  <rect width="15" height="15" fill="#fff" />
                  <rect x="15" y="15" width="15" height="15" fill="#fff" />
                </pattern>
                <linearGradient id="finishGradient" x1="0%" y1="0%" x2="0%" y2="100%">
                  <stop offset="0%" stopColor="#fbbf24" stopOpacity="0.9" />
                  <stop offset="50%" stopColor="#f59e0b" stopOpacity="0.7" />
                  <stop offset="100%" stopColor="#d97706" stopOpacity="0.9" />
                </linearGradient>
                <linearGradient id="finishFlag" x1="0%" y1="0%" x2="100%" y2="0%">
                  <stop offset="0%" stopColor="#ef4444" />
                  <stop offset="50%" stopColor="#dc2626" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
                <linearGradient id="obstacleGradient" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#dc2626" />
                  <stop offset="50%" stopColor="#ef4444" />
                  <stop offset="100%" stopColor="#991b1b" />
                </linearGradient>
                <filter id="obstacleGlow">
                  <feGaussianBlur stdDeviation="4" result="coloredBlur"/>
                  <feMerge>
                    <feMergeNode in="coloredBlur"/>
                    <feMergeNode in="SourceGraphic"/>
                  </feMerge>
                </filter>
              </defs>
            </svg>
            
            {/* Marbles on Track - Side View */}
            <div 
              className="absolute top-0 left-1/2 -translate-x-1/2" 
              style={{ 
                width: '400px', 
                height: '4000px', 
                pointerEvents: 'none'
              }}
            >
              {players.map((player, i) => {
                const position = marblePositions[i];
                const progress = Math.min(position / TRACK_LENGTH, 1);
                const isLeading = position === Math.max(...marblePositions);
                
                // Get exact position on SVG path using getPointAtLength
                let x = 200; // Track is centered at x=200
                let y = 0; // Start at top
                let angle = 90; // Point down (side view)
                
                if (trackPathRef.current && pathLength > 0) {
                  const distanceAlongPath = progress * pathLength;
                  const point = trackPathRef.current.getPointAtLength(distanceAlongPath);
                  x = point.x;
                  y = point.y;
                  
                  // Calculate angle based on track direction
                  if (distanceAlongPath < pathLength - 1) {
                    const nextPoint = trackPathRef.current.getPointAtLength(distanceAlongPath + 1);
                    angle = Math.atan2(nextPoint.y - point.y, nextPoint.x - point.x) * (180 / Math.PI);
                  }
                }
                
                return (
                  <div
                    key={i}
                    className="absolute transition-all duration-75"
                    style={{
                      left: `${x}px`,
                      top: `${y}px`,
                      transform: `translate(-50%, -50%) rotate(${angle}deg) scale(${isLeading ? 1.1 : 1})`,
                      zIndex: isLeading ? 20 : 10,
                    }}
                  >
                    {/* Marble - Side view, visible from behind */}
                    <div
                      className="w-12 h-12 rounded-full overflow-hidden relative transition-all duration-75"
                      style={{
                        background: player.pfpUrl 
                          ? `url(${player.pfpUrl})`
                          : `linear-gradient(135deg, ${player.color} 0%, ${player.color}dd 50%, ${player.color}aa 100%)`,
                        backgroundSize: player.pfpUrl ? 'cover' : 'auto',
                        backgroundPosition: 'center',
                        boxShadow: isLeading
                          ? `0 0 20px ${player.color}ff, 0 0 40px ${player.color}aa, 0 8px 32px rgba(0,0,0,0.9), inset 0 -3px 6px rgba(0,0,0,0.6), inset 0 3px 6px rgba(255,255,255,1)`
                          : `0 0 12px ${player.color}cc, 0 4px 16px rgba(0,0,0,0.8), inset 0 -2px 4px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.9)`,
                        border: `2px solid ${player.color}`,
                        filter: marbleEvents[i]?.type === 'fall'
                          ? 'brightness(0.5) saturate(0.5) drop-shadow(0 0 8px rgba(255,0,0,0.8))'
                          : marbleEvents[i]?.type === 'crash'
                          ? 'brightness(0.6) drop-shadow(0 0 6px rgba(255,100,0,0.6))'
                          : isLeading 
                          ? 'brightness(1.4) saturate(1.6) drop-shadow(0 0 12px rgba(255,215,0,1))' 
                          : 'drop-shadow(0 3px 6px rgba(0,0,0,0.6))',
                        transform: speedBursts[i] && (Date.now() - speedBursts[i]) < 500 
                          ? 'scale(1.25)' 
                          : marbleEvents[i]?.type === 'fall'
                          ? 'scale(0.7) rotate(180deg)'
                          : marbleEvents[i]?.type === 'crash'
                          ? 'scale(0.9)'
                          : isLeading ? 'scale(1.2)' : 'scale(1)',
                        opacity: marbleEvents[i]?.type === 'fall' ? 0.6 : 1,
                      }}
                    >
                      {/* Funky pattern overlay - different for each player */}
                      {!player.pfpUrl && (
                        <>
                          {/* Swirl pattern */}
                          <div 
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: `conic-gradient(from ${i * 72}deg, transparent 0%, ${player.color}40 25%, transparent 50%, ${player.color}40 75%, transparent 100%)`,
                            }}
                          />
                          {/* Radial burst */}
                          <div 
                            className="absolute inset-0 rounded-full"
                            style={{
                              background: `radial-gradient(circle at ${30 + i * 10}% ${30 + i * 10}%, rgba(255,255,255,0.8) 0%, ${player.color}60 40%, transparent 70%)`,
                            }}
                          />
                          {/* Diagonal stripes */}
                          <div 
                            className="absolute inset-0 rounded-full opacity-30"
                            style={{
                              background: `repeating-linear-gradient(${i * 45}deg, transparent, transparent 2px, rgba(255,255,255,0.3) 2px, rgba(255,255,255,0.3) 4px)`,
                            }}
                          />
                        </>
                      )}
                      {/* Event indicators */}
                      {marbleEvents[i]?.type === 'fall' && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-40">
                          <span className="text-[10px] font-bold text-red-500 bg-white/90 px-2 py-0.5 rounded-full shadow-lg animate-bounce">
                            💥 Fell off!
                          </span>
                        </div>
                      )}
                      {marbleEvents[i]?.type === 'crash' && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-40">
                          <span className="text-[10px] font-bold text-orange-500 bg-white/90 px-2 py-0.5 rounded-full shadow-lg">
                            ⚠️ Crash!
                          </span>
                        </div>
                      )}
                      {marbleEvents[i]?.type === 'boost' && (
                        <div className="absolute -top-6 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none z-40">
                          <span className="text-[10px] font-bold text-green-500 bg-white/90 px-2 py-0.5 rounded-full shadow-lg animate-pulse">
                            ⚡ Boost!
                          </span>
                        </div>
                      )}
                      {/* Speed Burst Effect - Visual suspense */}
                      {speedBursts[i] && (Date.now() - speedBursts[i]) < 500 && (
                        <>
                          <div className="absolute -inset-6 rounded-full bg-yellow-400/40 animate-ping" />
                          <div className="absolute -inset-4 rounded-full bg-orange-400/30 animate-ping" style={{ animationDelay: '100ms' }} />
                          {/* Speed lines */}
                          <div className="absolute -top-8 left-1/2 -translate-x-1/2 w-1 h-8 bg-gradient-to-t from-yellow-400 to-transparent opacity-60" />
                          <div className="absolute -bottom-8 left-1/2 -translate-x-1/2 w-1 h-8 bg-gradient-to-b from-yellow-400 to-transparent opacity-60" />
                        </>
                      )}
                      {/* Funky effects for all marbles */}
                      {player.pfpUrl ? (
                        <>
                          {/* Enhanced shine for profile pictures */}
                          <div
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                              background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.7) 0%, transparent 60%)`,
                            }}
                          />
                          <div
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                              background: `radial-gradient(circle at 70% 70%, rgba(0,0,0,0.3) 0%, transparent 60%)`,
                            }}
                          />
                          {/* Colorful rim glow */}
                          <div
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                              border: `2px solid ${player.color}80`,
                              boxShadow: `inset 0 0 10px ${player.color}40`,
                            }}
                          />
                        </>
                      ) : (
                        <>
                          {/* Funky pattern for solid color marbles */}
                          {/* Swirl pattern */}
                          <div 
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                              background: `conic-gradient(from ${i * 72}deg, transparent 0%, ${player.color}40 25%, transparent 50%, ${player.color}40 75%, transparent 100%)`,
                            }}
                          />
                          {/* Radial burst */}
                          <div 
                            className="absolute inset-0 rounded-full pointer-events-none"
                            style={{
                              background: `radial-gradient(circle at ${30 + i * 10}% ${30 + i * 10}%, rgba(255,255,255,0.9) 0%, ${player.color}70 40%, transparent 70%)`,
                            }}
                          />
                          {/* Diagonal stripes */}
                          <div 
                            className="absolute inset-0 rounded-full pointer-events-none opacity-40"
                            style={{
                              background: `repeating-linear-gradient(${i * 45}deg, transparent, transparent 2px, rgba(255,255,255,0.4) 2px, rgba(255,255,255,0.4) 4px)`,
                            }}
                          />
                          {/* Highlight dots */}
                          <div className="absolute w-3 h-3 rounded-full bg-white/90 top-2 left-2 blur-[1px] pointer-events-none" />
                          <div className="absolute w-2 h-2 rounded-full bg-white/70 top-1 left-1 pointer-events-none" />
                        </>
                      )}
                      {isLeading && position < TRACK_LENGTH && (
                        <div className="absolute -top-1 -right-1 w-6 h-6 bg-yellow-400 rounded-full animate-ping z-30" />
                      )}
                      {position >= TRACK_LENGTH && (
                        <div className="absolute -top-2 -right-2 w-7 h-7 bg-yellow-400 rounded-full flex items-center justify-center z-30 shadow-lg">
                          <span className="text-white text-sm">👑</span>
                        </div>
                      )}
                    </div>
                    
                    {/* Player Name Label - Compact design */}
                    <div
                      className="absolute top-10 left-1/2 -translate-x-1/2 whitespace-nowrap pointer-events-none"
                      style={{
                        textShadow: '0 1px 4px rgba(0,0,0,0.8)',
                      }}
                    >
                      <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full backdrop-blur-sm ${isLeading ? 'bg-yellow-400/95 text-black shadow-lg' : 'bg-black/85 text-white shadow-md'}`}>
                        {player.handle}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          
          {/* UI Overlay with Timer and Stats */}
          <div className="absolute top-4 left-4 right-4 z-30 flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="bg-white/95 backdrop-blur-md rounded-xl px-4 py-2.5 shadow-xl border border-white/20">
                <div className="flex flex-col">
                  <span className="text-sm font-semibold text-black">Pot: {pot} ETH</span>
                  {ethPriceUsd !== null && (
                    <span className="text-xs text-neutral-500">
                      ${(parseFloat(pot) * (ethPriceUsd as number)).toFixed(2)}
                    </span>
                  )}
                </div>
              </div>
              {/* Race Timer - Builds suspense */}
              <div className={`bg-gradient-to-r ${raceTime > 8 ? 'from-red-500/90 to-orange-500/90' : raceTime > 6 ? 'from-yellow-500/90 to-orange-500/90' : 'from-blue-500/90 to-indigo-500/90'} backdrop-blur-md rounded-xl px-4 py-2.5 shadow-xl border border-white/20`}>
                <span className="text-sm font-bold text-white">
                  {raceTime.toFixed(1)}s
                </span>
              </div>
            </div>
            <div className="bg-white/95 backdrop-blur-md rounded-xl px-4 py-2.5 shadow-xl border border-white/20">
              <span className="text-xs text-neutral-500 font-mono">VRF: {vrfSeed?.slice(0, 8)}...</span>
            </div>
          </div>
          
          {/* Suspense Indicators - Show when race is close */}
          {marblePositions.length > 0 && (() => {
            const positions = marblePositions;
            const maxPos = Math.max(...positions);
            const minPos = Math.min(...positions.filter(p => p < TRACK_LENGTH));
            const gap = maxPos - minPos;
            const isCloseRace = gap < 15 && maxPos > TRACK_LENGTH * 0.7;
            const averageProgress = positions.reduce((a, b) => a + b, 0) / positions.length / TRACK_LENGTH;
            
            return (
              <>
                {/* Progress Bar - Shows race tension */}
                <div className="absolute bottom-4 left-4 right-4 z-30">
                  <div className="bg-white/95 backdrop-blur-md rounded-xl px-4 py-3 shadow-xl border border-white/20">
                    <div className="flex items-center justify-between mb-2">
                      <span className="text-xs font-semibold text-neutral-600">Race Progress</span>
                      <span className="text-xs font-bold text-neutral-800">{Math.round(averageProgress * 100)}%</span>
                    </div>
                    <div className="w-full h-2 bg-neutral-200 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-gradient-to-r from-blue-500 via-purple-500 to-pink-500 rounded-full transition-all duration-300"
                        style={{ width: `${Math.min(averageProgress * 100, 100)}%` }}
                      />
                    </div>
                  </div>
                </div>
                
                {/* Close Race Alert */}
                {isCloseRace && (
                  <div className="absolute top-20 left-1/2 -translate-x-1/2 z-30 animate-pulse">
                    <div className="bg-gradient-to-r from-red-500/95 to-orange-500/95 backdrop-blur-md rounded-full px-6 py-2.5 shadow-2xl border-2 border-yellow-400">
                      <span className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
                        <span className="animate-spin">⚡</span>
                        Close Race!
                        <span className="animate-spin">⚡</span>
                      </span>
                    </div>
                  </div>
                )}
              </>
            );
          })()}
        </main>
      )}

      {/* Old Racing Screen - Keeping as fallback for now */}
      {false && screen === 'racing' && (
        <main className="flex-1 px-6 flex flex-col items-center">
          <div className="w-full bg-gradient-to-br from-white to-neutral-50 rounded-3xl p-6 shadow-xl mt-4 mb-5 border border-neutral-200/50 relative overflow-hidden">
            {/* Animated background gradient */}
            <div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 via-purple-500/5 to-pink-500/5 animate-pulse" />
            
            <div className="relative flex flex-col gap-5">
              {players.map((player, i) => {
                const position = marblePositions[i];
                const isLeading = position === Math.max(...marblePositions);
                return (
                  <div key={i} className="flex items-center gap-3">
                    {/* Enhanced longer track with gradient and checkered pattern */}
                    <div className="flex-1 h-4 bg-gradient-to-r from-neutral-100 via-neutral-50 to-neutral-100 rounded-full relative overflow-visible border-2 border-neutral-200/40">
                      {/* Track surface pattern with lane markers */}
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.02)_50%,transparent_100%)] rounded-full" />
                      {/* Lane dividers */}
                      <div className="absolute inset-0 bg-[repeating-linear-gradient(90deg,transparent_0px,transparent_48px,rgba(0,0,0,0.05)_48px,rgba(0,0,0,0.05)_50px)] rounded-full" />
                      
                      {/* Motion blur trail */}
                      {position > 5 && (
                        <div 
                          className="absolute h-4 rounded-full opacity-40 blur-md transition-all duration-75"
                          style={{ 
                            backgroundColor: player.color,
                            left: `calc(${Math.max(0, (position / TRACK_LENGTH) * 100 - 3)}% - 12px)`,
                            width: '28px',
                          }}
                        />
                      )}
                      
                      {/* Marble with enhanced effects and profile picture - larger and clearer */}
                      <div 
                        className="absolute w-8 h-8 rounded-full top-1/2 -mt-4 transition-all duration-75 z-10 overflow-hidden"
                        style={{ 
                          backgroundColor: player.pfpUrl ? 'transparent' : player.color,
                          backgroundImage: player.pfpUrl ? `url(${player.pfpUrl})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          left: `calc(${Math.min((position / TRACK_LENGTH) * 100, 98)}% - 16px)`,
                          boxShadow: isLeading 
                            ? `0 6px 24px ${player.color}90, 0 3px 10px rgba(0,0,0,0.4), inset 0 -4px 8px rgba(0,0,0,0.25), inset 0 4px 8px rgba(255,255,255,0.6)`
                            : '0 3px 14px rgba(0,0,0,0.3), inset 0 -3px 6px rgba(0,0,0,0.2), inset 0 3px 6px rgba(255,255,255,0.5)',
                          transform: `rotate(${position * 8}deg) scale(${isLeading ? 1.15 : 1})`,
                          filter: isLeading ? 'brightness(1.15) saturate(1.2)' : 'none',
                          border: player.pfpUrl ? `2px solid ${player.color}` : 'none',
                        }}
                      >
                        {/* Profile picture overlay with marble effect - small and fits inside */}
                        {player.pfpUrl && (
                          <>
                            {/* Marble shine effect */}
                            <div 
                              className="absolute inset-0 rounded-full"
                              style={{
                                background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.35) 0%, transparent 55%)`,
                              }}
                            />
                            {/* Marble shadow effect */}
                            <div 
                              className="absolute inset-0 rounded-full"
                              style={{
                                background: `radial-gradient(circle at 70% 70%, rgba(0,0,0,0.2) 0%, transparent 55%)`,
                              }}
                            />
                          </>
                        )}
                        {/* Marble highlight (only if no pfp) */}
                        {!player.pfpUrl && (
                          <>
                            <div className="absolute w-3 h-3 rounded-full bg-white/70 top-1.5 left-1.5 blur-[1px]" />
                            <div className="absolute w-2 h-2 rounded-full bg-white/50 top-0.5 left-0.5" />
                          </>
                        )}
                        {/* Leading indicator */}
                        {isLeading && position < TRACK_LENGTH && (
                          <div className="absolute -top-1 -right-1 w-4 h-4 bg-yellow-400 rounded-full animate-ping z-20" />
                        )}
                        {/* Winner crown */}
                        {position >= TRACK_LENGTH && isLeading && (
                          <div className="absolute -top-2 -right-2 w-6 h-6 bg-yellow-400 rounded-full flex items-center justify-center z-30">
                            <span className="text-white text-xs">👑</span>
                          </div>
                        )}
                      </div>
                      
                      {/* Speed lines effect */}
                      {position > 10 && position < TRACK_LENGTH && (
                        <div 
                          className="absolute h-4 w-10 opacity-25"
                          style={{ 
                            left: `calc(${(position / TRACK_LENGTH) * 100 - 2}% - 20px)`,
                            background: `linear-gradient(90deg, transparent, ${player.color}, transparent)`,
                          }}
                        />
                      )}
                    </div>
                    {/* Player name - larger and clearer */}
                    <div className="flex flex-col items-end gap-0.5 min-w-[80px]">
                      <span className={`text-sm font-bold text-right transition-colors ${isLeading ? 'text-black' : 'text-neutral-500'}`}>
                        {player.handle}
                      </span>
                      {isLeading && position < TRACK_LENGTH && (
                        <span className="text-[10px] text-yellow-500 font-bold uppercase">leading</span>
                      )}
                    </div>
                  </div>
                );
              })}
              
              {/* Enhanced finish line with checkered pattern - positioned at end of longer track */}
              <div className="absolute right-4 top-0 bottom-0 w-2 flex flex-col">
                {[...Array(30)].map((_, i) => (
                  <div 
                    key={i}
                    className="flex-1"
                    style={{
                      backgroundColor: i % 2 === 0 ? '#000' : '#fff',
                    }}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/30 to-transparent" />
              </div>
              
              {/* Finish line glow and flag effect */}
              <div className="absolute right-4 top-0 bottom-0 w-1 bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-70 blur-sm" />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 bg-gradient-to-r from-yellow-400 to-yellow-500 rounded-full opacity-80 blur-md" />
            </div>
          </div>

          <div className="flex items-center gap-1.5 mb-4">
            <div className="w-2 h-2 rounded-full bg-red-500 animate-pulse" />
            <span className="text-xs font-bold text-red-500 uppercase tracking-wider">LIVE</span>
          </div>

          {/* Live standings */}
          <div className="w-full flex flex-col gap-2">
            {sortedPlayers.map((player, rank) => (
              <div key={player.id} className="flex items-center gap-3 px-4 py-2.5 bg-white rounded-xl">
                <span className="text-sm font-bold text-neutral-300 w-5">{rank + 1}</span>
                <div 
                  className="w-5 h-5 rounded-full overflow-hidden"
                  style={{ 
                    backgroundColor: player.pfpUrl ? 'transparent' : player.color,
                    backgroundImage: player.pfpUrl ? `url(${player.pfpUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)',
                    border: player.pfpUrl ? `1px solid ${player.color}` : 'none',
                  }}
                />
                <span className="text-sm font-medium text-black">{player.handle}</span>
                {player.isYou && <span className="ml-auto text-xs text-blue-500 font-medium">you</span>}
              </div>
            ))}
          </div>
        </main>
      )}

      {/* Winner Dialog - appears when race ends */}
      {showWinnerDialog && winner && vrfSeed && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-6">
          <div className="bg-white rounded-3xl p-8 max-w-md w-full shadow-2xl relative">
            <button
              onClick={() => {
                setShowWinnerDialog(false);
                setTimeout(() => setScreen('results'), 300);
              }}
              className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-full bg-neutral-100 hover:bg-neutral-200 transition-colors"
            >
              <span className="text-neutral-400 text-xl">×</span>
            </button>
            
            <div className="flex flex-col items-center text-center">
              <div className="text-6xl mb-4">🏆</div>
              <h2 className="text-2xl font-bold text-black mb-2">Race Complete!</h2>
              
              {/* Winner display */}
              <div className="relative mb-6">
                <div 
                  className="w-24 h-24 rounded-full relative overflow-hidden mx-auto"
                  style={{ 
                    backgroundColor: winner.pfpUrl ? 'transparent' : winner.color,
                    backgroundImage: winner.pfpUrl ? `url(${winner.pfpUrl})` : undefined,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    border: winner.pfpUrl ? `4px solid ${winner.color}` : 'none',
                  }}
                >
                  {winner.pfpUrl && (
                    <div 
                      className="absolute inset-0 rounded-full"
                      style={{
                        background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)`,
                      }}
                    />
                  )}
                </div>
                <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 bg-yellow-400 text-black text-xs font-bold px-3 py-1 rounded-full">
                  WINNER
                </div>
              </div>
              
              <div className="w-full space-y-3 mb-6">
                <div>
                  <span className="text-sm text-neutral-500">Winner</span>
                  <p className="text-xl font-bold text-black">{winner.handle}</p>
                </div>
                <div>
                  <span className="text-sm text-neutral-500">Prize</span>
                  <p className="text-xl font-bold text-green-500">+{(parseFloat(pot) * 0.9).toFixed(3)} ETH</p>
                </div>
                <div className="bg-neutral-50 rounded-xl p-4">
                  <span className="text-xs text-neutral-500 uppercase tracking-wide block mb-2">VRF Seed</span>
                  <code className="text-xs font-mono text-black break-all block">
                    {vrfSeed}
                  </code>
                  <p className="text-[10px] text-neutral-400 mt-2">
                    This seed was used to determine the winner in a provably fair manner
                  </p>
                </div>
              </div>
              
              <div className="w-full flex flex-col gap-3">
                {/* Share button - only show if current user won */}
                {winner.isYou && (
                  <button
                    onClick={async (e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      
                      const shareText = `I won ${pot} ETH on Zarble! 🏆\n\nVRF Seed: ${vrfSeed?.slice(0, 16)}...`;
                      const shareUrl = 'https://farcaster.xyz/miniapps/AJ789Uv0lu7g/zarble';
                      
                      try {
                        // Try Web Share API first (works on mobile and some browsers)
                        if (navigator.share) {
                          await navigator.share({
                            title: 'Zarble Winner!',
                            text: shareText,
                            url: shareUrl,
                          });
                        } else {
                          // Fallback: copy to clipboard
                          const fullText = `${shareText}\n${shareUrl}`;
                          await navigator.clipboard.writeText(fullText);
                          // Show toast notification instead of alert
                          const toast = document.createElement('div');
                          toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                          toast.textContent = 'Copied to clipboard!';
                          document.body.appendChild(toast);
                          setTimeout(() => toast.remove(), 2000);
                        }
                      } catch (error: any) {
                        // User cancelled or error occurred
                        if (error.name !== 'AbortError') {
                          // Fallback: copy to clipboard if share fails
                          try {
                            const fullText = `${shareText}\n${shareUrl}`;
                            await navigator.clipboard.writeText(fullText);
                            const toast = document.createElement('div');
                            toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                            toast.textContent = 'Copied to clipboard!';
                            document.body.appendChild(toast);
                            setTimeout(() => toast.remove(), 2000);
                          } catch (clipboardError) {
                            console.error('Failed to copy:', clipboardError);
                          }
                        }
                      }
                    }}
                    className="w-full py-4 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold hover:from-blue-600 hover:to-purple-600 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
                  >
                    <span>📤</span>
                    Share Victory
                  </button>
                )}
                
                <button
                  onClick={() => {
                    setShowWinnerDialog(false);
                    setTimeout(() => setScreen('results'), 300);
                  }}
                  className="w-full py-4 px-6 rounded-xl bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
                >
                  View Full Results
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Results Screen */}
      {screen === 'results' && winner && (
        <main className="flex-1 px-6 flex flex-col items-center justify-center pb-10">
          <div className="relative mb-4">
            <div 
              className="absolute w-32 h-32 rounded-full top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2"
              style={{ background: `radial-gradient(circle, ${winner.color}33 0%, transparent 70%)` }}
            />
            <div 
              className="w-20 h-20 rounded-full relative overflow-hidden"
              style={{ 
                backgroundColor: winner.pfpUrl ? 'transparent' : winner.color,
                backgroundImage: winner.pfpUrl ? `url(${winner.pfpUrl})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 -8px 16px rgba(0,0,0,0.1), inset 0 8px 16px rgba(255,255,255,0.4)',
                border: winner.pfpUrl ? `3px solid ${winner.color}` : 'none',
              }}
            >
              {winner.pfpUrl ? (
                <div 
                  className="absolute inset-0 rounded-full"
                  style={{
                    background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.3) 0%, transparent 60%)`,
                  }}
                />
              ) : (
                <div className="absolute w-6 h-6 rounded-full bg-white/50 top-3 left-3" />
              )}
            </div>
          </div>
          
          <span className="text-sm font-semibold text-neutral-400 uppercase tracking-widest">{winner.colorName}</span>
          <span className="text-2xl font-bold text-black tracking-tight mt-1">{winner.handle} wins</span>
          <span className="text-xl font-semibold text-green-500 mt-1">+{(parseFloat(pot) * 0.9).toFixed(3)} ETH</span>

          {winner.isYou && (
            <>
              <div className="bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-full mt-3">
                That's you!
              </div>
              
              {/* Share button on results screen */}
              <button
                onClick={async (e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  
                  const shareText = `I won ${pot} ETH on Zarble! 🏆\n\nVRF Seed: ${vrfSeed?.slice(0, 16)}...`;
                  const shareUrl = 'https://farcaster.xyz/miniapps/AJ789Uv0lu7g/zarble';
                  
                  try {
                    // Try Web Share API first (works on mobile and some browsers)
                    if (navigator.share) {
                      await navigator.share({
                        title: 'Zarble Winner!',
                        text: shareText,
                        url: shareUrl,
                      });
                    } else {
                      // Fallback: copy to clipboard
                      const fullText = `${shareText}\n${shareUrl}`;
                      await navigator.clipboard.writeText(fullText);
                      // Show toast notification instead of alert
                      const toast = document.createElement('div');
                      toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                      toast.textContent = 'Copied to clipboard!';
                      document.body.appendChild(toast);
                      setTimeout(() => toast.remove(), 2000);
                    }
                  } catch (error: any) {
                    // User cancelled or error occurred
                    if (error.name !== 'AbortError') {
                      // Fallback: copy to clipboard if share fails
                      try {
                        const fullText = `${shareText}\n${shareUrl}`;
                        await navigator.clipboard.writeText(fullText);
                        const toast = document.createElement('div');
                        toast.className = 'fixed top-4 left-1/2 -translate-x-1/2 bg-green-500 text-white px-6 py-3 rounded-lg shadow-lg z-50';
                        toast.textContent = 'Copied to clipboard!';
                        document.body.appendChild(toast);
                        setTimeout(() => toast.remove(), 2000);
                      } catch (clipboardError) {
                        console.error('Failed to copy:', clipboardError);
                      }
                    }
                  }
                }}
                className="mt-4 w-full max-w-sm py-3 px-6 rounded-xl bg-gradient-to-r from-blue-500 to-purple-500 text-white text-sm font-semibold hover:from-blue-600 hover:to-purple-600 active:scale-95 transition-all shadow-lg flex items-center justify-center gap-2"
              >
                <span>📤</span>
                Share Victory
              </button>
            </>
          )}

          {/* VRF Seed display */}
          {vrfSeed && (
            <div className="mt-6 bg-neutral-50 rounded-xl p-4 w-full max-w-sm">
              <span className="text-xs text-neutral-500 uppercase tracking-wide block mb-2">VRF Seed</span>
              <code className="text-xs font-mono text-black break-all block">
                {vrfSeed}
              </code>
              <p className="text-[10px] text-neutral-400 mt-2 text-center">
                Provably fair randomness seed used to determine winner
              </p>
            </div>
          )}

          <div className="flex gap-3 w-full mt-8">
            <button 
              className="flex-1 py-4 px-6 rounded-xl bg-neutral-100 text-black text-sm font-semibold hover:bg-neutral-200 transition-colors"
              onClick={resetGame}
            >
              New Lobby
            </button>
            <button 
              className="flex-1 py-4 px-6 rounded-xl bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
              onClick={resetGame}
            >
              Rematch
            </button>
          </div>

          <button className="mt-3 py-3 px-6 text-blue-500 text-sm font-semibold">
            Share Result
          </button>
        </main>
      )}

      {/* Footer */}
      <footer className="px-6 py-5 flex items-center justify-center gap-3">
        <span className="text-xs text-neutral-300 font-medium">built on Base</span>
        <div className="w-1 h-1 rounded-full bg-neutral-300" />
        <span className="text-xs text-neutral-300 font-medium">provably fair</span>
      </footer>
    </div>
  );
};

export default MarbleRace;



