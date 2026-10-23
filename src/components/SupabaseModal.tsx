/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import {
  Database,
  X,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Copy,
  Check,
  Server,
  Layers,
  ArrowRight,
  Shield,
  Clock,
  Terminal,
} from 'lucide-react';
import { SupabaseStatus, PersistedSessionItem } from '../types/bms';
import { fetchPersistedSessions } from '../utils/supabaseClient';

interface SupabaseModalProps {
  isOpen: boolean;
  onClose: () => void;
  status: SupabaseStatus | null;
  onRefreshStatus: () => void;
  onLoadSession: (sessionId: string) => void;
}

export const SupabaseModal: React.FC<SupabaseModalProps> = ({
  isOpen,
  onClose,
  status,
  onRefreshStatus,
  onLoadSession,
}) => {
  const [copiedSql, setCopiedSql] = useState(false);
  const [sessions, setSessions] = useState<PersistedSessionItem[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setLoadingSessions(true);
      fetchPersistedSessions()
        .then((data) => setSessions(data))
        .finally(() => setLoadingSessions(false));
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleCopyMigrationSql = () => {
    const sqlText = `-- Supabase PostgreSQL Schema for Battery-Red-Flag (gnckwhhsdquaxfyzlxhi)
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id TEXT UNIQUE NOT NULL,
    model TEXT DEFAULT 'Standard EV Pack',
    pack_capacity_kwh NUMERIC(7, 2) DEFAULT 75.00,
    nominal_voltage_v NUMERIC(6, 2) DEFAULT 400.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.telemetry_sessions (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE,
    session_index INTEGER DEFAULT 0 NOT NULL,
    label TEXT NOT NULL,
    mode TEXT NOT NULL,
    data_source TEXT NOT NULL,
    is_simulated BOOLEAN DEFAULT false NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ NOT NULL,
    duration_seconds NUMERIC(12, 2) DEFAULT 0 NOT NULL,
    total_records INTEGER DEFAULT 0 NOT NULL,
    valid_records INTEGER DEFAULT 0 NOT NULL,
    voltage_stats JSONB,
    current_stats JSONB,
    temperature_stats JSONB,
    soc_stats JSONB,
    config_used JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.battery_readings (
    id BIGINT GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE,
    row_number INTEGER NOT NULL,
    timestamp TIMESTAMPTZ NOT NULL,
    voltage_v NUMERIC(7, 2),
    current_a NUMERIC(7, 2),
    temperature_c NUMERIC(6, 2),
    soc_pct NUMERIC(5, 2),
    mode TEXT DEFAULT 'unknown',
    is_valid BOOLEAN DEFAULT true NOT NULL,
    raw_data JSONB,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_battery_readings_session_time ON public.battery_readings (session_id, timestamp ASC);

CREATE TABLE IF NOT EXISTS public.bms_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    field TEXT,
    message TEXT NOT NULL,
    row_number INTEGER,
    timestamp TIMESTAMPTZ,
    acknowledged BOOLEAN DEFAULT false NOT NULL,
    acknowledged_at TIMESTAMPTZ,
    acknowledged_by TEXT,
    acknowledgement_notes TEXT,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.investigation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending',
    engineer_notes TEXT DEFAULT '',
    root_cause_category TEXT DEFAULT 'unspecified',
    findings JSONB DEFAULT '{}'::jsonb,
    investigated_by TEXT DEFAULT 'BMS Safety Engineer',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battery_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bms_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read access to vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Allow public read access to telemetry_sessions" ON public.telemetry_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public read access to battery_readings" ON public.battery_readings FOR SELECT USING (true);
CREATE POLICY "Allow public read access to bms_alerts" ON public.bms_alerts FOR SELECT USING (true);
CREATE POLICY "Allow public read access to investigation_results" ON public.investigation_results FOR SELECT USING (true);
CREATE POLICY "Allow anon insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert telemetry_sessions" ON public.telemetry_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert battery_readings" ON public.battery_readings FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon insert bms_alerts" ON public.bms_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update bms_alerts for acknowledgement" ON public.bms_alerts FOR UPDATE USING (true) WITH CHECK (true);
CREATE POLICY "Allow anon insert investigation_results" ON public.investigation_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow anon update investigation_results" ON public.investigation_results FOR UPDATE USING (true) WITH CHECK (true);`;

    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  const isConnected = Boolean(status?.connected && status?.tablesExist);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0e131d] border border-slate-800 rounded-xl w-full max-w-2xl max-h-[90vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-lg bg-emerald-950/40 border border-emerald-800/50 text-emerald-400">
              <Database className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
                Supabase PostgreSQL Integration
              </h3>
              <p className="text-xs text-slate-400">
                Persistent database storage for EV battery telemetry, alerts &amp; investigations
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 space-y-5 overflow-y-auto text-xs text-slate-300">
          {/* Status Overview Card */}
          <div className="bg-slate-900/60 border border-slate-800 rounded-lg p-4 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-slate-400 font-medium">Connection Status</span>
              <div className="flex items-center gap-2">
                {isConnected ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-emerald-950/60 text-emerald-400 border border-emerald-800/60">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    Database Active &amp; Verified
                  </span>
                ) : status?.configured ? (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-amber-950/60 text-amber-400 border border-amber-800/60">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Tables Not Created Yet
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-medium bg-slate-800 text-slate-400 border border-slate-700">
                    <Server className="w-3.5 h-3.5" />
                    Awaiting Publishable Key
                  </span>
                )}

                <button
                  onClick={onRefreshStatus}
                  className="p-1.5 text-slate-400 hover:text-slate-200 bg-slate-800/80 hover:bg-slate-700 rounded-md transition-colors"
                  title="Refresh Connection Status"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-[#090d16] p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">Project ID</div>
                <div className="text-slate-200 font-medium truncate">gnckwhhsdquaxfyzlxhi</div>
              </div>
              <div className="bg-[#090d16] p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">Region</div>
                <div className="text-slate-200 font-medium">ap-northeast-2</div>
              </div>
              <div className="bg-[#090d16] p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">Endpoint</div>
                <div className="text-slate-200 font-medium truncate">gnckwh...co</div>
              </div>
              <div className="bg-[#090d16] p-2 rounded border border-slate-800">
                <div className="text-slate-500 text-[10px]">RLS Policies</div>
                <div className="text-emerald-400 font-medium">Active</div>
              </div>
            </div>

            {status?.error && (
              <div className="p-3 bg-amber-950/30 border border-amber-800/40 rounded-lg text-amber-300 text-[11px] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                  <span>Setup Guidance</span>
                </div>
                <p className="text-amber-300/90 leading-relaxed">{status.error}</p>
              </div>
            )}
          </div>

          {/* Database Tables Specification */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-slate-400" />
              <span>Relational Schema Architecture</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800">
                <div className="font-mono text-slate-200 font-medium">vehicles</div>
                <div className="text-slate-400 text-[10px]">Profiles, pack capacity, nominal voltage</div>
              </div>
              <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800">
                <div className="font-mono text-slate-200 font-medium">telemetry_sessions</div>
                <div className="text-slate-400 text-[10px]">Drive/charge sessions, integrated Ah &amp; kWh</div>
              </div>
              <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800">
                <div className="font-mono text-slate-200 font-medium">battery_readings</div>
                <div className="text-slate-400 text-[10px]">Synchronized V, I, T, SOC time-series samples</div>
              </div>
              <div className="p-2.5 rounded bg-slate-900/40 border border-slate-800">
                <div className="font-mono text-slate-200 font-medium">bms_alerts &amp; investigations</div>
                <div className="text-slate-400 text-[10px]">Violation flags with acknowledgement audit log</div>
              </div>
            </div>
          </div>

          {/* Migration Action Bar */}
          <div className="bg-slate-900/40 border border-slate-800 rounded-lg p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-medium text-slate-200 text-xs flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-slate-400" />
                <span>Apply Database Migrations</span>
              </div>
              <p className="text-[11px] text-slate-400 mt-0.5">
                Run the SQL migration in your Supabase SQL Editor to establish tables and RLS security rules.
              </p>
            </div>
            <button
              onClick={handleCopyMigrationSql}
              className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded-lg transition-colors shrink-0"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                  <span className="text-emerald-400">Copied SQL</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-slate-400" />
                  <span>Copy Migration SQL</span>
                </>
              )}
            </button>
          </div>

          {/* Persisted Sessions in Supabase */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-slate-200 flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-slate-400" />
                <span>Persisted Telemetry Sessions ({sessions.length})</span>
              </h4>
            </div>

            {loadingSessions ? (
              <div className="py-6 text-center text-slate-500 font-mono text-[11px]">
                Querying Supabase PostgreSQL...
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-6 text-center text-slate-500 bg-slate-900/20 border border-slate-800/60 rounded-lg text-[11px]">
                No sessions saved to Supabase yet. Ingest a telemetry stream and click &quot;Persist to Supabase&quot; to permanently store it.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-2.5 rounded-lg bg-slate-900/50 border border-slate-800 flex items-center justify-between gap-3 hover:border-slate-700 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-slate-200 truncate">{s.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-800 text-slate-400">
                          {s.vehicle_id}
                        </span>
                        {s.is_simulated && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-amber-950/40 text-amber-400 border border-amber-800/40">
                            Simulated
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-3">
                        <span>{s.total_records} records</span>
                        <span>{Math.round(s.duration_seconds)}s duration</span>
                        {s.unacknowledged_alerts_count ? (
                          <span className="text-rose-400 font-medium">
                            {s.unacknowledged_alerts_count} unacknowledged alerts
                          </span>
                        ) : null}
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        onLoadSession(s.id);
                        onClose();
                      }}
                      className="flex items-center gap-1 px-2.5 py-1 text-[11px] font-medium text-slate-200 bg-slate-800 hover:bg-slate-700 rounded border border-slate-700 transition-colors shrink-0"
                    >
                      <span>Load</span>
                      <ArrowRight className="w-3 h-3 text-slate-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-slate-800 bg-[#090d16]">
          <span className="text-[11px] text-slate-500 font-mono">
            Endpoint: https://gnckwhhsdquaxfyzlxhi.supabase.co
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
