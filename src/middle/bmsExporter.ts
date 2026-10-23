/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// LAYER 2: MIDDLE LAYER — EXPORT SERIALIZERS & FILE BUILDERS
// ============================================================================

import { BMSAnalysisResult, QualityReport, SessionSummary } from './types';
import { downloadCsvFile, downloadJsonFile } from './sampleData';

/**
 * Builds standard CSV text of all vehicle sessions and descriptive metrics
 */
export function buildSummaryCsvContent(result: BMSAnalysisResult): string {
  const headers = [
    'vehicle_id',
    'session_label',
    'mode',
    'start_time',
    'end_time',
    'duration_seconds',
    'total_records',
    'valid_records',
    'voltage_min_v',
    'voltage_max_v',
    'voltage_mean_v',
    'voltage_delta_v',
    'current_min_a',
    'current_max_a',
    'current_mean_a',
    'net_throughput_ah',
    'est_energy_kwh',
    'soc_min_pct',
    'soc_max_pct',
    'soc_mean_pct',
    'soc_delta_pct',
    'temp_min_c',
    'temp_max_c',
    'temp_mean_c',
    'temp_threshold_used_c',
    'time_above_temp_threshold_s',
    'pct_above_temp_threshold',
  ];

  const rows: string[] = [headers.join(',')];

  result.vehicleIds.forEach((vId) => {
    const group = result.vehicleGroups[vId];
    if (!group) return;

    const exportSessions: SessionSummary[] = [group.overallSummary, ...group.sessions];

    exportSessions.forEach((s) => {
      const row = [
        `"${s.vehicleId}"`,
        `"${s.label}"`,
        `"${s.mode}"`,
        `"${s.startTime}"`,
        `"${s.endTime}"`,
        s.durationSeconds,
        s.totalRecords,
        s.validRecords,
        s.voltage?.min ?? '',
        s.voltage?.max ?? '',
        s.voltage?.mean ?? '',
        s.voltage?.delta ?? '',
        s.current?.min ?? '',
        s.current?.max ?? '',
        s.current?.mean ?? '',
        s.current?.netAh ?? '',
        s.current?.netKWhEst ?? '',
        s.soc?.min ?? '',
        s.soc?.max ?? '',
        s.soc?.mean ?? '',
        s.soc?.delta ?? '',
        s.temperature?.min ?? '',
        s.temperature?.max ?? '',
        s.temperature?.mean ?? '',
        s.temperature?.thresholdUsed ?? '',
        s.temperature?.timeAboveThresholdSec ?? '',
        s.temperature?.pctAboveThreshold ?? '',
      ];
      rows.push(row.join(','));
    });
  });

  return rows.join('\n');
}

/**
 * Builds standard CSV text of all quality audit discrepancies
 */
export function buildQualityReportCsvContent(report: QualityReport): string {
  const headers = ['row_number', 'timestamp', 'vehicle_id', 'issue_type', 'field', 'severity', 'description'];
  const rows: string[] = [headers.join(',')];

  report.affectedRecords.forEach((item) => {
    item.issues.forEach((iss) => {
      const row = [
        item.rowNumber,
        `"${item.timestamp}"`,
        `"${item.vehicle_id}"`,
        `"${iss.type}"`,
        `"${iss.field}"`,
        `"${iss.severity}"`,
        `"${iss.message.replace(/"/g, '""')}"`,
      ];
      rows.push(row.join(','));
    });
  });

  return rows.join('\n');
}

/**
 * Generates and downloads a CSV export of session descriptive statistics
 */
export function exportSummaryAsCsv(result: BMSAnalysisResult): void {
  const csvContent = buildSummaryCsvContent(result);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadCsvFile(csvContent, `bms_descriptive_summary_${timestamp}.csv`);
}

/**
 * Exports summary data as structured JSON
 */
export function exportSummaryAsJson(result: BMSAnalysisResult): void {
  const exportData = {
    metadata: {
      generatedAt: new Date().toISOString(),
      disclaimer:
        'Descriptive statistics and data quality screening only. Not a certified battery fault diagnostic or remaining useful life (RUL) estimate.',
      plausibilityConfigUsed: result.configUsed,
    },
    vehicleSummaries: Object.values(result.vehicleGroups).map((vg) => ({
      vehicleId: vg.vehicleId,
      totalRecords: vg.totalRecords,
      overallSummary: vg.overallSummary,
      sessions: vg.sessions,
    })),
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadJsonFile(exportData, `bms_summary_report_${timestamp}.json`);
}

/**
 * Generates and downloads a CSV export of the quality issues audit log
 */
export function exportQualityReportAsCsv(report: QualityReport): void {
  const csvContent = buildQualityReportCsvContent(report);
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadCsvFile(csvContent, `bms_data_quality_report_${timestamp}.csv`);
}

/**
 * Exports data quality audit report as JSON
 */
export function exportQualityReportAsJson(report: QualityReport): void {
  const exportData = {
    generatedAt: new Date().toISOString(),
    metrics: {
      totalRows: report.totalRows,
      validRows: report.validRows,
      cleanRowsCount: report.cleanRowsCount,
      rowsWithIssuesCount: report.rowsWithIssuesCount,
      duplicateTimestampCount: report.duplicateTimestampCount,
      outOfOrderTimestampCount: report.outOfOrderTimestampCount,
      missingFieldCounts: report.missingFieldCounts,
      invalidNumberCounts: report.invalidNumberCounts,
      rangeViolationCounts: report.rangeViolationCounts,
    },
    affectedRecords: report.affectedRecords,
  };

  const timestamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  downloadJsonFile(exportData, `bms_quality_audit_${timestamp}.json`);
}
