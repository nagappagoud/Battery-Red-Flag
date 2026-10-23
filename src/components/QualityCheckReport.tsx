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
    <div className="bg-[#0e131d] border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
              <Gauge className="w-4 h-4 text-slate-400" />
              <span>Telemetry Quality &amp; Screening Audit</span>
            </h2>
            <span className="text-slate-600">·</span>
            <span className="text-xs font-mono text-slate-400">
              {report.cleanRowsCount} / {report.totalRows} clean ({cleanPercentage}%)
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Deterministic check for missing data, format corruption, duplicate/out-of-order timestamps, and configurable screening bounds.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onOpenSettings}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 rounded-lg transition-colors"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-slate-400" />
            <span>Screening Limits</span>
          </button>

          <div className="flex items-center gap-1">
            <button
              onClick={() => exportQualityReportAsCsv(report)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 rounded-lg transition-colors"
              title="Export Quality Audit Log as CSV"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>CSV</span>
            </button>
            <button
              onClick={() => exportQualityReportAsJson(report)}
              className="flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 rounded-lg transition-colors"
              title="Export Quality Audit Log as JSON"
            >
              <Download className="w-3.5 h-3.5 text-slate-400" />
              <span>JSON</span>
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-2.5">
        {/* Clean records % */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">Integrity Ratio</span>
            <CheckCircle className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">{cleanPercentage}%</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
            {report.cleanRowsCount} clean rows
          </div>
        </div>

        {/* Duplicate Timestamps */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">Duplicate Timestamps</span>
            <Copy className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">
            {report.duplicateTimestampCount}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Repeated timestamps</div>
        </div>

        {/* Out of Order */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">Timeline Inversions</span>
            <Clock className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">
            {report.outOfOrderTimestampCount}
          </div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Out of order</div>
        </div>

        {/* Missing Values */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">Missing Fields</span>
            <FileQuestion className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">{totalMissing}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Null / empty values</div>
        </div>

        {/* Invalid Numbers */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">Malformed Values</span>
            <AlertTriangle className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">{totalInvalid}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Unparseable strings</div>
        </div>

        {/* Range Violations */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-3">
          <div className="flex items-center justify-between text-slate-400 mb-1">
            <span className="text-[11px]">Screening Alerts</span>
            <Gauge className="w-3.5 h-3.5 text-slate-500" />
          </div>
          <div className="text-xl font-bold font-mono text-slate-100 tabular-nums">{totalRangeViolations}</div>
          <div className="text-[10px] text-slate-500 font-mono mt-0.5">Outside boundaries</div>
        </div>
      </div>

      {/* Applied screening bounds reference line */}
      <div className="px-3 py-2 bg-slate-900/40 border border-slate-800/60 rounded-lg text-xs flex flex-wrap items-center gap-x-4 gap-y-1.5 font-mono text-[11px] text-slate-400">
        <span className="text-slate-500 uppercase font-sans text-[10px]">Applied Limits:</span>
        <span>Voltage: [{config.voltageMin}, {config.voltageMax}] V</span>
        <span className="text-slate-700">·</span>
        <span>Current: [{config.currentMin}, {config.currentMax}] A</span>
        <span className="text-slate-700">·</span>
        <span>Temp: [{config.temperatureMin}, {config.temperatureMax}] °C</span>
        <span className="text-slate-700">·</span>
        <span>SoC: [{config.socMin}, {config.socMax}] %</span>
        <span className="text-slate-700">·</span>
        <span className="text-slate-300">Temp baseline: &gt;{config.tempAlertThreshold} °C</span>
      </div>

      {/* Affected Records Detail Table */}
      {report.affectedRecords.length > 0 ? (
        <div className="space-y-3">
          <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2.5">
            <span className="text-xs font-medium text-slate-300">
              Discrepancy Audit Log ({filteredRecords.length} records)
            </span>

            <div className="flex flex-wrap items-center gap-2">
              {/* Type filter */}
              <div className="flex items-center gap-1 bg-slate-900 px-2 py-1 rounded-md border border-slate-800 text-[11px]">
                <Filter className="w-3 h-3 text-slate-500" />
                <select
                  value={selectedFilter}
                  onChange={(e) => setSelectedFilter(e.target.value)}
                  className="bg-transparent text-slate-300 focus:outline-none text-xs cursor-pointer"
                >
                  <option value="all" className="bg-slate-900">All Flagged Issues</option>
                  <option value="missing_field" className="bg-slate-900">Missing Fields</option>
                  <option value="invalid_number" className="bg-slate-900">Malformed Numbers</option>
                  <option value="duplicate_timestamp" className="bg-slate-900">Duplicate Timestamps</option>
                  <option value="out_of_order" className="bg-slate-900">Out of Order</option>
                  <option value="out_of_range" className="bg-slate-900">Screening Range</option>
                </select>
              </div>

              {/* Search text */}
              <input
                type="text"
                placeholder="Filter logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="bg-slate-950 border border-slate-800 rounded-md px-2.5 py-1 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 w-44"
              />
            </div>
          </div>

          <div className="border border-slate-800/80 rounded-lg overflow-hidden overflow-x-auto max-h-72">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[11px] font-mono">
                <tr>
                  <th className="py-2 px-3 font-medium w-16">Row</th>
                  <th className="py-2 px-3 font-medium w-40">Timestamp</th>
                  <th className="py-2 px-3 font-medium w-28">Vehicle ID</th>
                  <th className="py-2 px-3 font-medium w-32">Issue Type</th>
                  <th className="py-2 px-3 font-medium w-24">Field</th>
                  <th className="py-2 px-3 font-medium">Description</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                {filteredRecords.map((item) =>
                  item.issues.map((iss, issIdx) => (
                    <tr
                      key={`${item.rowNumber}-${issIdx}`}
                      className="hover:bg-slate-800/30 transition-colors"
                    >
                      <td className="py-2 px-3 text-slate-300">
                        #{item.rowNumber}
                      </td>
                      <td className="py-2 px-3 text-slate-400 truncate max-w-[150px]">
                        {item.timestamp}
                      </td>
                      <td className="py-2 px-3 text-slate-300">
                        {item.vehicle_id}
                      </td>
                      <td className="py-2 px-3">
                        <span className="text-slate-300 uppercase font-mono text-[10px]">
                          {iss.type.replace(/_/g, ' ')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-slate-400">
                        {iss.field}
                      </td>
                      <td className="py-2 px-3 font-sans text-xs text-slate-300">
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
        <div className="p-4 bg-slate-900/30 border border-slate-800/60 rounded-lg text-center text-xs text-slate-400 flex items-center justify-center gap-2">
          <CheckCircle className="w-4 h-4 text-emerald-400" />
          <span>No quality anomalies or boundary violations detected in telemetry stream.</span>
        </div>
      )}
    </div>
  );
};
