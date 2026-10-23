/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { Info, ShieldAlert } from 'lucide-react';

interface DisclaimerBannerProps {
  tempThreshold: number;
}

export const DisclaimerBanner: React.FC<DisclaimerBannerProps> = ({ tempThreshold }) => {
  return (
    <div className="bg-slate-900/70 border border-slate-800/80 rounded-xl p-4 text-slate-300 text-xs">
      <div className="flex items-start gap-3">
        <div className="p-1.5 bg-slate-800 text-slate-400 rounded-md shrink-0 mt-0.5">
          <ShieldAlert className="w-4 h-4 text-slate-300" />
        </div>
        <div className="space-y-1.5 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2 font-medium text-slate-200">
              <span>Descriptive Analysis &amp; Data-Quality Screening Scope</span>
              <span className="text-slate-500">·</span>
              <span className="text-[11px] text-slate-400 font-normal">Deterministic Pipeline</span>
            </div>
            <span className="text-[11px] text-slate-400 font-mono">
              Temp threshold: &gt; {tempThreshold}°C
            </span>
          </div>

          <p className="text-slate-400 leading-relaxed text-xs">
            This system evaluates raw telemetry for formatting flaws, timeline sequence irregularities, and boundary screening limits. It does not perform AI inference, model-based fault diagnostics, cell degradation modeling, or Remaining Useful Life (RUL) estimation.
          </p>

          <div className="pt-1 flex flex-wrap items-center gap-x-4 gap-y-1 text-[11px] text-slate-400">
            <span className="flex items-center gap-1.5">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              <span>Unusual values represent data screening alerts, not certified electrochemical defects.</span>
            </span>
            <span className="text-slate-600">·</span>
            <span>Production diagnostics require calibrated lab ground truth.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
