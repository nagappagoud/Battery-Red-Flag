/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  Database,
  CheckCircle2,
  Save,
  AlertTriangle,
  FileCheck,
  FileText,
  UserCheck,
  Loader2,
} from 'lucide-react';
import {
  BMSAnalysisResult,
  DataSourceType,
  InvestigationResult,
  InvestigationStatus,
  PlausibilityConfig,
  RootCauseCategory,
  SupabaseStatus,
} from '../types/bms';
import { persistAnalysisToSupabase, saveInvestigationApi } from '../utils/supabaseClient';

interface InvestigationPanelProps {
  analysis: BMSAnalysisResult;
  selectedVehicleId: string;
  sourceTitle: string;
  dataSource: DataSourceType;
  isSimulated: boolean;
  config: PlausibilityConfig;
  supabaseStatus: SupabaseStatus | null;
  activeSessionDbId?: string;
  onSessionPersisted?: (sessionId: string) => void;
  existingInvestigation?: InvestigationResult | null;
  onOpenSupabaseModal: () => void;
}

export const InvestigationPanel: React.FC<InvestigationPanelProps> = ({
  analysis,
  selectedVehicleId,
  sourceTitle,
  dataSource,
  isSimulated,
  config,
  supabaseStatus,
  activeSessionDbId,
  onSessionPersisted,
  existingInvestigation,
  onOpenSupabaseModal,
}) => {
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Investigation fields
  const [status, setStatus] = useState<InvestigationStatus>(
    existingInvestigation?.status || (analysis.qualityReport.rowsWithIssuesCount > 0 ? 'pending' : 'resolved')
  );
  const [rootCause, setRootCause] = useState<RootCauseCategory>(
    existingInvestigation?.root_cause_category || (analysis.qualityReport.rowsWithIssuesCount > 0 ? 'thermal_excursion' : 'normal_operation')
  );
  const [engineerNotes, setEngineerNotes] = useState<string>(
    existingInvestigation?.engineer_notes ||
      (analysis.qualityReport.rowsWithIssuesCount > 0
        ? `Triage: ${analysis.qualityReport.rowsWithIssuesCount} anomalies flagged. Inspecting thermal dissipation and sensor calibration.`
        : 'Telemetry baseline healthy. All measurements strictly within plausibility limits.')
  );
  const [isSavingInvestigation, setIsSavingInvestigation] = useState(false);
  const [investigationSaved, setInvestigationSaved] = useState(false);

  useEffect(() => {
    if (existingInvestigation) {
      setStatus(existingInvestigation.status);
      setRootCause(existingInvestigation.root_cause_category);
      setEngineerNotes(existingInvestigation.engineer_notes);
    }
  }, [existingInvestigation]);

  const handlePersistToSupabase = async () => {
    setIsSaving(true);
    setErrorMessage(null);
    setSaveSuccess(false);

    try {
      const res = await persistAnalysisToSupabase({
        vehicleId: selectedVehicleId || analysis.vehicleIds[0] || 'EV-01',
        sourceName: sourceTitle,
        dataSource,
        isSimulated,
        analysis,
        config,
      });

      if (!res.success) {
        setErrorMessage(res.error || 'Failed to save to Supabase.');
      } else {
        setSaveSuccess(true);
        if (res.sessionId && onSessionPersisted) {
          onSessionPersisted(res.sessionId);
        }
        setTimeout(() => setSaveSuccess(false), 3500);
      }
    } catch (err: any) {
      setErrorMessage(err?.message || 'Network error.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleSaveInvestigation = async () => {
    const sessionId = activeSessionDbId || `sess_${selectedVehicleId}_local`;
    setIsSavingInvestigation(true);

    try {
      await saveInvestigationApi({
        sessionId,
        vehicleId: selectedVehicleId,
        status,
        engineerNotes,
        rootCauseCategory: rootCause,
        findings: {
          totalRows: analysis.qualityReport.totalRows,
          issuesCount: analysis.qualityReport.rowsWithIssuesCount,
        },
      });
      setInvestigationSaved(true);
      setTimeout(() => setInvestigationSaved(false), 3000);
    } finally {
      setIsSavingInvestigation(false);
    }
  };

  const isPersisted = Boolean(activeSessionDbId);

  return (
    <div className="cockpit-panel p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-950/60 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-cyan-400" />
            <span>Battery Investigation &amp; Supabase Storage</span>
          </h2>
          <p className="text-xs text-cyan-200/70 mt-0.5">
            Record engineering diagnostic findings, root-cause categorization, and persist telemetry to Supabase PostgreSQL.
          </p>
        </div>

        {/* Persistence Status Badge */}
        <div className="flex items-center gap-2">
          {isPersisted ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-cyan-950/70 text-cyan-300 border border-cyan-400/60 shadow-[0_0_12px_rgba(0,245,255,0.25)]">
              <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
              <span>Persisted in Supabase</span>
            </div>
          ) : (
            <button
              onClick={handlePersistToSupabase}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-cyan-500 hover:bg-cyan-400 text-black border border-cyan-300 transition-all duration-200 disabled:opacity-50 shadow-[0_0_18px_rgba(0,245,255,0.3)] hover:shadow-[0_0_24px_rgba(0,245,255,0.5)] active:scale-95"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-black" />
                  <span>Saving to PostgreSQL...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-black" />
                  <span>Saved Successfully</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-black" />
                  <span>Persist to Supabase</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onOpenSupabaseModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-cyan-200/80 hover:text-white bg-[#04080e] hover:bg-[#07131e] border border-cyan-900/50 hover:border-cyan-400 transition-all duration-200 active:scale-95 shadow-sm"
          >
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span>Manage DB</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-red-950/40 border border-red-500/40 rounded-xl text-red-200 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-red-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={onOpenSupabaseModal}
            className="underline text-cyan-300 hover:text-white text-[11px] whitespace-nowrap"
          >
            View SQL Migrations
          </button>
        </div>
      )}

      {/* Telemetry Provenance Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-[#03070d] border border-cyan-900/40 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-mono uppercase text-cyan-400/60">Data Source Provenance</span>
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-white truncate">{sourceTitle}</span>
          </div>
          <div className="text-[11px] text-cyan-400/70 font-mono">
            Mode: {dataSource.replace(/_/g, ' ')}
          </div>
        </div>

        <div className="bg-[#03070d] border border-cyan-900/40 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-mono uppercase text-cyan-400/60">Simulation Indicator</span>
          <div className="flex items-center gap-2">
            {isSimulated ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f5ff]" />
                <span className="font-semibold text-cyan-300">Simulated / Reference Data</span>
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_#00f5ff]" />
                <span className="font-semibold text-cyan-300">Uploaded Telemetry Ingestion</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-cyan-400/70 font-mono">
            {isSimulated ? 'Synthetic test cycle benchmark' : 'User-provided battery pack log'}
          </div>
        </div>

        <div className="bg-[#03070d] border border-cyan-900/40 rounded-xl p-3.5 space-y-1">
          <span className="text-[10px] font-mono uppercase text-cyan-400/60">Storage Target</span>
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-cyan-400" />
            <span className="font-semibold text-white">Supabase (gnckwh...co)</span>
          </div>
          <div className="text-[11px] text-cyan-400/70 font-mono">
            Region: ap-northeast-2 (PostgreSQL)
          </div>
        </div>
      </div>

      {/* Investigation Inputs */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-white flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-cyan-400" />
            <span>Safety Engineer Diagnostic Log</span>
          </span>
          <span className="text-[11px] text-cyan-400/70 font-mono">
            Vehicle: <strong className="text-white">{selectedVehicleId}</strong>
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-cyan-300">Investigation Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as InvestigationStatus)}
              className="w-full bg-[#020509] border border-cyan-950/80 rounded-xl p-2.5 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,245,255,0.2)] transition-all cursor-pointer"
            >
              <option value="pending" className="bg-[#04080e] text-cyan-200">Pending Review (Yellow Alert)</option>
              <option value="in_progress" className="bg-[#04080e] text-cyan-200">In Progress (Active Testing)</option>
              <option value="flagged_critical" className="bg-[#04080e] text-cyan-200">Flagged Critical (Red Flag Stop-Charge)</option>
              <option value="resolved" className="bg-[#04080e] text-cyan-200">Resolved (Cleared for Service)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-cyan-300">Root Cause Classification</label>
            <select
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value as RootCauseCategory)}
              className="w-full bg-[#020509] border border-cyan-950/80 rounded-xl p-2.5 text-xs text-cyan-100 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,245,255,0.2)] transition-all cursor-pointer"
            >
              <option value="unspecified" className="bg-[#04080e] text-cyan-200">Unspecified / Triage</option>
              <option value="thermal_excursion" className="bg-[#04080e] text-cyan-200">Thermal Excursion (&gt;Threshold Limit)</option>
              <option value="cell_voltage_sag" className="bg-[#04080e] text-cyan-200">Cell Undervoltage / Sag</option>
              <option value="overcurrent_spike" className="bg-[#04080e] text-cyan-200">Overcurrent Inrush / Spike</option>
              <option value="sensor_drift" className="bg-[#04080e] text-cyan-200">Thermistor / Sensor Drift</option>
              <option value="data_dropout" className="bg-[#04080e] text-cyan-200">CAN Bus Telemetry Dropout</option>
              <option value="normal_operation" className="bg-[#04080e] text-cyan-200">Normal Nominal Cycle</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-cyan-300">Engineering Notes &amp; Actions Taken</label>
          <textarea
            value={engineerNotes}
            onChange={(e) => setEngineerNotes(e.target.value)}
            rows={3}
            placeholder="Document observations regarding temperature elevation, charging current taper, or sensor discrepancy..."
            className="w-full bg-[#020509] border border-cyan-950/80 rounded-xl p-3 text-xs text-cyan-100 placeholder-cyan-900 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,245,255,0.2)] transition-all"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={handleSaveInvestigation}
            disabled={isSavingInvestigation}
            className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-cyan-950/70 hover:bg-cyan-900 text-cyan-200 border border-cyan-500/50 hover:border-cyan-300 hover:shadow-[0_0_15px_rgba(0,245,255,0.3)] transition-all duration-200 disabled:opacity-50 active:scale-95"
          >
            {isSavingInvestigation ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-cyan-400" />
                <span>Saving Log...</span>
              </>
            ) : investigationSaved ? (
              <>
                <FileCheck className="w-3.5 h-3.5 text-cyan-400" />
                <span className="text-cyan-300">Diagnostic Saved</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-cyan-400" />
                <span>Save Diagnostic Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
