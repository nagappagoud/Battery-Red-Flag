/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { BmsRecord } from '../types/bms';
import {
  Table,
  Search,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Check,
} from 'lucide-react';

interface DataPreviewTableProps {
  records: BmsRecord[];
}

export const DataPreviewTable: React.FC<DataPreviewTableProps> = ({ records }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [onlyIssues, setOnlyIssues] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 20;

  const filteredRecords = useMemo(() => {
    return records.filter((r) => {
      if (onlyIssues && r.issues.length === 0) return false;
      if (!searchTerm.trim()) return true;

      const term = searchTerm.toLowerCase();
      return (
        r.rowNumber.toString().includes(term) ||
        r.vehicle_id.toLowerCase().includes(term) ||
        r.timestamp.toLowerCase().includes(term) ||
        r.mode.toLowerCase().includes(term) ||
        r.issues.some((iss) => iss.message.toLowerCase().includes(term))
      );
    });
  }, [records, searchTerm, onlyIssues]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / pageSize));
  const pageIndex = Math.min(currentPage, totalPages);
  const paginated = filteredRecords.slice((pageIndex - 1) * pageSize, pageIndex * pageSize);

  const getCellIssue = (r: BmsRecord, fieldName: string) => {
    return r.issues.find((iss) => iss.field === fieldName);
  };

  return (
    <div className="cockpit-panel p-5 sm:p-6 space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-950/60 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Table className="w-4 h-4 text-cyan-400" />
            <span>Telemetry Records Table</span>
          </h2>
          <p className="text-xs text-cyan-200/70 mt-0.5">
            Individual inspection of {records.length} parsed records. Cells violating screening bounds or format rules are annotated.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Checkbox to filter issues only */}
          <label className="flex items-center gap-1.5 text-xs text-cyan-200 cursor-pointer bg-[#020509] px-2.5 py-1.5 rounded-lg border border-cyan-950/80 hover:border-cyan-500/50 transition-colors">
            <input
              type="checkbox"
              checked={onlyIssues}
              onChange={(e) => {
                setOnlyIssues(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded bg-[#04080e] border-cyan-800 text-cyan-400 focus:ring-0 accent-cyan-400"
            />
            <span>Flagged rows only</span>
          </label>

          {/* Search box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-cyan-500/70 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter records..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-[#020509] border border-cyan-950/80 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-cyan-100 placeholder-cyan-900 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_12px_rgba(0,245,255,0.25)] transition-all font-mono"
            />
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="border border-cyan-950/80 rounded-xl overflow-hidden overflow-x-auto bg-[#020509]">
        <table className="w-full text-left text-xs">
          <thead className="bg-[#040912] text-cyan-400 border-b border-cyan-950/80 text-[11px] font-mono">
            <tr>
              <th className="py-2.5 px-3 font-semibold w-14">Row</th>
              <th className="py-2.5 px-3 font-semibold">Timestamp</th>
              <th className="py-2.5 px-3 font-semibold">Vehicle ID</th>
              <th className="py-2.5 px-3 font-semibold">Voltage (V)</th>
              <th className="py-2.5 px-3 font-semibold">Current (A)</th>
              <th className="py-2.5 px-3 font-semibold">Temp (°C)</th>
              <th className="py-2.5 px-3 font-semibold">SoC (%)</th>
              <th className="py-2.5 px-3 font-semibold">Mode</th>
              <th className="py-2.5 px-3 font-semibold">Audit Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-cyan-950/40 font-mono text-xs">
            {paginated.length > 0 ? (
              paginated.map((r) => {
                const tsIssue = getCellIssue(r, 'timestamp');
                const vIssue = getCellIssue(r, 'voltage_v');
                const iIssue = getCellIssue(r, 'current_a');
                const tIssue = getCellIssue(r, 'temperature_c');
                const socIssue = getCellIssue(r, 'soc_pct');

                return (
                  <tr
                    key={r.rowNumber}
                    className={`hover:bg-cyan-950/25 transition-colors ${
                      r.issues.length > 0 ? 'bg-cyan-950/10' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-cyan-400/70 tabular-nums">#{r.rowNumber}</td>
                    <td
                      className={`py-2 px-3 truncate max-w-[150px] ${
                        tsIssue ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-cyan-200/80'
                      }`}
                      title={tsIssue?.message}
                    >
                      {r.timestamp}
                    </td>
                    <td className="py-2 px-3 text-white font-medium">{r.vehicle_id}</td>
                    <td
                      className={`py-2 px-3 tabular-nums ${
                        vIssue ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-cyan-100'
                      }`}
                      title={vIssue?.message}
                    >
                      {r.voltage_v !== null ? `${r.voltage_v} V` : <span className="text-cyan-600 italic">null</span>}
                    </td>
                    <td
                      className={`py-2 px-3 tabular-nums ${
                        iIssue ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-cyan-100'
                      }`}
                      title={iIssue?.message}
                    >
                      {r.current_a !== null ? `${r.current_a} A` : <span className="text-cyan-600 italic">null</span>}
                    </td>
                    <td
                      className={`py-2 px-3 tabular-nums ${
                        tIssue ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-cyan-100'
                      }`}
                      title={tIssue?.message}
                    >
                      {r.temperature_c !== null ? `${r.temperature_c} °C` : <span className="text-cyan-600 italic">null</span>}
                    </td>
                    <td
                      className={`py-2 px-3 tabular-nums ${
                        socIssue ? 'text-cyan-300 font-bold bg-cyan-950/40' : 'text-cyan-100'
                      }`}
                      title={socIssue?.message}
                    >
                      {r.soc_pct !== null ? `${r.soc_pct} %` : <span className="text-cyan-600 italic">null</span>}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] font-mono uppercase text-cyan-400 bg-cyan-950/50 px-1.5 py-0.5 rounded border border-cyan-900/60">
                        {r.mode}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {r.issues.length === 0 ? (
                        <span className="flex items-center gap-1 text-[11px] text-cyan-400/80 font-sans">
                          <Check className="w-3 h-3 text-cyan-400" /> Pass
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {r.issues.map((iss, i) => (
                            <span
                              key={i}
                              className="text-[10px] text-cyan-300 flex items-center gap-1 font-sans"
                              title={iss.message}
                            >
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-cyan-400" />
                              <span className="truncate max-w-[130px]">{iss.message}</span>
                            </span>
                          ))}
                        </div>
                      )}
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan={9} className="py-8 text-center text-cyan-400/60 font-sans">
                  No records match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between text-xs text-cyan-400/70 pt-1 font-mono">
        <span>
          Records {filteredRecords.length > 0 ? (pageIndex - 1) * pageSize + 1 : 0}–
          {Math.min(pageIndex * pageSize, filteredRecords.length)} of {filteredRecords.length}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={pageIndex <= 1}
            className="p-1.5 rounded-lg border border-cyan-950 bg-[#020509] text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#07131e] hover:border-cyan-400 transition-all"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-cyan-200 px-2 tabular-nums font-semibold">
            {pageIndex} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageIndex >= totalPages}
            className="p-1.5 rounded-lg border border-cyan-950 bg-[#020509] text-cyan-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-[#07131e] hover:border-cyan-400 transition-all"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
