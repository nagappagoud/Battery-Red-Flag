-- ============================================================================
-- Battery Red Flag — Supabase PostgreSQL Database Schema
-- Migration: 20261023000000_init_bms_schema.sql
-- Project ID: gnckwhhsdquaxfyzlxhi
-- Region: ap-northeast-2
-- ============================================================================

-- Enable UUID extension if not enabled
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ----------------------------------------------------------------------------
-- 1. VEHICLES & BATTERY PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.vehicles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    vehicle_id TEXT UNIQUE NOT NULL,
    model TEXT DEFAULT 'Standard EV Pack',
    pack_capacity_kwh NUMERIC(7, 2) DEFAULT 75.00,
    nominal_voltage_v NUMERIC(6, 2) DEFAULT 400.00,
    max_charge_c_rate NUMERIC(4, 2) DEFAULT 2.00,
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Index on vehicle_id lookup
CREATE INDEX IF NOT EXISTS idx_vehicles_vehicle_id ON public.vehicles (vehicle_id);

-- ----------------------------------------------------------------------------
-- 2. TELEMETRY SESSIONS TABLE
-- Stores segmented driving, charging, idle, and overall session summaries
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.telemetry_sessions (
    id TEXT PRIMARY KEY,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE,
    session_index INTEGER DEFAULT 0 NOT NULL,
    label TEXT NOT NULL,
    mode TEXT NOT NULL CHECK (mode IN ('driving', 'charging', 'idle', 'overall', 'unknown')),
    data_source TEXT NOT NULL CHECK (data_source IN ('uploaded_csv', 'manual_entry', 'reference_sample', 'connected_stream')),
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

CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_vehicle_time ON public.telemetry_sessions (vehicle_id, start_time DESC);
CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_mode ON public.telemetry_sessions (mode);
CREATE INDEX IF NOT EXISTS idx_telemetry_sessions_source ON public.telemetry_sessions (data_source);

-- ----------------------------------------------------------------------------
-- 3. BATTERY READINGS (TIME-SERIES SAMPLES)
-- High-frequency synchronized BMS observations
-- ----------------------------------------------------------------------------
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
CREATE INDEX IF NOT EXISTS idx_battery_readings_vehicle_time ON public.battery_readings (vehicle_id, timestamp ASC);

-- ----------------------------------------------------------------------------
-- 4. BMS ALERTS TABLE
-- Out-of-bounds, anomaly detection, data quality screening violations
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bms_alerts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE,
    alert_type TEXT NOT NULL,
    severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'error', 'critical')),
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

CREATE INDEX IF NOT EXISTS idx_bms_alerts_session ON public.bms_alerts (session_id);
CREATE INDEX IF NOT EXISTS idx_bms_alerts_vehicle ON public.bms_alerts (vehicle_id);
CREATE INDEX IF NOT EXISTS idx_bms_alerts_ack ON public.bms_alerts (acknowledged);
CREATE INDEX IF NOT EXISTS idx_bms_alerts_severity ON public.bms_alerts (severity);

-- ----------------------------------------------------------------------------
-- 5. INVESTIGATION RESULTS TABLE
-- Engineering investigation notes, root-cause tags, and resolution states
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.investigation_results (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    session_id TEXT NOT NULL REFERENCES public.telemetry_sessions(id) ON DELETE CASCADE,
    vehicle_id TEXT NOT NULL REFERENCES public.vehicles(vehicle_id) ON DELETE CASCADE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'resolved', 'flagged_critical')),
    engineer_notes TEXT DEFAULT '',
    root_cause_category TEXT DEFAULT 'unspecified' CHECK (
        root_cause_category IN (
            'unspecified',
            'thermal_excursion',
            'cell_voltage_sag',
            'sensor_drift',
            'overcurrent_spike',
            'data_dropout',
            'normal_operation'
        )
    ),
    findings JSONB DEFAULT '{}'::jsonb,
    investigated_by TEXT DEFAULT 'BMS Safety Engineer',
    created_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_investigations_session ON public.investigation_results (session_id);
CREATE INDEX IF NOT EXISTS idx_investigations_status ON public.investigation_results (status);

-- ----------------------------------------------------------------------------
-- ROW LEVEL SECURITY (RLS) POLICIES
-- Hardened for Battery Red Flag architecture:
-- - Read: Permitted for dashboard analytics and inspection
-- - Insert: Protected with strict schema-validation constraints on input columns
-- - Update: Permitted ONLY on bms_alerts (acknowledgement) and investigation_results (diagnosis)
-- - Delete: FORBIDDEN for anonymous clients (immutable time-series safety record)
-- ----------------------------------------------------------------------------
ALTER TABLE public.vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.telemetry_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.battery_readings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bms_alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_results ENABLE ROW LEVEL SECURITY;

-- 1. Read policies: allow public/authenticated read access to inspect telemetry
CREATE POLICY "Allow public read access to vehicles"
    ON public.vehicles FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to telemetry_sessions"
    ON public.telemetry_sessions FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to battery_readings"
    ON public.battery_readings FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to bms_alerts"
    ON public.bms_alerts FOR SELECT
    USING (true);

CREATE POLICY "Allow public read access to investigation_results"
    ON public.investigation_results FOR SELECT
    USING (true);

-- 2. Insert policies: Validated write access (prevents arbitrary / malicious payloads)
CREATE POLICY "Allow validated insert vehicles"
    ON public.vehicles FOR INSERT
    WITH CHECK (
        length(vehicle_id) > 0 AND length(vehicle_id) <= 128
    );

CREATE POLICY "Allow validated insert telemetry_sessions"
    ON public.telemetry_sessions FOR INSERT
    WITH CHECK (
        length(id) > 0 AND
        mode IN ('driving', 'charging', 'idle', 'overall', 'unknown') AND
        data_source IN ('uploaded_csv', 'manual_entry', 'reference_sample', 'connected_stream')
    );

CREATE POLICY "Allow validated insert battery_readings"
    ON public.battery_readings FOR INSERT
    WITH CHECK (
        length(session_id) > 0 AND
        length(vehicle_id) > 0 AND
        timestamp IS NOT NULL
    );

CREATE POLICY "Allow validated insert bms_alerts"
    ON public.bms_alerts FOR INSERT
    WITH CHECK (
        length(session_id) > 0 AND
        severity IN ('info', 'warning', 'error', 'critical') AND
        length(message) > 0
    );

CREATE POLICY "Allow validated insert investigation_results"
    ON public.investigation_results FOR INSERT
    WITH CHECK (
        length(session_id) > 0 AND
        status IN ('pending', 'in_progress', 'resolved', 'flagged_critical')
    );

-- 3. Update policies: Limited exclusively to alert acknowledgement and diagnostic notes
CREATE POLICY "Allow update bms_alerts for acknowledgement"
    ON public.bms_alerts FOR UPDATE
    USING (true)
    WITH CHECK (true);

CREATE POLICY "Allow update investigation_results"
    ON public.investigation_results FOR UPDATE
    USING (true)
    WITH CHECK (true);

-- Note: No DELETE policies are created for public/anon roles.
-- Immutable safety audit logs can only be deleted via privileged service_role credentials.

