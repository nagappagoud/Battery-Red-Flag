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
    issues JSONB DEFAULT '[]'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.bms_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL,
    metric_field TEXT NOT NULL,
    trigger_value NUMERIC(10, 2),
    threshold_limit NUMERIC(10, 2),
    description TEXT NOT NULL,
    acknowledged BOOLEAN DEFAULT false NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE IF NOT EXISTS public.investigation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT UNIQUE NOT NULL REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE,
    investigator_id TEXT DEFAULT 'SafetyEngineer-01' NOT NULL,
    status TEXT DEFAULT 'pending' NOT NULL,
    root_cause_category TEXT DEFAULT 'unspecified' NOT NULL,
    engineer_notes TEXT,
    findings JSONB DEFAULT '{}'::jsonb NOT NULL,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battery_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bms_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow public read vehicles" ON public.vehicles FOR SELECT USING (true);
CREATE POLICY "Allow public insert vehicles" ON public.vehicles FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update vehicles" ON public.vehicles FOR UPDATE USING (true);

CREATE POLICY "Allow public read telemetry_sessions" ON public.telemetry_sessions FOR SELECT USING (true);
CREATE POLICY "Allow public insert telemetry_sessions" ON public.telemetry_sessions FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update telemetry_sessions" ON public.telemetry_sessions FOR UPDATE USING (true);

CREATE POLICY "Allow public read battery_readings" ON public.battery_readings FOR SELECT USING (true);
CREATE POLICY "Allow public insert battery_readings" ON public.battery_readings FOR INSERT WITH CHECK (true);

CREATE POLICY "Allow public read bms_alerts" ON public.bms_alerts FOR SELECT USING (true);
CREATE POLICY "Allow public insert bms_alerts" ON public.bms_alerts FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update bms_alerts" ON public.bms_alerts FOR UPDATE USING (true);

CREATE POLICY "Allow public read investigation_results" ON public.investigation_results FOR SELECT USING (true);
CREATE POLICY "Allow public insert investigation_results" ON public.investigation_results FOR INSERT WITH CHECK (true);
CREATE POLICY "Allow public update investigation_results" ON public.investigation_results FOR UPDATE USING (true);`;

    navigator.clipboard.writeText(sqlText);
    setCopiedSql(true);
    setTimeout(() => setCopiedSql(false), 2500);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-150">
      <div className="bg-[#03070d] border border-cyan-500/40 rounded-2xl max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-[0_0_50px_rgba(0,245,255,0.2)] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-950/80 bg-[#020509]/90 sticky top-0 z-10 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/60 text-cyan-400 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,245,255,0.25)]">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-semibold text-white text-base">Supabase Cloud PostgreSQL Console</h3>
              <p className="text-xs text-cyan-400/70 font-mono">
                Project: gnckwhhsdquaxfyzlxhi · ap-northeast-2
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-cyan-400/60 hover:text-white hover:bg-cyan-950/50 rounded-lg transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-5 text-xs text-cyan-100">
          {/* Connection Overview Banner */}
          <div className="p-4 rounded-xl bg-[#020509] border border-cyan-950/80 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Server className="w-4 h-4 text-cyan-400" />
                <span className="font-semibold text-white">Database Cluster Connectivity</span>
              </div>
              <div className="flex items-center gap-2">
                {status?.connected ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-semibold bg-cyan-950/70 text-cyan-300 border border-cyan-400/60 shadow-[0_0_10px_rgba(0,245,255,0.25)]">
                    <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                    Database Active &amp; Verified
                  </span>
                ) : status?.configured ? (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-amber-950/60 text-amber-400 border border-amber-800/60">
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Tables Not Created Yet
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-[11px] font-medium bg-cyan-950/40 text-cyan-400 border border-cyan-900/60">
                    <Server className="w-3.5 h-3.5 text-cyan-400" />
                    Awaiting Publishable Key
                  </span>
                )}

                <button
                  onClick={onRefreshStatus}
                  className="p-1.5 text-cyan-400 hover:text-white bg-[#04080e] hover:bg-[#07131e] border border-cyan-950 rounded-lg transition-colors"
                  title="Refresh Connection Status"
                >
                  <RefreshCw className="w-3 h-3" />
                </button>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 font-mono text-[11px]">
              <div className="bg-[#04080e] p-2.5 rounded-lg border border-cyan-950">
                <div className="text-cyan-400/60 text-[10px]">Project ID</div>
                <div className="text-white font-medium truncate">gnckwhhsdquaxfyzlxhi</div>
              </div>
              <div className="bg-[#04080e] p-2.5 rounded-lg border border-cyan-950">
                <div className="text-cyan-400/60 text-[10px]">Region</div>
                <div className="text-white font-medium">ap-northeast-2</div>
              </div>
              <div className="bg-[#04080e] p-2.5 rounded-lg border border-cyan-950">
                <div className="text-cyan-400/60 text-[10px]">Endpoint</div>
                <div className="text-white font-medium truncate">gnckwh...co</div>
              </div>
              <div className="bg-[#04080e] p-2.5 rounded-lg border border-cyan-950">
                <div className="text-cyan-400/60 text-[10px]">RLS Policies</div>
                <div className="text-cyan-400 font-semibold">Active</div>
              </div>
            </div>

            {status?.error && (
              <div className="p-3 bg-red-950/30 border border-red-500/40 rounded-xl text-red-200 text-[11px] space-y-1">
                <div className="font-semibold flex items-center gap-1.5">
                  <AlertTriangle className="w-3.5 h-3.5 shrink-0 text-red-400" />
                  <span>Setup Guidance</span>
                </div>
                <p className="text-red-200/90 leading-relaxed">{status.error}</p>
              </div>
            )}
          </div>

          {/* Database Tables Specification */}
          <div className="space-y-2">
            <h4 className="text-xs font-semibold text-white flex items-center gap-2">
              <Shield className="w-3.5 h-3.5 text-cyan-400" />
              <span>Relational Schema Architecture</span>
            </h4>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-[11px]">
              <div className="p-2.5 rounded-xl bg-[#020509] border border-cyan-950/80">
                <div className="font-mono text-cyan-300 font-semibold">vehicles</div>
                <div className="text-cyan-400/60 text-[10px]">Profiles, pack capacity, nominal voltage</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#020509] border border-cyan-950/80">
                <div className="font-mono text-cyan-300 font-semibold">telemetry_sessions</div>
                <div className="text-cyan-400/60 text-[10px]">Drive/charge sessions, integrated Ah &amp; kWh</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#020509] border border-cyan-950/80">
                <div className="font-mono text-cyan-300 font-semibold">battery_readings</div>
                <div className="text-cyan-400/60 text-[10px]">Synchronized V, I, T, SOC time-series samples</div>
              </div>
              <div className="p-2.5 rounded-xl bg-[#020509] border border-cyan-950/80">
                <div className="font-mono text-cyan-300 font-semibold">bms_alerts &amp; investigations</div>
                <div className="text-cyan-400/60 text-[10px]">Violation flags with acknowledgement audit log</div>
              </div>
            </div>
          </div>

          {/* Migration Action Bar */}
          <div className="bg-[#020509] border border-cyan-950/80 rounded-xl p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div>
              <div className="font-semibold text-white text-xs flex items-center gap-1.5">
                <Terminal className="w-3.5 h-3.5 text-cyan-400" />
                <span>Apply Database Migrations</span>
              </div>
              <p className="text-[11px] text-cyan-400/70 mt-0.5">
                Execute the SQL migration in your Supabase SQL Editor to establish tables and RLS security rules.
              </p>
            </div>
            <button
              onClick={handleCopyMigrationSql}
              className="flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-black bg-cyan-500 hover:bg-cyan-400 rounded-lg transition-all duration-200 shrink-0 shadow-[0_0_12px_rgba(0,245,255,0.3)] active:scale-95"
            >
              {copiedSql ? (
                <>
                  <Check className="w-3.5 h-3.5 text-black" />
                  <span>Copied SQL</span>
                </>
              ) : (
                <>
                  <Copy className="w-3.5 h-3.5 text-black" />
                  <span>Copy Migration SQL</span>
                </>
              )}
            </button>
          </div>

          {/* Persisted Sessions in Supabase */}
          <div className="space-y-2 pt-1">
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-semibold text-white flex items-center gap-2">
                <Clock className="w-3.5 h-3.5 text-cyan-400" />
                <span>Persisted Telemetry Sessions ({sessions.length})</span>
              </h4>
            </div>

            {loadingSessions ? (
              <div className="py-6 text-center text-cyan-400/60 font-mono text-[11px]">
                Querying Supabase PostgreSQL...
              </div>
            ) : sessions.length === 0 ? (
              <div className="py-6 text-center text-cyan-400/60 bg-[#020509] border border-cyan-950/60 rounded-xl text-[11px]">
                No sessions saved to Supabase yet. Ingest a telemetry stream and click &quot;Persist to Supabase&quot; to permanently store it.
              </div>
            ) : (
              <div className="space-y-2 max-h-48 overflow-y-auto pr-1">
                {sessions.map((s) => (
                  <div
                    key={s.id}
                    className="p-3 rounded-xl bg-[#020509] border border-cyan-950/80 flex items-center justify-between gap-3 hover:border-cyan-500/50 transition-colors"
                  >
                    <div className="space-y-0.5 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-white truncate">{s.label}</span>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/60 text-cyan-300 border border-cyan-900/60">
                          {s.vehicle_id}
                        </span>
                        {s.is_simulated && (
                          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-cyan-950/40 text-cyan-400 border border-cyan-800/40">
                            Simulated
                          </span>
                        )}
                      </div>
                      <div className="text-[10px] text-cyan-400/70 flex items-center gap-3 font-mono">
                        <span>{s.total_records} records</span>
                        <span>{Math.round(s.duration_seconds)}s duration</span>
                        {s.unacknowledged_alerts_count ? (
                          <span className="text-cyan-300 font-bold">
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
                      className="flex items-center gap-1 px-3 py-1 text-[11px] font-semibold text-cyan-200 bg-cyan-950/60 hover:bg-cyan-900 rounded-lg border border-cyan-600/50 hover:border-cyan-400 transition-all shrink-0 active:scale-95"
                    >
                      <span>Load</span>
                      <ArrowRight className="w-3 h-3 text-cyan-400" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between px-6 py-3.5 border-t border-cyan-950/80 bg-[#020509]">
          <span className="text-[11px] text-cyan-400/60 font-mono">
            Endpoint: https://gnckwhhsdquaxfyzlxhi.supabase.co
          </span>
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg text-xs font-semibold bg-[#04080e] hover:bg-[#07131e] border border-cyan-950 hover:border-cyan-400 text-cyan-200 transition-all"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
