// ============================================
// Window Controls Component
// Custom title bar controls for frameless window
// ============================================

import React from 'react';
import { Minus, Square, X } from 'lucide-react';
import { minimizeWindow, toggleMaximize, closeWindow, isTauri } from '../lib/tauri';

interface WindowControlsProps {
  className?: string;
}

export function WindowControls({ className = '' }: WindowControlsProps) {
  // Don't render in browser mode
  if (!isTauri()) return null;

  return (
    <div 
      className={`flex items-center gap-0 ${className}`}
      style={{ WebkitAppRegion: 'no-drag' } as React.CSSProperties}
    >
      {/* Minimize */}
      <button
        onClick={minimizeWindow}
        className="w-11 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        title="Minimize"
      >
        <Minus className="w-4 h-4" />
      </button>
      
      {/* Maximize/Restore */}
      <button
        onClick={toggleMaximize}
        className="w-11 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-white/10 transition-colors"
        title="Maximize"
      >
        <Square className="w-3.5 h-3.5" />
      </button>
      
      {/* Close */}
      <button
        onClick={closeWindow}
        className="w-11 h-8 flex items-center justify-center text-gray-400 hover:text-white hover:bg-red-500 transition-colors"
        title="Close"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
