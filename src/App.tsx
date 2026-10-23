/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  BMSAnalysisResult,
  DEFAULT_PLAUSIBILITY_CONFIG,
  DataSourceType,
  InvestigationResult,
  PlausibilityConfig,
  SupabaseStatus,
} from './types/bms';
import { parseBmsCsv } from './utils/bmsParser';
import { groupAndSummarizeBmsData } from './utils/bmsAggregator';
import { SAMPLE_STANDARD_CYCLE } from './utils/sampleData';

import { Header } from './components/Header';
import { UploadSection } from './components/UploadSection';
import { QualityCheckReport } from './components/QualityCheckReport';
import { SessionSummaryView } from './components/SessionSummaryView';
import { InteractiveCharts } from './components/InteractiveCharts';
import { DataPreviewTable } from './components/DataPreviewTable';
import { PlausibilitySettingsModal } from './components/PlausibilitySettingsModal';
import { DocumentationModal } from './components/DocumentationModal';
import { SupabaseModal } from './components/SupabaseModal';
import { InvestigationPanel } from './components/InvestigationPanel';


import {
  Layers,
  Gauge,
  LineChart,
  Table,
  Upload,
  BookOpen,
  Sliders,
  ShieldAlert,
} from 'lucide-react';
import { fetchSupabaseStatus, fetchPersistedSessionDetails } from './utils/supabaseClient';

export default function App() {
  const [csvContent, setCsvContent] = useState<string>(() => {
    return localStorage.getItem('bms_active_csv') || '';
  });
  const [loadedSourceTitle, setLoadedSourceTitle] = useState<string>(() => {
    return localStorage.getItem('bms_active_source_title') || '';
  });
  const [dataSource, setDataSource] = useState<DataSourceType>(() => {
    return (localStorage.getItem('bms_active_data_source') as DataSourceType) || 'reference_sample';
  });
  const [isSimulated, setIsSimulated] = useState<boolean>(() => {
    return localStorage.getItem('bms_active_is_simulated') === 'true';
  });
  const [activeSessionDbId, setActiveSessionDbId] = useState<string | undefined>(() => {
    return localStorage.getItem('bms_active_session_db_id') || undefined;
  });
  const [existingInvestigation, setExistingInvestigation] = useState<InvestigationResult | null>(null);
  const [config, setConfig] = useState<PlausibilityConfig>(DEFAULT_PLAUSIBILITY_CONFIG);

  // Active navigation tab
  const [activeTab, setActiveTab] = useState<'overview' | 'quality' | 'sessions' | 'charts' | 'table' | 'upload' | 'investigation'>('overview');

  // Selected vehicle & session
  const [selectedVehicleId, setSelectedVehicleId] = useState<string>('');
  const [selectedSessionId, setSelectedSessionId] = useState<string>('');

  // Modals
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isGuideOpen, setIsGuideOpen] = useState(false);
  const [isSupabaseModalOpen, setIsSupabaseModalOpen] = useState(false);
  const [supabaseStatus, setSupabaseStatus] = useState<SupabaseStatus | null>(null);

  // Check Supabase health on startup
  const checkStatus = useCallback(() => {
    fetchSupabaseStatus().then((s) => setSupabaseStatus(s));
  }, []);

  useEffect(() => {
    checkStatus();
  }, [checkStatus]);

  // Persist session to localStorage so active view survives browser refreshes
  useEffect(() => {
    if (csvContent) {
      localStorage.setItem('bms_active_csv', csvContent);
      localStorage.setItem('bms_active_source_title', loadedSourceTitle);
      localStorage.setItem('bms_active_data_source', dataSource);
      localStorage.setItem('bms_active_is_simulated', String(isSimulated));
      if (activeSessionDbId) {
        localStorage.setItem('bms_active_session_db_id', activeSessionDbId);
      } else {
        localStorage.removeItem('bms_active_session_db_id');
      }
    }
  }, [csvContent, loadedSourceTitle, dataSource, isSimulated, activeSessionDbId]);

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

  const handleDataLoaded = useCallback((
    newCsv: string,
    sourceName: string,
    srcType: DataSourceType = 'uploaded_csv',
    simulated: boolean = false
  ) => {
    setCsvContent(newCsv);
    setLoadedSourceTitle(sourceName);
    setDataSource(srcType);
    setIsSimulated(simulated);
    setActiveSessionDbId(undefined);
    setExistingInvestigation(null);
    setActiveTab('overview');
  }, []);

  const handleLoadDefaultSample = useCallback(() => {
    handleDataLoaded(
      SAMPLE_STANDARD_CYCLE.trim(),
      'Standard Drive & DC Fast-Charge Cycle',
      'reference_sample',
      true
    );
  }, [handleDataLoaded]);

  const handleResetData = useCallback(() => {
    setCsvContent('');
    setLoadedSourceTitle('');
    setSelectedVehicleId('');
    setSelectedSessionId('');
    setActiveSessionDbId(undefined);
    setExistingInvestigation(null);
    localStorage.removeItem('bms_active_csv');
    localStorage.removeItem('bms_active_source_title');
    localStorage.removeItem('bms_active_data_source');
    localStorage.removeItem('bms_active_is_simulated');
    localStorage.removeItem('bms_active_session_db_id');
    setActiveTab('upload');
  }, []);

  const handleLoadPersistedSession = useCallback(async (sessionId: string) => {
    const data = await fetchPersistedSessionDetails(sessionId);
    if (!data || !data.records || data.records.length === 0) return;

    const header = 'timestamp,vehicle_id,voltage_v,current_a,temperature_c,soc_pct,mode';
    const lines = [
      header,
      ...data.records.map((r: any) =>
        `${r.timestamp || ''},${r.vehicle_id || ''},${r.voltage_v ?? ''},${r.current_a ?? ''},${r.temperature_c ?? ''},${r.soc_pct ?? ''},${r.mode || ''}`
      ),
    ];
    const reconstructedCsv = lines.join('\n');

    setCsvContent(reconstructedCsv);
    setLoadedSourceTitle(data.session?.label || `Supabase Session (${sessionId})`);
    setDataSource('supabase_stored');
    setIsSimulated(data.session?.is_simulated || false);
    setActiveSessionDbId(sessionId);
    setExistingInvestigation(data.investigation || null);
    if (data.session?.config_used) {
      setConfig((prev) => ({ ...prev, ...data.session.config_used }));
    }
    setActiveTab('overview');
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
    <div className="min-h-screen bg-[#020408] text-cyan-100 flex flex-col font-sans selection:bg-cyan-400 selection:text-black">
      {/* Top Application Header */}
      <Header
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenGuide={() => setIsGuideOpen(true)}
        onOpenSupabase={() => setIsSupabaseModalOpen(true)}
        onReset={handleResetData}
        onLoadDefaultSample={handleLoadDefaultSample}
        hasData={!!analysisResult}
        supabaseStatus={supabaseStatus}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 py-6 space-y-6">
        {/* If no data loaded yet, show clean minimal landing state */}
        {!analysisResult ? (
          <div className="space-y-6 animate-in fade-in duration-200">
            {/* Cyber Cockpit Hero Section */}
            <div className="cockpit-panel p-6 sm:p-7 text-center relative overflow-hidden group">
              <div className="absolute top-0 left-0 right-0 h-[1px] bg-gradient-to-r from-transparent via-cyan-400 to-transparent opacity-70 animate-pulse" />
              <div className="relative z-10 space-y-2">
                <div className="inline-flex items-center gap-2 px-2.5 py-0.5 rounded-full bg-cyan-950/60 border border-cyan-500/30 text-[11px] font-mono text-cyan-300 mb-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-ping" />
                  <span>OSCILLOSCOPE &amp; TELEMETRY SCREENER</span>
                </div>
                <h2 className="text-xl sm:text-2xl font-bold tracking-tight text-white">
                  EV Battery Telemetry <span className="text-cyan-400 drop-shadow-[0_0_14px_rgba(0,245,255,0.45)]">Inspection</span>
                </h2>
                <p className="text-xs sm:text-sm text-cyan-200/70 max-w-lg mx-auto leading-relaxed">
                  Upload battery telemetry data to analyze performance and detect data-quality issues.
                </p>
              </div>
            </div>

            {/* Ingestion & Upload Component */}
            <UploadSection
              onDataLoaded={handleDataLoaded}
              currentLoadedSource={loadedSourceTitle}
              hasData={false}
            />
          </div>
        ) : (

          /* Active Data Loaded State */
          <div className="space-y-6 animate-in fade-in duration-150">
            {/* Navigation Tabs Bar */}
            <div className="flex items-center justify-between gap-2 overflow-x-auto border-b border-cyan-950/80 pb-2">
              <div className="flex items-center gap-1 min-w-max p-1 bg-[#03070d] border border-cyan-950/90 rounded-xl shadow-inner">
                <button
                  onClick={() => setActiveTab('overview')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'overview'
                      ? 'bg-cyan-950/70 text-cyan-200 shadow-[0_0_16px_rgba(0,245,255,0.25)] border border-cyan-500/50 font-semibold'
                      : 'text-cyan-400/60 hover:text-cyan-200 hover:bg-[#07131e]'
                  }`}
                >
                  <Layers className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Overview &amp; Sessions</span>
                </button>

                <button
                  onClick={() => setActiveTab('charts')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'charts'
                      ? 'bg-cyan-950/70 text-cyan-200 shadow-[0_0_16px_rgba(0,245,255,0.25)] border border-cyan-500/50 font-semibold'
                      : 'text-cyan-400/60 hover:text-cyan-200 hover:bg-[#07131e]'
                  }`}
                >
                  <LineChart className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Waveforms</span>
                </button>

                <button
                  onClick={() => setActiveTab('quality')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'quality'
                      ? 'bg-cyan-950/70 text-cyan-200 shadow-[0_0_16px_rgba(0,245,255,0.25)] border border-cyan-500/50 font-semibold'
                      : 'text-cyan-400/60 hover:text-cyan-200 hover:bg-[#07131e]'
                  }`}
                >
                  <Gauge className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Quality Audit</span>
                  {analysisResult.qualityReport.rowsWithIssuesCount > 0 && (
                    <span className="font-mono text-[10px] text-cyan-300 bg-cyan-900/40 px-1.5 py-0.2 rounded border border-cyan-600/40">
                      ({analysisResult.qualityReport.rowsWithIssuesCount})
                    </span>
                  )}
                </button>

                <button
                  onClick={() => setActiveTab('investigation')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'investigation'
                      ? 'bg-cyan-950/70 text-cyan-200 shadow-[0_0_16px_rgba(0,245,255,0.25)] border border-cyan-500/50 font-semibold'
                      : 'text-cyan-400/60 hover:text-cyan-200 hover:bg-[#07131e]'
                  }`}
                >
                  <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Investigation &amp; DB</span>
                </button>

                <button
                  onClick={() => setActiveTab('table')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'table'
                      ? 'bg-cyan-950/70 text-cyan-200 shadow-[0_0_16px_rgba(0,245,255,0.25)] border border-cyan-500/50 font-semibold'
                      : 'text-cyan-400/60 hover:text-cyan-200 hover:bg-[#07131e]'
                  }`}
                >
                  <Table className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Records ({analysisResult.records.length})</span>
                </button>

                <button
                  onClick={() => setActiveTab('upload')}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                    activeTab === 'upload'
                      ? 'bg-cyan-950/70 text-cyan-200 shadow-[0_0_16px_rgba(0,245,255,0.25)] border border-cyan-500/50 font-semibold'
                      : 'text-cyan-400/60 hover:text-cyan-200 hover:bg-[#07131e]'
                  }`}
                >
                  <Upload className="w-3.5 h-3.5 text-cyan-400" />
                  <span>Ingest Stream</span>
                </button>
              </div>

              <div className="hidden sm:flex items-center text-xs text-cyan-400/60 font-mono">
                Source: <span className="text-cyan-200 font-medium ml-1.5">{loadedSourceTitle}</span>
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

                <InvestigationPanel
                  analysis={analysisResult}
                  selectedVehicleId={selectedVehicleId}
                  sourceTitle={loadedSourceTitle}
                  dataSource={dataSource}
                  isSimulated={isSimulated}
                  config={config}
                  supabaseStatus={supabaseStatus}
                  activeSessionDbId={activeSessionDbId}
                  onSessionPersisted={(id) => setActiveSessionDbId(id)}
                  existingInvestigation={existingInvestigation}
                  onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
                />

                <QualityCheckReport
                  report={analysisResult.qualityReport}
                  config={config}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
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

            {/* Tab 4: Investigation & Database */}
            {activeTab === 'investigation' && (
              <div className="space-y-6">
                <InvestigationPanel
                  analysis={analysisResult}
                  selectedVehicleId={selectedVehicleId}
                  sourceTitle={loadedSourceTitle}
                  dataSource={dataSource}
                  isSimulated={isSimulated}
                  config={config}
                  supabaseStatus={supabaseStatus}
                  activeSessionDbId={activeSessionDbId}
                  onSessionPersisted={(id) => setActiveSessionDbId(id)}
                  existingInvestigation={existingInvestigation}
                  onOpenSupabaseModal={() => setIsSupabaseModalOpen(true)}
                />

                <QualityCheckReport
                  report={analysisResult.qualityReport}
                  config={config}
                  onOpenSettings={() => setIsSettingsOpen(true)}
                />
              </div>
            )}

            {/* Tab 5: Records Table */}
            {activeTab === 'table' && (
              <div className="space-y-6">
                <DataPreviewTable records={analysisResult.records} />
              </div>
            )}

            {/* Tab 6: Ingest Stream */}
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

      <SupabaseModal
        isOpen={isSupabaseModalOpen}
        onClose={() => setIsSupabaseModalOpen(false)}
        status={supabaseStatus}
        onRefreshStatus={checkStatus}
        onLoadSession={handleLoadPersistedSession}
      />

      {/* Footer */}
      <footer className="border-t border-cyan-950/80 bg-[#020509] py-5 text-center text-xs text-cyan-500/70">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-3">
          <p className="font-medium text-cyan-300/80">
            EV BMS <span className="text-cyan-400">Data Analyzer</span>
          </p>
          <div className="flex items-center gap-3">
            <button
              onClick={() => setIsSupabaseModalOpen(true)}
              className="hover:text-cyan-200 transition-colors"
            >
              Supabase Status
            </button>
            <span className="text-cyan-900">·</span>
            <button
              onClick={() => setIsGuideOpen(true)}
              className="hover:text-cyan-200 transition-colors"
            >
              Data Spec
            </button>
            <span className="text-cyan-900">·</span>
            <button
              onClick={() => setIsSettingsOpen(true)}
              className="hover:text-cyan-200 transition-colors"
            >
              Screening Limits
            </button>
          </div>
        </div>
      </footer>
    </div>
  );
}

