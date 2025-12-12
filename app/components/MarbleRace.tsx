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
    if (screen === 'racing' && !winnerFound) {
      const interval = setInterval(() => {
        setMarblePositions(prev => {
          const newPositions = prev.map((pos) => {
            if (pos >= 100) return 100;
            const speed = Math.random() * 4 + 0.5;
            return Math.min(100, pos + speed);
          });
          
          const winnerIndex = newPositions.findIndex(p => p >= 100);
          if (winnerIndex !== -1 && !winnerFound) {
            setWinnerFound(true);
            setWinner(players[winnerIndex]);
            setTimeout(() => setScreen('results'), 1000);
          }
          
          return newPositions;
        });
      }, 60);

      return () => clearInterval(interval);
    }
  }, [screen, winnerFound]);

  const startRace = () => {
    setCountdown(3);
    const countInterval = setInterval(() => {
      setCountdown(prev => {
        if (prev === null || prev <= 1) {
          clearInterval(countInterval);
          setScreen('racing');
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
  };

  const sortedPlayers = [...players]
    .map((p, i) => ({ ...p, position: marblePositions[i], originalIndex: i }))
    .sort((a, b) => b.position - a.position);

  return (
    <div className="min-h-screen bg-neutral-50 flex flex-col relative overflow-hidden max-w-md mx-auto shadow-2xl" style={{ fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", system-ui, sans-serif' }}>
      
      {/* Subtle top gradient */}
      <div className="absolute top-0 left-0 right-0 h-96 bg-gradient-to-b from-black/[0.02] to-transparent pointer-events-none" />
      
      {/* Header */}
      <header className="px-6 py-5 flex items-center gap-2.5 relative z-10">
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
        {screen !== 'lobby' && (
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

          {/* Horse race style lineup */}
          <div className="w-full bg-white rounded-3xl p-4 shadow-md mb-6">
            <div className="flex items-center justify-between gap-2">
              {players.map((player, i) => (
                <div 
                  key={i} 
                  className={`flex-1 flex flex-col items-center gap-2 p-3 rounded-xl transition-all ${player.isYou ? 'bg-blue-50 ring-2 ring-blue-500' : 'bg-neutral-50'} ${player.joined ? '' : 'opacity-40'}`}
                >
                  {/* Marble with profile picture - larger and clearer */}
                  <div 
                    className="w-16 h-16 rounded-full overflow-hidden relative flex-shrink-0"
                    style={{ 
                      backgroundColor: player.pfpUrl ? 'transparent' : player.color,
                      backgroundImage: player.pfpUrl ? `url(${player.pfpUrl})` : undefined,
                      backgroundSize: 'cover',
                      backgroundPosition: 'center',
                      boxShadow: player.joined 
                        ? '0 4px 16px rgba(0,0,0,0.2), inset 0 -4px 8px rgba(0,0,0,0.15), inset 0 4px 8px rgba(255,255,255,0.5)' 
                        : 'none',
                      border: player.pfpUrl ? `3px solid ${player.color}` : 'none',
                    }} 
                  >
                    {player.pfpUrl && (
                      <>
                        {/* Marble shine effect */}
                        <div 
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `radial-gradient(circle at 30% 30%, rgba(255,255,255,0.4) 0%, transparent 60%)`,
                          }}
                        />
                        {/* Marble shadow effect */}
                        <div 
                          className="absolute inset-0 rounded-full"
                          style={{
                            background: `radial-gradient(circle at 70% 70%, rgba(0,0,0,0.2) 0%, transparent 60%)`,
                          }}
                        />
                      </>
                    )}
                    {/* You indicator */}
                    {player.isYou && (
                      <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center">
                        <span className="text-white text-[10px] font-bold">YOU</span>
                      </div>
                    )}
                  </div>
                  {/* Username - clear and full width */}
                  <div className="w-full flex flex-col items-center gap-1">
                    <span className={`text-sm font-bold text-center break-all ${player.joined ? 'text-black' : 'text-neutral-400'}`}>
                      {player.joined ? player.handle : 'waiting'}
                    </span>
                    {player.joined && (
                      <span className="text-[10px] text-neutral-500 font-medium uppercase tracking-wide">
                        {player.colorName}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 mb-8">
            <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
            <span className="text-sm text-neutral-400 font-medium">
              {players.filter(p => p.joined).length} / 5 players
            </span>
          </div>

          <div className="flex gap-3 w-full mb-4">
            <button className="flex-1 py-4 px-6 rounded-xl bg-neutral-100 text-black text-sm font-semibold hover:bg-neutral-200 transition-colors">
              Copy Invite
            </button>
            <button 
              className="flex-1 py-4 px-6 rounded-xl bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-colors disabled:opacity-50 disabled:cursor-not-allowed relative"
              onClick={handleJoinRace}
              disabled={isPaying}
            >
              {isPaying ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  {paymentStatus || 'Processing...'}
                </span>
              ) : hasPaid ? (
                'Start Race'
              ) : (
                `Join Race (${buyIn} ETH)`
              )}
            </button>
          </div>
          
          {paymentStatus && (
            <div className={`text-xs text-center mb-2 ${paymentStatus.includes('failed') ? 'text-red-500' : 'text-green-500'}`}>
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
                    {/* Enhanced track with gradient and checkered pattern */}
                    <div className="flex-1 h-3 bg-gradient-to-r from-neutral-100 via-neutral-50 to-neutral-100 rounded-full relative overflow-visible border border-neutral-200/30">
                      {/* Track surface pattern */}
                      <div className="absolute inset-0 bg-[linear-gradient(90deg,transparent_0%,rgba(0,0,0,0.02)_50%,transparent_100%)] rounded-full" />
                      
                      {/* Motion blur trail */}
                      {position > 5 && (
                        <div 
                          className="absolute h-3 rounded-full opacity-30 blur-sm transition-all duration-75"
                          style={{ 
                            backgroundColor: player.color,
                            left: `calc(${Math.max(0, position - 8)}% - 12px)`,
                            width: '24px',
                          }}
                        />
                      )}
                      
                      {/* Marble with enhanced effects and profile picture */}
                      <div 
                        className="absolute w-7 h-7 rounded-full top-1/2 -mt-3.5 transition-all duration-75 z-10 overflow-hidden"
                        style={{ 
                          backgroundColor: player.pfpUrl ? 'transparent' : player.color,
                          backgroundImage: player.pfpUrl ? `url(${player.pfpUrl})` : undefined,
                          backgroundSize: 'cover',
                          backgroundPosition: 'center',
                          left: `calc(${Math.min(position, 95)}% - 14px)`,
                          boxShadow: isLeading 
                            ? `0 4px 20px ${player.color}80, 0 2px 8px rgba(0,0,0,0.3), inset 0 -3px 6px rgba(0,0,0,0.2), inset 0 3px 6px rgba(255,255,255,0.5)`
                            : '0 2px 12px rgba(0,0,0,0.25), inset 0 -2px 4px rgba(0,0,0,0.15), inset 0 2px 4px rgba(255,255,255,0.4)',
                          transform: `rotate(${position * 12}deg) scale(${isLeading ? 1.1 : 1})`,
                          filter: isLeading ? 'brightness(1.1)' : 'none',
                          border: player.pfpUrl ? `1.5px solid ${player.color}` : 'none',
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
                        {isLeading && position < 100 && (
                          <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full animate-ping z-20" />
                        )}
                      </div>
                      
                      {/* Speed lines effect */}
                      {position > 10 && position < 100 && (
                        <div 
                          className="absolute h-3 w-8 opacity-20"
                          style={{ 
                            left: `calc(${position - 5}% - 16px)`,
                            background: `linear-gradient(90deg, transparent, ${player.color}, transparent)`,
                          }}
                        />
                      )}
                    </div>
                    <span className={`text-xs font-medium w-16 text-right truncate transition-colors ${isLeading ? 'text-black font-semibold' : 'text-neutral-400'}`}>
                      {player.handle}
                    </span>
                  </div>
                );
              })}
              
              {/* Enhanced finish line with checkered pattern */}
              <div className="absolute right-12 top-0 bottom-0 w-1 flex flex-col">
                {[...Array(20)].map((_, i) => (
                  <div 
                    key={i}
                    className="flex-1"
                    style={{
                      backgroundColor: i % 2 === 0 ? '#000' : '#fff',
                    }}
                  />
                ))}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-black/20 to-transparent" />
              </div>
              
              {/* Finish line glow */}
              <div className="absolute right-12 top-0 bottom-0 w-0.5 bg-gradient-to-b from-transparent via-yellow-400 to-transparent opacity-60 blur-sm" />
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

