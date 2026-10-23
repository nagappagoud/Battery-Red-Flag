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
    <div className="bg-[#0e131d] border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-5">
      {/* Top Header & Mode Tabs */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Upload className="w-4 h-4 text-slate-400" />
            <span>Telemetry Ingestion</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Accepts CSV telemetry with timestamp, vehicle_id, voltage_v, current_a, temperature_c, soc_pct, mode
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleDownloadSampleCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 rounded-lg transition-colors"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Download CSV Template</span>
          </button>

          <div className="bg-slate-900 p-0.5 rounded-lg border border-slate-800 flex items-center text-xs">
            <button
              onClick={() => setActiveTab('upload')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'upload'
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              File Upload
            </button>
            <button
              onClick={() => setActiveTab('manual')}
              className={`px-3 py-1 rounded-md font-medium transition-all ${
                activeTab === 'manual'
                  ? 'bg-slate-800 text-slate-100 shadow-sm'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Manual Editor
            </button>
          </div>
        </div>
      </div>

      {/* Error notification if any */}
      {errorMessage && (
        <div className="p-3 bg-rose-950/30 border border-rose-800/40 rounded-lg text-rose-300 text-xs flex items-center gap-2.5">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
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
            className={`border border-dashed rounded-xl p-8 sm:p-10 text-center cursor-pointer transition-all ${
              isDragging
                ? 'border-slate-500 bg-slate-800/40'
                : 'border-slate-700/60 hover:border-slate-600 bg-slate-900/30 hover:bg-slate-900/60'
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
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="p-2.5 bg-slate-800/80 text-slate-300 rounded-lg border border-slate-700/50">
                <FileText className="w-5 h-5" />
              </div>
              <div className="text-xs sm:text-sm text-slate-200 font-medium pt-1">
                Drop telemetry CSV here, or <span className="text-slate-300 underline underline-offset-4 hover:text-white">select file from disk</span>
              </div>
              <p className="text-[11px] text-slate-500 max-w-md font-mono">
                timestamp, vehicle_id, voltage_v, current_a, temperature_c, soc_pct, mode
              </p>
            </div>
          </div>

          {currentLoadedSource && (
            <div className="flex items-center justify-between text-xs px-3.5 py-2.5 bg-slate-900/70 border border-slate-800 rounded-lg text-slate-300">
              <div className="flex items-center gap-2">
                <FileCheck className="w-4 h-4 text-emerald-400" />
                <span>Active Dataset: <strong className="text-slate-100">{currentLoadedSource}</strong></span>
              </div>
              <span className="text-[11px] font-mono text-slate-400">Validated</span>
            </div>
          )}
        </div>
      )}

      {/* Manual Input Tab */}
      {activeTab === 'manual' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs text-slate-300 font-medium flex items-center gap-1.5">
              <Edit3 className="w-3.5 h-3.5 text-slate-400" />
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
              className="text-xs text-slate-400 hover:text-slate-200 underline"
            >
              Insert example rows
            </button>
          </div>
          <textarea
            value={manualText}
            onChange={(e) => setManualText(e.target.value)}
            placeholder={`timestamp,vehicle_id,voltage_v,current_a,temperature_c,soc_pct,mode\n2026-10-22T10:00:00Z,EV-01,395.2,-42.0,25.0,80.0,driving`}
            rows={6}
            className="w-full bg-[#090d16] border border-slate-800 rounded-lg p-3 font-mono text-xs text-slate-200 focus:outline-none focus:border-slate-600"
          />
          <div className="flex justify-end">
            <button
              onClick={handleManualSubmit}
              className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-medium border border-slate-700/80 transition-colors"
            >
              <Play className="w-3.5 h-3.5" />
              Parse &amp; Analyze
            </button>
          </div>
        </div>
      )}

      {/* Preset Demonstrations */}
      <div className="pt-2 border-t border-slate-800/60">
        <div className="flex items-center justify-between mb-2.5">
          <span className="text-xs font-medium text-slate-400">
            Reference Test Datasets:
          </span>
          <span className="text-[11px] text-slate-500">Select to evaluate parsing &amp; analytics</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {SAMPLE_DATASETS.map((sample) => (
            <button
              key={sample.id}
              onClick={() => onDataLoaded(sample.csvContent, sample.title, 'reference_sample', true)}
              className="text-left p-3.5 rounded-lg border border-slate-800/80 bg-slate-900/40 hover:bg-slate-800/50 hover:border-slate-700 transition-all group flex flex-col justify-between"
            >

              <div>
                <div className="flex items-center justify-between gap-2 mb-1">
                  <span className="text-xs font-semibold text-slate-200 group-hover:text-white transition-colors">
                    {sample.title}
                  </span>
                  <ChevronRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-slate-300 transition-colors shrink-0" />
                </div>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  {sample.description}
                </p>
              </div>
              <div className="pt-2 mt-2 border-t border-slate-800/60 text-[10px] font-mono text-slate-500">
                {sample.badge}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
