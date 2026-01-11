import { useState, useRef, useEffect } from 'react';
import { 
  Users, 
  User, 
  Plus, 
  Trash2, 
  Edit2, 
  Save, 
  X, 
  Crown,
  UserPlus,
  Check,
  Zap
} from 'lucide-react';
import { useShopStore } from '../store/shopStore';
import { PlayerHead } from './PlayerHead';
import type { Player, Group } from '../types';
import { v4 as uuidv4 } from 'uuid';

type Tab = 'players' | 'groups';

export function PlayerManager() {
  const [activeTab, setActiveTab] = useState<Tab>('players');
  const searchQuery = useShopStore((state) => state.filter.searchQuery);

  return (
    <div>
      {/* Tabs */}
      <div className="flex items-center gap-4 mb-6" data-tutorial="players-tabs">
        <button
          onClick={() => setActiveTab('players')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
            activeTab === 'players'
              ? 'bg-[#2489c7] text-white shadow-lg shadow-[#2489c7]/20'
              : 'bg-dark-200 text-gray-400 border border-dark-50 hover:border-gray-600 hover:bg-dark-100 hover:text-[#f1af15]'
          }`}
        >
          <User className="w-4 h-4" />
          Players
        </button>
        <button
          onClick={() => setActiveTab('groups')}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-200 ${
            activeTab === 'groups'
              ? 'bg-[#2489c7] text-white shadow-lg shadow-[#2489c7]/20'
              : 'bg-dark-200 text-gray-400 border border-dark-50 hover:border-gray-600 hover:bg-dark-100 hover:text-[#f1af15]'
          }`}
          data-tutorial="groups-tab"
        >
          <Users className="w-4 h-4" />
          Groups
        </button>
      </div>

      {/* Content */}
      {activeTab === 'players' ? (
        <PlayersTab searchQuery={searchQuery} />
      ) : (
        <GroupsTab searchQuery={searchQuery} />
      )}
    </div>
  );
}

interface PlayersTabProps {
  searchQuery: string;
}

function PlayersTab({ searchQuery }: PlayersTabProps) {
  const { players, shops, addPlayer, updatePlayer, deletePlayer } = useShopStore();
  const [quickAddMode, setQuickAddMode] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [quickAddInput, setQuickAddInput] = useState('');
  const [recentlyAdded, setRecentlyAdded] = useState<string[]>([]);
  const quickAddRef = useRef<HTMLInputElement>(null);

  const filteredPlayers = players.filter(p => 
    p.ign.toLowerCase().includes(searchQuery.toLowerCase()) ||
    p.notes?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Count shops per player
  const shopCounts = players.reduce((acc, player) => {
    acc[player.ign] = shops.filter(s => 
      s.owner.type === 'individual' && s.owner.player?.ign === player.ign
    ).length;
    return acc;
  }, {} as Record<string, number>);

  // Focus quick add input when mode is enabled
  useEffect(() => {
    if (quickAddMode && quickAddRef.current) {
      quickAddRef.current.focus();
    }
  }, [quickAddMode]);

  // Clear recently added highlights after 3 seconds
  useEffect(() => {
    if (recentlyAdded.length > 0) {
      const timer = setTimeout(() => {
        setRecentlyAdded([]);
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [recentlyAdded]);

  const handleQuickAdd = () => {
    const name = quickAddInput.trim();
    if (!name) return;
    
    // Check if player already exists
    if (players.some(p => p.ign.toLowerCase() === name.toLowerCase())) {
      // Flash the existing player
      setRecentlyAdded([name.toLowerCase()]);
      setQuickAddInput('');
      return;
    }
    
    addPlayer({ ign: name });
    setRecentlyAdded(prev => [...prev, name.toLowerCase()]);
    setQuickAddInput('');
    // Keep focus on input for next entry
    quickAddRef.current?.focus();
  };

  const handleDeletePlayer = (ign: string) => {
    const shopCount = shopCounts[ign] || 0;
    if (shopCount > 0) {
      alert(`Cannot delete ${ign} - they own ${shopCount} shop(s). Transfer ownership first.`);
      return;
    }
    if (confirm(`Delete player "${ign}"?`)) {
      deletePlayer(ign);
    }
  };

  return (
    <div className="space-y-4">
      {/* Quick add mode toggle and input */}
      <div className="flex items-center gap-3" data-tutorial="add-player-input">
        <button
          onClick={() => setQuickAddMode(!quickAddMode)}
          className={`flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 ${
            quickAddMode
              ? 'bg-gradient-to-r from-green-500/20 to-emerald-500/20 text-green-400 border border-green-500/30 shadow-lg shadow-green-500/10'
              : 'bg-gradient-to-r from-cw-gold-500/20 to-cw-gold-500/10 text-cw-gold-400 border border-cw-gold-500/30 hover:shadow-lg hover:shadow-cw-gold-500/10'
          }`}
        >
          {quickAddMode ? (
            <>
              <Zap className="w-4 h-4" />
              Quick Add Active
            </>
          ) : (
            <>
              <Plus className="w-4 h-4" />
              Quick Add Players
            </>
          )}
        </button>
        
        {quickAddMode && (
          <div className="flex-1 flex items-center gap-2 animate-fadeIn">
            <div className="relative flex-1 max-w-md">
              <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-green-400" />
              <input
                ref={quickAddRef}
                type="text"
                value={quickAddInput}
                onChange={(e) => setQuickAddInput(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    e.preventDefault();
                    handleQuickAdd();
                  } else if (e.key === 'Escape') {
                    setQuickAddMode(false);
                  }
                }}
                className="w-full pl-10 pr-4 py-2.5 bg-dark-200 border border-green-500/30 rounded-xl text-white placeholder-gray-500 focus:outline-none focus:border-green-500/50 focus:shadow-lg focus:shadow-green-500/10 transition-all duration-200"
                placeholder="Type IGN and press Enter... (Esc to exit)"
              />
            </div>
            <button
              onClick={handleQuickAdd}
              className="p-2.5 bg-green-500/20 hover:bg-green-500/30 text-green-400 rounded-xl border border-green-500/30 transition-all duration-200"
            >
              <Check className="w-4 h-4" />
            </button>
            <button
              onClick={() => setQuickAddMode(false)}
              className="p-2.5 bg-dark-200 hover:bg-dark-100 text-gray-400 rounded-xl border border-dark-50 transition-all duration-200"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        )}
      </div>

      {/* Recently added indicator */}
      {recentlyAdded.length > 0 && (
        <div className="flex items-center gap-2 text-sm text-green-400 animate-fadeIn">
          <Check className="w-4 h-4" />
          <span>Added {recentlyAdded.length} player{recentlyAdded.length !== 1 ? 's' : ''}</span>
        </div>
      )}

      {/* Players list */}
      {filteredPlayers.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <User className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>{searchQuery ? 'No players match your search' : 'No players added yet'}</p>
          {!searchQuery && !quickAddMode && (
            <button
              onClick={() => setQuickAddMode(true)}
              className="mt-4 text-cw-gold-400 hover:text-cw-gold-300 transition-colors"
            >
              Start adding players →
            </button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPlayers.map(player => (
            <PlayerCard 
              key={player.ign} 
              player={player}
              shopCount={shopCounts[player.ign] || 0}
              isEditing={editingId === player.ign}
              isHighlighted={recentlyAdded.includes(player.ign.toLowerCase())}
              onEdit={() => setEditingId(player.ign)}
              onCancelEdit={() => setEditingId(null)}
              onSave={(updates) => {
                updatePlayer(player.ign, updates);
                setEditingId(null);
              }}
              onDelete={() => handleDeletePlayer(player.ign)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

interface PlayerCardProps {
  player: Player;
  shopCount: number;
  isEditing: boolean;
  isHighlighted?: boolean;
  onEdit: () => void;
  onCancelEdit: () => void;
  onSave: (updates: Partial<Player>) => void;
  onDelete: () => void;
}

function PlayerCard({ player, shopCount, isEditing, isHighlighted, onEdit, onCancelEdit, onSave, onDelete }: PlayerCardProps) {
  const [notes, setNotes] = useState(player.notes || '');

  if (isEditing) {
    return (
      <div className="bg-dark-200 border border-cw-gold-500/50 rounded-xl p-4 shadow-lg shadow-cw-gold-500/5">
        <div className="flex items-center gap-3 mb-4">
          <PlayerHead ign={player.ign} size="lg" />
          <span className="font-semibold text-white">{player.ign}</span>
        </div>
        <div className="space-y-3">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Notes</label>
            <textarea
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 bg-dark-300 border border-dark-50 rounded-lg text-white focus:outline-none focus:border-cw-gold-500 resize-none text-sm"
              rows={2}
            />
          </div>
          <div className="flex gap-2">
            <button onClick={() => onSave({ notes: notes || undefined })} className="btn btn-primary text-sm py-1">
              <Save className="w-3 h-3" />
              Save
            </button>
            <button onClick={onCancelEdit} className="btn btn-ghost text-sm py-1">
              Cancel
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bg-dark-200 border rounded-xl p-4 transition-all duration-300 hover:shadow-lg ${
      isHighlighted 
        ? 'border-green-500/50 shadow-lg shadow-green-500/10 animate-pulse-once' 
        : 'border-dark-50 hover:border-gray-600'
    }`}>
      <div className="flex items-start justify-between">
        <div className="flex items-center gap-3">
          <div className="relative">
            <PlayerHead ign={player.ign} size="lg" />
            {isHighlighted && (
              <div className="absolute -top-1 -right-1 w-4 h-4 bg-green-500 rounded-full flex items-center justify-center animate-bounce">
                <Check className="w-2.5 h-2.5 text-white" />
              </div>
            )}
          </div>
          <div>
            <p className="font-semibold text-white">{player.ign}</p>
            <p className="text-xs text-gray-500">
              {shopCount} shop{shopCount !== 1 ? 's' : ''}
            </p>
          </div>
        </div>
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1.5 hover:bg-dark-100 rounded-lg transition-colors">
            <Edit2 className="w-4 h-4 text-gray-400" />
          </button>
          <button 
            onClick={onDelete} 
            className="p-1.5 hover:bg-red-500/10 rounded-lg transition-colors"
            disabled={shopCount > 0}
          >
            <Trash2 className={`w-4 h-4 ${shopCount > 0 ? 'text-gray-600' : 'text-red-400'}`} />
          </button>
        </div>
      </div>
      {player.notes && (
        <p className="mt-3 text-sm text-gray-400 border-t border-dark-50 pt-3">
          {player.notes}
        </p>
      )}
    </div>
  );
}

interface GroupsTabProps {
  searchQuery: string;
}

function GroupsTab({ searchQuery }: GroupsTabProps) {
  const { groups, players, shops, addGroup, updateGroup, deleteGroup } = useShopStore();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredGroups = groups.filter(g => 
    g.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.notes?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.members.some(m => m.ign.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Count shops per group
  const shopCounts = groups.reduce((acc, group) => {
    acc[group.id] = shops.filter(s => 
      s.owner.type === 'group' && s.owner.group?.id === group.id
    ).length;
    return acc;
  }, {} as Record<string, number>);

  const handleDeleteGroup = (group: Group) => {
    const shopCount = shopCounts[group.id] || 0;
    if (shopCount > 0) {
      alert(`Cannot delete "${group.name}" - it owns ${shopCount} shop(s). Transfer ownership first.`);
      return;
    }
    if (confirm(`Delete group "${group.name}"?`)) {
      deleteGroup(group.id);
    }
  };

  return (
    <div className="space-y-4">
      {/* Add group button */}
      {!isAdding && (
        <button
          onClick={() => setIsAdding(true)}
          className="flex items-center gap-2 px-4 py-2.5 rounded-xl transition-all duration-300 bg-gradient-to-r from-cw-gold-500/20 to-cw-gold-500/10 text-cw-gold-400 border border-cw-gold-500/30 hover:shadow-lg hover:shadow-cw-gold-500/10"
          data-tutorial="add-group-btn"
        >
          <Plus className="w-4 h-4" />
          Create Group
        </button>
      )}

      {/* Add group form */}
      {isAdding && (
        <GroupForm 
          players={players}
          onSave={(group) => {
            addGroup(group);
            setIsAdding(false);
          }}
          onCancel={() => setIsAdding(false)}
        />
      )}

      {/* Groups list */}
      {filteredGroups.length === 0 ? (
        <div className="text-center py-12 text-gray-500">
          <Users className="w-12 h-12 mx-auto mb-2 opacity-30" />
          <p>{searchQuery ? 'No groups match your search' : 'No groups created yet'}</p>
        </div>
      ) : (
        <div className="space-y-4">
          {filteredGroups.map(group => (
            editingId === group.id ? (
              <GroupForm
                key={group.id}
                group={group}
                players={players}
                onSave={(updates) => {
                  updateGroup(group.id, updates);
                  setEditingId(null);
                }}
                onCancel={() => setEditingId(null)}
              />
            ) : (
              <GroupCard 
                key={group.id} 
                group={group}
                shopCount={shopCounts[group.id] || 0}
                onEdit={() => setEditingId(group.id)}
                onDelete={() => handleDeleteGroup(group)}
              />
            )
          ))}
        </div>
      )}
    </div>
  );
}

interface GroupFormProps {
  group?: Group;
  players: Player[];
  onSave: (group: Group) => void;
  onCancel: () => void;
}

function GroupForm({ group, players, onSave, onCancel }: GroupFormProps) {
  const { addPlayer } = useShopStore();
  const [name, setName] = useState(group?.name || '');
  const [notes, setNotes] = useState(group?.notes || '');
  const [members, setMembers] = useState<Player[]>(group?.members || []);
  const [leader, setLeader] = useState<Player | undefined>(group?.leader);
  const [memberSearch, setMemberSearch] = useState('');

  const availablePlayers = players.filter(p => 
    !members.some(m => m.ign === p.ign) &&
    p.ign.toLowerCase().includes(memberSearch.toLowerCase())
  );
  
  // Check if the search query could be a new player (not in existing players or members)
  const canCreateNewPlayer = memberSearch.trim().length > 0 && 
    !players.some(p => p.ign.toLowerCase() === memberSearch.toLowerCase()) &&
    !members.some(m => m.ign.toLowerCase() === memberSearch.toLowerCase());

  const handleAddMember = (player: Player) => {
    setMembers([...members, player]);
    setMemberSearch('');
    if (members.length === 0) {
      setLeader(player);
    }
  };
  
  const handleCreateAndAddPlayer = () => {
    const ign = memberSearch.trim();
    if (!ign) return;
    
    // Create new player
    const newPlayer: Player = { ign };
    addPlayer(newPlayer);
    
    // Add to group members
    handleAddMember(newPlayer);
  };

  const handleRemoveMember = (ign: string) => {
    setMembers(members.filter(m => m.ign !== ign));
    if (leader?.ign === ign) {
      setLeader(members.find(m => m.ign !== ign));
    }
  };

  const handleSubmit = () => {
    if (!name.trim() || members.length === 0) {
      alert('Please enter a group name and add at least one member');
      return;
    }
    
    onSave({
      id: group?.id || uuidv4(),
      name: name.trim(),
      notes: notes.trim() || undefined,
      members,
      leader,
    });
  };

  return (
    <div className="bg-dark-200 border border-cw-gold-500/50 rounded-lg p-6" data-tutorial="group-form">
      <h3 className="font-semibold text-white mb-4">
        {group ? 'Edit Group' : 'Create New Group'}
      </h3>
      
      <div className="space-y-4">
        <div>
          <label className="block text-sm text-gray-400 mb-1">Group Name *</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full px-4 py-2 bg-dark-300 border border-dark-50 rounded-lg text-white focus:outline-none focus:border-cw-gold-500"
            placeholder="e.g., CW Trading Co."
          />
        </div>

        <div>
          <label className="block text-sm text-gray-400 mb-1">Notes</label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-4 py-2 bg-dark-300 border border-dark-50 rounded-lg text-white focus:outline-none focus:border-cw-gold-500 resize-none"
            rows={2}
            placeholder="Optional notes about this group..."
          />
        </div>

        {/* Members */}
        <div>
          <label className="block text-sm text-gray-400 mb-2">Members *</label>
          
          {/* Current members */}
          {members.length > 0 && (
            <div className="flex flex-wrap gap-2 mb-3">
              {members.map(member => (
                <div 
                  key={member.ign}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full ${
                    leader?.ign === member.ign 
                      ? 'bg-cw-gold-500/20 border border-cw-gold-500/50' 
                      : 'bg-dark-300 border border-dark-50'
                  }`}
                >
                  <PlayerHead ign={member.ign} size="sm" />
                  <span className="text-sm text-white">{member.ign}</span>
                  {leader?.ign === member.ign && (
                    <Crown className="w-3 h-3 text-cw-gold-400" />
                  )}
                  <button
                    onClick={() => setLeader(member)}
                    className="p-0.5 hover:bg-dark-100 rounded"
                    title="Set as leader"
                  >
                    <Crown className={`w-3 h-3 ${leader?.ign === member.ign ? 'text-cw-gold-400' : 'text-gray-500'}`} />
                  </button>
                  <button
                    onClick={() => handleRemoveMember(member.ign)}
                    className="p-0.5 hover:bg-red-500/20 rounded"
                  >
                    <X className="w-3 h-3 text-gray-400 hover:text-red-400" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add member */}
          <div className="relative">
            <UserPlus className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-500" />
            <input
              type="text"
              value={memberSearch}
              onChange={(e) => setMemberSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-dark-300 border border-dark-50 rounded-lg text-white placeholder-gray-500 focus:outline-none focus:border-cw-gold-500"
              placeholder="Search players to add..."
            />
            
            {/* Dropdown */}
            {memberSearch && (availablePlayers.length > 0 || canCreateNewPlayer) && (
              <div className="absolute z-10 left-0 right-0 top-full mt-1 bg-dark-400 border border-dark-50 rounded-lg shadow-xl max-h-48 overflow-y-auto">
                {/* Create new player option */}
                {canCreateNewPlayer && (
                  <button
                    onClick={handleCreateAndAddPlayer}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-green-500/10 text-left border-b border-dark-50"
                  >
                    <Plus className="w-4 h-4 text-green-400" />
                    <span className="text-sm text-green-400">Create & add "{memberSearch.trim()}"</span>
                  </button>
                )}
                {availablePlayers.slice(0, 10).map(player => (
                  <button
                    key={player.ign}
                    onClick={() => handleAddMember(player)}
                    className="w-full flex items-center gap-2 px-3 py-2 hover:bg-dark-100 text-left"
                  >
                    <PlayerHead ign={player.ign} size="sm" />
                    <span className="text-sm text-white">{player.ign}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {members.length === 0 && (
            <p className="text-xs text-gray-500 mt-2">
              Search for existing players or type a new IGN to create and add them.
            </p>
          )}
        </div>

        <div className="flex gap-2 pt-2">
          <button onClick={handleSubmit} className="btn btn-primary">
            <Save className="w-4 h-4" />
            {group ? 'Save Changes' : 'Create Group'}
          </button>
          <button onClick={onCancel} className="btn btn-ghost">
            <X className="w-4 h-4" />
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
}

interface GroupCardProps {
  group: Group;
  shopCount: number;
  onEdit: () => void;
  onDelete: () => void;
}

function GroupCard({ group, shopCount, onEdit, onDelete }: GroupCardProps) {
  return (
    <div className="bg-dark-200 border border-dark-50 rounded-lg p-4 hover:border-gray-600 transition-colors">
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-2">
            <h3 className="font-semibold text-white">{group.name}</h3>
            <span className="text-xs text-gray-500">
              {shopCount} shop{shopCount !== 1 ? 's' : ''}
            </span>
          </div>
          
          {/* Members */}
          <div className="flex items-center gap-2 mt-3">
            {group.members.slice(0, 5).map(member => (
              <div 
                key={member.ign} 
                className="relative"
                title={`${member.ign}${group.leader?.ign === member.ign ? ' (Leader)' : ''}`}
              >
                <PlayerHead ign={member.ign} size="md" />
                {group.leader?.ign === member.ign && (
                  <Crown className="absolute -top-1 -right-1 w-3 h-3 text-cw-gold-400" />
                )}
              </div>
            ))}
            {group.members.length > 5 && (
              <span className="text-sm text-gray-500">+{group.members.length - 5}</span>
            )}
          </div>
          
          {group.notes && (
            <p className="mt-3 text-sm text-gray-400">
              {group.notes}
            </p>
          )}
        </div>
        
        <div className="flex gap-1">
          <button onClick={onEdit} className="p-1.5 hover:bg-dark-100 rounded transition-colors">
            <Edit2 className="w-4 h-4 text-gray-400" />
          </button>
          <button 
            onClick={onDelete} 
            className="p-1.5 hover:bg-red-500/10 rounded transition-colors"
            disabled={shopCount > 0}
          >
            <Trash2 className={`w-4 h-4 ${shopCount > 0 ? 'text-gray-600' : 'text-red-400'}`} />
          </button>
        </div>
      </div>
    </div>
  );
}
