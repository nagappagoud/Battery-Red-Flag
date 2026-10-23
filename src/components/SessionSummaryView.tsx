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
      <div className="cockpit-panel p-8 text-center text-cyan-400/60 text-xs font-mono">
        No vehicle telemetry loaded.
      </div>
    );
  }

  const allSessions = [currentVehicleGroup.overallSummary, ...currentVehicleGroup.sessions];
  const activeSession: SessionSummary =
    allSessions.find((s) => s.id === selectedSessionId) || currentVehicleGroup.overallSummary;

  return (
    <div className="cockpit-panel p-5 sm:p-6 space-y-5">
      {/* Top Header & Export Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-950/60 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <Layers className="w-4 h-4 text-cyan-400" />
            <span>Descriptive Session Statistics</span>
          </h2>
          <p className="text-xs text-cyan-200/70 mt-0.5">
            Parametric aggregations grouped by vehicle identifier and operational mode intervals.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => exportSummaryAsCsv(analysis)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-200/80 hover:text-white bg-[#04080e] hover:bg-[#07131e] border border-cyan-900/50 hover:border-cyan-400 rounded-lg transition-all duration-200 active:scale-95 shadow-sm"
            title="Download CSV Summary with all metrics"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export CSV</span>
          </button>
          <button
            onClick={() => exportSummaryAsJson(analysis)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-cyan-200/80 hover:text-white bg-[#04080e] hover:bg-[#07131e] border border-cyan-900/50 hover:border-cyan-400 rounded-lg transition-all duration-200 active:scale-95 shadow-sm"
            title="Download JSON Summary"
          >
            <Download className="w-3.5 h-3.5 text-cyan-400" />
            <span>Export JSON</span>
          </button>
        </div>
      </div>

      {/* Vehicle Selection & Session Tabs */}
      <div className="space-y-3">
        {analysis.vehicleIds.length > 1 && (
          <div className="flex items-center gap-2">
            <span className="text-xs text-cyan-400/80 flex items-center gap-1.5 font-medium">
              <Car className="w-3.5 h-3.5 text-cyan-400" />
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
                  className={`px-3 py-1 rounded-md text-xs font-mono transition-all duration-200 ${
                    vId === selectedVehicleId
                      ? 'bg-cyan-400 text-black font-bold shadow-[0_0_12px_rgba(0,245,255,0.4)]'
                      : 'bg-[#03070d] text-cyan-300 border border-cyan-950 hover:border-cyan-500/60'
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
            <span className="text-xs font-medium text-cyan-300">
              Evaluation Window:
            </span>
            <span className="text-[11px] text-cyan-400/60 font-mono">
              Mode changes &amp; &gt;{analysis.configUsed.idleSessionGapMinutes}m inactivity splits
            </span>
          </div>

          <div className="flex flex-wrap gap-1.5 p-1 bg-[#020509] border border-cyan-950/80 rounded-xl">
            <button
              onClick={() => onSelectSession(currentVehicleGroup.overallSummary.id)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeSession.id === currentVehicleGroup.overallSummary.id
                  ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-400/60 shadow-[0_0_14px_rgba(0,245,255,0.25)] font-semibold'
                  : 'text-cyan-400/60 hover:text-cyan-200 hover:bg-[#06111a]'
              }`}
            >
              All Telemetry ({currentVehicleGroup.totalRecords} records)
            </button>

            {currentVehicleGroup.sessions.map((sess) => (
              <button
                key={sess.id}
                onClick={() => onSelectSession(sess.id)}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                  activeSession.id === sess.id
                    ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-400/60 shadow-[0_0_14px_rgba(0,245,255,0.25)] font-semibold'
                    : 'text-cyan-400/60 hover:text-cyan-200 hover:bg-[#06111a]'
                }`}
              >
                <span>{sess.label}</span>
                <span className="text-[10px] font-mono text-cyan-400 bg-cyan-950/40 px-1 py-0.2 rounded uppercase">
                  {sess.mode}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Session Metadata Info Row */}
      <div className="bg-[#020509] border border-cyan-900/40 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex flex-wrap items-center gap-3 text-cyan-200">
          <span className="font-bold text-white tracking-wide">{activeSession.vehicleId}</span>
          <span className="text-cyan-800">/</span>
          <span className="text-cyan-300 font-mono uppercase text-[11px]">
            Mode: <strong className="text-white">{activeSession.mode}</strong>
          </span>
          <span className="text-cyan-800">/</span>
          <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px]">
            <Clock className="w-3.5 h-3.5 text-cyan-400" />
            <span>{activeSession.startTime} &rarr; {activeSession.endTime}</span>
          </div>
        </div>

        <div className="flex items-center gap-3 font-mono text-[11px] text-cyan-400/70">
          <span>Duration: <strong className="text-cyan-200 font-semibold">{formatDurationSec(activeSession.durationSeconds)}</strong></span>
          <span className="text-cyan-800">·</span>
          <span>Valid rows: <strong className="text-cyan-200 font-semibold">{activeSession.validRecords}</strong>/{activeSession.totalRecords}</span>
        </div>
      </div>

      {/* 4 Core Metric KPI Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3.5">
        {/* 1. Voltage Card */}
        <div className="bg-[#03070d] border border-cyan-900/40 hover:border-cyan-400/60 rounded-xl p-4 space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(0,245,255,0.18)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Terminal Voltage
            </span>
            <span className="text-[10px] font-mono text-cyan-400/60">
              [{analysis.configUsed.voltageMin}–{analysis.configUsed.voltageMax} V]
            </span>
          </div>

          {activeSession.voltage ? (
            <div className="space-y-2.5">
              <div className="flex items-baseline gap-1 border-b border-cyan-950/80 pb-2">
                <span className="text-2xl font-bold font-mono text-white tabular-nums drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">
                  {activeSession.voltage.mean.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-cyan-400/70 uppercase">V mean</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-cyan-400/60 block">Min / Max</span>
                  <span className="text-cyan-100 tabular-nums font-medium">
                    {activeSession.voltage.min} / {activeSession.voltage.max} V
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-cyan-400/60 block">Span (Delta)</span>
                  <span className="text-cyan-100 tabular-nums font-medium">
                    {activeSession.voltage.delta > 0 ? '+' : ''}{activeSession.voltage.delta} V
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-cyan-400/60 font-mono">
                Start: {activeSession.voltage.start} V · End: {activeSession.voltage.end} V
              </div>
            </div>
          ) : (
            <div className="text-xs text-cyan-400/40 py-3 text-center font-mono">No valid voltage readings</div>
          )}
        </div>

        {/* 2. Current & Throughput Card */}
        <div className="bg-[#03070d] border border-cyan-900/40 hover:border-cyan-400/60 rounded-xl p-4 space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(0,245,255,0.18)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Zap className="w-3.5 h-3.5 text-cyan-400" />
              Pack Current &amp; Energy
            </span>
            <span className="text-[10px] font-mono text-cyan-400/60">
              Amperes (A)
            </span>
          </div>

          {activeSession.current ? (
            <div className="space-y-2.5">
              <div className="flex items-baseline gap-1 border-b border-cyan-950/80 pb-2">
                <span className="text-2xl font-bold font-mono text-white tabular-nums drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">
                  {activeSession.current.mean.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-cyan-400/70 uppercase">A mean</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-cyan-400/60 block">Peak Discharge/Charge</span>
                  <span className="text-cyan-100 tabular-nums font-medium">
                    {activeSession.current.peakDischargeA} / +{activeSession.current.peakChargeA} A
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-cyan-400/60 block">Charge Throughput</span>
                  <span className="text-cyan-300 tabular-nums font-semibold">
                    {activeSession.current.netAh > 0 ? '+' : ''}{activeSession.current.netAh} Ah
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-cyan-400/60 font-mono">
                Energy: {activeSession.current.netKWhEst > 0 ? '+' : ''}{activeSession.current.netKWhEst} kWh (est.)
              </div>
            </div>
          ) : (
            <div className="text-xs text-cyan-400/40 py-3 text-center font-mono">No valid current readings</div>
          )}
        </div>

        {/* 3. State of Charge (SoC) Card */}
        <div className="bg-[#03070d] border border-cyan-900/40 hover:border-cyan-400/60 rounded-xl p-4 space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(0,245,255,0.18)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Battery className="w-3.5 h-3.5 text-cyan-400" />
              State of Charge
            </span>
            <span className="text-[10px] font-mono text-cyan-400/60">
              Reported %
            </span>
          </div>

          {activeSession.soc ? (
            <div className="space-y-2.5">
              <div className="flex items-baseline gap-1 border-b border-cyan-950/80 pb-2">
                <span className="text-2xl font-bold font-mono text-white tabular-nums drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">
                  {activeSession.soc.mean.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-cyan-400/70 uppercase">% mean</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-cyan-400/60 block">Min / Max</span>
                  <span className="text-cyan-100 tabular-nums font-medium">
                    {activeSession.soc.min}% / {activeSession.soc.max}%
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-cyan-400/60 block">Net Change</span>
                  <span className="text-cyan-100 tabular-nums font-medium">
                    {activeSession.soc.delta > 0 ? '+' : ''}{activeSession.soc.delta}%
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-cyan-400/60 font-mono">
                Start: {activeSession.soc.start}% · End: {activeSession.soc.end}%
              </div>
            </div>
          ) : (
            <div className="text-xs text-cyan-400/40 py-3 text-center font-mono">No valid SoC readings</div>
          )}
        </div>

        {/* 4. Temperature & Exposure Metrics Card */}
        <div className="bg-[#03070d] border border-cyan-900/40 hover:border-cyan-400/60 rounded-xl p-4 space-y-3 transition-all duration-200 hover:-translate-y-0.5 hover:shadow-[0_0_20px_rgba(0,245,255,0.18)]">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-white flex items-center gap-1.5">
              <Thermometer className="w-3.5 h-3.5 text-cyan-400" />
              Thermal Exposure
            </span>
            <span className="text-[10px] font-mono text-cyan-400/60">
              &gt; {analysis.configUsed.tempAlertThreshold}°C baseline
            </span>
          </div>

          {activeSession.temperature ? (
            <div className="space-y-2.5">
              <div className="flex items-baseline gap-1 border-b border-cyan-950/80 pb-2">
                <span className="text-2xl font-bold font-mono text-white tabular-nums drop-shadow-[0_0_8px_rgba(0,245,255,0.4)]">
                  {activeSession.temperature.mean.toFixed(1)}
                </span>
                <span className="text-xs font-mono text-cyan-400/70 uppercase">°C mean</span>
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                <div>
                  <span className="text-[10px] text-cyan-400/60 block">Min / Max</span>
                  <span className="text-cyan-100 tabular-nums font-medium">
                    {activeSession.temperature.min}°C / {activeSession.temperature.max}°C
                  </span>
                </div>
                <div>
                  <span className="text-[10px] text-cyan-400/60 block">Time &gt;{activeSession.temperature.thresholdUsed}°C</span>
                  <span className="text-cyan-300 tabular-nums font-semibold">
                    {formatDurationSec(activeSession.temperature.timeAboveThresholdSec)}
                  </span>
                </div>
              </div>
              <div className="text-[11px] text-cyan-400/60 font-mono">
                Exposure share: {activeSession.temperature.pctAboveThreshold}% of duration
              </div>
            </div>
          ) : (
            <div className="text-xs text-cyan-400/40 py-3 text-center font-mono">No valid temperature readings</div>
          )}
        </div>
      </div>

      {/* Transparent Methodology Notes footer */}
      <div className="p-3.5 bg-[#020509] border border-cyan-950/60 rounded-xl text-cyan-400/80 text-xs flex items-start gap-2.5">
        <Info className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
        <p className="text-[11px] leading-relaxed text-cyan-300/70">
          Descriptive statistics are evaluated deterministically over parseable records. Throughput (Ah) and Energy (kWh) employ trapezoidal numerical integration. State-of-charge represents BMS telemetry values rather than laboratory-validated ground truth.
        </p>
      </div>
    </div>
  );
};
