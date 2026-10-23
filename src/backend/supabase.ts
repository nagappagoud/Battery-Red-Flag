/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// LAYER 3: SUPABASE INTEGRATION SERVICE (POSTGRESQL & REST API CLIENT)
// Project: Battery-Red-Flag (gnckwhhsdquaxfyzlxhi)
// Region: ap-northeast-2
// ============================================================================

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import {
  BMSAnalysisResult,
  BmsRecord,
  DataSourceType,
  PlausibilityConfig,
  SupabaseStatus,
  PersistedSessionItem,
  BMSAlert,
  InvestigationResult,
} from '../types/bms';

// Ensure environment variables are loaded
dotenv.config();

export const SUPABASE_PROJECT_ID = 'gnckwhhsdquaxfyzlxhi';
export const SUPABASE_DEFAULT_URL = 'https://gnckwhhsdquaxfyzlxhi.supabase.co';
export const SUPABASE_REGION = 'ap-northeast-2';

/**
 * Resolves Supabase credentials securely from environment variables.
 * Prioritizes privileged server-side service role key if present,
 * falling back to the publishable / anon key configured in environment settings.
 */
export function getSupabaseCredentials(): { url: string; key: string; isServiceRole: boolean } {
  const url =
    process.env.SUPABASE_URL ||
    process.env.VITE_SUPABASE_URL ||
    SUPABASE_DEFAULT_URL;

  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
  const publishableKey =
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.SUPABASE_ANON_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_ANON_KEY ||
    '';

  const key = serviceRoleKey || publishableKey;
  const isServiceRole = Boolean(serviceRoleKey);

  return { url, key, isServiceRole };
}

let cachedClient: SupabaseClient | null = null;
let lastUsedKey = '';

/**
 * Returns a configured Supabase client instance or null if credentials are not set.
 */
export function getSupabaseClient(): SupabaseClient | null {
  const { url, key } = getSupabaseCredentials();

  if (!key || !url) {
    return null;
  }

  if (!cachedClient || lastUsedKey !== key) {
    cachedClient = createClient(url, key, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
    lastUsedKey = key;
  }

  return cachedClient;
}

/**
 * Verifies live database connectivity and checks whether the required tables exist.
 */
export async function checkSupabaseHealth(): Promise<SupabaseStatus> {
  const { url, key } = getSupabaseCredentials();
  const configured = Boolean(key && url);

  if (!configured) {
    return {
      configured: false,
      connected: false,
      projectUrl: url,
      projectId: SUPABASE_PROJECT_ID,
      region: SUPABASE_REGION,
      tablesExist: false,
      missingTables: ['vehicles', 'telemetry_sessions', 'battery_readings', 'bms_alerts', 'investigation_results'],
      error: 'SUPABASE_PUBLISHABLE_KEY is not yet populated in the environment. Configure SUPABASE_PUBLISHABLE_KEY in environment/secrets settings.',
      timestamp: new Date().toISOString(),
    };
  }

  const client = getSupabaseClient();
  if (!client) {
    return {
      configured: true,
      connected: false,
      projectUrl: url,
      projectId: SUPABASE_PROJECT_ID,
      region: SUPABASE_REGION,
      tablesExist: false,
      missingTables: ['vehicles', 'telemetry_sessions', 'battery_readings', 'bms_alerts', 'investigation_results'],
      error: 'Failed to initialize Supabase client with provided credentials.',
      timestamp: new Date().toISOString(),
    };
  }

  try {
    // Probe vehicles table
    const { error: probeError } = await client
      .from('vehicles')
      .select('vehicle_id')
      .limit(1);

    if (probeError) {
      const code = (probeError as any).code;
      // PostgREST 42P01 = table does not exist
      const isMissingTable = code === '42P01' || probeError.message?.toLowerCase().includes('relation') || probeError.message?.toLowerCase().includes('not find');
      
      return {
        configured: true,
        connected: !isMissingTable,
        projectUrl: url,
        projectId: SUPABASE_PROJECT_ID,
        region: SUPABASE_REGION,
        tablesExist: false,
        missingTables: ['vehicles', 'telemetry_sessions', 'battery_readings', 'bms_alerts', 'investigation_results'],
        error: isMissingTable
          ? 'Connected to Supabase, but schema tables have not been created yet. Please execute the SQL migration in supabase/migrations/20261023000000_init_bms_schema.sql in the Supabase SQL Editor.'
          : probeError.message,
        timestamp: new Date().toISOString(),
      };
    }

    return {
      configured: true,
      connected: true,
      projectUrl: url,
      projectId: SUPABASE_PROJECT_ID,
      region: SUPABASE_REGION,
      tablesExist: true,
      missingTables: [],
      error: null,
      timestamp: new Date().toISOString(),
    };
  } catch (err: any) {
    return {
      configured: true,
      connected: false,
      projectUrl: url,
      projectId: SUPABASE_PROJECT_ID,
      region: SUPABASE_REGION,
      tablesExist: false,
      missingTables: [],
      error: err?.message || 'Network exception while connecting to Supabase endpoint.',
      timestamp: new Date().toISOString(),
    };
  }
}

/**
 * Safely converts any input into a valid ISO-8601 timestamp string for PostgreSQL TIMESTAMPTZ columns.
 * Prevents "invalid input syntax for type timestamp with time zone" on unparseable/missing CSV rows.
 */
function toValidIsoTimestamp(raw: any, fallbackMs: number = Date.now()): string {
  if (!raw) return new Date(fallbackMs).toISOString();
  if (typeof raw === 'number' && !isNaN(raw)) {
    return new Date(raw).toISOString();
  }
  const str = String(raw).trim();
  if (!str || str === 'Missing' || str === 'N/A' || str === 'Invalid Date') {
    return new Date(fallbackMs).toISOString();
  }
  const parsed = new Date(str);
  if (!isNaN(parsed.getTime())) {
    return parsed.toISOString();
  }
  return new Date(fallbackMs).toISOString();
}

const VALID_SESSION_MODES = new Set(['driving', 'charging', 'idle', 'overall', 'unknown']);
const VALID_DATA_SOURCES = new Set(['uploaded_csv', 'manual_entry', 'reference_sample', 'connected_stream']);

/**
 * Persists an ingested dataset, its session summary, synchronized battery readings,
 * and detected quality/plausibility alerts into Supabase PostgreSQL.
 */
export async function persistBmsDataset(params: {
  vehicleId: string;
  sourceName: string;
  dataSource: DataSourceType;
  isSimulated: boolean;
  analysis: BMSAnalysisResult;
  config: PlausibilityConfig;
}): Promise<{
  success: boolean;
  sessionId: string;
  vehicleId: string;
  recordsSaved: number;
  alertsSaved: number;
  error?: string;
}> {
  const client = getSupabaseClient();
  if (!client) {
    throw new Error('Supabase client is not configured. Set SUPABASE_PUBLISHABLE_KEY to persist data.');
  }

  const { vehicleId, sourceName, dataSource, isSimulated, analysis, config } = params;
  const group = analysis.vehicleGroups[vehicleId] || Object.values(analysis.vehicleGroups)[0];

  if (!group) {
    throw new Error(`Vehicle group '${vehicleId}' not found in telemetry analysis.`);
  }

  const summary = group.overallSummary;
  const now = new Date();
  const sessionId = `sess_${vehicleId}_${now.getTime()}`;

  // 1. Upsert Vehicle Profile
  const { error: vehicleError } = await client.from('vehicles').upsert(
    {
      vehicle_id: vehicleId,
      model: isSimulated ? 'Simulated Battery Test Pack' : 'Production Battery Pack',
      pack_capacity_kwh: 75.0,
      nominal_voltage_v: summary.voltage ? Number(summary.voltage.mean.toFixed(2)) : 400.0,
      updated_at: now.toISOString(),
    },
    { onConflict: 'vehicle_id' }
  );

  if (vehicleError) {
    console.error('[Supabase Ingestion] Failed to upsert vehicle profile:', vehicleError);
    throw new Error(`Failed to upsert vehicle profile: ${vehicleError.message}`);
  }

  // 2. Insert Session Record with safe timestamps and verified check constraints
  const safeMode = VALID_SESSION_MODES.has(summary.mode) ? summary.mode : 'overall';
  const safeSource = VALID_DATA_SOURCES.has(dataSource) ? dataSource : 'uploaded_csv';

  const sessionRow = {
    id: sessionId,
    vehicle_id: vehicleId,
    session_index: 0,
    label: `${sourceName || 'Telemetry Dataset'} (${safeMode})`,
    mode: safeMode,
    data_source: safeSource,
    is_simulated: isSimulated,
    start_time: toValidIsoTimestamp(summary.startTime, summary.startTimestampMs || now.getTime()),
    end_time: toValidIsoTimestamp(summary.endTime, summary.endTimestampMs || now.getTime()),
    duration_seconds: summary.durationSeconds,
    total_records: summary.totalRecords,
    valid_records: summary.validRecords,
    voltage_stats: summary.voltage,
    current_stats: summary.current,
    temperature_stats: summary.temperature,
    soc_stats: summary.soc,
    config_used: config,
    created_at: now.toISOString(),
  };

  const { error: sessionError } = await client.from('telemetry_sessions').insert(sessionRow);
  if (sessionError) {
    console.error('[Supabase Ingestion] Failed to insert telemetry session:', sessionError);
    throw new Error(`Failed to insert telemetry session: ${sessionError.message}`);
  }

  // 3. Batch Insert Readings in chunks of 250 with guaranteed valid timestamps
  const readingsRows = analysis.records.map((r, idx) => ({
    session_id: sessionId,
    vehicle_id: r.vehicle_id || vehicleId,
    row_number: r.rowNumber || idx + 1,
    timestamp: toValidIsoTimestamp(r.timestamp, r.timestampMs || (now.getTime() + idx * 1000)),
    voltage_v: r.voltage_v,
    current_a: r.current_a,
    temperature_c: r.temperature_c,
    soc_pct: r.soc_pct,
    mode: r.mode || 'unknown',
    is_valid: r.isValid,
    raw_data: r.rawRecord || {},
  }));


  const BATCH_SIZE = 250;
  for (let i = 0; i < readingsRows.length; i += BATCH_SIZE) {
    const batch = readingsRows.slice(i, i + BATCH_SIZE);
    const { error: batchError } = await client.from('battery_readings').insert(batch);
    if (batchError) {
      console.error(`[Supabase Ingestion] Batch insert failed at index ${i}:`, batchError);
      throw new Error(`Failed to batch insert battery readings: ${batchError.message}`);
    }
  }

  // 4. Extract and Insert BMS Alerts
  const alertsToInsert: any[] = [];
  if (analysis.qualityReport?.affectedRecords) {
    for (const item of analysis.qualityReport.affectedRecords) {
      for (const issue of item.issues) {
        alertsToInsert.push({
          session_id: sessionId,
          vehicle_id: item.vehicle_id || vehicleId,
          alert_type: issue.type,
          severity: issue.severity === 'error' ? 'error' : 'warning',
          field: issue.field,
          message: issue.message,
          row_number: item.rowNumber,
          timestamp: toValidIsoTimestamp(item.timestamp, now.getTime()),
          acknowledged: false,
          created_at: now.toISOString(),
        });
      }
    }
  }


  if (alertsToInsert.length > 0) {
    // Insert alerts in batches
    for (let i = 0; i < alertsToInsert.length; i += BATCH_SIZE) {
      const batch = alertsToInsert.slice(i, i + BATCH_SIZE);
      const { error: alertsError } = await client.from('bms_alerts').insert(batch);
      if (alertsError) {
        console.warn(`[Supabase Ingestion] Warning: Could not insert alerts batch:`, alertsError.message);
      }
    }
  }

  // 5. Initialize Investigation Record
  const hasErrors = analysis.qualityReport.rowsWithIssuesCount > 0;
  const initialInvestigation = {
    session_id: sessionId,
    vehicle_id: vehicleId,
    status: hasErrors ? 'pending' : 'resolved',
    engineer_notes: hasErrors
      ? `Automated triage: ${analysis.qualityReport.rowsWithIssuesCount} telemetry records flagged with data quality or plausibility issues.`
      : 'All parametric measurements passed deterministic plausibility boundaries with zero discrepancies.',
    root_cause_category: hasErrors ? 'thermal_excursion' : 'normal_operation',
    findings: {
      totalRows: analysis.qualityReport.totalRows,
      rowsWithIssues: analysis.qualityReport.rowsWithIssuesCount,
      tempExposureSeconds: summary.temperature?.timeAboveThresholdSec || 0,
      netAh: summary.current?.netAh || 0,
    },
    investigated_by: 'BMS Safety Screener',
    created_at: now.toISOString(),
    updated_at: now.toISOString(),
  };

  try {
    await client.from('investigation_results').insert(initialInvestigation);
  } catch {
    // Non-blocking initial investigation insert
  }

  return {
    success: true,
    sessionId,
    vehicleId,
    recordsSaved: readingsRows.length,
    alertsSaved: alertsToInsert.length,
  };
}

/**
 * Retrieves list of persisted sessions from Supabase.
 */
export async function getPersistedSessions(): Promise<PersistedSessionItem[]> {
  const client = getSupabaseClient();
  if (!client) return [];

  const { data: sessions, error } = await client
    .from('telemetry_sessions')
    .select(`
      id,
      vehicle_id,
      session_index,
      label,
      mode,
      data_source,
      is_simulated,
      start_time,
      end_time,
      duration_seconds,
      total_records,
      valid_records,
      created_at
    `)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error || !sessions) {
    console.error('[Supabase Query] Failed to fetch sessions:', error);
    return [];
  }

  // Fetch alert counts for these sessions
  const sessionIds = sessions.map((s) => s.id);
  const { data: alertCounts } = await client
    .from('bms_alerts')
    .select('session_id, acknowledged')
    .in('session_id', sessionIds);

  const alertMap = new Map<string, { total: number; unack: number }>();
  if (alertCounts) {
    for (const a of alertCounts) {
      const current = alertMap.get(a.session_id) || { total: 0, unack: 0 };
      current.total += 1;
      if (!a.acknowledged) current.unack += 1;
      alertMap.set(a.session_id, current);
    }
  }

  return sessions.map((s) => ({
    ...s,
    alerts_count: alertMap.get(s.id)?.total || 0,
    unacknowledged_alerts_count: alertMap.get(s.id)?.unack || 0,
  }));
}

/**
 * Loads a complete persisted session and its battery readings from Supabase.
 */
export async function loadPersistedSessionData(sessionId: string): Promise<{
  session: any;
  records: BmsRecord[];
  alerts: BMSAlert[];
  investigation: InvestigationResult | null;
} | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  // 1. Get session
  const { data: session, error: sessionErr } = await client
    .from('telemetry_sessions')
    .select('*')
    .eq('id', sessionId)
    .single();

  if (sessionErr || !session) {
    console.error('[Supabase Query] Session not found:', sessionErr);
    return null;
  }

  // 2. Get readings
  const { data: rawReadings, error: readingsErr } = await client
    .from('battery_readings')
    .select('*')
    .eq('session_id', sessionId)
    .order('timestamp', { ascending: true })
    .limit(10000);

  if (readingsErr || !rawReadings) {
    console.error('[Supabase Query] Readings not found:', readingsErr);
    return null;
  }

  // 3. Get alerts
  const { data: alerts } = await client
    .from('bms_alerts')
    .select('*')
    .eq('session_id', sessionId)
    .order('row_number', { ascending: true });

  // 4. Get investigation
  const { data: investigation } = await client
    .from('investigation_results')
    .select('*')
    .eq('session_id', sessionId)
    .maybeSingle();

  // Map database readings back to BmsRecord interface
  const records: BmsRecord[] = rawReadings.map((r) => ({
    rowNumber: r.row_number,
    rawTimestamp: r.timestamp,
    timestamp: r.timestamp,
    timestampMs: new Date(r.timestamp).getTime(),
    vehicle_id: r.vehicle_id,
    voltage_v: r.voltage_v !== null ? Number(r.voltage_v) : null,
    current_a: r.current_a !== null ? Number(r.current_a) : null,
    temperature_c: r.temperature_c !== null ? Number(r.temperature_c) : null,
    soc_pct: r.soc_pct !== null ? Number(r.soc_pct) : null,
    mode: r.mode || 'unknown',
    isValid: r.is_valid,
    issues: [],
    rawRecord: (r.raw_data as Record<string, string>) || {},
  }));

  return {
    session,
    records,
    alerts: alerts || [],
    investigation: investigation || null,
  };
}

/**
 * Acknowledges a specific BMS alert in Supabase.
 */
export async function acknowledgeAlertInSupabase(params: {
  alertId: string;
  acknowledgedBy: string;
  notes?: string;
}): Promise<boolean> {
  const client = getSupabaseClient();
  if (!client) return false;

  const { error } = await client
    .from('bms_alerts')
    .update({
      acknowledged: true,
      acknowledged_at: new Date().toISOString(),
      acknowledged_by: params.acknowledgedBy || 'Lead Battery Engineer',
      acknowledgement_notes: params.notes || 'Verified and marked as reviewed.',
    })
    .eq('id', params.alertId);

  if (error) {
    console.error('[Supabase Update] Failed to acknowledge alert:', error);
    return false;
  }

  return true;
}

/**
 * Saves or updates an investigation report in Supabase.
 */
export async function saveInvestigationToSupabase(params: {
  sessionId: string;
  vehicleId: string;
  status: string;
  engineerNotes: string;
  rootCauseCategory: string;
  findings?: Record<string, any>;
  investigatedBy?: string;
}): Promise<InvestigationResult | null> {
  const client = getSupabaseClient();
  if (!client) return null;

  const VALID_STATUSES = new Set(['pending', 'in_progress', 'resolved', 'flagged_critical']);
  const VALID_ROOT_CAUSES = new Set([
    'unspecified',
    'thermal_excursion',
    'cell_voltage_sag',
    'sensor_drift',
    'overcurrent_spike',
    'data_dropout',
    'normal_operation',
  ]);

  const sanitizedStatus = VALID_STATUSES.has(params.status) ? params.status : 'pending';
  const sanitizedRootCause = VALID_ROOT_CAUSES.has(params.rootCauseCategory)
    ? params.rootCauseCategory
    : 'unspecified';

  const now = new Date().toISOString();
  const payload = {
    session_id: params.sessionId,
    vehicle_id: params.vehicleId,
    status: sanitizedStatus,
    engineer_notes: params.engineerNotes || '',
    root_cause_category: sanitizedRootCause,
    findings: params.findings || {},
    investigated_by: params.investigatedBy || 'BMS Safety Engineer',
    updated_at: now,
  };

  const { data, error } = await client
    .from('investigation_results')
    .upsert(payload, { onConflict: 'session_id' })
    .select()
    .single();

  if (error) {
    console.error('[Supabase Update] Failed to save investigation:', error);
    return null;
  }

  return data as InvestigationResult;
}

