/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef } from 'react';
import {
  Upload,
  FileText,
  Download,
  Play,
  Edit3,
  AlertCircle,
  FileCheck,
  ChevronRight,
  Sparkles,
} from 'lucide-react';
import { SAMPLE_DATASETS, downloadCsvFile, SAMPLE_STANDARD_CYCLE } from '../utils/sampleData';
import { DataSourceType } from '../types/bms';

interface UploadSectionProps {
  onDataLoaded: (
    csvText: string,
    sourceName: string,
    dataSource?: DataSourceType,
    isSimulated?: boolean
  ) => void;
  currentLoadedSource?: string;
  hasData: boolean;
}

export const UploadSection: React.FC<UploadSectionProps> = ({
  onDataLoaded,
  currentLoadedSource,
  hasData,
}) => {
  const [activeTab, setActiveTab] = useState<'upload' | 'manual'>('upload');
  const [manualText, setManualText] = useState<string>('');
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileProcess = (file: File) => {
    setErrorMessage(null);
    if (!file.name.endsWith('.csv') && !file.name.endsWith('.txt')) {
      setErrorMessage('Please upload a valid CSV file (.csv or .txt).');
      return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      if (!text || text.trim().length === 0) {
        setErrorMessage('Uploaded file is empty.');
        return;
      }
      onDataLoaded(text, file.name, 'uploaded_csv', false);
    };
    reader.onerror = () => {
      setErrorMessage('Failed to read file. Please try again.');
    };
    reader.readAsText(file);
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = () => {
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleManualSubmit = () => {
    setErrorMessage(null);
    if (!manualText.trim()) {
      setErrorMessage('Please paste or enter CSV records first.');
      return;
    }
    onDataLoaded(manualText, 'Manual Entry Records', 'manual_entry', false);
  };

  const handleDownloadSampleCsv = () => {
    downloadCsvFile(SAMPLE_STANDARD_CYCLE.trim(), 'sample_bms_telemetry.csv');
  };

  return (
    <div className="cockpit-panel p-5 sm:p-6 space-y-5">
      {/* Top Header & Mode Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-950/60 pb-3">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Upload className="w-4 h-4 text-cyan-400" />
            <span>Upload Battery Telemetry</span>
          </h2>
          <p className="text-[11px] text-cyan-300/70 mt-0.5 font-mono">
            Format: timestamp, vehicle_id, voltage_v, current_a, temperature_c, soc_pct, mode
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSampleCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-200/80 hover:text-white bg-[#050c14] hover:bg-[#091724] border border-cyan-900/50 hover:border-cyan-400/80 rounded-lg transition-all duration-200 active:scale-95"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Download CSV Template</span>
          </button>

          <div className="bg-[#03060a] p-0.5 rounded-lg border border-cyan-950/80 flex items-center text-xs">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,245,255,0.2)]'
                  : 'text-cyan-400/60 hover:text-cyan-200'
              }`}
            >
              File Upload
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'manual'
                  ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,245,255,0.2)]'
                  : 'text-cyan-400/60 hover:text-cyan-200'
              }`}
            >
              Manual Editor
            </button>
          </div>
        </div>
      </div>

      {/* Error notification if any */}
      {errorMessage && (
        <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-lg text-red-200 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-red-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* Upload Drop Zone Tab */}
      {activeTab === 'upload' && (
        <div className="space-y-4">
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`upload-neon-zone rounded-xl p-8 sm:p-11 text-center cursor-pointer relative overflow-hidden group ${
              isDragging ? 'is-dragging' : ''
            }`}
          >
            <input
              type="file"
              ref={fileInputRef}
              accept=".csv,.txt"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  handleFileProcess(e.target.files[0]);
                }
              }}
            />

            {/* Glowing sweep overlay line on hover */}
            <div className="absolute inset-0 bg-gradient-to-r from-transparent via-cyan-400/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />

            <div className="flex flex-col items-center justify-center space-y-2.5 relative z-10">
              <div className="p-3 bg-cyan-950/40 text-cyan-400 rounded-xl border border-cyan-500/30 group-hover:border-cyan-400 group-hover:shadow-[0_0_20px_rgba(0,245,255,0.35)] transition-all duration-300 group-hover:scale-105">
                <FileText className="w-6 h-6 text-cyan-300" />
              </div>
              <div className="text-xs sm:text-sm text-cyan-100 font-medium">
                Drop telemetry CSV here, or <span className="text-cyan-400 underline underline-offset-4 hover:text-white transition-colors">browse file</span>
              </div>
              <p className="text-[11px] text-cyan-400/60 font-mono">
                Supports standard BMS logs (.csv, .txt) with UTC or ISO-8601 timestamps
              </p>
            </div>
          </div>

          {currentLoadedSource && (
            <div className="flex items-center justify-between text-xs px-3.5 py-2.5 bg-[#03070d] border border-cyan-900/50 rounded-lg text-cyan-200">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-cyan-400" />
                <span>Active Dataset: <strong className="text-white">{currentLoadedSource}</strong></span>
              </div>
              <span className="text-[11px] font-mono text-cyan-400">Telemetry Loaded</span>
            </div>
          )}
        </div>
      )}

      {/* Manual Input Tab */}
      {activeTab === 'manual' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-cyan-300 font-medium flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-cyan-400" />
              Direct CSV Input
            </span>
            <button
              onClick={() => {
                setManualText(
                  `timestamp,vehicle_id,voltage_v,current_a,temperature_c,soc_pct,mode\n` +
                    `2026-10-22T14:00:00Z,CAR-01,392.4,-35.0,24.0,80.0,driving\n` +
                    `2026-10-22T14:02:00Z,CAR-01,390.1,-62.0,25.2,78.5,driving\n` +
                    `2026-10-22T14:04:00Z,CAR-01,388.5,-50.0,26.5,77.2,driving\n` +
                    `2026-10-22T14:06:00Z,CAR-01,394.0,20.0,27.0,77.5,driving\n` +
                    `2026-10-22T14:08:00Z,CAR-01,391.0,0.0,26.8,77.5,idle`
                );
              }}
              className="text-xs text-cyan-400/80 hover:text-cyan-200 underline transition-colors"
            >
              Insert example rows
            </button>
          </div>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={`timestamp,vehicle_id,voltage_v,current_a,temperature_c,soc_pct,mode\n2026-10-22T10:00:00Z,EV-01,395.2,-42.0,25.0,80.0,driving`}
            rows={6}
            className="w-full bg-[#020509] border border-cyan-900/50 rounded-lg p-3 font-mono text-xs text-cyan-100 placeholder-cyan-900/60 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_15px_rgba(0,245,255,0.25)] transition-all"
          />
          <div className="flex justify-end">
            <button
              onClick={handleManualSubmit}
              className="flex items-center gap-2 px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-black font-semibold rounded-lg text-xs border border-cyan-300 shadow-[0_0_18px_rgba(0,245,255,0.3)] hover:shadow-[0_0_26px_rgba(0,245,255,0.5)] transition-all duration-200 active:scale-95"
            >
              <Play className="w-3.5 h-3.5 fill-black" />
              Parse &amp; Analyze
            </button>
          </div>
        </div>
      )}

      {/* Preset Demonstrations */}
      <div className="pt-3 border-t border-cyan-950/60">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-medium text-cyan-300">
            Reference Test Datasets:
          </span>
          <span className="text-[11px] text-cyan-400/60 font-mono">Click to inspect in oscilloscope</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SAMPLE_DATASETS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onDataLoaded(sample.csvContent, sample.title, 'reference_sample', true)}
              className="text-left p-4 rounded-xl border border-cyan-900/40 bg-[#03080e]/70 hover:bg-[#06121d] hover:border-cyan-400/70 hover:shadow-[0_0_20px_rgba(0,245,255,0.2)] transition-all duration-200 group flex flex-col justify-between active:scale-[0.98]"
            >
              <div>
                <div className="flex items-center justify-between gap-2 mb-1.5">
                  <span className="text-xs font-semibold text-white group-hover:text-cyan-300 transition-colors">
                    {sample.title}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-cyan-600 group-hover:text-cyan-300 group-hover:translate-x-0.5 transition-all shrink-0" />
                </div>
                <p className="text-[11px] text-cyan-200/60 leading-relaxed">
                  {sample.description}
                </p>
              </div>
              <div className="pt-2 mt-2.5 border-t border-cyan-950/60 text-[10px] font-mono text-cyan-400/80">
                {sample.badge}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
