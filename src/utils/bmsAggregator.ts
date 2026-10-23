/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BmsRecord,
  CurrentEnergyStats,
  MetricStats,
  PlausibilityConfig,
  SessionSummary,
  TemperatureExposureStats,
  VehicleGroup,
} from '../types/bms';

/**
 * Calculates standard descriptive metrics for a numeric series
 */
function calculateMetricStats(values: { val: number; ms: number }[]): MetricStats | null {
  if (values.length === 0) return null;

  let min = values[0].val;
  let max = values[0].val;
  let sum = 0;

  for (const item of values) {
    if (item.val < min) min = item.val;
    if (item.val > max) max = item.val;
    sum += item.val;
  }

  const start = values[0].val;
  const end = values[values.length - 1].val;
  const delta = end - start;
  const mean = sum / values.length;

  return {
    min: Number(min.toFixed(2)),
    max: Number(max.toFixed(2)),
    mean: Number(mean.toFixed(2)),
    start: Number(start.toFixed(2)),
    end: Number(end.toFixed(2)),
    delta: Number(delta.toFixed(2)),
  };
}

/**
 * Calculates temperature exposure metrics: duration and percentage spent above threshold
 */
function calculateTemperatureExposure(
  tempPoints: { val: number; ms: number }[],
  threshold: number,
  totalDurationSec: number
): TemperatureExposureStats | null {
  const baseStats = calculateMetricStats(tempPoints);
  if (!baseStats) return null;

  let timeAboveSec = 0;

  if (tempPoints.length === 1) {
    if (tempPoints[0].val > threshold) {
      timeAboveSec = 60; // default 1 min sample if isolated point
    }
  } else {
    for (let i = 0; i < tempPoints.length - 1; i++) {
      const p1 = tempPoints[i];
      const p2 = tempPoints[i + 1];
      const dtSec = Math.max(0, (p2.ms - p1.ms) / 1000);

      // Skip huge gaps (> 1 hour) from corrupt timestamp jumps
      if (dtSec > 3600) continue;

      const t1Above = p1.val > threshold;
      const t2Above = p2.val > threshold;

      if (t1Above && t2Above) {
        timeAboveSec += dtSec;
      } else if (t1Above || t2Above) {
        // Linear interpolation for fractional threshold crossing
        const denom = Math.abs(p2.val - p1.val);
        if (denom > 0.0001) {
          const frac = (Math.max(p1.val, p2.val) - threshold) / denom;
          timeAboveSec += dtSec * Math.min(Math.max(frac, 0), 1);
        } else {
          timeAboveSec += dtSec * 0.5;
        }
      }
    }
  }

  const effectiveDuration = totalDurationSec > 0 ? totalDurationSec : Math.max(timeAboveSec, 1);
  const pctAbove = Math.min(100, Math.max(0, (timeAboveSec / effectiveDuration) * 100));

  return {
    ...baseStats,
    thresholdUsed: threshold,
    timeAboveThresholdSec: Math.round(timeAboveSec),
    pctAboveThreshold: Number(pctAbove.toFixed(1)),
  };
}

/**
 * Calculates current and approximate energy throughput using trapezoidal integration
 */
function calculateCurrentEnergy(
  records: BmsRecord[]
): CurrentEnergyStats | null {
  const currentPoints: { val: number; ms: number; v?: number | null }[] = [];

  for (const r of records) {
    if (r.current_a !== null && r.timestampMs !== null) {
      currentPoints.push({
        val: r.current_a,
        ms: r.timestampMs,
        v: r.voltage_v,
      });
    }
  }

  if (currentPoints.length === 0) return null;

  const baseStats = calculateMetricStats(currentPoints);
  if (!baseStats) return null;

  let netAh = 0;
  let netKWhEst = 0;
  let peakDischargeA = 0;
  let peakChargeA = 0;

  for (let i = 0; i < currentPoints.length; i++) {
    const cur = currentPoints[i].val;
    if (cur < peakDischargeA) peakDischargeA = cur;
    if (cur > peakChargeA) peakChargeA = cur;

    if (i < currentPoints.length - 1) {
      const p1 = currentPoints[i];
      const p2 = currentPoints[i + 1];
      const dtHours = Math.max(0, (p2.ms - p1.ms) / 1000 / 3600);

      // Ignore unreasonable telemetry packet gaps (> 1 hour)
      if (dtHours <= 1.0) {
        const avgI = (p1.val + p2.val) / 2;
        netAh += avgI * dtHours;

        if (p1.v !== null && p1.v !== undefined && p2.v !== null && p2.v !== undefined) {
          const avgV = (p1.v + p2.v) / 2;
          const powerKw = (avgV * avgI) / 1000;
          netKWhEst += powerKw * dtHours;
        }
      }
    }
  }

  return {
    ...baseStats,
    netAh: Number(netAh.toFixed(2)),
    netKWhEst: Number(netKWhEst.toFixed(2)),
    peakDischargeA: Number(peakDischargeA.toFixed(1)),
    peakChargeA: Number(peakChargeA.toFixed(1)),
  };
}

/**
 * Generates descriptive summary for a list of records
 */
export function summarizeRecordSet(
  records: BmsRecord[],
  id: string,
  sessionIndex: number,
  label: string,
  mode: string,
  vehicleId: string,
  config: PlausibilityConfig
): SessionSummary {
  // Sort records by timestamp for strictly sequential calculation
  const sorted = [...records].sort((a, b) => {
    const msA = a.timestampMs ?? 0;
    const msB = b.timestampMs ?? 0;
    return msA - msB;
  });

  const validRecords = sorted.filter((r) => r.isValid && r.timestampMs !== null);
  const totalRecords = sorted.length;

  let startTime = sorted[0]?.timestamp || 'N/A';
  let endTime = sorted[sorted.length - 1]?.timestamp || 'N/A';
  let startTimestampMs = sorted[0]?.timestampMs || 0;
  let endTimestampMs = sorted[sorted.length - 1]?.timestampMs || 0;
  let durationSeconds = 0;

  if (startTimestampMs && endTimestampMs && endTimestampMs >= startTimestampMs) {
    durationSeconds = Math.round((endTimestampMs - startTimestampMs) / 1000);
  }

  // Voltage points
  const voltPoints = sorted
    .filter((r) => r.voltage_v !== null && r.timestampMs !== null)
    .map((r) => ({ val: r.voltage_v!, ms: r.timestampMs! }));
  const voltage = calculateMetricStats(voltPoints);

  // Current & Energy
  const current = calculateCurrentEnergy(sorted);

  // Temperature exposure
  const tempPoints = sorted
    .filter((r) => r.temperature_c !== null && r.timestampMs !== null)
    .map((r) => ({ val: r.temperature_c!, ms: r.timestampMs! }));
  const temperature = calculateTemperatureExposure(
    tempPoints,
    config.tempAlertThreshold,
    durationSeconds
  );

  // SoC points
  const socPoints = sorted
    .filter((r) => r.soc_pct !== null && r.timestampMs !== null)
    .map((r) => ({ val: r.soc_pct!, ms: r.timestampMs! }));
  const soc = calculateMetricStats(socPoints);

  return {
    id,
    vehicleId,
    sessionIndex,
    label,
    mode,
    startTime,
    endTime,
    startTimestampMs,
    endTimestampMs,
    durationSeconds,
    totalRecords,
    validRecords: validRecords.length,
    voltage,
    current,
    temperature,
    soc,
    records: sorted,
  };
}

/**
 * Groups BMS records by Vehicle ID and segments each vehicle's data into sessions
 * based on mode transitions and idle time gaps.
 */
export function groupAndSummarizeBmsData(
  records: BmsRecord[],
  config: PlausibilityConfig
): { vehicleGroups: Record<string, VehicleGroup>; vehicleIds: string[] } {
  // 1. Group records by vehicle_id
  const vehicleMap: Record<string, BmsRecord[]> = {};

  for (const r of records) {
    const vId = r.vehicle_id || 'DEFAULT_VEHICLE';
    if (!vehicleMap[vId]) {
      vehicleMap[vId] = [];
    }
    vehicleMap[vId].push(r);
  }

  const vehicleIds = Object.keys(vehicleMap).sort();
  const vehicleGroups: Record<string, VehicleGroup> = {};

  for (const vId of vehicleIds) {
    const vRecords = vehicleMap[vId].sort((a, b) => {
      const msA = a.timestampMs ?? 0;
      const msB = b.timestampMs ?? 0;
      return msA - msB;
    });

    // Overall summary for the entire dataset of this vehicle
    const overallSummary = summarizeRecordSet(
      vRecords,
      `${vId}-all`,
      0,
      'Entire Telemetry Timeline',
      'composite',
      vId,
      config
    );

    // Segment into distinct sessions based on mode shifts and idle gaps (> config.idleSessionGapMinutes)
    const sessions: SessionSummary[] = [];
    const idleGapMs = config.idleSessionGapMinutes * 60 * 1000;

    let currentSessionRecords: BmsRecord[] = [];
    let currentMode = vRecords[0]?.mode || 'unknown';
    let sessionCount = 1;

    for (let i = 0; i < vRecords.length; i++) {
      const record = vRecords[i];
      const prevRecord = i > 0 ? vRecords[i - 1] : null;

      const isModeShift = prevRecord !== null && record.mode !== currentMode;
      const isTimeGap =
        prevRecord !== null &&
        record.timestampMs !== null &&
        prevRecord.timestampMs !== null &&
        record.timestampMs - prevRecord.timestampMs > idleGapMs;

      if ((isModeShift || isTimeGap) && currentSessionRecords.length > 0) {
        const modeLabel = currentMode.charAt(0).toUpperCase() + currentMode.slice(1);
        const sessionSummary = summarizeRecordSet(
          currentSessionRecords,
          `${vId}-sess-${sessionCount}`,
          sessionCount,
          `Session ${sessionCount}: ${modeLabel}`,
          currentMode,
          vId,
          config
        );
        sessions.push(sessionSummary);

        sessionCount++;
        currentSessionRecords = [];
        currentMode = record.mode;
      }

      currentSessionRecords.push(record);
    }

    if (currentSessionRecords.length > 0) {
      const modeLabel = currentMode.charAt(0).toUpperCase() + currentMode.slice(1);
      const sessionSummary = summarizeRecordSet(
        currentSessionRecords,
        `${vId}-sess-${sessionCount}`,
        sessionCount,
        `Session ${sessionCount}: ${modeLabel}`,
        currentMode,
        vId,
        config
      );
      sessions.push(sessionSummary);
    }

    vehicleGroups[vId] = {
      vehicleId: vId,
      totalRecords: vRecords.length,
      sessions,
      overallSummary,
    };
  }

  return { vehicleGroups, vehicleIds };
}

/**
 * Format duration in seconds to human-readable string: e.g. "1h 24m 10s"
 */
export function formatDurationSec(seconds: number): string {
  if (isNaN(seconds) || seconds <= 0) return '0s';
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = seconds % 60;

  const parts: string[] = [];
  if (hrs > 0) parts.push(`${hrs}h`);
  if (mins > 0 || hrs > 0) parts.push(`${mins}m`);
  if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);
  return parts.join(' ');
}
