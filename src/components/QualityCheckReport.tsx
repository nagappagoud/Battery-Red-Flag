/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import {
  QualityReport,
  PlausibilityConfig,
} from '../types/bms';
import {
  AlertTriangle,
  CheckCircle,
  Clock,
  Copy,
  FileQuestion,
  Gauge,
  SlidersHorizontal,
  Download,
  Filter,
} from 'lucide-react';
import { exportQualityReportAsCsv, exportQualityReportAsJson } from '../utils/bmsExporter';

interface QualityCheckReportProps {
  report: QualityReport;
  config: PlausibilityConfig;
  onOpenSettings: () => void;
}

export const QualityCheckReport: React.FC<QualityCheckReportProps> = ({
  report,
  config,
  onOpenSettings,
}) => {
  const [selectedFilter, setSelectedFilter] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');

  const totalMissing = Object.values(report.missingFieldCounts).reduce((a, b) => a + b, 0);
  const totalInvalid = Object.values(report.invalidNumberCounts).reduce((a, b) => a + b, 0);
  const totalRangeViolations = Object.values(report.rangeViolationCounts).reduce((a, b) => a + b, 0);

  const cleanPercentage = report.totalRows > 0
    ? Math.round((report.cleanRowsCount / report.totalRows) * 100)
    : 100;

  // Filter affected records
  const filteredRecords = report.affectedRecords.filter((item) => {
    if (selectedFilter !== 'all') {
      const hasMatchingIssue = item.issues.some((iss) => iss.type === selectedFilter);
      if (!hasMatchingIssue) return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchVehicle = item.vehicle_id.toLowerCase().includes(term);
      const matchTs = item.timestamp.toLowerCase().includes(term);
      const matchRow = item.rowNumber.toString().includes(term);
      const matchMsg = item.issues.some((iss) => iss.message.toLowerCase().includes(term));
      if (!matchVehicle && !matchTs && !matchRow && !matchMsg) return false;
    }
    return true;
  });

  return (
    <div className="cockpit-panel p-5 sm:p-6 space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-950/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-white flex items-center gap-2">
              <Gauge className="w-4 h-4 text-cyan-400" />
              <span>Telemetry Quality &amp; Screening Audit</span>
            </h2>
            <span className="text-cyan-800">·</span>
            <span className="text-xs font-mono text-cyan-400/80">
              {report.cleanRowsCount} / {report.totalRows} clean ({cleanPercentage}%)
            </span>
          </div>
          <p className="text-xs text-cyan-200/70 mt-0.5">
            Deterministic validation for missing telemetry, format anomalies, timestamps, and physical plausibility boundaries.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-200/80 hover:text-white bg-[#04080e] hover:bg-[#07131e] border border-cyan-900/50 hover:border-cyan-400 rounded-lg transition-all duration-200 active:scale-95 shadow-sm"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-cyan-400" />
            <span>Screening Limits</span>
          </button>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => exportQualityReportAsCsv(report)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-cyan-200/80 hover:text-white bg-[#04080e] hover:bg-[#07131e] border border-cyan-900/50 hover:border-cyan-400 rounded-lg transition-all duration-200 active:scale-95 shadow-sm"
              title="Export Quality Audit Log as CSV"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => exportQualityReportAsJson(report)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-cyan-200/80 hover:text-white bg-[#04080e] hover:bg-[#07131e] border border-cyan-900/50 hover:border-cyan-400 rounded-lg transition-all duration-200 active:scale-95 shadow-sm"
              title="Export Quality Audit Log as JSON"
            >
              <Download className="w-3.5 h-3.5 text-cyan-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Clean records % */}
        <div className="bg-[#03070d] border border-cyan-900/40 hover:border-cyan-400/60 rounded-xl p-3.5 space-y-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,245,255,0.15)]">
          <div className="flex items-center justify-between text-cyan-400/70 mb-1">
            <span className="text-[11px] font-medium">Integrity Ratio</span>
            <CheckCircle className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">{cleanPercentage}%</div>
          <div className="text-[10px] text-cyan-400/60 font-mono">
            {report.cleanRowsCount} clean rows
          </div>
        </div>

        {/* Duplicate Timestamps */}
        <div className="bg-[#03070d] border border-cyan-900/40 hover:border-cyan-400/60 rounded-xl p-3.5 space-y-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,245,255,0.15)]">
          <div className="flex items-center justify-between text-cyan-400/70 mb-1">
            <span className="text-[11px] font-medium">Duplicate Timestamps</span>
            <Copy className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">
            {report.duplicateTimestampCount}
          </div>
          <div className="text-[10px] text-cyan-400/60 font-mono">Repeated entries</div>
        </div>

        {/* Out of Order */}
        <div className="bg-[#03070d] border border-cyan-900/40 hover:border-cyan-400/60 rounded-xl p-3.5 space-y-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,245,255,0.15)]">
          <div className="flex items-center justify-between text-cyan-400/70 mb-1">
            <span className="text-[11px] font-medium">Timeline Inversions</span>
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">
            {report.outOfOrderTimestampCount}
          </div>
          <div className="text-[10px] text-cyan-400/60 font-mono">Out of order</div>
        </div>

        {/* Missing Values */}
        <div className="bg-[#03070d] border border-cyan-900/40 hover:border-cyan-400/60 rounded-xl p-3.5 space-y-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,245,255,0.15)]">
          <div className="flex items-center justify-between text-cyan-400/70 mb-1">
            <span className="text-[11px] font-medium">Missing Fields</span>
            <FileQuestion className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">{totalMissing}</div>
          <div className="text-[10px] text-cyan-400/60 font-mono">Null / empty values</div>
        </div>

        {/* Invalid Numbers */}
        <div className="bg-[#03070d] border border-cyan-900/40 hover:border-cyan-400/60 rounded-xl p-3.5 space-y-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,245,255,0.15)]">
          <div className="flex items-center justify-between text-cyan-400/70 mb-1">
            <span className="text-[11px] font-medium">Malformed Values</span>
            <AlertTriangle className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">{totalInvalid}</div>
          <div className="text-[10px] text-cyan-400/60 font-mono">Unparseable items</div>
        </div>

        {/* Range Violations */}
        <div className="bg-[#03070d] border border-cyan-900/40 hover:border-cyan-400/60 rounded-xl p-3.5 space-y-1 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_15px_rgba(0,245,255,0.15)]">
          <div className="flex items-center justify-between text-cyan-400/70 mb-1">
            <span className="text-[11px] font-medium">Screening Alerts</span>
            <Gauge className="w-3.5 h-3.5 text-cyan-400" />
          </div>
          <div className="text-xl font-bold font-mono text-white tabular-nums drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">{totalRangeViolations}</div>
          <div className="text-[10px] text-cyan-400/60 font-mono">Outside bounds</div>
        </div>
      </div>

      {/* Applied screening bounds reference line */}
      <div className="px-4 py-2.5 bg-[#020509] border border-cyan-950/70 rounded-xl text-xs flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] text-cyan-300/80">
        <span className="text-cyan-400 font-sans font-semibold text-[10px] uppercase tracking-wider">Applied Limits:</span>
        <span>Voltage: [{config.voltageMin}, {config.voltageMax}] V</span>
        <span className="text-cyan-900">·</span>
        <span>Current: [{config.currentMin}, {config.currentMax}] A</span>
        <span className="text-cyan-900">·</span>
        <span>Temp: [{config.temperatureMin}, {config.temperatureMax}] °C</span>
        <span className="text-cyan-900">·</span>
        <span>SoC: [{config.socMin}, {config.socMax}] %</span>
        <span className="text-cyan-900">·</span>
        <span className="text-cyan-300">Temp baseline: &gt;{config.tempAlertThreshold} °C</span>
      </div>

      {/* Affected Records Detail Table */}
      {report.affectedRecords.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <span className="text-xs font-semibold text-white">
              Discrepancy Audit Log ({filteredRecords.length} records)
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type filter */}
              <div className="flex items-center gap-1.5 bg-[#020509] px-2.5 py-1 rounded-lg border border-cyan-950/80 text-[11px]">
                <Filter className="w-3 h-3 text-cyan-400" />
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="bg-transparent text-cyan-200 focus:outline-none text-xs cursor-pointer"
                >
                  <option value="all" className="bg-[#04080e] text-cyan-200">All Flagged Issues</option>
                  <option value="missing_field" className="bg-[#04080e] text-cyan-200">Missing Fields</option>
                  <option value="invalid_number" className="bg-[#04080e] text-cyan-200">Malformed Numbers</option>
                  <option value="duplicate_timestamp" className="bg-[#04080e] text-cyan-200">Duplicate Timestamps</option>
                  <option value="out_of_order" className="bg-[#04080e] text-cyan-200">Out of Order</option>
                  <option value="out_of_range" className="bg-[#04080e] text-cyan-200">Screening Range</option>
                </select>
              </div>

              {/* Search text */}
              <input
                type="text"
                placeholder="Filter logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-[#020509] border border-cyan-950/80 rounded-lg px-2.5 py-1 text-xs text-cyan-100 placeholder-cyan-900 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,245,255,0.25)] transition-all w-44"
              />
            </div>
          </div>

          <div className="border border-cyan-950/80 rounded-xl overflow-hidden overflow-x-auto max-h-72 bg-[#020509]">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#040912] text-cyan-400 border-b border-cyan-950/80 text-[11px] font-mono">
                <tr>
                  <th className="py-2.5 px-3 font-semibold w-16">Row</th>
                  <th className="py-2.5 px-3 font-semibold w-40">Timestamp</th>
                  <th className="py-2.5 px-3 font-semibold w-28">Vehicle ID</th>
                  <th className="py-2.5 px-3 font-semibold w-32">Issue Type</th>
                  <th className="py-2.5 px-3 font-semibold w-24">Field</th>
                  <th className="py-2.5 px-3 font-semibold">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-cyan-950/40 font-mono text-[11px]">
                {filteredRecords.map((item) =>
                  item.issues.map((iss, issIdx) => (
                    <tr
                      key={`${item.rowNumber}-${issIdx}`}
                      className="hover:bg-cyan-950/20 transition-colors"
                    >
                      <td className="py-2 px-3 text-cyan-300 font-bold">
                        #{item.rowNumber}
                      </td>
                      <td className="py-2 px-3 text-cyan-200/80 truncate max-w-[150px]">
                        {item.timestamp}
                      </td>
                      <td className="py-2 px-3 text-white font-semibold">
                        {item.vehicle_id}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-cyan-300 uppercase font-mono text-[10px] bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/40">
                          {iss.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-cyan-400/80">
                        {iss.field}
                      </td>
                      <td className="py-2 px-3 font-sans text-xs text-cyan-100">
                        {iss.message}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        <div className="p-4 bg-[#020509] border border-cyan-950/80 rounded-xl text-center text-xs text-cyan-300 flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4 text-cyan-400" />
          <span>No quality anomalies or boundary violations detected in telemetry stream.</span>
        </div>
      )}
    </div>
  );
};
