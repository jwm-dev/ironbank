interface PlayerHeadProps {
  ign: string;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showTooltip?: boolean;
}

const SIZE_MAP = {
  xs: 12,
  sm: 16,
  md: 24,
  lg: 32,
  xl: 48,
};

const SIZE_CLASSES = {
  xs: 'w-3 h-3',
  sm: 'w-4 h-4',
  md: 'w-6 h-6',
  lg: 'w-8 h-8',
  xl: 'w-12 h-12',
};

/**
 * Renders a Minecraft player's head using the mc-heads.net API
 * https://mc-heads.net/
 */
export function PlayerHead({ ign, size = 'md', className = '', showTooltip = true }: PlayerHeadProps) {
  const pixelSize = SIZE_MAP[size];
  
  // mc-heads.net provides various formats:
  // - /avatar/{uuid|name}/{size} - 2D face
  // - /head/{uuid|name}/{size} - 3D head render
  // - /player/{uuid|name}/{size} - Full body
  // - /skin/{uuid|name} - Full skin texture
  
  const headUrl = `https://mc-heads.net/avatar/${ign}/${pixelSize}`;

  return (
    <div 
      className={`relative inline-flex ${className}`}
      data-tooltip={showTooltip ? ign : undefined}
    >
      <img
        src={headUrl}
        alt={`${ign}'s head`}
        className={`player-head ${SIZE_CLASSES[size]}`}
        loading="lazy"
        onError={(e) => {
          // Fallback to Steve head on error
          (e.target as HTMLImageElement).src = `https://mc-heads.net/avatar/MHF_Steve/${pixelSize}`;
        }}
      />
    </div>
  );
}

interface PlayerBadgeProps {
  ign: string;
  size?: 'sm' | 'md' | 'lg';
  showName?: boolean;
  className?: string;
}

/**
 * Renders a player head with their IGN next to it
 */
export function PlayerBadge({ ign, size = 'md', showName = true, className = '' }: PlayerBadgeProps) {
  return (
    <div className={`flex items-center gap-2 ${className}`}>
      <PlayerHead ign={ign} size={size} showTooltip={!showName} />
      {showName && (
        <span className="text-sm font-medium text-gray-200">{ign}</span>
      )}
    </div>
  );
}

interface PlayerGroupProps {
  players: string[];
  maxDisplay?: number;
  size?: 'sm' | 'md';
  className?: string;
}

/**
 * Renders a stack of player heads for groups
 */
export function PlayerGroup({ players, maxDisplay = 4, size = 'sm', className = '' }: PlayerGroupProps) {
  const displayPlayers = players.slice(0, maxDisplay);
  const remaining = players.length - maxDisplay;

  return (
    <div className={`flex items-center ${className}`}>
      <div className="flex -space-x-2">
        {displayPlayers.map((ign, index) => (
          <div 
            key={ign} 
            className="relative ring-2 ring-dark-300 rounded"
            style={{ zIndex: displayPlayers.length - index }}
          >
            <PlayerHead ign={ign} size={size} />
          </div>
        ))}
      </div>
      {remaining > 0 && (
        <span className="ml-2 text-xs text-gray-400">
          +{remaining} more
        </span>
      )}
    </div>
  );
}
