/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// LAYER 1: SUPABASE CLIENT SERVICE (API PROXY & PERSISTENCE ENGINE)
// ============================================================================

import {
  BMSAnalysisResult,
  BMSAlert,
  DataSourceType,
  InvestigationResult,
  PersistedSessionItem,
  PlausibilityConfig,
  SupabaseStatus,
} from '../types/bms';

export async function fetchSupabaseStatus(): Promise<SupabaseStatus> {
  try {
    const res = await fetch('/api/supabase/status');
    if (!res.ok) {
      throw new Error(`Server returned HTTP ${res.status}`);
    }
    return await res.json();
  } catch (err: any) {
    return {
      configured: false,
      connected: false,
      projectUrl: 'https://gnckwhhsdquaxfyzlxhi.supabase.co',
      projectId: 'gnckwhhsdquaxfyzlxhi',
      region: 'ap-northeast-2',
      error: err?.message || 'Failed to reach Supabase backend health endpoint',
      timestamp: new Date().toISOString(),
    };
  }
}

export async function persistAnalysisToSupabase(params: {
  vehicleId: string;
  sourceName: string;
  dataSource: DataSourceType;
  isSimulated: boolean;
  analysis: BMSAnalysisResult;
  config: PlausibilityConfig;
}): Promise<{ success: boolean; sessionId?: string; error?: string; recordsSaved?: number; alertsSaved?: number }> {
  try {
    const res = await fetch('/api/supabase/save', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.error || data.details || `Failed to persist (HTTP ${res.status})`);
    }

    return data;
  } catch (err: any) {
    return {
      success: false,
      error: err?.message || 'Network error while persisting telemetry to Supabase',
    };
  }
}

export async function fetchPersistedSessions(): Promise<PersistedSessionItem[]> {
  try {
    const res = await fetch('/api/supabase/sessions');
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}

export async function fetchPersistedSessionDetails(sessionId: string): Promise<any | null> {
  try {
    const res = await fetch(`/api/supabase/sessions/${encodeURIComponent(sessionId)}`);
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}

export async function acknowledgeAlertApi(
  alertId: string,
  acknowledgedBy: string = 'Battery Safety Engineer',
  notes: string = 'Reviewed and cleared.'
): Promise<boolean> {
  try {
    const res = await fetch(`/api/supabase/alerts/${encodeURIComponent(alertId)}/ack`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ acknowledgedBy, notes }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function saveInvestigationApi(params: {
  sessionId: string;
  vehicleId: string;
  status: string;
  engineerNotes: string;
  rootCauseCategory: string;
  findings?: Record<string, any>;
  investigatedBy?: string;
}): Promise<InvestigationResult | null> {
  try {
    const res = await fetch('/api/supabase/investigations', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(params),
    });
    if (!res.ok) return null;
    return await res.json();
  } catch {
    return null;
  }
}
