/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import {
  BMSAnalysisResult,
  SessionSummary,
  VehicleGroup,
} from '../types/bms';
import {
  Zap,
  Battery,
  Thermometer,
  Layers,
  Car,
  Download,
  Info,
  Clock,
} from 'lucide-react';
import { formatDurationSec } from '../utils/bmsAggregator';
import { exportSummaryAsCsv, exportSummaryAsJson } from '../utils/bmsExporter';

interface SessionSummaryViewProps {
  analysis: BMSAnalysisResult;
  selectedVehicleId: string;
  onSelectVehicle: (id: string) => void;
  selectedSessionId: string;
  onSelectSession: (id: string) => void;
}

export const SessionSummaryView: React.FC<SessionSummaryViewProps> = ({
  analysis,
  selectedVehicleId,
  onSelectVehicle,
  selectedSessionId,
  onSelectSession,
}) => {
  const currentVehicleGroup: VehicleGroup | undefined = analysis.vehicleGroups[selectedVehicleId];

  if (!currentVehicleGroup) {
    return (
      <div className="p-8 text-center text-slate-500 bg-[#0e131d] border border-slate-800/80 rounded-xl text-xs">
        No vehicle telemetry loaded.
      </div>
    );
  }

  const allSessions = [currentVehicleGroup.overallSummary, ...currentVehicleGroup.sessions];
  const activeSession: SessionSummary =
    allSessions.find((s) => s.id === selectedSessionId) || currentVehicleGroup.overallSummary;

  return (
    <div className="bg-[#0e131d] border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-5">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <Layers className="w-4 h-4 text-slate-400" />
            <span>Descriptive Session Statistics</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Parametric aggregations grouped by vehicle identifier and operational mode intervals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSummaryAsCsv(analysis)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 rounded-lg transition-colors"
            title="Download CSV Summary with all metrics"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => exportSummaryAsJson(analysis)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-slate-300 hover:text-white bg-slate-800/70 hover:bg-slate-700/70 border border-slate-700/60 rounded-lg transition-colors"
            title="Download JSON Summary"
          >
            <Download className="w-3.5 h-3.5 text-slate-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Vehicle Selection & Session Tabs */}
      <div className="space-y-3">
        {analysis.vehicleIds.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-slate-400 flex items-center gap-1.5 font-medium">
              <Car className="w-3.5 h-3.5 text-slate-500" />
              Vehicle:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {analysis.vehicleIds.map((vId) => (
                <button
                  key={vId}
                  onClick={() => {
                    onSelectVehicle(vId);
                    onSelectSession(`${vId}-all`);
                  }}
                  className={`px-2.5 py-1 rounded-md text-xs font-mono transition-colors ${
                    vId === selectedVehicleId
                      ? 'bg-slate-200 text-slate-900 font-medium'
                      : 'bg-slate-800/80 text-slate-300 hover:bg-slate-700'
                  }`}
                >
                  {vId}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sessions tabs */}
        <div>
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-400">
              Evaluation Window:
            </span>
            <span className="text-[11px] text-slate-500 font-mono">
              Mode changes &amp; &gt;{analysis.configUsed.idleSessionGapMinutes}m inactivity splits
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 p-1 bg-slate-900/60 border border-slate-800 rounded-lg">
            <button
              onClick={() => onSelectSession(currentVehicleGroup.overallSummary.id)}
              className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all ${
                activeSession.id === currentVehicleGroup.overallSummary.id
                  ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/70'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              All Telemetry ({currentVehicleGroup.totalRecords} records)
            </button>

            {currentVehicleGroup.sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => onSelectSession(sess.id)}
                className={`px-3 py-1.5 rounded-md text-xs font-medium transition-all flex items-center gap-2 ${
                  activeSession.id === sess.id
                    ? 'bg-slate-800 text-slate-100 shadow-sm border border-slate-700/70'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <span>{sess.label}</span>
                <span className="text-[10px] font-mono text-slate-500 uppercase">
                  {sess.mode}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Session Metadata Info Row */}
      <div className="bg-slate-900/40 border border-slate-800/60 rounded-lg px-3.5 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-slate-300">
          <span className="font-semibold text-slate-200">{activeSession.vehicleId}</span>
          <span className="text-slate-600">/</span>
          <span className="text-slate-400 font-mono uppercase text-[11px]">
            Mode: {activeSession.mode}
          </span>
          <span className="text-slate-600">/</span>
          <div className="flex items-center gap-1.5 text-slate-400 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-slate-500" />
            <span>{activeSession.startTime} &rarr; {activeSession.endTime}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-slate-400">
          <span>Duration: <strong className="text-slate-200">{formatDurationSec(activeSession.durationSeconds)}</strong></span>
          <span className="text-slate-600">·</span>
          <span>Valid rows: <strong className="text-slate-200">{activeSession.validRecords}</strong>/{activeSession.totalRecords}</span>
        </div>
      </div>

      {/* 4 Core Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Voltage Card */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-400" />
              Terminal Voltage
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              [{analysis.configUsed.voltageMin}–{analysis.configUsed.voltageMax} V]
            </span>
          </div>

          {activeSession.voltage ? (
            <div className="space-y-2.5">
              <div className="flex items-baseline gap-1 border-b border-slate-800/60 pb-2">
                <span className="text-2xl font-semibold font-mono text-slate-100 tabular-nums">
                  {activeSession.voltage.mean.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-500 uppercase">V mean</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Min / Max</span>
                  <span className="text-slate-300 tabular-nums">
                    {activeSession.voltage.min} / {activeSession.voltage.max} V
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Span (Delta)</span>
                  <span className="text-slate-300 tabular-nums">
                    {activeSession.voltage.delta > 0 ? '+' : ''}{activeSession.voltage.delta} V
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Start: {activeSession.voltage.start} V · End: {activeSession.voltage.end} V
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3 text-center font-mono">No valid voltage readings</div>
          )}
        </div>

        {/* 2. Current & Throughput Card */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-slate-400" />
              Pack Current &amp; Energy
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Amperes (A)
            </span>
          </div>

          {activeSession.current ? (
            <div className="space-y-2.5">
              <div className="flex items-baseline gap-1 border-b border-slate-800/60 pb-2">
                <span className="text-2xl font-semibold font-mono text-slate-100 tabular-nums">
                  {activeSession.current.mean.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-500 uppercase">A mean</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Peak Discharge/Charge</span>
                  <span className="text-slate-300 tabular-nums">
                    {activeSession.current.peakDischargeA} / +{activeSession.current.peakChargeA} A
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Charge Throughput</span>
                  <span className="text-slate-200 tabular-nums">
                    {activeSession.current.netAh > 0 ? '+' : ''}{activeSession.current.netAh} Ah
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Energy: {activeSession.current.netKWhEst > 0 ? '+' : ''}{activeSession.current.netKWhEst} kWh (est.)
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3 text-center font-mono">No valid current readings</div>
          )}
        </div>

        {/* 3. State of Charge (SoC) Card */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Battery className="w-3.5 h-3.5 text-slate-400" />
              State of Charge
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              Reported %
            </span>
          </div>

          {activeSession.soc ? (
            <div className="space-y-2.5">
              <div className="flex items-baseline gap-1 border-b border-slate-800/60 pb-2">
                <span className="text-2xl font-semibold font-mono text-slate-100 tabular-nums">
                  {activeSession.soc.mean.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-500 uppercase">% mean</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Min / Max</span>
                  <span className="text-slate-300 tabular-nums">
                    {activeSession.soc.min}% / {activeSession.soc.max}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Net Change</span>
                  <span className="text-slate-300 tabular-nums">
                    {activeSession.soc.delta > 0 ? '+' : ''}{activeSession.soc.delta}%
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Start: {activeSession.soc.start}% · End: {activeSession.soc.end}%
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3 text-center font-mono">No valid SoC readings</div>
          )}
        </div>

        {/* 4. Temperature & Exposure Metrics Card */}
        <div className="bg-slate-900/50 border border-slate-800/80 rounded-lg p-4 space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium text-slate-300 flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-slate-400" />
              Thermal Exposure
            </span>
            <span className="text-[10px] font-mono text-slate-500">
              &gt; {analysis.configUsed.tempAlertThreshold}°C baseline
            </span>
          </div>

          {activeSession.temperature ? (
            <div className="space-y-2.5">
              <div className="flex items-baseline gap-1 border-b border-slate-800/60 pb-2">
                <span className="text-2xl font-semibold font-mono text-slate-100 tabular-nums">
                  {activeSession.temperature.mean.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-slate-500 uppercase">°C mean</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-slate-500 block">Min / Max</span>
                  <span className="text-slate-300 tabular-nums">
                    {activeSession.temperature.min}°C / {activeSession.temperature.max}°C
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-slate-500 block">Time &gt;{activeSession.temperature.thresholdUsed}°C</span>
                  <span className="text-slate-200 tabular-nums">
                    {formatDurationSec(activeSession.temperature.timeAboveThresholdSec)}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-slate-500 font-mono">
                Exposure share: {activeSession.temperature.pctAboveThreshold}% of duration
              </div>
            </div>
          ) : (
            <div className="text-xs text-slate-500 py-3 text-center font-mono">No valid temperature readings</div>
          )}
        </div>
      </div>

      {/* Transparent Methodology Notes footer */}
      <div className="p-3 bg-slate-900/30 border border-slate-800/60 rounded-lg text-slate-400 text-xs flex items-start gap-2">
        <Info className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-slate-400">
          Descriptive statistics are evaluated deterministically over parseable records. Throughput (Ah) and Energy (kWh) employ trapezoidal numerical integration. State-of-charge represents BMS telemetry values rather than laboratory-validated ground truth.
        </p>
      </div>
    </div>
  );
};
