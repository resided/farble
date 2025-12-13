'use client';

import React from 'react';

interface CallingCardProps {
  player: {
    id: number;
    name: string;
    handle: string;
    color: string;
    colorName: string;
    joined: boolean;
    isYou?: boolean;
    pfpUrl?: string;
  };
  theme?: string;
  stats?: {
    totalCasts?: number;
    topTopic?: string;
  };
  showTaunt?: boolean;
  onTaunt?: (playerId: number) => void;
  compact?: boolean;
}

// Analyze casts to determine theme
function analyzeCasts(casts: any[]): { theme: string; stats: { totalCasts: number; topTopic: string } } {
  if (!casts || casts.length === 0) {
    return {
      theme: 'rookie',
      stats: { totalCasts: 0, topTopic: 'Newcomer' }
    };
  }

  const text = casts.map(c => c.text || '').join(' ').toLowerCase();
  
  // Topic detection
  const topics: Record<string, number> = {
    crypto: (text.match(/\b(eth|btc|crypto|blockchain|defi|nft|web3|token|coin)\b/g) || []).length,
    art: (text.match(/\b(art|design|creative|artist|drawing|painting|visual)\b/g) || []).length,
    tech: (text.match(/\b(code|programming|tech|software|developer|ai|ml|algorithm)\b/g) || []).length,
    gaming: (text.match(/\b(game|gaming|play|player|quest|level|win)\b/g) || []).length,
    social: (text.match(/\b(community|friends|social|network|connect|share)\b/g) || []).length,
    trading: (text.match(/\b(trade|buy|sell|price|market|profit|loss)\b/g) || []).length,
  };

  const topTopic = Object.entries(topics).sort((a, b) => b[1] - a[1])[0];
  const theme = topTopic[1] > 0 ? topTopic[0] : 'veteran';

  return {
    theme,
    stats: {
      totalCasts: casts.length,
      topTopic: topTopic[0].charAt(0).toUpperCase() + topTopic[0].slice(1)
    }
  };
}

// Generate gradient based on theme
function getThemeGradient(theme: string, playerColor: string): string {
  const colorMap: Record<string, string> = {
    crypto: 'from-yellow-500 via-orange-500 to-red-600',
    art: 'from-pink-500 via-purple-500 to-indigo-600',
    tech: 'from-blue-500 via-cyan-500 to-teal-600',
    gaming: 'from-green-500 via-emerald-500 to-lime-600',
    social: 'from-rose-500 via-pink-500 to-fuchsia-600',
    trading: 'from-amber-500 via-yellow-500 to-orange-600',
    rookie: 'from-gray-400 via-gray-500 to-gray-600',
    veteran: 'from-slate-600 via-gray-700 to-zinc-800',
  };

  return colorMap[theme] || `from-${playerColor}-500 via-${playerColor}-600 to-${playerColor}-700`;
}

// Generate pattern based on theme
function getThemePattern(theme: string): React.ReactNode {
  const patterns: Record<string, React.ReactNode> = {
    crypto: (
      <>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-4 w-8 h-8 border-2 border-white/30 rotate-45" />
          <div className="absolute top-12 right-8 w-6 h-6 border-2 border-white/30 rounded-full" />
          <div className="absolute bottom-8 left-8 w-4 h-4 bg-white/20 rotate-45" />
          <div className="absolute bottom-4 right-4 w-10 h-10 border-2 border-white/30" />
        </div>
      </>
    ),
    art: (
      <>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-6 left-6 w-12 h-12 border-2 border-white/30 rounded-full" />
          <div className="absolute top-4 right-4 w-8 h-8 border-2 border-white/30" />
          <div className="absolute bottom-6 left-4 w-6 h-6 border-2 border-white/30 rotate-45" />
          <div className="absolute bottom-4 right-6 w-10 h-10 border-2 border-white/30 rounded-full" />
        </div>
      </>
    ),
    tech: (
      <>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-4 w-8 h-8 border-2 border-white/30" />
          <div className="absolute top-4 right-4 w-8 h-8 border-2 border-white/30" />
          <div className="absolute bottom-4 left-4 w-8 h-8 border-2 border-white/30" />
          <div className="absolute bottom-4 right-4 w-8 h-8 border-2 border-white/30" />
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-4 h-4 bg-white/20" />
        </div>
      </>
    ),
    gaming: (
      <>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-4 w-6 h-6 border-2 border-white/30 rotate-45" />
          <div className="absolute top-4 right-4 w-6 h-6 border-2 border-white/30 rotate-45" />
          <div className="absolute bottom-4 left-4 w-6 h-6 border-2 border-white/30 rotate-45" />
          <div className="absolute bottom-4 right-4 w-6 h-6 border-2 border-white/30 rotate-45" />
        </div>
      </>
    ),
    social: (
      <>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-6 left-1/2 -translate-x-1/2 w-8 h-8 border-2 border-white/30 rounded-full" />
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 w-8 h-8 border-2 border-white/30 rounded-full" />
          <div className="absolute top-1/2 left-6 -translate-y-1/2 w-8 h-8 border-2 border-white/30 rounded-full" />
          <div className="absolute top-1/2 right-6 -translate-y-1/2 w-8 h-8 border-2 border-white/30 rounded-full" />
        </div>
      </>
    ),
    trading: (
      <>
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-4 left-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-white/30" />
          <div className="absolute top-4 right-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-white/30" />
          <div className="absolute bottom-4 left-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-b-[12px] border-b-white/30" />
          <div className="absolute bottom-4 right-4 w-0 h-0 border-l-[8px] border-l-transparent border-r-[8px] border-r-transparent border-t-[12px] border-t-white/30" />
        </div>
      </>
    ),
  };

  return patterns[theme] || null;
}

export default function CallingCard({ player, theme: propTheme, stats: propStats, showTaunt = false, onTaunt, compact = false }: CallingCardProps) {
  // Use provided theme/stats or defaults
  const theme = propTheme || 'veteran';
  const stats = propStats || { totalCasts: 0, topTopic: 'Player' };
  const gradient = getThemeGradient(theme, player.colorName.toLowerCase());

  const handleClick = (e: React.MouseEvent) => {
    if (player.joined && !player.isYou) {
      e.preventDefault();
      e.stopPropagation();
      window.open(`https://warpcast.com/${player.name}`, '_blank', 'noopener,noreferrer');
    }
  };

  const handleTaunt = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (onTaunt && !player.isYou) {
      onTaunt(player.id);
    }
  };

  return (
    <div 
      className={`relative w-full ${compact ? 'h-20' : 'h-32'} rounded-lg overflow-hidden group cursor-pointer transform transition-all duration-300 hover:scale-[1.01] hover:shadow-xl border border-neutral-800/50`}
      onClick={handleClick}
      style={{
        background: 'linear-gradient(135deg, #1a1a1a 0%, #2d2d2d 50%, #1a1a1a 100%)',
        boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.1), 0 4px 12px rgba(0,0,0,0.5)'
      }}
    >
      {/* Black Ops style dark background with subtle theme accent */}
      <div className={`absolute inset-0 bg-gradient-to-br from-neutral-900 via-neutral-800 to-neutral-900`} />
      
      {/* Theme accent bar on left */}
      <div 
        className={`absolute left-0 top-0 bottom-0 w-1 bg-gradient-to-b ${gradient} opacity-60`}
      />
      
      {/* Crazy chaos graphics - animated patterns */}
      <div className="absolute inset-0 overflow-hidden">
        {/* Animated grid pattern */}
        <div 
          className="absolute inset-0 opacity-10"
          style={{
            backgroundImage: `
              linear-gradient(rgba(255,255,255,0.2) 1px, transparent 1px),
              linear-gradient(90deg, rgba(255,255,255,0.2) 1px, transparent 1px)
            `,
            backgroundSize: '15px 15px',
            animation: 'pulse 3s ease-in-out infinite'
          }}
        />
        
        {/* Chaotic diagonal lines */}
        <div className="absolute inset-0 opacity-15">
          <div className="absolute top-0 left-0 w-full h-full animate-pulse" style={{
            background: `repeating-linear-gradient(
              45deg,
              transparent,
              transparent 10px,
              rgba(255,0,0,0.1) 10px,
              rgba(255,0,0,0.1) 20px
            )`,
            animationDuration: '2s'
          }} />
          <div className="absolute top-0 left-0 w-full h-full animate-pulse" style={{
            background: `repeating-linear-gradient(
              -45deg,
              transparent,
              transparent 10px,
              rgba(0,255,255,0.1) 10px,
              rgba(0,255,255,0.1) 20px
            )`,
            animationDuration: '1.5s',
            animationDelay: '0.5s'
          }} />
        </div>
        
        {/* Explosive radial bursts */}
        <div className="absolute inset-0 opacity-20">
          <div className="absolute top-1/4 left-1/4 w-32 h-32 rounded-full bg-gradient-radial from-red-500/30 via-transparent to-transparent blur-xl animate-ping" style={{ animationDuration: '2s' }} />
          <div className="absolute top-3/4 right-1/4 w-24 h-24 rounded-full bg-gradient-radial from-blue-500/30 via-transparent to-transparent blur-xl animate-ping" style={{ animationDuration: '1.5s', animationDelay: '0.5s' }} />
          <div className="absolute bottom-1/4 left-1/2 w-20 h-20 rounded-full bg-gradient-radial from-yellow-500/30 via-transparent to-transparent blur-xl animate-ping" style={{ animationDuration: '2.5s', animationDelay: '1s' }} />
        </div>
        
        {/* Scan lines effect - more intense */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,255,255,0.2)_50%)] bg-[length:100%_3px] animate-pulse" />
        </div>
        
        {/* Glitch effect */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute top-0 left-0 w-full h-1 bg-red-500 animate-pulse" style={{ animationDuration: '0.1s' }} />
          <div className="absolute bottom-0 left-0 w-full h-1 bg-blue-500 animate-pulse" style={{ animationDuration: '0.15s', animationDelay: '0.05s' }} />
        </div>
        
        {/* Chaotic corner elements */}
        <div className="absolute top-2 left-2 w-8 h-8 border-2 border-red-500/50 rotate-45 animate-spin" style={{ animationDuration: '3s' }} />
        <div className="absolute top-2 right-2 w-6 h-6 border-2 border-blue-500/50 rounded-full animate-pulse" />
        <div className="absolute bottom-2 left-2 w-4 h-4 bg-yellow-500/50 rotate-45 animate-bounce" />
        <div className="absolute bottom-2 right-2 w-10 h-10 border-2 border-green-500/50 animate-pulse" style={{ animationDuration: '1s' }} />
      </div>
      
      
      {/* Corner brackets - Black Ops style */}
      <div className="absolute top-0 left-0 w-6 h-6">
        <div className="absolute top-0 left-0 w-4 h-0.5 bg-white/30" />
        <div className="absolute top-0 left-0 w-0.5 h-4 bg-white/30" />
      </div>
      <div className="absolute top-0 right-0 w-6 h-6">
        <div className="absolute top-0 right-0 w-4 h-0.5 bg-white/30" />
        <div className="absolute top-0 right-0 w-0.5 h-4 bg-white/30" />
      </div>
      <div className="absolute bottom-0 left-0 w-6 h-6">
        <div className="absolute bottom-0 left-0 w-4 h-0.5 bg-white/30" />
        <div className="absolute bottom-0 left-0 w-0.5 h-4 bg-white/30" />
      </div>
      <div className="absolute bottom-0 right-0 w-6 h-6">
        <div className="absolute bottom-0 right-0 w-4 h-0.5 bg-white/30" />
        <div className="absolute bottom-0 right-0 w-0.5 h-4 bg-white/30" />
      </div>
      
      {/* Content - Xbox 360 Gamertag Style */}
      <div className={`relative h-full flex items-center ${compact ? 'p-3' : 'p-4'} z-10`}>
        {/* Player info - Xbox 360 style gamertag */}
        <div className="flex-1 min-w-0">
          {/* Gamertag - Xbox 360 style with color accent */}
          <div className="flex items-center gap-2 mb-1">
            {/* Color accent bar on left - Xbox 360 style */}
            <div 
              className="w-1 h-8 rounded-full"
              style={{ 
                backgroundColor: player.color,
                boxShadow: `0 0 8px ${player.color}80`
              }}
            />
            
            {/* Gamertag text */}
            <div className="flex-1">
              <h3 
                className={`text-white font-bold ${compact ? 'text-base' : 'text-xl'} leading-tight truncate`}
                style={{
                  textShadow: '2px 2px 4px rgba(0,0,0,0.8), 0 0 12px rgba(0,0,0,0.6)',
                  letterSpacing: '1px',
                  fontFamily: 'Arial, sans-serif',
                  fontWeight: 700
                }}
              >
                {player.handle.replace('@', '')}
              </h3>
              
              {/* Subtitle - Xbox 360 style */}
              {player.joined && !compact && (
                <div className="flex items-center gap-2 mt-0.5">
                  <span 
                    className="text-xs font-semibold uppercase tracking-widest"
                    style={{
                      color: player.color,
                      textShadow: '0 0 6px rgba(0,0,0,0.8)'
                    }}
                  >
                    {player.colorName}
                  </span>
                  {player.isYou && (
                    <span className="text-[10px] text-blue-400 font-bold uppercase tracking-wider">
                      YOU
                    </span>
                  )}
                </div>
              )}
            </div>
          </div>
          
          {/* Stats - Xbox 360 style info bar */}
          {!compact && (
            <div className="flex items-center gap-3 mt-2 ml-3">
              <div className="flex items-center gap-1">
                <span className="text-white/80 text-xs font-semibold">{stats.totalCasts}</span>
                <span className="text-white/50 text-[10px] uppercase tracking-wider">CASTS</span>
              </div>
              <div className="w-px h-3 bg-white/20" />
              <div className="flex items-center gap-1">
                <span className="text-white/80 text-xs font-semibold uppercase">{stats.topTopic}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions - Xbox 360 style */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* Taunt button - Xbox 360 style */}
          {showTaunt && !player.isYou && player.joined && (
            <button
              onClick={handleTaunt}
              className="px-3 py-1.5 bg-red-600/90 hover:bg-red-700 rounded text-white text-xs font-bold uppercase tracking-wider transition-all hover:scale-105 active:scale-95"
              style={{
                textShadow: '0 1px 3px rgba(0,0,0,0.8)',
                boxShadow: '0 2px 6px rgba(0,0,0,0.5)'
              }}
              title="Send a taunt"
            >
              💥
            </button>
          )}
          
          {/* Rank badge - Xbox 360 style */}
          <div 
            className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg border-2 flex items-center justify-center`}
            style={{
              backgroundColor: 'rgba(0,0,0,0.6)',
              borderColor: 'rgba(255,255,255,0.3)',
              boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.5), 0 2px 8px rgba(0,0,0,0.8)'
            }}
          >
            <span 
              className={`text-white font-bold ${compact ? 'text-sm' : 'text-base'}`}
              style={{
                textShadow: '0 2px 4px rgba(0,0,0,0.9)'
              }}
            >
              #{player.id}
            </span>
          </div>
        </div>
      </div>
      
      {/* Subtle hover glow */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-20 transition-opacity duration-300 pointer-events-none">
        <div 
          className={`absolute inset-0 bg-gradient-to-br ${gradient}`}
          style={{ filter: 'blur(20px)' }}
        />
      </div>
    </div>
  );
}

export { analyzeCasts };

