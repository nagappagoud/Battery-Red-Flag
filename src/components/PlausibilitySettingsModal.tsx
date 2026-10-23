/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { PlausibilityConfig, DEFAULT_PLAUSIBILITY_CONFIG } from '../types/bms';
import { X, Sliders, RotateCcw, Check, Info } from 'lucide-react';

interface PlausibilitySettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: PlausibilityConfig;
  onSave: (newConfig: PlausibilityConfig) => void;
}

export const PlausibilitySettingsModal: React.FC<PlausibilitySettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onSave,
}) => {
  const [form, setForm] = useState<PlausibilityConfig>(config);

  if (!isOpen) return null;

  const handleChange = (key: keyof PlausibilityConfig, val: string) => {
    const num = parseFloat(val);
    setForm((prev) => ({
      ...prev,
      [key]: isNaN(num) ? 0 : num,
    }));
  };

  const handleReset = () => {
    setForm(DEFAULT_PLAUSIBILITY_CONFIG);
  };

  const handleSave = () => {
    onSave(form);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-150">
      <div className="bg-[#0e131d] border border-slate-800 rounded-xl max-w-xl w-full max-h-[90vh] overflow-y-auto shadow-2xl flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-800 bg-slate-900/60 sticky top-0 z-10 backdrop-blur">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-slate-800 text-slate-300 rounded-lg">
              <Sliders className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-sm font-semibold text-slate-100">Screening Plausibility Thresholds</h2>
              <p className="text-[11px] text-slate-400">Configure data-quality boundary filters</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Informational callout */}
        <div className="p-5 space-y-4 text-xs text-slate-300">
          <div className="p-3 bg-slate-900/50 border border-slate-800 rounded-lg flex items-start gap-2.5 text-slate-400 leading-relaxed text-[11px]">
            <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            <div>
              <strong>Screening Defaults:</strong> These bounds represent screening limits for detecting corrupt sensors or truncated packets. They are not universal standards or battery safety trip points.
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
            {/* Voltage */}
            <div className="space-y-1.5 p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
              <label className="font-medium text-slate-200 block text-xs">Voltage Range (V)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Min (V)</span>
                  <input
                    type="number"
                    value={form.voltageMin}
                    onChange={(e) => handleChange('voltageMin', e.target.value)}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-md px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-slate-600"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Max (V)</span>
                  <input
                    type="number"
                    value={form.voltageMax}
                    onChange={(e) => handleChange('voltageMax', e.target.value)}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-md px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Current */}
            <div className="space-y-1.5 p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
              <label className="font-medium text-slate-200 block text-xs">Current Range (A)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Min (Discharge)</span>
                  <input
                    type="number"
                    value={form.currentMin}
                    onChange={(e) => handleChange('currentMin', e.target.value)}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-md px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-slate-600"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Max (Charge)</span>
                  <input
                    type="number"
                    value={form.currentMax}
                    onChange={(e) => handleChange('currentMax', e.target.value)}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-md px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Temperature */}
            <div className="space-y-1.5 p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
              <label className="font-medium text-slate-200 block text-xs">Temperature Plausibility (°C)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Min (°C)</span>
                  <input
                    type="number"
                    value={form.temperatureMin}
                    onChange={(e) => handleChange('temperatureMin', e.target.value)}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-md px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-slate-600"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Max (°C)</span>
                  <input
                    type="number"
                    value={form.temperatureMax}
                    onChange={(e) => handleChange('temperatureMax', e.target.value)}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-md px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* SoC Range */}
            <div className="space-y-1.5 p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
              <label className="font-medium text-slate-200 block text-xs">State of Charge Range (%)</label>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Min (%)</span>
                  <input
                    type="number"
                    value={form.socMin}
                    onChange={(e) => handleChange('socMin', e.target.value)}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-md px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-slate-600"
                  />
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block mb-1">Max (%)</span>
                  <input
                    type="number"
                    value={form.socMax}
                    onChange={(e) => handleChange('socMax', e.target.value)}
                    className="w-full bg-[#080c14] border border-slate-800 rounded-md px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-slate-600"
                  />
                </div>
              </div>
            </div>

            {/* Temperature Exposure Metric Threshold */}
            <div className="space-y-1.5 p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
              <label className="font-medium text-slate-200 block text-xs">
                Thermal Exposure Baseline (°C)
              </label>
              <span className="text-[10px] text-slate-500 block">
                Calculates cumulative duration &gt; this threshold
              </span>
              <input
                type="number"
                value={form.tempAlertThreshold}
                onChange={(e) => handleChange('tempAlertThreshold', e.target.value)}
                className="w-full bg-[#080c14] border border-slate-800 rounded-md px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-slate-600"
              />
            </div>

            {/* Session Segmentation Idle Gap */}
            <div className="space-y-1.5 p-3 bg-slate-900/40 rounded-lg border border-slate-800/80">
              <label className="font-medium text-slate-200 block text-xs">
                Inactivity Split Window (minutes)
              </label>
              <span className="text-[10px] text-slate-500 block">
                Segments trips if idle gap exceeds this limit
              </span>
              <input
                type="number"
                value={form.idleSessionGapMinutes}
                onChange={(e) => handleChange('idleSessionGapMinutes', e.target.value)}
                className="w-full bg-[#080c14] border border-slate-800 rounded-md px-2.5 py-1.5 font-mono text-xs text-slate-100 focus:outline-none focus:border-slate-600"
              />
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-slate-800 bg-slate-900/50 flex items-center justify-between mt-auto">
          <button
            type="button"
            onClick={handleReset}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset to Defaults
          </button>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs text-slate-400 hover:text-slate-200 transition-colors"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleSave}
              className="flex items-center gap-1.5 px-4 py-1.5 text-xs font-medium bg-slate-200 hover:bg-white text-slate-900 rounded-md transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Apply Limits
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
