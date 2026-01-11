// ============================================
// Enchantment Selector Component
// Allows selecting enchantments for enchantable items
// ============================================

import { useState, useEffect } from 'react';
import { Sparkles, Plus, X, AlertCircle } from 'lucide-react';
import type { Enchantment, AppliedEnchantment } from '../types';
import {
  getValidEnchantmentsForItem,
  canBeEnchanted,
  toRomanNumeral,
  validateEnchantmentCombination,
} from '../data/enchantmentLoader';

interface EnchantmentSelectorProps {
  itemId: string;
  enchantments: AppliedEnchantment[];
  onChange: (enchantments: AppliedEnchantment[]) => void;
  compact?: boolean;
}

export function EnchantmentSelector({
  itemId,
  enchantments,
  onChange,
  compact = false,
}: EnchantmentSelectorProps) {
  const [availableEnchantments, setAvailableEnchantments] = useState<Enchantment[]>([]);
  const [showSelector, setShowSelector] = useState(false);
  const [selectedEnchant, setSelectedEnchant] = useState<string>('');
  const [selectedLevel, setSelectedLevel] = useState<number>(1);
  const [conflicts, setConflicts] = useState<Array<{ enchant1: string; enchant2: string }>>([]);
  const [isEnchantable, setIsEnchantable] = useState(false);

  // Load valid enchantments for this item
  useEffect(() => {
    const checkEnchantable = canBeEnchanted(itemId);
    setIsEnchantable(checkEnchantable);
    
    if (checkEnchantable) {
      getValidEnchantmentsForItem(itemId).then(setAvailableEnchantments);
    } else {
      setAvailableEnchantments([]);
    }
  }, [itemId]);

  // Validate current enchantment combination
  useEffect(() => {
    if (enchantments.length > 0) {
      validateEnchantmentCombination(enchantments).then(result => {
        setConflicts(result.conflicts);
      });
    } else {
      setConflicts([]);
    }
  }, [enchantments]);

  // Get currently selected enchantment object
  const currentEnchant = availableEnchantments.find(e => e.name === selectedEnchant);

  // Filter out already-added enchantments
  const unusedEnchantments = availableEnchantments.filter(
    e => !enchantments.some(ae => ae.enchantmentId === e.name)
  );

  const addEnchantment = () => {
    if (!selectedEnchant || !currentEnchant) return;

    const newEnchant: AppliedEnchantment = {
      enchantmentId: selectedEnchant,
      level: Math.min(Math.max(1, selectedLevel), currentEnchant.maxLevel),
    };

    onChange([...enchantments, newEnchant]);
    setSelectedEnchant('');
    setSelectedLevel(1);
    setShowSelector(false);
  };

  const removeEnchantment = (enchantmentId: string) => {
    onChange(enchantments.filter(e => e.enchantmentId !== enchantmentId));
  };

  const updateLevel = (enchantmentId: string, level: number) => {
    onChange(
      enchantments.map(e =>
        e.enchantmentId === enchantmentId ? { ...e, level } : e
      )
    );
  };

  // Don't render anything for non-enchantable items
  if (!isEnchantable) {
    return null;
  }

  // Compact view for showing enchantments on an existing item
  if (compact) {
    return (
      <div className="flex flex-wrap gap-1 mt-1">
        {enchantments.map(ae => {
          const enchant = availableEnchantments.find(e => e.name === ae.enchantmentId);
          if (!enchant) return null;
          return (
            <span
              key={ae.enchantmentId}
              className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-xs ${
                enchant.curse
                  ? 'bg-red-500/20 text-red-400'
                  : 'bg-purple-500/20 text-purple-400'
              }`}
            >
              <Sparkles className="w-3 h-3" />
              {enchant.displayName}
              {enchant.maxLevel > 1 && ` ${toRomanNumeral(ae.level)}`}
            </span>
          );
        })}
      </div>
    );
  }

  return (
    <div className="mt-2">
      {/* Current enchantments */}
      {enchantments.length > 0 && (
        <div className="flex flex-wrap gap-2 mb-2">
          {enchantments.map(ae => {
            const enchant = availableEnchantments.find(e => e.name === ae.enchantmentId);
            if (!enchant) return null;
            return (
              <div
                key={ae.enchantmentId}
                className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-lg ${
                  enchant.curse
                    ? 'bg-red-500/20 text-red-400 border border-red-500/30'
                    : 'bg-purple-500/20 text-purple-400 border border-purple-500/30'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span className="text-sm font-medium">{enchant.displayName}</span>
                {enchant.maxLevel > 1 && (
                  <select
                    value={ae.level}
                    onChange={(e) => updateLevel(ae.enchantmentId, parseInt(e.target.value))}
                    className="bg-transparent text-sm font-medium cursor-pointer focus:outline-none"
                  >
                    {Array.from({ length: enchant.maxLevel }, (_, i) => i + 1).map(lvl => (
                      <option key={lvl} value={lvl} className="bg-dark-300">
                        {toRomanNumeral(lvl)}
                      </option>
                    ))}
                  </select>
                )}
                <button
                  type="button"
                  onClick={() => removeEnchantment(ae.enchantmentId)}
                  className="ml-1 p-0.5 hover:bg-white/10 rounded transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Conflict warnings */}
      {conflicts.length > 0 && (
        <div className="mb-2 p-2 bg-orange-500/10 border border-orange-500/30 rounded-lg">
          <div className="flex items-start gap-2 text-orange-400 text-xs">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
            <div>
              <p className="font-medium mb-1">Conflicting enchantments:</p>
              {conflicts.map((c, i) => (
                <p key={i}>{c.enchant1} and {c.enchant2} cannot be combined</p>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Add enchantment button/selector */}
      {!showSelector ? (
        <button
          type="button"
          onClick={() => setShowSelector(true)}
          disabled={unusedEnchantments.length === 0}
          className="flex items-center gap-1.5 px-2 py-1 text-xs text-purple-400 hover:bg-purple-500/10 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <Sparkles className="w-3.5 h-3.5" />
          {enchantments.length === 0 ? 'Add Enchantments' : 'Add More'}
        </button>
      ) : (
        <div className="p-2 bg-dark-300 border border-purple-500/30 rounded-lg">
          <div className="flex items-center gap-2">
            <select
              value={selectedEnchant}
              onChange={(e) => {
                setSelectedEnchant(e.target.value);
                setSelectedLevel(1);
              }}
              className="flex-1 px-2 py-1.5 bg-dark-200 border border-dark-50 rounded text-sm text-white focus:outline-none focus:border-purple-500"
            >
              <option value="">Select enchantment...</option>
              {unusedEnchantments.map(e => (
                <option key={e.name} value={e.name}>
                  {e.displayName}
                  {e.curse && ' (Curse)'}
                </option>
              ))}
            </select>
            
            {currentEnchant && currentEnchant.maxLevel > 1 && (
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(parseInt(e.target.value))}
                className="w-16 px-2 py-1.5 bg-dark-200 border border-dark-50 rounded text-sm text-white focus:outline-none focus:border-purple-500"
              >
                {Array.from({ length: currentEnchant.maxLevel }, (_, i) => i + 1).map(lvl => (
                  <option key={lvl} value={lvl}>
                    {toRomanNumeral(lvl)}
                  </option>
                ))}
              </select>
            )}
            
            <button
              type="button"
              onClick={addEnchantment}
              disabled={!selectedEnchant}
              className="px-2 py-1.5 bg-purple-500 text-white rounded text-sm font-medium hover:bg-purple-600 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Plus className="w-4 h-4" />
            </button>
            
            <button
              type="button"
              onClick={() => {
                setShowSelector(false);
                setSelectedEnchant('');
                setSelectedLevel(1);
              }}
              className="p-1.5 text-gray-400 hover:text-white transition-colors"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
