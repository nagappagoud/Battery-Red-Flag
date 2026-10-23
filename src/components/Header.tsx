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
    <header className="border-b border-slate-800/80 bg-[#090d16]/95 backdrop-blur-md sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 h-14 flex items-center justify-between gap-6">
        {/* Brand Zone */}
        <div className="flex items-center gap-3 shrink-0">
          <div className="w-8 h-8 rounded-lg bg-slate-900 border border-slate-700/70 flex items-center justify-center text-slate-300">
            <Activity className="w-4 h-4 text-slate-300" />
          </div>
          <div className="flex items-baseline gap-2.5">
            <span className="font-semibold text-slate-100 text-sm tracking-tight whitespace-nowrap">
              EV BMS Data Analyzer
            </span>
            <span className="hidden sm:inline text-xs text-slate-500 font-normal">
              Telemetry Inspection &amp; Quality Audit
            </span>
          </div>
        </div>

        {/* Action Toolbar */}
        <div className="flex items-center gap-2 shrink-0">
          {!hasData && (
            <button
              onClick={onLoadDefaultSample}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700/80 border border-slate-700/80 transition-colors whitespace-nowrap"
            >
              <Upload className="w-3.5 h-3.5 text-slate-400" />
              <span>Load Sample</span>
            </button>
          )}

          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors whitespace-nowrap"
          >
            <Sliders className="w-3.5 h-3.5 text-slate-400" />
            <span>Screening Limits</span>
          </button>

          <button
            onClick={onOpenSupabase}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors whitespace-nowrap"
            title="Inspect Supabase PostgreSQL Database (gnckwhhsdquaxfyzlxhi)"
          >
            <span className="relative flex h-2 w-2">
              <span
                className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                  supabaseStatus?.connected ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span
                className={`relative inline-flex rounded-full h-2 w-2 ${
                  supabaseStatus?.connected ? 'bg-emerald-500' : 'bg-amber-500'
                }`}
              />
            </span>
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Supabase</span>
          </button>

          <a
            href="/api/download-project-zip"
            download="ev-bms-analyzer-3layer.zip"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors whitespace-nowrap"
            title="Download complete 3-layer project source archive (.zip)"
          >
            <FolderArchive className="w-3.5 h-3.5 text-slate-400" />
            <span className="hidden sm:inline">Project ZIP</span>
          </a>

          <button
            onClick={onOpenGuide}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-slate-100 bg-slate-900 hover:bg-slate-800 border border-slate-800 hover:border-slate-700 transition-colors whitespace-nowrap"
          >
            <BookOpen className="w-3.5 h-3.5 text-slate-400" />
            <span>Data Spec</span>
          </button>

          {hasData && (
            <button
              onClick={onReset}
              className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-400 hover:text-slate-200 hover:bg-slate-800/80 border border-transparent transition-colors whitespace-nowrap ml-1"
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
