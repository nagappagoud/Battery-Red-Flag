/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BMSAnalysisResult,
  DEFAULT_PLAUSIBILITY_CONFIG,
  PlausibilityConfig,
} from './types/bms';
import { parseBmsCsv } from './utils/bmsParser';
import { groupAndSummarizeBmsData } from './utils/bmsAggregator';
import { SAMPLE_STANDARD_CYCLE } from './utils/sampleData';

import { Header } from './components/Header';
import { DisclaimerBanner } from './components/DisclaimerBanner';
import { UploadSection } from './components/UploadSection';
import { QualityCheckReport } from './components/QualityCheckReport';
import { SessionSummaryView } from './components/SessionSummaryView';
import { InteractiveCharts } from './components/InteractiveCharts';
import { DataPreviewTable } from './components/DataPreviewTable';
import { MethodologyNote } from './components/MethodologyNote';
import { PlausibilitySettingsModal } from './components/PlausibilitySettingsModal';
import { DocumentationModal } from './components/DocumentationModal';

import {
  Layers,
  Gauge,
  LineChart,
  Table,
  Upload,
  BookOpen,
  Sliders,
} from 'lucide-react';

export default function App() {
  const [csvContent, setCsvContent] = useState<string>('');
  const [loadedSourceTitle, setLoadedSourceTitle] = useState<string>('');
  const [config, setConfig] = useState<PlausibilityConfig>(DEFAULT_PLAUSIBILITY_CONFIG);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'sessions' | 'charts' | 'table' | 'upload'>('overview');

  // Selected vehicle & session
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);

  // Analyze BMS data whenever CSV or screening config changes
  const analysisResult: BMSAnalysisResult | null = useMemo(() => {
    if (!csvContent.trim()) return null;

    const { records, qualityReport } = parseBmsCsv(csvContent, config);
    const { vehicleGroups, vehicleIds } = groupAndSummarizeBmsData(records, config);

    return {
      records,
      qualityReport,
      vehicleGroups,
      vehicleIds,
      configUsed: config,
    };
  }, [csvContent, config]);

  // Keep selected vehicle & session valid
  useEffect(() => {
    if (analysisResult && analysisResult.vehicleIds.length > 0) {
      const currentValid = analysisResult.vehicleIds.includes(selectedVehicleId);
      const targetVehicle = currentValid ? selectedVehicleId : analysisResult.vehicleIds[0];
      if (!currentValid) {
        setSelectedVehicleId(targetVehicle);
      }

      const currentGroup = analysisResult.vehicleGroups[targetVehicle];
      if (currentGroup) {
        const allSessions = [currentGroup.overallSummary, ...currentGroup.sessions];
        const sessionValid = allSessions.some((s) => s.id === selectedSessionId);
        if (!sessionValid) {
          setSelectedSessionId(currentGroup.overallSummary.id);
        }
      }
    }
  }, [analysisResult, selectedVehicleId, selectedSessionId]);

  const handleDataLoaded = useCallback((newCsv: string, sourceName: string) => {
    setCsvContent(newCsv);
    setLoadedSourceTitle(sourceName);
    setActiveTab('overview');
  }, []);

  const handleLoadDefaultSample = useCallback(() => {
    handleDataLoaded(SAMPLE_STANDARD_CYCLE.trim(), 'Standard Drive & DC Fast-Charge Cycle');
  }, [handleDataLoaded]);

  const handleResetData = useCallback(() => {
    setCsvContent('');
    setLoadedSourceTitle('');
    setSelectedVehicleId('');
    setSelectedSessionId('');
    setActiveTab('upload');
  }, []);

  const activeRecordsForCharts = useMemo(() => {
    if (!analysisResult || !selectedVehicleId) return [];
    const group = analysisResult.vehicleGroups[selectedVehicleId];
    if (!group) return [];

    const allSessions = [group.overallSummary, ...group.sessions];
    const session = allSessions.find((s) => s.id === selectedSessionId);
    return session ? session.records : group.overallSummary.records;
  }, [analysisResult, selectedVehicleId, selectedSessionId]);

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-200 flex flex-col font-sans selection:bg-slate-800 selection:text-slate-100">
      {/* Top Application Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onReset={handleResetData}
        onLoadDefaultSample={handleLoadDefaultSample}
        hasData={!!analysisResult}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* Core Disclaimer Banner */}
        <DisclaimerBanner tempThreshold={config.tempAlertThreshold} />

        {/* If no data loaded yet, show clean workbench empty state */}
        {!analysisResult ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Clean Engineering Workspace Landing */}
            <div className="bg-[#0e131d] border border-slate-800/80 rounded-xl p-8 sm:p-10 text-center space-y-4">
              <div className="max-w-xl mx-auto space-y-2">
                <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-100">
                  EV Battery Telemetry Inspection
                </h2>
                <p className="text-xs sm:text-sm text-slate-400 leading-relaxed">
                  Ingest raw or pre-filtered BMS time-series streams to run deterministic data-quality verification, evaluate chronological consistency, segment driving and charging sessions, and inspect synchronized parametric waveforms.
                </p>
              </div>

              <div className="pt-2 flex flex-wrap items-center justify-center gap-3">
                <button
                  onClick={handleLoadDefaultSample}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-slate-200 hover:bg-white text-slate-900 transition-colors"
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Load Reference Dataset</span>
                </button>
                <button
                  onClick={() => setIsSettingsOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <Sliders className="w-3.5 h-3.5 text-slate-400" />
                  <span>Configure Screening Bounds</span>
                </button>
                <button
                  onClick={() => setIsGuideOpen(true)}
                  className="flex items-center gap-2 px-4 py-2 rounded-lg text-xs font-medium bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 hover:border-slate-700 transition-colors"
                >
                  <BookOpen className="w-3.5 h-3.5 text-slate-400" />
                  <span>CSV Format Guide</span>
                </button>
              </div>
            </div>

            {/* Ingestion & Upload Component */}
            <UploadSection
              onDataLoaded={handleDataLoaded}
              currentLoadedSource={loadedSourceTitle}
              hasData={false}
            />

            {/* Methodology Note */}
            <MethodologyNote />
          </div>
        ) : (
          /* Active Data Loaded State */
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Navigation Tabs Bar */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-slate-800/80 pb-2">
              <div className="flex items-center gap-1 min-w-max p-1 bg-slate-900/60 border border-slate-800/80 rounded-lg">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'overview'
                      ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/70'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5" />
                  <span>Overview &amp; Sessions</span>
                </button>

                <button
                  onClick={() => setActiveTab('charts')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'charts'
                      ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/70'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <LineChart className="w-3.5 h-3.5" />
                  <span>Waveforms</span>
                </button>

                <button
                  onClick={() => setActiveTab('quality')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'quality'
                      ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/70'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5" />
                  <span>Quality Audit</span>
                  {analysisResult.qualityReport.rowsWithIssuesCount > 0 && (
                    <span className="font-mono text-[10px] text-slate-400">
                      ({analysisResult.qualityReport.rowsWithIssuesCount})
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'table'
                      ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/70'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Table className="w-3.5 h-3.5" />
                  <span>Records ({analysisResult.records.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                    activeTab === 'upload'
                      ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/70'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5" />
                  <span>Ingest Stream</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center text-xs text-slate-500 font-mono">
                Source: <span className="text-slate-300 font-medium ml-1.5">{loadedSourceTitle}</span>
              </div>
            </div>

            {/* Tab 1: Overview & Sessions */}
            {activeTab === 'overview' && (
              <div className="space-y-6">
                <SessionSummaryView
                  analysis={analysisResult}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={setSelectedVehicleId}
                  selectedSessionId={selectedSessionId}
                  onSelectSession={setSelectedSessionId}
                />

                <InteractiveCharts
                  records={activeRecordsForCharts}
                  config={config}
                />

                <QualityCheckReport
                  report={analysisResult.qualityReport}
                  config={config}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />

                <MethodologyNote />
              </div>
            )}

            {/* Tab 2: Waveforms */}
            {activeTab === 'charts' && (
              <div className="space-y-6">
                <SessionSummaryView
                  analysis={analysisResult}
                  selectedVehicleId={selectedVehicleId}
                  onSelectVehicle={setSelectedVehicleId}
                  selectedSessionId={selectedSessionId}
                  onSelectSession={setSelectedSessionId}
                />

                <InteractiveCharts
                  records={activeRecordsForCharts}
                  config={config}
                />
              </div>
            )}

            {/* Tab 3: Quality Audit */}
            {activeTab === 'quality' && (
              <div className="space-y-6">
                <QualityCheckReport
                  report={analysisResult.qualityReport}
                  config={config}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              </div>
            )}

            {/* Tab 4: Records Table */}
            {activeTab === 'table' && (
              <div className="space-y-6">
                <DataPreviewTable records={analysisResult.records} />
              </div>
            )}

            {/* Tab 5: Ingest Stream */}
            {activeTab === 'upload' && (
              <div className="space-y-6">
                <UploadSection
                  onDataLoaded={handleDataLoaded}
                  currentLoadedSource={loadedSourceTitle}
                  hasData={true}
                />
              </div>
            )}
          </div>
        )}
      </main>

      {/* Global Modals */}
      <PlausibilitySettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        config={config}
        onSave={(newCfg) => setConfig(newCfg)}
      />

      <DocumentationModal
        isOpen={isGuideOpen}
        onClose={() => setIsGuideOpen(false)}
      />

      {/* Footer */}
      <footer className="border-t border-slate-900 bg-[#070a12] py-5 text-center text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p>
            EV BMS Data Analyzer · Deterministic Telemetry Quality Screener &amp; Descriptive Analyzer
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsGuideOpen(true)}
              className="hover:text-slate-300"
            >
              Schema Reference
            </button>
            <span className="text-slate-700">·</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-slate-300"
            >
              Screening Boundaries
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}
