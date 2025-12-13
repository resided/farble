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
      className={`relative w-full ${compact ? 'h-20' : 'h-32'} rounded-2xl overflow-hidden group cursor-pointer transform transition-all duration-300 hover:scale-[1.02] hover:shadow-2xl`}
      onClick={handleClick}
    >
      {/* Background gradient */}
      <div className={`absolute inset-0 bg-gradient-to-br ${gradient} opacity-90`} />
      
      {/* Pattern overlay */}
      {getThemePattern(theme)}
      
      {/* Scan lines effect */}
      <div className="absolute inset-0 opacity-10">
        <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(255,255,255,0.03)_50%)] bg-[length:100%_4px]" />
      </div>
      
      {/* Corner accents */}
      <div className="absolute top-0 left-0 w-8 h-8 border-t-2 border-l-2 border-white/40" />
      <div className="absolute top-0 right-0 w-8 h-8 border-t-2 border-r-2 border-white/40" />
      <div className="absolute bottom-0 left-0 w-8 h-8 border-b-2 border-l-2 border-white/40" />
      <div className="absolute bottom-0 right-0 w-8 h-8 border-b-2 border-r-2 border-white/40" />
      
      {/* Content */}
      <div className={`relative h-full flex items-center gap-3 ${compact ? 'p-3' : 'p-4'}`}>
        {/* Profile picture / Avatar */}
        <div className="relative flex-shrink-0">
          <div 
            className={`${compact ? 'w-12 h-12' : 'w-16 h-16'} rounded-lg overflow-hidden border-2 border-white/50 shadow-lg`}
            style={{ 
              backgroundColor: player.color,
            }}
          >
            {player.pfpUrl ? (
              <img
                src={player.pfpUrl}
                alt={player.handle}
                className="w-full h-full object-cover"
                onError={(e) => {
                  e.currentTarget.style.display = 'none';
                }}
              />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-white font-bold text-xl">
                {player.handle.charAt(0).toUpperCase()}
              </div>
            )}
          </div>
          {/* You badge */}
          {player.isYou && (
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-blue-500 rounded-full flex items-center justify-center shadow-lg border-2 border-white z-10">
              <span className="text-white text-[7px] font-bold">YOU</span>
            </div>
          )}
        </div>
        
        {/* Player info */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <h3 className={`text-white font-bold ${compact ? 'text-sm' : 'text-lg'} leading-tight truncate drop-shadow-lg`}>
              {player.handle}
            </h3>
            {player.joined && !compact && (
              <span className="px-2 py-0.5 bg-white/20 backdrop-blur-sm rounded text-[10px] font-bold text-white uppercase tracking-wider">
                {player.colorName}
              </span>
            )}
          </div>
          
          {/* Stats - only show if not compact */}
          {!compact && (
            <div className="flex items-center gap-3 mt-2">
              <div className="flex items-center gap-1">
                <span className="text-white/80 text-xs font-medium">{stats.totalCasts}</span>
                <span className="text-white/60 text-[10px] uppercase tracking-wide">casts</span>
              </div>
              <div className="w-px h-4 bg-white/30" />
              <div className="flex items-center gap-1">
                <span className="text-white/80 text-xs font-semibold uppercase">{stats.topTopic}</span>
              </div>
            </div>
          )}
        </div>
        
        {/* Actions */}
        <div className="flex-shrink-0 flex items-center gap-2">
          {/* Taunt button */}
          {showTaunt && !player.isYou && player.joined && (
            <button
              onClick={handleTaunt}
              className="px-3 py-1.5 bg-red-500/80 hover:bg-red-600 backdrop-blur-sm rounded-lg text-white text-[10px] font-bold uppercase tracking-wider transition-all hover:scale-110 active:scale-95 shadow-lg border border-white/30"
              title="Send a taunt"
            >
              💥 Taunt
            </button>
          )}
          
          {/* Rank badge */}
          <div className={`${compact ? 'w-10 h-10' : 'w-12 h-12'} rounded-lg bg-black/30 backdrop-blur-sm border border-white/30 flex items-center justify-center`}>
            <span className={`text-white font-bold ${compact ? 'text-sm' : 'text-lg'}`}>#{player.id}</span>
          </div>
        </div>
      </div>
      
      {/* Glow effect on hover */}
      <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300">
        <div className={`absolute inset-0 bg-gradient-to-br ${gradient} blur-xl -z-10`} />
      </div>
    </div>
  );
}

export { analyzeCasts };

