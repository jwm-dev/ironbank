// ============================================
// Tauri API wrapper for native functionality
// ============================================

import { invoke } from '@tauri-apps/api/core';
import { getCurrentWindow } from '@tauri-apps/api/window';

export interface LedgerInfo {
  name: string;
  filename: string;
  path: string;
  modified: number; // Unix timestamp
  size: number;
}

// Check if we're running in Tauri
export const isTauri = (): boolean => {
  return '__TAURI_INTERNALS__' in window;
};

// Show the window (call after app is ready)
export async function showWindow(): Promise<void> {
  if (!isTauri()) return;
  const window = getCurrentWindow();
  await window.show();
}

// List all ledgers in the ledgers directory
export async function listLedgers(): Promise<LedgerInfo[]> {
  if (!isTauri()) {
    console.warn('listLedgers: Not running in Tauri');
    return [];
  }
  return invoke<LedgerInfo[]>('list_ledgers');
}

// Read a ledger file by path
export async function readLedger(path: string): Promise<string> {
  if (!isTauri()) {
    throw new Error('readLedger: Not running in Tauri');
  }
  return invoke<string>('read_ledger', { path });
}

// Save a ledger to the ledgers directory
export async function saveLedger(filename: string, content: string): Promise<string> {
  if (!isTauri()) {
    throw new Error('saveLedger: Not running in Tauri');
  }
  return invoke<string>('save_ledger', { filename, content });
}

// Delete a ledger file
export async function deleteLedger(path: string): Promise<void> {
  if (!isTauri()) {
    throw new Error('deleteLedger: Not running in Tauri');
  }
  return invoke<void>('delete_ledger', { path });
}

// Get the ledgers directory path
export async function getLedgersDirectory(): Promise<string> {
  if (!isTauri()) {
    return '';
  }
  return invoke<string>('get_ledgers_directory');
}

// Open the ledgers directory in file explorer
export async function openLedgersDirectory(): Promise<void> {
  if (!isTauri()) {
    console.warn('openLedgersDirectory: Not running in Tauri');
    return;
  }
  return invoke<void>('open_ledgers_directory');
}

// Get fresh tutorial data (resets each time, reads from bundled resource)
export async function getTutorialData(): Promise<string> {
  if (!isTauri()) {
    throw new Error('getTutorialData: Not running in Tauri');
  }
  return invoke<string>('get_tutorial_data');
}

// Reset the tutorial ledger by copying fresh from bundled resources
export async function resetTutorialLedger(): Promise<void> {
  if (!isTauri()) {
    console.warn('resetTutorialLedger: Not running in Tauri');
    return;
  }
  return invoke<void>('reset_tutorial_ledger');
}

// Generate a safe filename from a ledger name
export function generateFilename(name: string): string {
  return `${name.replace(/[^a-z0-9]/gi, '_').toLowerCase()}.ledger.json`;
}

// Format file size for display
export function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// Format timestamp for display
export function formatDate(timestamp: number): string {
  const date = new Date(timestamp * 1000);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  
  if (diffDays === 0) {
    return `Today at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays === 1) {
    return `Yesterday at ${date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`;
  } else if (diffDays < 7) {
    return `${diffDays} days ago`;
  } else {
    return date.toLocaleDateString();
  }
}

// ============================================
// Window Control Functions (for frameless window)
// ============================================

// Minimize the window
export async function minimizeWindow(): Promise<void> {
  if (!isTauri()) return;
  const window = getCurrentWindow();
  await window.minimize();
}

// Maximize/restore the window
export async function toggleMaximize(): Promise<void> {
  if (!isTauri()) return;
  const window = getCurrentWindow();
  await window.toggleMaximize();
}

// Close the window
export async function closeWindow(): Promise<void> {
  if (!isTauri()) return;
  const window = getCurrentWindow();
  await window.close();
}

// Start dragging the window (for custom title bar)
export function startDrag(): void {
  if (!isTauri()) return;
  const window = getCurrentWindow();
  window.startDragging();
}
