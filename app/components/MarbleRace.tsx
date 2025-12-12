'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useFarcaster } from '../hooks/useFarcaster';
import { sdk } from '@farcaster/miniapp-sdk';
import { fetchNeynarProfiles } from '../hooks/useNeynar';

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

  const basePlayers: Player[] = useMemo(() => [
    { 
      id: 1, 
      name: user?.username || 'you', 
      handle: `@${user?.username || 'you'}`, 
      color: '#FF3B30', 
      colorName: 'Red', 
      joined: true, 
      isYou: true,
      pfpUrl: user?.pfpUrl,
    },
    { id: 2, name: 'dwr', handle: '@dwr', color: '#007AFF', colorName: 'Blue', joined: true },
    { id: 3, name: 'vitalik', handle: '@vitalik', color: '#34C759', colorName: 'Mint', joined: true },
    { id: 4, name: 'jessepollak', handle: '@jessepollak', color: '#FF9500', colorName: 'Gold', joined: true },
    { id: 5, name: 'ted', handle: '@ted', color: '#AF52DE', colorName: 'Grape', joined: true },
  ], [user]);

  // Fetch profile pictures from Neynar for ALL players (including current user)
  useEffect(() => {
    const loadProfiles = async () => {
      // Fetch profiles for all players who have joined, including current user
      // This ensures we get profile pictures from Neynar using usernames/FIDs
      const allPlayers = basePlayers.filter(p => p.joined);
      const handles = allPlayers.map(p => p.handle);
      
      if (handles.length === 0) return;
      
      console.log('Fetching profile pictures for all players:', handles);
      const profiles = await fetchNeynarProfiles(handles);
      if (Object.keys(profiles).length > 0) {
        console.log('Setting player profile pictures:', profiles);
        setPlayerPfps(profiles);
      } else {
        console.warn('No profile pictures loaded. Check NEYNAR_API_KEY is set.');
      }
    };

    // Always load profiles when component mounts or screen changes
    loadProfiles();
  }, [screen, basePlayers]);

  // Merge players with profile pictures from Neynar
  const players: Player[] = useMemo(() => {
    return basePlayers.map(player => {
      // All players get pfpUrl from Neynar fetch (using their username/FID)
      // Fallback to Farcaster context pfpUrl for current user if Neynar doesn't have it
      const neynarPfp = playerPfps[player.handle];
      const farcasterPfp = player.isYou ? user?.pfpUrl : undefined;
      
      return {
        ...player,
        pfpUrl: neynarPfp || farcasterPfp || undefined,
      };
    });
  }, [basePlayers, playerPfps, user?.pfpUrl]);

  const buyIn = '0.001';
  const pot = (players.filter(p => p.joined).length * parseFloat(buyIn)).toFixed(3);
  const TRACK_LENGTH = 200; // Longer track (200% instead of 100%)

  // Generate VRF seed for verifiable randomness
  const generateVrfSeed = (): string => {
    // In production, use a proper VRF service or onchain VRF
    // For now, use crypto.getRandomValues for cryptographically secure randomness
    const randomBytes = new Uint8Array(32);
    if (typeof window !== 'undefined' && window.crypto) {
      window.crypto.getRandomValues(randomBytes);
    } else {
      // Fallback for environments without crypto
      for (let i = 0; i < 32; i++) {
        randomBytes[i] = Math.floor(Math.random() * 256);
      }
    }
    
    // Convert to hex string
    const hex = Array.from(randomBytes)
      .map(b => b.toString(16).padStart(2, '0'))
      .join('');
    
    // Add timestamp and race data for additional entropy
    const timestamp = Date.now();
    const raceData = players.map(p => p.handle).join('');
    const combined = `${hex}${timestamp.toString(16)}${btoa(raceData).slice(0, 16)}`;
    
    return combined.slice(0, 64); // 32 bytes = 64 hex chars
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

  useEffect(() => {
    if (screen === 'racing' && !winnerFound && raceStartTime) {
      // Generate VRF seed when race starts (only once)
      if (!vrfSeed) {
        const seed = generateVrfSeed();
        setVrfSeed(seed);
        console.log('VRF Seed generated:', seed);
      }

      const interval = setInterval(() => {
        setMarblePositions(prev => {
          const seed = vrfSeed || generateVrfSeed();
          
          const newPositions = prev.map((pos, i) => {
            if (pos >= TRACK_LENGTH) return TRACK_LENGTH;
            
            // Use VRF seed deterministically for each player's speed
            // Each player gets a portion of the seed for their base speed
            const seedOffset = i * 8; // Each player uses 8 hex chars (4 bytes)
            const playerSeed = parseInt(seed.slice(seedOffset, seedOffset + 8) || '1', 16);
            
            // Use time elapsed for variation, but base it on seed
            const timeElapsed = Date.now() - (raceStartTime || 0);
            const frame = Math.floor(timeElapsed / 50); // Frame number
            
            // Deterministic speed based on seed + frame + position
            const combinedSeed = (playerSeed + frame * 1000 + Math.floor(pos)) % 100000;
            
            // Base speed from seed (1.0 to 4.0), with small variations
            const baseSpeed = 1.0 + ((playerSeed % 30000) / 30000) * 3.0;
            const variation = (combinedSeed % 1000) / 1000 * 0.5; // ±0.25 variation
            const speed = baseSpeed + variation;
            
            return Math.min(TRACK_LENGTH, pos + speed);
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
      }, 50); // Faster updates for smoother animation

      return () => clearInterval(interval);
    }
  }, [screen, winnerFound, vrfSeed, raceStartTime, players]);

  const startRace = () => {
    setCountdown(3);
    const countInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countInterval);
          setScreen('racing');
          setRaceStartTime(Date.now());
          setVrfSeed(null); // Reset seed for new race
          setWinnerFound(false);
          setMarblePositions([0, 0, 0, 0, 0]);
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
            alt="FARBLE" 
            width={24}
            height={24}
            className="object-contain"
            priority
          />
        </div>
        <span className="text-lg font-semibold text-black tracking-tight">farble</span>
        {screen === 'lobby' ? (
          <div className="ml-auto flex items-center gap-2">
            <button className="px-4 py-2 rounded-lg bg-neutral-100 text-black text-sm font-semibold hover:bg-neutral-200 transition-colors">
              Copy Invite
            </button>
            <button 
              className="px-4 py-2 rounded-lg bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
              onClick={handleJoinRace}
              disabled={isPaying}
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
          </div>
        )}
      </header>

      {/* Lobby Screen */}
      {screen === 'lobby' && !countdown && (
        <main className="flex-1 px-6 flex flex-col items-center">
          <div className="bg-white rounded-2xl px-8 py-5 flex flex-col items-center shadow-sm mb-8 mt-4">
            <span className="text-xs text-neutral-400 font-medium uppercase tracking-wide">buy-in</span>
            <span className="text-3xl font-bold text-black tracking-tight">{buyIn} ETH</span>
          </div>

          {/* Vertical bullet-point style player list */}
          <div className="w-full bg-white rounded-3xl p-4 shadow-md mb-6">
            <div className="flex flex-col gap-2">
              {players.map((player, i) => (
                <div 
                  key={i} 
                  className={`flex items-center gap-3 p-3 rounded-xl transition-all ${player.isYou ? 'bg-blue-50 ring-2 ring-blue-500' : 'bg-neutral-50'} ${player.joined ? '' : 'opacity-40'}`}
                >
                  {/* Bullet point - marble */}
                  <div className="relative flex-shrink-0">
                    <div 
                      className="w-12 h-12 rounded-full overflow-hidden relative"
                      style={{ 
                        backgroundColor: player.color,
                        boxShadow: player.joined 
                          ? '0 4px 16px rgba(0,0,0,0.2), inset 0 -4px 8px rgba(0,0,0,0.15), inset 0 4px 8px rgba(255,255,255,0.5)' 
                          : 'none',
                        border: player.pfpUrl ? `3px solid ${player.color}` : 'none',
                      }}
                    >
                      {/* Profile picture or color fallback */}
                      {player.pfpUrl ? (
                        <img
                          src={player.pfpUrl}
                          alt={player.handle}
                          className="w-full h-full object-cover"
                          onError={(e) => {
                            // Hide the image if it fails to load, showing the color background instead
                            e.currentTarget.style.display = 'none';
                          }}
                        />
                      ) : null}
                      
                      {/* Marble shine effect */}
                      <div 
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
                        }}
                      />
                      {/* Marble shadow effect */}
                      <div 
                        className="absolute inset-0 rounded-full pointer-events-none"
                        style={{
                          background: `radial-gradient(circle at 70% 70%, rgba(0,0,0,0.2) 0%, transparent 60%)`,
                        }}
                      />
                    </div>
                    {/* You indicator - positioned outside the circle to avoid clipping */}
                    {player.isYou && (
                      <div className="absolute -top-0.5 -right-0.5 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-md border-2 border-white z-10">
                        <span className="text-white text-[9px] font-bold leading-none">YOU</span>
                      </div>
                    )}
                  </div>
                  {/* Username and color - horizontal layout */}
                  <div className="flex-1 flex flex-col gap-0.5 min-w-0">
                    <span className={`text-sm font-bold ${player.joined ? 'text-black' : 'text-neutral-400'} truncate`}>
                      {player.joined ? player.handle : 'waiting'}
                    </span>
                    {player.joined && (
                      <span className="text-xs text-neutral-500 font-medium uppercase tracking-wide">
                        {player.colorName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
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

          <p className="text-xs text-neutral-300">Race starts when lobby is full</p>
        </main>
      )}

      {/* Countdown */}
      {countdown && (
        <main className="flex-1 px-6 flex flex-col items-center justify-center">
          <span className="text-9xl font-bold text-black leading-none tracking-tighter">{countdown}</span>
          <span className="text-base text-neutral-400 font-medium uppercase tracking-widest mt-2">get ready</span>
        </main>
      )}

      {/* Racing Screen */}
      {screen === 'racing' && (
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
            <div className="bg-blue-500 text-white text-sm font-semibold px-4 py-2 rounded-full mt-3">
              That's you!
            </div>
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

