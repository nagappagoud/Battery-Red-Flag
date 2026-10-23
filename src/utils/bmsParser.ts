/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import {
  BmsRecord,
  PlausibilityConfig,
  QualityIssue,
  QualityReport,
} from '../types/bms';

/**
 * Normalizes header names to canonical field keys
 */
function normalizeHeader(rawHeader: string): string {
  const cleaned = rawHeader.trim().toLowerCase().replace(/[\s\-_]+/g, '');
  if (['timestamp', 'time', 'datetime', 'ts', 'date'].includes(cleaned)) return 'timestamp';
  if (['vehicleid', 'vehicle', 'vin', 'carid', 'id'].includes(cleaned)) return 'vehicle_id';
  if (['voltagev', 'voltage', 'volt', 'v'].includes(cleaned)) return 'voltage_v';
  if (['currenta', 'current', 'amps', 'amp', 'i', 'a'].includes(cleaned)) return 'current_a';
  if (['temperaturec', 'temperature', 'tempc', 'temp', 'degc', 't'].includes(cleaned)) return 'temperature_c';
  if (['socpct', 'soc', 'stateofcharge', 'soc%'].includes(cleaned)) return 'soc_pct';
  if (['mode', 'state', 'opmode', 'status'].includes(cleaned)) return 'mode';
  return rawHeader.trim();
}

/**
 * Simple CSV line parser taking quotes into account
 */
function parseCsvLine(line: string): string[] {
  const values: string[] = [];
  let currentValue = '';
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"' || char === "'") {
      inQuotes = !inQuotes;
    } else if (char === ',' && !inQuotes) {
      values.push(currentValue.trim());
      currentValue = '';
    } else {
      currentValue += char;
    }
  }
  values.push(currentValue.trim());
  return values;
}

/**
 * Parses timestamp string into millisecond epoch
 */
function parseTimestampToMs(raw: string): { ms: number | null; formatted: string } {
  if (!raw || !raw.trim()) {
    return { ms: null, formatted: 'Missing' };
  }
  const trimmed = raw.trim();
  // Check if numeric unix timestamp (seconds or ms)
  if (/^\d{10,13}$/.test(trimmed)) {
    const num = parseInt(trimmed, 10);
    const ms = trimmed.length === 10 ? num * 1000 : num;
    return { ms, formatted: new Date(ms).toISOString() };
  }
  const date = new Date(trimmed);
  if (!isNaN(date.getTime())) {
    return { ms: date.getTime(), formatted: date.toISOString() };
  }
  return { ms: null, formatted: trimmed };
}

/**
 * Parses raw CSV text or manual text lines into structured BmsRecords and produces a QualityReport
 */
export function parseBmsCsv(
  csvText: string,
  config: PlausibilityConfig
): { records: BmsRecord[]; qualityReport: QualityReport } {
  const lines = csvText
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter((l) => l.length > 0 && !l.startsWith('#'));

  if (lines.length === 0) {
    return {
      records: [],
      qualityReport: {
        totalRows: 0,
        validRows: 0,
        cleanRowsCount: 0,
        rowsWithIssuesCount: 0,
        duplicateTimestampCount: 0,
        outOfOrderTimestampCount: 0,
        missingFieldCounts: {},
        invalidNumberCounts: {},
        rangeViolationCounts: {},
        affectedRecords: [],
      },
    };
  }

  // Parse header line
  const rawHeaders = parseCsvLine(lines[0]);
  const canonicalHeaders = rawHeaders.map(normalizeHeader);

  // Fallback indices if header names differ
  const getColIndex = (target: string): number => canonicalHeaders.indexOf(target);
  const tsIdx = getColIndex('timestamp');
  const vehIdx = getColIndex('vehicle_id');
  const voltIdx = getColIndex('voltage_v');
  const currIdx = getColIndex('current_a');
  const tempIdx = getColIndex('temperature_c');
  const socIdx = getColIndex('soc_pct');
  const modeIdx = getColIndex('mode');

  // Track timestamps seen per vehicle for duplicates and chronological order
  const seenTimestampsByVehicle = new Map<string, Set<string>>();
  const lastTimestampMsByVehicle = new Map<string, number>();

  // Aggregate metrics for QualityReport
  const missingFieldCounts: Record<string, number> = {
    timestamp: 0,
    vehicle_id: 0,
    voltage_v: 0,
    current_a: 0,
    temperature_c: 0,
    soc_pct: 0,
  };
  const invalidNumberCounts: Record<string, number> = {
    voltage_v: 0,
    current_a: 0,
    temperature_c: 0,
    soc_pct: 0,
  };
  const rangeViolationCounts: Record<string, number> = {
    voltage_v: 0,
    current_a: 0,
    temperature_c: 0,
    soc_pct: 0,
  };

  let duplicateTimestampCount = 0;
  let outOfOrderTimestampCount = 0;

  const records: BmsRecord[] = [];
  const affectedRecordsList: QualityReport['affectedRecords'] = [];

  for (let i = 1; i < lines.length; i++) {
    const rowNumber = i + 1; // 1-indexed including header
    const rawCols = parseCsvLine(lines[i]);
    const rawRecord: Record<string, string> = {};
    rawHeaders.forEach((h, idx) => {
      rawRecord[h] = rawCols[idx] ?? '';
    });

    const issues: QualityIssue[] = [];

    // 1. Timestamp validation
    const rawTimestamp = tsIdx !== -1 ? (rawCols[tsIdx] ?? '') : '';
    if (!rawTimestamp.trim()) {
      issues.push({
        type: 'missing_field',
        field: 'timestamp',
        message: 'Timestamp is missing or blank',
        severity: 'error',
      });
      missingFieldCounts.timestamp++;
    }

    const { ms: timestampMs, formatted: formattedTimestamp } = parseTimestampToMs(rawTimestamp);
    if (rawTimestamp.trim() && timestampMs === null) {
      issues.push({
        type: 'invalid_number',
        field: 'timestamp',
        message: `Unparseable timestamp format: "${rawTimestamp}"`,
        severity: 'error',
        value: rawTimestamp,
      });
      invalidNumberCounts.timestamp = (invalidNumberCounts.timestamp || 0) + 1;
    }

    // 2. Vehicle ID validation
    const rawVehicle = vehIdx !== -1 ? (rawCols[vehIdx] ?? '') : '';
    const vehicle_id = rawVehicle.trim() || 'DEFAULT_VEHICLE';
    if (!rawVehicle.trim()) {
      issues.push({
        type: 'missing_field',
        field: 'vehicle_id',
        message: 'Vehicle ID is blank; assigned to "DEFAULT_VEHICLE"',
        severity: 'warning',
      });
      missingFieldCounts.vehicle_id++;
    }

    // Duplicate & chronological sequence checks (per vehicle)
    if (timestampMs !== null) {
      if (!seenTimestampsByVehicle.has(vehicle_id)) {
        seenTimestampsByVehicle.set(vehicle_id, new Set());
      }
      const vehicleSeenSet = seenTimestampsByVehicle.get(vehicle_id)!;
      if (vehicleSeenSet.has(formattedTimestamp)) {
        issues.push({
          type: 'duplicate_timestamp',
          field: 'timestamp',
          message: `Duplicate timestamp "${formattedTimestamp}" detected for vehicle "${vehicle_id}"`,
          severity: 'warning',
          value: formattedTimestamp,
        });
        duplicateTimestampCount++;
      } else {
        vehicleSeenSet.add(formattedTimestamp);
      }

      const prevMs = lastTimestampMsByVehicle.get(vehicle_id);
      if (prevMs !== undefined && timestampMs < prevMs) {
        issues.push({
          type: 'out_of_order',
          field: 'timestamp',
          message: `Timestamp is out-of-order: ${formattedTimestamp} occurs earlier than preceding record (${new Date(prevMs).toISOString()})`,
          severity: 'warning',
          value: formattedTimestamp,
        });
        outOfOrderTimestampCount++;
      }
      lastTimestampMsByVehicle.set(vehicle_id, timestampMs);
    }

    // 3. Numeric field helper
    const parseNumericField = (
      colIdx: number,
      fieldName: 'voltage_v' | 'current_a' | 'temperature_c' | 'soc_pct',
      minScreening: number,
      maxScreening: number,
      unit: string
    ): number | null => {
      const rawVal = colIdx !== -1 ? (rawCols[colIdx] ?? '') : '';
      if (!rawVal.trim()) {
        issues.push({
          type: 'missing_field',
          field: fieldName,
          message: `Missing ${fieldName} reading`,
          severity: 'warning',
        });
        missingFieldCounts[fieldName]++;
        return null;
      }
      const num = parseFloat(rawVal.trim());
      if (isNaN(num)) {
        issues.push({
          type: 'invalid_number',
          field: fieldName,
          message: `Non-numeric value "${rawVal}" in ${fieldName}`,
          severity: 'error',
          value: rawVal,
        });
        invalidNumberCounts[fieldName]++;
        return null;
      }
      // Plausibility screening check (explicitly labeled as screening default, not a battery fault)
      if (num < minScreening || num > maxScreening) {
        issues.push({
          type: 'out_of_range',
          field: fieldName,
          message: `Plausibility screening alert: ${num}${unit} is outside configured screening range [${minScreening}${unit}, ${maxScreening}${unit}]`,
          severity: 'warning',
          value: num,
        });
        rangeViolationCounts[fieldName]++;
      }
      return num;
    };

    const voltage_v = parseNumericField(voltIdx, 'voltage_v', config.voltageMin, config.voltageMax, 'V');
    const current_a = parseNumericField(currIdx, 'current_a', config.currentMin, config.currentMax, 'A');
    const temperature_c = parseNumericField(tempIdx, 'temperature_c', config.temperatureMin, config.temperatureMax, '°C');
    const soc_pct = parseNumericField(socIdx, 'soc_pct', config.socMin, config.socMax, '%');

    // 4. Mode
    const rawMode = modeIdx !== -1 ? (rawCols[modeIdx] ?? '').trim().toLowerCase() : '';
    let mode = 'unknown';
    if (['driving', 'drive', 'discharging', 'motion'].includes(rawMode)) {
      mode = 'driving';
    } else if (['charging', 'charge', 'fast_charge', 'level2'].includes(rawMode)) {
      mode = 'charging';
    } else if (['idle', 'standby', 'parked', 'off'].includes(rawMode)) {
      mode = 'idle';
    } else if (rawMode) {
      mode = rawMode;
    } else {
      // Inferred fallback based on current if mode is omitted
      if (current_a !== null) {
        if (current_a < -2) mode = 'driving';
        else if (current_a > 2) mode = 'charging';
        else mode = 'idle';
      }
    }

    const hasFatalErrors = issues.some((iss) => iss.severity === 'error');
    const isValid = !hasFatalErrors && timestampMs !== null;

    const record: BmsRecord = {
      rowNumber,
      rawTimestamp,
      timestamp: formattedTimestamp,
      timestampMs,
      vehicle_id,
      voltage_v,
      current_a,
      temperature_c,
      soc_pct,
      mode,
      issues,
      isValid,
      rawRecord,
    };

    records.push(record);

    if (issues.length > 0) {
      affectedRecordsList.push({
        rowNumber,
        timestamp: formattedTimestamp,
        vehicle_id,
        issues,
      });
    }
  }

  const totalRows = records.length;
  const validRows = records.filter((r) => r.isValid).length;
  const rowsWithIssuesCount = affectedRecordsList.length;
  const cleanRowsCount = totalRows - rowsWithIssuesCount;

  return {
    records,
    qualityReport: {
      totalRows,
      validRows,
      cleanRowsCount,
      rowsWithIssuesCount,
      duplicateTimestampCount,
      outOfOrderTimestampCount,
      missingFieldCounts,
      invalidNumberCounts,
      rangeViolationCounts,
      affectedRecords: affectedRecordsList,
    },
  };
}
