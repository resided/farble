'use client';

import React, { useState, useEffect, useMemo } from 'react';
import Image from 'next/image';
import { useFarcaster } from '../hooks/useFarcaster';

interface Player {
  id: number;
  name: string;
  handle: string;
  color: string;
  colorName: string;
  joined: boolean;
  isYou?: boolean;
}

const MarbleRace = () => {
  const { user } = useFarcaster();
  const [screen, setScreen] = useState<'lobby' | 'racing' | 'results'>('lobby');
  const [countdown, setCountdown] = useState<number | null>(null);
  const [marblePositions, setMarblePositions] = useState([0, 0, 0, 0, 0]);
  const [winner, setWinner] = useState<Player | null>(null);
  const [winnerFound, setWinnerFound] = useState(false);

  const players: Player[] = useMemo(() => [
    { 
      id: 1, 
      name: user?.username || 'you', 
      handle: `@${user?.username || 'you'}`, 
      color: '#FF3B30', 
      colorName: 'Red', 
      joined: true, 
      isYou: true 
    },
    { id: 2, name: 'dwr', handle: '@dwr', color: '#007AFF', colorName: 'Blue', joined: true },
    { id: 3, name: 'vitalik', handle: '@vitalik', color: '#34C759', colorName: 'Mint', joined: true },
    { id: 4, name: 'jessepollak', handle: '@jessepollak', color: '#FF9500', colorName: 'Gold', joined: true },
    { id: 5, name: 'ted', handle: '@ted', color: '#AF52DE', colorName: 'Grape', joined: true },
  ], [user]);

  const buyIn = '0.001';
  const pot = (players.filter(p => p.joined).length * parseFloat(buyIn)).toFixed(3);

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
            src="/farble.png" 
            alt="FARBLE" 
            width={24}
            height={24}
            className="object-contain"
            priority
          />
        </div>
        <span className="text-lg font-semibold text-black tracking-tight">marble</span>
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

          <div className="grid grid-cols-5 gap-2 w-full mb-6">
            {players.map((player, i) => (
              <div 
                key={i} 
                className={`bg-white rounded-2xl p-3 flex flex-col items-center gap-2 transition-all ${player.isYou ? 'ring-2 ring-blue-500' : ''} ${player.joined ? 'shadow-sm' : ''}`}
              >
                <div 
                  className="w-9 h-9 rounded-full"
                  style={{ 
                    backgroundColor: player.color,
                    opacity: player.joined ? 1 : 0.3,
                    boxShadow: player.joined ? '0 4px 12px rgba(0,0,0,0.15), inset 0 -4px 8px rgba(0,0,0,0.1), inset 0 4px 8px rgba(255,255,255,0.4)' : 'none'
                  }} 
                />
                <span className="text-[10px] text-neutral-400 font-medium text-center truncate w-full">
                  {player.joined ? player.handle : 'waiting'}
                </span>
                <span className="text-[9px] text-neutral-300 font-semibold uppercase tracking-wide">
                  {player.colorName}
                </span>
              </div>
            ))}
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
              className="flex-1 py-4 px-6 rounded-xl bg-black text-white text-sm font-semibold hover:bg-neutral-800 transition-colors"
              onClick={startRace}
            >
              Start Race
            </button>
          </div>

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
          <div className="w-full bg-white rounded-3xl p-6 shadow-md mt-4 mb-5">
            <div className="relative flex flex-col gap-4">
              {players.map((player, i) => (
                <div key={i} className="flex items-center gap-3">
                  <div className="flex-1 h-2 bg-neutral-100 rounded-full relative overflow-visible">
                    <div 
                      className="absolute w-6 h-6 rounded-full top-1/2 -mt-3 transition-all duration-75"
                      style={{ 
                        backgroundColor: player.color,
                        left: `calc(${Math.min(marblePositions[i], 95)}% - 12px)`,
                        boxShadow: '0 2px 8px rgba(0,0,0,0.2), inset 0 -2px 4px rgba(0,0,0,0.1), inset 0 2px 4px rgba(255,255,255,0.4)',
                        transform: `rotate(${marblePositions[i] * 8}deg)`
                      }}
                    >
                      <div className="absolute w-2 h-2 rounded-full bg-white/60 top-1 left-1" />
                    </div>
                  </div>
                  <span className="text-xs text-neutral-400 font-medium w-16 text-right truncate">{player.handle}</span>
                </div>
              ))}
              {/* Finish line */}
              <div className="absolute right-16 top-0 bottom-0 w-0.5 bg-black rounded-full" />
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
                  className="w-5 h-5 rounded-full"
                  style={{ 
                    backgroundColor: player.color,
                    boxShadow: '0 2px 6px rgba(0,0,0,0.15)'
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
              className="w-20 h-20 rounded-full relative"
              style={{ 
                backgroundColor: winner.color,
                boxShadow: '0 8px 32px rgba(0,0,0,0.2), inset 0 -8px 16px rgba(0,0,0,0.1), inset 0 8px 16px rgba(255,255,255,0.4)'
              }}
            >
              <div className="absolute w-6 h-6 rounded-full bg-white/50 top-3 left-3" />
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

