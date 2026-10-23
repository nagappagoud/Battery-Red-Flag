/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  Activity,
  Sliders,
  RotateCcw,
  BookOpen,
  Upload,
  FolderArchive,
  Database,
} from 'lucide-react';
import { SupabaseStatus } from '../types/bms';

interface HeaderProps {
  onOpenSettings: () => void;
  onOpenGuide: () => void;
  onOpenSupabase: () => void;
  onReset: () => void;
  onLoadDefaultSample: () => void;
  hasData: boolean;
  supabaseStatus: SupabaseStatus | null;
}

export const Header: React.FC<HeaderProps> = ({
  onOpenSettings,
  onOpenGuide,
  onOpenSupabase,
  onReset,
  onLoadDefaultSample,
  hasData,
  supabaseStatus,
}) => {
  return (
    <header className="border-b border-cyan-950/80 bg-[#020509]/90 backdrop-blur-xl sticky top-0 z-30 shadow-[0_4px_30px_rgba(0,0,0,0.9)]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
        {/* Brand Wordmark & Signal Indicator */}
        <div className="flex items-center gap-2.5 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-[#040a10] border border-cyan-500/40 flex items-center justify-center text-cyan-400 shadow-[0_0_16px_rgba(0,245,255,0.25)]">
            <Activity className="w-4 h-4 text-cyan-300 animate-pulse" />
          </div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-white text-sm tracking-tight whitespace-nowrap">
              EV BMS <span className="text-cyan-400 drop-shadow-[0_0_10px_rgba(0,245,255,0.4)]">Data Analyzer</span>
            </span>
          </div>
        </div>

        {/* Precision Action Controls */}
        <div className="flex items-center gap-2 shrink-0">
          {!hasData && (
            <button
              onClick={onLoadDefaultSample}
              className="group flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-200 bg-cyan-950/50 hover:bg-cyan-400 hover:text-black border border-cyan-500/40 hover:border-cyan-300 hover:shadow-[0_0_20px_rgba(0,245,255,0.4)] transition-all duration-200 whitespace-nowrap active:scale-95"
            >
              <Upload className="w-3.5 h-3.5 text-cyan-400 group-hover:text-black transition-colors" />
              <span>Load Sample</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-200/80 hover:text-white bg-[#04080e] hover:bg-[#07131e] border border-cyan-900/50 hover:border-cyan-400 hover:shadow-[0_0_14px_rgba(0,245,255,0.2)] transition-all duration-200 whitespace-nowrap active:scale-95"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            <span>Screening Limits</span>
          </button>

          <button
            onClick={onOpenSupabase}
            className="flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-200/80 hover:text-white bg-[#04080e] hover:bg-[#07131e] border border-cyan-900/50 hover:border-cyan-400 hover:shadow-[0_0_14px_rgba(0,245,255,0.2)] transition-all duration-200 whitespace-nowrap active:scale-95"
            title="Inspect Supabase PostgreSQL Database (gnckwhhsdquaxfyzlxhi)"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  supabaseStatus?.connected ? 'bg-cyan-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  supabaseStatus?.connected ? 'bg-cyan-400 shadow-[0_0_8px_#00f5ff]' : 'bg-amber-400 shadow-[0_0_8px_#f59e0b]'
                }`}
              />
            </span>
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Supabase</span>
          </button>

          <a
            href="/api/download-project-zip"
            download="ev-bms-analyzer-3layer.zip"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-200/80 hover:text-white bg-[#04080e] hover:bg-[#07131e] border border-cyan-900/50 hover:border-cyan-400 hover:shadow-[0_0_14px_rgba(0,245,255,0.2)] transition-all duration-200 whitespace-nowrap active:scale-95"
            title="Download complete 3-layer project source archive (.zip)"
          >
            <FolderArchive className="w-3.5 h-3.5 text-cyan-400" />
            <span className="hidden sm:inline">Project ZIP</span>
          </a>

          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-cyan-200/80 hover:text-white bg-[#04080e] hover:bg-[#07131e] border border-cyan-900/50 hover:border-cyan-400 hover:shadow-[0_0_14px_rgba(0,245,255,0.2)] transition-all duration-200 whitespace-nowrap active:scale-95"
          >
            <BookOpen className="w-3.5 h-3.5 text-cyan-400" />
            <span>Data Spec</span>
          </button>

          {hasData && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-cyan-400 hover:text-cyan-200 hover:bg-cyan-950/40 border border-cyan-900/40 hover:border-cyan-500/50 transition-all duration-200 whitespace-nowrap ml-1 active:scale-95"
              title="Clear loaded dataset"
            >
              <RotateCcw className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Reset</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
