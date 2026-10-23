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
    <div className="bg-[#0e131d] border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
      {/* Header & Filter Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Table className="w-4 h-4 text-slate-400" />
            <span>Telemetry Records Table</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Individual inspection of {records.length} parsed records. Cells violating screening bounds or format rules are annotated.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 w-full sm:w-auto">
          {/* Checkbox to filter issues only */}
          <label className="flex items-center gap-1.5 text-xs text-slate-300 cursor-pointer bg-slate-900 px-2.5 py-1.5 rounded-md border border-slate-800">
            <input
              type="checkbox"
              checked={onlyIssues}
              onChange={(e) => {
                setOnlyIssues(e.target.checked);
                setCurrentPage(1);
              }}
              className="rounded bg-slate-950 border-slate-700 text-slate-400 focus:ring-0"
            />
            <span>Flagged rows only</span>
          </label>

          {/* Search box */}
          <div className="relative flex-1 sm:w-48">
            <Search className="w-3.5 h-3.5 text-slate-500 absolute left-2.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Filter records..."
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="w-full bg-slate-950 border border-slate-800 rounded-md pl-8 pr-2.5 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-slate-700 font-mono"
            />
          </div>
        </div>
      </div>

      {/* Table view */}
      <div className="border border-slate-800/80 rounded-lg overflow-hidden overflow-x-auto">
        <table className="w-full text-left text-xs">
          <thead className="bg-slate-900 text-slate-400 border-b border-slate-800 text-[11px] font-mono">
            <tr>
              <th className="py-2.5 px-3 font-medium w-14">Row</th>
              <th className="py-2.5 px-3 font-medium">Timestamp</th>
              <th className="py-2.5 px-3 font-medium">Vehicle ID</th>
              <th className="py-2.5 px-3 font-medium">Voltage (V)</th>
              <th className="py-2.5 px-3 font-medium">Current (A)</th>
              <th className="py-2.5 px-3 font-medium">Temp (°C)</th>
              <th className="py-2.5 px-3 font-medium">SoC (%)</th>
              <th className="py-2.5 px-3 font-medium">Mode</th>
              <th className="py-2.5 px-3 font-medium">Audit Notes</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/60 font-mono text-xs">
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
                    className={`hover:bg-slate-800/20 transition-colors ${
                      r.issues.length > 0 ? 'bg-slate-900/30' : ''
                    }`}
                  >
                    <td className="py-2 px-3 text-slate-500 tabular-nums">#{r.rowNumber}</td>
                    <td
                      className={`py-2 px-3 truncate max-w-[150px] ${
                        tsIssue ? 'text-amber-300 font-medium' : 'text-slate-300'
                      }`}
                      title={tsIssue?.message}
                    >
                      {r.timestamp}
                    </td>
                    <td className="py-2 px-3 text-slate-300">{r.vehicle_id}</td>
                    <td
                      className={`py-2 px-3 tabular-nums ${
                        vIssue ? 'text-amber-300 font-medium' : 'text-slate-200'
                      }`}
                      title={vIssue?.message}
                    >
                      {r.voltage_v !== null ? `${r.voltage_v} V` : <span className="text-slate-500 italic">null</span>}
                    </td>
                    <td
                      className={`py-2 px-3 tabular-nums ${
                        iIssue ? 'text-amber-300 font-medium' : 'text-slate-200'
                      }`}
                      title={iIssue?.message}
                    >
                      {r.current_a !== null ? `${r.current_a} A` : <span className="text-slate-500 italic">null</span>}
                    </td>
                    <td
                      className={`py-2 px-3 tabular-nums ${
                        tIssue ? 'text-amber-300 font-medium' : 'text-slate-200'
                      }`}
                      title={tIssue?.message}
                    >
                      {r.temperature_c !== null ? `${r.temperature_c} °C` : <span className="text-slate-500 italic">null</span>}
                    </td>
                    <td
                      className={`py-2 px-3 tabular-nums ${
                        socIssue ? 'text-amber-300 font-medium' : 'text-slate-200'
                      }`}
                      title={socIssue?.message}
                    >
                      {r.soc_pct !== null ? `${r.soc_pct} %` : <span className="text-slate-500 italic">null</span>}
                    </td>
                    <td className="py-2 px-3">
                      <span className="text-[10px] font-mono uppercase text-slate-400">
                        {r.mode}
                      </span>
                    </td>
                    <td className="py-2 px-3">
                      {r.issues.length === 0 ? (
                        <span className="flex items-center gap-1 text-[11px] text-slate-500 font-sans">
                          <Check className="w-3 h-3 text-slate-500" /> Pass
                        </span>
                      ) : (
                        <div className="flex flex-col gap-0.5">
                          {r.issues.map((iss, i) => (
                            <span
                              key={i}
                              className="text-[10px] text-amber-300/90 flex items-center gap-1 font-sans"
                              title={iss.message}
                            >
                              <AlertTriangle className="w-2.5 h-2.5 shrink-0 text-amber-400" />
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
                <td colSpan={9} className="py-8 text-center text-slate-500 font-sans">
                  No records match the current filter.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination controls */}
      <div className="flex items-center justify-between text-xs text-slate-400 pt-1 font-mono">
        <span>
          Records {filteredRecords.length > 0 ? (pageIndex - 1) * pageSize + 1 : 0}–
          {Math.min(pageIndex * pageSize, filteredRecords.length)} of {filteredRecords.length}
        </span>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
            disabled={pageIndex <= 1}
            className="p-1 rounded-md border border-slate-800 bg-slate-900 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-slate-300 px-2 tabular-nums">
            {pageIndex} / {totalPages}
          </span>
          <button
            onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
            disabled={pageIndex >= totalPages}
            className="p-1 rounded-md border border-slate-800 bg-slate-900 text-slate-400 disabled:opacity-30 disabled:cursor-not-allowed hover:bg-slate-800"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};
