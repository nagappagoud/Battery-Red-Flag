/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BookOpen, ShieldCheck, FileCheck, Layers } from 'lucide-react';

export const MethodologyNote: React.FC = () => {
  return (
    <div className="bg-[#0e131d] border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4">
      <div className="flex items-center gap-2 border-b border-slate-800/60 pb-3">
        <BookOpen className="w-4 h-4 text-slate-400" />
        <h2 className="text-sm font-semibold text-slate-100">
          Analytical Architecture &amp; Diagnostic Scope
        </h2>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
        {/* Column 1: Descriptive Summaries */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
            <Layers className="w-3.5 h-3.5 text-slate-400" />
            <span>Descriptive Statistics</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            All pack-level statistics (mean, min, max, deltas, and throughput) are evaluated deterministically using standard numerical methods (trapezoidal integration for Ah and kWh).
          </p>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
            SoC reflects the raw telemetry value provided by the onboard vehicle estimator, not ground-truth verified capacity.
          </div>
        </div>

        {/* Column 2: Data-Quality Screening */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
            <FileCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Data-Quality Screening</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            Checks verify records for missing values, corrupt strings, duplicate timestamps, timeline inversions, and boundary limits.
          </p>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
            Unparseable or out-of-range readings are reported explicitly without silent replacement or data mutation.
          </div>
        </div>

        {/* Column 3: Distinction from Fault Diagnosis */}
        <div className="bg-slate-900/40 border border-slate-800/60 rounded-lg p-3.5 space-y-2">
          <div className="flex items-center gap-1.5 text-slate-200 font-medium">
            <ShieldCheck className="w-3.5 h-3.5 text-slate-400" />
            <span>Fault Diagnostics Distinction</span>
          </div>
          <p className="text-slate-400 leading-relaxed">
            This system does not perform machine-learning anomaly detection, estimate validated SoH, or predict Remaining Useful Life (RUL).
          </p>
          <div className="text-[11px] text-slate-500 pt-1 border-t border-slate-800/60">
            Actual fault detection requires calibrated electrochemical twin models or machine-learning models trained on laboratory-validated defect datasets.
          </div>
        </div>
      </div>
    </div>
  );
};
