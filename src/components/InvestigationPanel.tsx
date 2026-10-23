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
    <div className="bg-[#0e131d] border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-slate-400" />
            <span>Battery Investigation &amp; Supabase Storage</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Record engineering diagnostic findings, root-cause categorization, and persist telemetry to Supabase PostgreSQL.
          </p>
        </div>

        {/* Persistence Status Badge */}
        <div className="flex items-center gap-2">
          {isPersisted ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-950/40 text-emerald-400 border border-emerald-800/50">
              <CheckCircle2 className="w-3.5 h-3.5" />
              <span>Persisted in Supabase</span>
            </div>
          ) : (
            <button
              onClick={handlePersistToSupabase}
              disabled={isSaving}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 transition-colors disabled:opacity-50"
            >
              {isSaving ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                  <span>Saving to PostgreSQL...</span>
                </>
              ) : saveSuccess ? (
                <>
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Saved Successfully</span>
                </>
              ) : (
                <>
                  <Database className="w-3.5 h-3.5 text-slate-400" />
                  <span>Persist to Supabase</span>
                </>
              )}
            </button>
          )}

          <button
            onClick={onOpenSupabaseModal}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-xs font-medium text-slate-300 hover:text-white bg-slate-900 border border-slate-800 hover:border-slate-700 transition-colors"
          >
            <Database className="w-3 h-3 text-slate-400" />
            <span>Manage DB</span>
          </button>
        </div>
      </div>

      {errorMessage && (
        <div className="p-3 bg-amber-950/40 border border-amber-800/40 rounded-lg text-amber-300 text-xs flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0 text-amber-400" />
            <span>{errorMessage}</span>
          </div>
          <button
            onClick={onOpenSupabaseModal}
            className="underline text-amber-200 hover:text-white text-[11px] whitespace-nowrap"
          >
            View SQL Migrations
          </button>
        </div>
      )}

      {/* Telemetry Provenance Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500">Data Source Provenance</span>
          <div className="flex items-center gap-2">
            <FileText className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-200 truncate">{sourceTitle}</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Mode: {dataSource.replace(/_/g, ' ')}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500">Simulation Indicator</span>
          <div className="flex items-center gap-2">
            {isSimulated ? (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-amber-400" />
                <span className="font-semibold text-amber-400">Simulated / Reference Data</span>
              </>
            ) : (
              <>
                <span className="inline-block w-2 h-2 rounded-full bg-emerald-400" />
                <span className="font-semibold text-emerald-400">Uploaded Telemetry Ingestion</span>
              </>
            )}
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            {isSimulated ? 'Synthetic test cycle benchmark' : 'User-provided battery pack log'}
          </div>
        </div>

        <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3 space-y-1">
          <span className="text-[10px] font-mono uppercase text-slate-500">Storage Target</span>
          <div className="flex items-center gap-2">
            <Database className="w-3.5 h-3.5 text-slate-400" />
            <span className="font-semibold text-slate-200">Supabase (gnckwh...co)</span>
          </div>
          <div className="text-[11px] text-slate-400 font-mono">
            Region: ap-northeast-2 (PostgreSQL)
          </div>
        </div>
      </div>

      {/* Investigation Inputs */}
      <div className="space-y-3 pt-1">
        <div className="flex items-center justify-between">
          <span className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
            <UserCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Safety Engineer Diagnostic Log</span>
          </span>
          <span className="text-[11px] text-slate-500 font-mono">
            Vehicle: {selectedVehicleId}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400">Investigation Status</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as InvestigationStatus)}
              className="w-full bg-[#090d16] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
            >
              <option value="pending">Pending Review (Yellow Alert)</option>
              <option value="in_progress">In Progress (Active Testing)</option>
              <option value="flagged_critical">Flagged Critical (Red Flag Stop-Charge)</option>
              <option value="resolved">Resolved (Cleared for Service)</option>
            </select>
          </div>

          <div className="space-y-1">
            <label className="text-[11px] font-medium text-slate-400">Root Cause Classification</label>
            <select
              value={rootCause}
              onChange={(e) => setRootCause(e.target.value as RootCauseCategory)}
              className="w-full bg-[#090d16] border border-slate-800 rounded-lg p-2 text-xs text-slate-200 focus:outline-none focus:border-slate-700"
            >
              <option value="unspecified">Unspecified / Triage</option>
              <option value="thermal_excursion">Thermal Excursion (&gt;Threshold Limit)</option>
              <option value="cell_voltage_sag">Cell Undervoltage / Sag</option>
              <option value="overcurrent_spike">Overcurrent Inrush / Spike</option>
              <option value="sensor_drift">Thermistor / Sensor Drift</option>
              <option value="data_dropout">CAN Bus Telemetry Dropout</option>
              <option value="normal_operation">Normal Nominal Cycle</option>
            </select>
          </div>
        </div>

        <div className="space-y-1">
          <label className="text-[11px] font-medium text-slate-400">Engineering Notes &amp; Actions Taken</label>
          <textarea
            value={engineerNotes}
            onChange={(e) => setEngineerNotes(e.target.value)}
            rows={3}
            placeholder="Document observations regarding temperature elevation, charging current taper, or sensor discrepancy..."
            className="w-full bg-[#090d16] border border-slate-800 rounded-lg p-2.5 text-xs text-slate-200 font-sans focus:outline-none focus:border-slate-700"
          />
        </div>

        <div className="flex justify-end gap-2 pt-1">
          <button
            onClick={handleSaveInvestigation}
            disabled={isSavingInvestigation}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-100 border border-slate-700 transition-colors disabled:opacity-50"
          >
            {isSavingInvestigation ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin text-slate-400" />
                <span>Saving Log...</span>
              </>
            ) : investigationSaved ? (
              <>
                <FileCheck className="w-3.5 h-3.5 text-emerald-400" />
                <span className="text-emerald-400">Diagnostic Saved</span>
              </>
            ) : (
              <>
                <Save className="w-3.5 h-3.5 text-slate-400" />
                <span>Save Diagnostic Report</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};
