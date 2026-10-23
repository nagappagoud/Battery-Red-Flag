/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { X, BookOpen, Terminal, CheckCircle2, ShieldAlert, Layers } from 'lucide-react';

interface DocumentationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const DocumentationModal: React.FC<DocumentationModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0e131d] border border-slate-800 rounded-xl max-w-2xl w-full max-h-[85vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-800 text-slate-300 rounded-lg">
              <BookOpen className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">
                Telemetry Schema &amp; Methodological Reference
              </h2>
              <p className="text-[11px] text-slate-400">Deterministic validation and parametric calculation logic</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-6 text-xs text-slate-300">
          {/* Section 1: CSV Schema */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Terminal className="w-3.5 h-3.5 text-slate-400" />
              1. Accepted CSV Field Specification
            </h3>
            <p className="text-slate-400">
              The parser reads standard CSV or text streams with comma delimiters. Headers are case-insensitive and support standard aliases:
            </p>
            <div className="bg-[#080c14] p-3 rounded-lg border border-slate-800 font-mono text-[11px] space-y-1 text-slate-300">
              <div><strong className="text-slate-100">timestamp</strong>: ISO 8601 string (e.g. <code>2026-10-22T08:00:00Z</code>) or unix epoch ms.</div>
              <div><strong className="text-slate-100">vehicle_id</strong>: Unique identifier string for vehicle or pack (e.g. <code>EV-101</code>).</div>
              <div><strong className="text-slate-100">voltage_v</strong>: Pack terminal voltage in Volts (V).</div>
              <div><strong className="text-slate-100">current_a</strong>: Pack current in Amperes (A). Negative = discharge, Positive = charge.</div>
              <div><strong className="text-slate-100">temperature_c</strong>: Average/peak battery temperature in degrees Celsius (°C).</div>
              <div><strong className="text-slate-100">soc_pct</strong>: State of Charge percentage (0 to 100%).</div>
              <div><strong className="text-slate-400">mode</strong> (optional): Operational mode: <code>driving</code>, <code>charging</code>, or <code>idle</code>.</div>
            </div>
          </div>

          {/* Section 2: Data Quality Checks */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <CheckCircle2 className="w-3.5 h-3.5 text-slate-400" />
              2. Data-Quality Integrity Rules
            </h3>
            <ul className="list-disc list-inside space-y-1 pl-1 text-slate-300 leading-relaxed">
              <li><strong>Missing Field Detection:</strong> Flags records missing any required telemetry field.</li>
              <li><strong>Malformed Numbers:</strong> Identifies unparseable sensor strings (e.g., <code>ERR</code>, <code>NaN</code>).</li>
              <li><strong>Duplicate Timestamps:</strong> Flags multiple records sharing identical timestamps for the same vehicle ID.</li>
              <li><strong>Timeline Order Checks:</strong> Flags records arriving out of chronological order.</li>
              <li><strong>Screening Bounds:</strong> Flags values falling outside configurable physical bounds without data alteration.</li>
            </ul>
          </div>

          {/* Section 3: Descriptive Calculation Formulas */}
          <div className="space-y-2">
            <h3 className="text-xs font-semibold text-slate-100 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-slate-400" />
              3. Descriptive Numerical Methods
            </h3>
            <div className="space-y-2 bg-slate-900/40 p-3.5 rounded-lg border border-slate-800">
              <div>
                <strong className="text-slate-200">Session Segmentation:</strong> Split on <code>mode</code> transitions (e.g. driving &rarr; idle) or when timestamp gaps exceed the configured inactivity threshold (default: 15 min).
              </div>
              <div>
                <strong className="text-slate-200">Thermal Exposure Duration:</strong> Evaluates cumulative duration where temperature exceeds the configured threshold. Applies linear interpolation on boundary-crossing intervals.
              </div>
              <div>
                <strong className="text-slate-200">Charge &amp; Energy Throughput:</strong> Trapezoidal numerical integration:
                <code className="block mt-1 font-mono text-[11px] text-slate-300">
                  {'Net Ah = \u03A3 ( (I[k] + I[k+1]) / 2 ) * \u0394t_hours'}
                </code>
                <code className="block mt-0.5 font-mono text-[11px] text-slate-300">
                  {'Net kWh = \u03A3 ( (V[k]*I[k] + V[k+1]*I[k+1]) / 2000 ) * \u0394t_hours'}
                </code>
              </div>
            </div>
          </div>

          {/* Section 4: AI & Fault Diagnostics Boundary */}
          <div className="p-3.5 bg-slate-900/50 border border-slate-800 rounded-lg space-y-1.5 text-slate-300">
            <div className="flex items-center gap-2 text-slate-200 font-medium">
              <ShieldAlert className="w-4 h-4 text-slate-400" />
              <span>Fault Diagnostics Distinction</span>
            </div>
            <p className="leading-relaxed text-[11px] text-slate-400">
              This application is a deterministic engineering screening tool. It does not predict Remaining Useful Life (RUL), assess cell internal resistance degradation, or validate State of Health (SoH). Production fault diagnostics require physics-based equivalent circuit / electrochemical models or specialized machine-learning models trained on laboratory-validated cell degradation and fault datasets.
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-md transition-colors border border-slate-700/80"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
};
