/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type IssueType =
  | 'missing_field'
  | 'invalid_number'
  | 'duplicate_timestamp'
  | 'out_of_order'
  | 'out_of_range';

export interface QualityIssue {
  type: IssueType;
  field: string;
  message: string;
  severity: 'warning' | 'error';
  value?: any;
}

export interface BmsRecord {
  rowNumber: number;
  rawTimestamp: string;
  timestamp: string; // Normalized ISO or formatted string
  timestampMs: number | null;
  vehicle_id: string;
  voltage_v: number | null;
  current_a: number | null;
  temperature_c: number | null;
  soc_pct: number | null;
  mode: string; // 'driving' | 'charging' | 'idle' | 'unknown' | custom
  issues: QualityIssue[];
  isValid: boolean; // false if critical fields are unparseable
  rawRecord: Record<string, string>;
}

export interface PlausibilityConfig {
  voltageMin: number;
  voltageMax: number;
  currentMin: number;
  currentMax: number;
  temperatureMin: number;
  temperatureMax: number;
  socMin: number;
  socMax: number;
  tempAlertThreshold: number; // Configurable threshold to calculate exposure time above this temp
  idleSessionGapMinutes: number; // Gap in minutes to split sessions if mode is unchanged
}

export const DEFAULT_PLAUSIBILITY_CONFIG: PlausibilityConfig = {
  voltageMin: 200,
  voltageMax: 500,
  currentMin: -400,
  currentMax: 400,
  temperatureMin: -25,
  temperatureMax: 65,
  socMin: 0,
  socMax: 100,
  tempAlertThreshold: 45, // default 45°C
  idleSessionGapMinutes: 15,
};

export interface MetricStats {
  min: number;
  max: number;
  mean: number;
  start: number;
  end: number;
  delta: number;
}

export interface TemperatureExposureStats extends MetricStats {
  thresholdUsed: number;
  timeAboveThresholdSec: number;
  pctAboveThreshold: number;
}

export interface CurrentEnergyStats extends MetricStats {
  netAh: number; // Integrated charge throughput (approx trapezoidal)
  netKWhEst: number; // Integrated energy throughput (approx V * I * dt)
  peakDischargeA: number;
  peakChargeA: number;
}

export interface SessionSummary {
  id: string;
  vehicleId: string;
  sessionIndex: number;
  label: string;
  mode: string;
  startTime: string;
  endTime: string;
  startTimestampMs: number;
  endTimestampMs: number;
  durationSeconds: number;
  totalRecords: number;
  validRecords: number;
  voltage: MetricStats | null;
  current: CurrentEnergyStats | null;
  temperature: TemperatureExposureStats | null;
  soc: MetricStats | null;
  records: BmsRecord[];
}

export interface QualityReport {
  totalRows: number;
  validRows: number;
  cleanRowsCount: number;
  rowsWithIssuesCount: number;
  duplicateTimestampCount: number;
  outOfOrderTimestampCount: number;
  missingFieldCounts: Record<string, number>;
  invalidNumberCounts: Record<string, number>;
  rangeViolationCounts: Record<string, number>;
  affectedRecords: {
    rowNumber: number;
    timestamp: string;
    vehicle_id: string;
    issues: QualityIssue[];
  }[];
}

export interface VehicleGroup {
  vehicleId: string;
  totalRecords: number;
  sessions: SessionSummary[];
  overallSummary: SessionSummary;
}

export interface BMSAnalysisResult {
  records: BmsRecord[];
  qualityReport: QualityReport;
  vehicleGroups: Record<string, VehicleGroup>;
  vehicleIds: string[];
  configUsed: PlausibilityConfig;
}

export type DataSourceType = 'uploaded_csv' | 'manual_entry' | 'reference_sample' | 'connected_stream' | 'supabase_stored';

export interface BMSAlert {
  id: string;
  session_id: string;
  vehicle_id: string;
  alert_type: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  field?: string;
  message: string;
  row_number?: number;
  timestamp?: string;
  acknowledged: boolean;
  acknowledged_at?: string | null;
  acknowledged_by?: string | null;
  acknowledgement_notes?: string | null;
  created_at?: string;
}

export type InvestigationStatus = 'pending' | 'in_progress' | 'resolved' | 'flagged_critical';
export type RootCauseCategory =
  | 'unspecified'
  | 'thermal_excursion'
  | 'cell_voltage_sag'
  | 'sensor_drift'
  | 'overcurrent_spike'
  | 'data_dropout'
  | 'normal_operation';

export interface InvestigationResult {
  id: string;
  session_id: string;
  vehicle_id: string;
  status: InvestigationStatus;
  engineer_notes: string;
  root_cause_category: RootCauseCategory;
  findings?: Record<string, any>;
  investigated_by?: string;
  created_at?: string;
  updated_at?: string;
}

export interface SupabaseStatus {
  configured: boolean;
  connected: boolean;
  projectUrl: string;
  projectId: string;
  region: string;
  tablesExist?: boolean;
  missingTables?: string[];
  error?: string | null;
  timestamp: string;
}

export interface PersistedSessionItem {
  id: string;
  vehicle_id: string;
  session_index: number;
  label: string;
  mode: string;
  data_source: DataSourceType;
  is_simulated: boolean;
  start_time: string;
  end_time: string;
  duration_seconds: number;
  total_records: number;
  valid_records: number;
  created_at: string;
  alerts_count?: number;
  unacknowledged_alerts_count?: number;
}

