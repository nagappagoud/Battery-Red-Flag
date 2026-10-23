/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo, useRef } from 'react';
import { BmsRecord, PlausibilityConfig } from '../types/bms';
import {
  LineChart,
  Zap,
  Battery,
  Thermometer,
  Activity,
} from 'lucide-react';

interface InteractiveChartsProps {
  records: BmsRecord[];
  config: PlausibilityConfig;
}

type ViewMode = 'stacked' | 'voltage' | 'current' | 'temperature' | 'soc';

export const InteractiveCharts: React.FC<InteractiveChartsProps> = ({
  records,
  config,
}) => {
  const [viewMode, setViewMode] = useState<ViewMode>('stacked');
  const [hoverIndex, setHoverIndex] = useState<number | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Filter valid records that have timestampMs
  const validData = useMemo(() => {
    return records
      .filter((r) => r.timestampMs !== null)
      .sort((a, b) => (a.timestampMs ?? 0) - (b.timestampMs ?? 0));
  }, [records]);

  if (validData.length === 0) {
    return (
      <div className="cockpit-panel p-8 text-center text-cyan-400/60 text-xs font-mono">
        No valid time-series records available for waveform rendering.
      </div>
    );
  }

  // Active hover record
  const hoveredRecord = hoverIndex !== null && hoverIndex >= 0 && hoverIndex < validData.length
    ? validData[hoverIndex]
    : null;

  // Chart Dimensions
  const svgWidth = 840;
  const padding = { top: 16, right: 28, bottom: 26, left: 52 };
  const innerWidth = svgWidth - padding.left - padding.right;

  // Time bounds
  const minTime = validData[0].timestampMs!;
  const maxTime = validData[validData.length - 1].timestampMs!;
  const timeSpan = Math.max(1, maxTime - minTime);

  const getX = (ms: number) => {
    return padding.left + ((ms - minTime) / timeSpan) * innerWidth;
  };

  // Helper to build SVG path for a metric
  const buildSvgPath = (
    dataExtractor: (r: BmsRecord) => number | null,
    minY: number,
    maxY: number,
    height: number
  ) => {
    const innerHeight = height - padding.top - padding.bottom;
    const yRange = maxY === minY ? 1 : maxY - minY;

    let pathD = '';
    let areaD = '';
    let firstX = 0;
    let lastX = 0;
    let isDrawing = false;

    validData.forEach((r) => {
      const val = dataExtractor(r);
      if (val === null || r.timestampMs === null) {
        isDrawing = false;
        return;
      }

      const x = getX(r.timestampMs);
      const normalizedY = (val - minY) / yRange;
      const y = padding.top + innerHeight - normalizedY * innerHeight;

      if (!isDrawing) {
        pathD += ` M ${x.toFixed(1)} ${y.toFixed(1)}`;
        areaD += ` M ${x.toFixed(1)} ${(padding.top + innerHeight).toFixed(1)} L ${x.toFixed(1)} ${y.toFixed(1)}`;
        firstX = x;
        isDrawing = true;
      } else {
        pathD += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
        areaD += ` L ${x.toFixed(1)} ${y.toFixed(1)}`;
      }
      lastX = x;
    });

    if (areaD) {
      areaD += ` L ${lastX.toFixed(1)} ${(padding.top + innerHeight).toFixed(1)} L ${firstX.toFixed(1)} ${(padding.top + innerHeight).toFixed(1)} Z`;
    }

    return { pathD, areaD };
  };

  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const relativeX = (clientX / rect.width) * svgWidth;

    if (relativeX < padding.left || relativeX > svgWidth - padding.right) {
      setHoverIndex(null);
      return;
    }

    const ratio = (relativeX - padding.left) / innerWidth;
    const targetMs = minTime + ratio * timeSpan;

    let closestIdx = 0;
    let minDiff = Infinity;
    validData.forEach((d, idx) => {
      const diff = Math.abs((d.timestampMs ?? 0) - targetMs);
      if (diff < minDiff) {
        minDiff = diff;
        closestIdx = idx;
      }
    });

    setHoverIndex(closestIdx);
  };

  const handleMouseLeave = () => {
    setHoverIndex(null);
  };

  const formatTimeTick = (ms: number) => {
    const date = new Date(ms);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  };

  const renderSingleTrack = (
    title: string,
    unit: string,
    icon: React.ReactNode,
    strokeColor: string,
    dataExtractor: (r: BmsRecord) => number | null,
    fixedMin?: number,
    fixedMax?: number,
    thresholdValue?: number,
    thresholdLabel?: string,
    trackHeight = 145
  ) => {
    const values = validData
      .map(dataExtractor)
      .filter((v): v is number => v !== null);

    if (values.length === 0) {
      return (
        <div className="bg-[#020509] border border-cyan-950 rounded-lg p-4 text-center text-xs text-cyan-400/60 font-mono">
          No data available for {title}
        </div>
      );
    }

    const dataMin = Math.min(...values);
    const dataMax = Math.max(...values);
    const padVal = (dataMax - dataMin) * 0.1 || 1;
    const minY = fixedMin !== undefined ? Math.min(fixedMin, dataMin) : dataMin - padVal;
    const maxY = fixedMax !== undefined ? Math.max(fixedMax, dataMax) : dataMax + padVal;

    const { pathD, areaD } = buildSvgPath(dataExtractor, minY, maxY, trackHeight);
    const innerHeight = trackHeight - padding.top - padding.bottom;

    const hoverVal = hoveredRecord ? dataExtractor(hoveredRecord) : null;
    const hoverX = hoveredRecord && hoveredRecord.timestampMs ? getX(hoveredRecord.timestampMs) : null;
    const hoverY =
      hoverVal !== null && hoverVal !== undefined
        ? padding.top + innerHeight - ((hoverVal - minY) / (maxY - minY || 1)) * innerHeight
        : null;

    let threshY: number | null = null;
    if (thresholdValue !== undefined && thresholdValue >= minY && thresholdValue <= maxY) {
      threshY = padding.top + innerHeight - ((thresholdValue - minY) / (maxY - minY || 1)) * innerHeight;
    }

    const gradId = `trace-${title.replace(/[^a-zA-Z0-9]/g, '')}`;

    return (
      <div className="oscilloscope-track p-3.5 space-y-2">
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <span className="text-cyan-400">{icon}</span>
            <span className="font-semibold text-white tracking-wide">{title}</span>
            <span className="text-[11px] text-cyan-400/70 font-mono">({unit})</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
            {hoverVal !== null && hoverVal !== undefined ? (
              <span className="text-cyan-300 font-bold drop-shadow-[0_0_8px_rgba(0,245,255,0.6)]">
                {hoverVal.toFixed(2)} {unit}
              </span>
            ) : (
              <span className="text-cyan-400/60">
                Min <span className="text-cyan-200">{dataMin.toFixed(1)}</span> · Max <span className="text-cyan-200">{dataMax.toFixed(1)}</span> {unit}
              </span>
            )}
          </div>
        </div>

        <div className="w-full overflow-hidden rounded-lg bg-[#010306] border border-cyan-950/60">
          <svg
            viewBox={`0 0 ${svgWidth} ${trackHeight}`}
            className="w-full h-auto cursor-crosshair select-none block"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.25" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
              </linearGradient>
              <filter id="neonTraceGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="2" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            {/* Oscilloscope Grid lines */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={svgWidth - padding.right}
              y2={padding.top}
              stroke="rgba(6, 182, 212, 0.12)"
              strokeDasharray="2 4"
              strokeWidth="0.8"
            />
            <line
              x1={padding.left}
              y1={padding.top + innerHeight / 2}
              x2={svgWidth - padding.right}
              y2={padding.top + innerHeight / 2}
              stroke="rgba(6, 182, 212, 0.14)"
              strokeDasharray="2 4"
              strokeWidth="0.8"
            />
            <line
              x1={padding.left}
              y1={padding.top + innerHeight}
              x2={svgWidth - padding.right}
              y2={padding.top + innerHeight}
              stroke="rgba(6, 182, 212, 0.25)"
              strokeWidth="1"
            />

            {/* Vertical Time Division Grids */}
            <line
              x1={padding.left + innerWidth * 0.25}
              y1={padding.top}
              x2={padding.left + innerWidth * 0.25}
              y2={padding.top + innerHeight}
              stroke="rgba(6, 182, 212, 0.08)"
              strokeDasharray="2 4"
            />
            <line
              x1={padding.left + innerWidth * 0.5}
              y1={padding.top}
              x2={padding.left + innerWidth * 0.5}
              y2={padding.top + innerHeight}
              stroke="rgba(6, 182, 212, 0.08)"
              strokeDasharray="2 4"
            />
            <line
              x1={padding.left + innerWidth * 0.75}
              y1={padding.top}
              x2={padding.left + innerWidth * 0.75}
              y2={padding.top + innerHeight}
              stroke="rgba(6, 182, 212, 0.08)"
              strokeDasharray="2 4"
            />

            {/* Y axis labels */}
            <text
              x={padding.left - 8}
              y={padding.top + 4}
              textAnchor="end"
              className="fill-cyan-400/60 text-[10px] font-mono tabular-nums"
            >
              {maxY.toFixed(0)}
            </text>
            <text
              x={padding.left - 8}
              y={padding.top + innerHeight / 2 + 3}
              textAnchor="end"
              className="fill-cyan-500/40 text-[10px] font-mono tabular-nums"
            >
              {((minY + maxY) / 2).toFixed(0)}
            </text>
            <text
              x={padding.left - 8}
              y={padding.top + innerHeight}
              textAnchor="end"
              className="fill-cyan-400/60 text-[10px] font-mono tabular-nums"
            >
              {minY.toFixed(0)}
            </text>

            {/* Threshold Line */}
            {threshY !== null && (
              <g>
                <line
                  x1={padding.left}
                  y1={threshY}
                  x2={svgWidth - padding.right}
                  y2={threshY}
                  stroke="#22d3ee"
                  strokeDasharray="3 3"
                  strokeWidth="1.2"
                />
                <text
                  x={svgWidth - padding.right - 4}
                  y={threshY - 3}
                  textAnchor="end"
                  className="fill-cyan-300 text-[9px] font-mono tabular-nums drop-shadow-[0_0_4px_rgba(0,245,255,0.8)]"
                >
                  {thresholdLabel || `Threshold ${thresholdValue}${unit}`}
                </text>
              </g>
            )}

            {/* Area & Glowing Trace Line */}
            {areaD && <path d={areaD} fill={`url(#${gradId})`} />}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeLinejoin="round"
                filter="url(#neonTraceGlow)"
              />
            )}

            {/* Hover Cursor Vertical Line with Cyan Glow */}
            {hoverX !== null && (
              <line
                x1={hoverX}
                y1={padding.top}
                x2={hoverX}
                y2={padding.top + innerHeight}
                stroke="#00f5ff"
                strokeWidth="1.2"
                strokeDasharray="3 3"
                className="drop-shadow-[0_0_6px_rgba(0,245,255,0.9)]"
              />
            )}

            {/* Hover Data Point Circle */}
            {hoverX !== null && hoverY !== null && (
              <circle
                cx={hoverX}
                cy={hoverY}
                r="4.5"
                fill={strokeColor}
                stroke="#020408"
                strokeWidth="2"
                className="drop-shadow-[0_0_10px_rgba(0,245,255,1)]"
              />
            )}

            {/* Time Ticks on bottom track */}
            <text
              x={padding.left}
              y={padding.top + innerHeight + 16}
              textAnchor="start"
              className="fill-cyan-400/50 text-[9px] font-mono tabular-nums"
            >
              {formatTimeTick(minTime)}
            </text>
            <text
              x={padding.left + innerWidth / 2}
              y={padding.top + innerHeight + 16}
              textAnchor="middle"
              className="fill-cyan-400/40 text-[9px] font-mono tabular-nums"
            >
              {formatTimeTick(minTime + timeSpan / 2)}
            </text>
            <text
              x={svgWidth - padding.right}
              y={padding.top + innerHeight + 16}
              textAnchor="end"
              className="fill-cyan-400/50 text-[9px] font-mono tabular-nums"
            >
              {formatTimeTick(maxTime)}
            </text>
          </svg>
        </div>
      </div>
    );
  };

  return (
    <div
      ref={containerRef}
      className="cockpit-panel p-5 sm:p-6 space-y-4"
    >
      {/* Chart Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-cyan-950/60 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-white flex items-center gap-2">
            <LineChart className="w-4 h-4 text-cyan-400" />
            <span>Time-Series Telemetry Channels</span>
          </h2>
          <p className="text-xs text-cyan-200/70 mt-0.5">
            Synchronized digital oscilloscope waveforms for terminal voltage, pack current, thermal state, and SoC.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="bg-[#02050a] p-0.5 rounded-lg border border-cyan-950/80 flex items-center text-xs">
          <button
            onClick={() => setViewMode('stacked')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'stacked'
                ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,245,255,0.25)] font-semibold'
                : 'text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            Synchronized (4-Channel)
          </button>
          <button
            onClick={() => setViewMode('voltage')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'voltage'
                ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,245,255,0.25)] font-semibold'
                : 'text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            Voltage
          </button>
          <button
            onClick={() => setViewMode('current')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'current'
                ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,245,255,0.25)] font-semibold'
                : 'text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            Current
          </button>
          <button
            onClick={() => setViewMode('temperature')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'temperature'
                ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,245,255,0.25)] font-semibold'
                : 'text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            Temperature
          </button>
          <button
            onClick={() => setViewMode('soc')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'soc'
                ? 'bg-cyan-950/70 text-cyan-200 border border-cyan-500/40 shadow-[0_0_12px_rgba(0,245,255,0.25)] font-semibold'
                : 'text-cyan-400/60 hover:text-cyan-200'
            }`}
          >
            SoC
          </button>
        </div>
      </div>

      {/* Hover Inspection HUD Bar */}
      <div className="bg-[#020509] border border-cyan-900/50 rounded-xl px-4 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shadow-inner">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <Activity className="w-3.5 h-3.5 text-cyan-400 animate-pulse" />
          <span className="text-cyan-400/80 font-bold">HUD:</span>
          {hoveredRecord ? (
            <span className="text-cyan-100">
              {hoveredRecord.timestamp} · Row #{hoveredRecord.rowNumber}
            </span>
          ) : (
            <span className="text-cyan-400/50">Move cursor across waveforms to inspect real-time values</span>
          )}
        </div>

        {hoveredRecord && (
          <div className="flex flex-wrap items-center gap-3.5 font-mono text-[11px] tabular-nums">
            <span className="text-cyan-300">
              V: <strong className="text-white drop-shadow-[0_0_6px_rgba(0,245,255,0.7)]">{hoveredRecord.voltage_v !== null ? `${hoveredRecord.voltage_v} V` : 'null'}</strong>
            </span>
            <span className="text-cyan-300">
              I: <strong className="text-white drop-shadow-[0_0_6px_rgba(0,245,255,0.7)]">{hoveredRecord.current_a !== null ? `${hoveredRecord.current_a} A` : 'null'}</strong>
            </span>
            <span className="text-cyan-300">
              T: <strong className="text-white drop-shadow-[0_0_6px_rgba(0,245,255,0.7)]">{hoveredRecord.temperature_c !== null ? `${hoveredRecord.temperature_c} °C` : 'null'}</strong>
            </span>
            <span className="text-cyan-300">
              SoC: <strong className="text-white drop-shadow-[0_0_6px_rgba(0,245,255,0.7)]">{hoveredRecord.soc_pct !== null ? `${hoveredRecord.soc_pct} %` : 'null'}</strong>
            </span>
            <span className="text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800/50 uppercase">
              [{hoveredRecord.mode}]
            </span>
          </div>
        )}
      </div>

      {/* Render selected channel tracks */}
      <div className="space-y-3">
        {(viewMode === 'stacked' || viewMode === 'voltage') &&
          renderSingleTrack(
            'Terminal Voltage',
            'V',
            <Zap className="w-3.5 h-3.5 text-cyan-400" />,
            '#00f5ff', // Luminous Electric Cyan
            (r) => r.voltage_v,
            undefined,
            undefined,
            undefined,
            undefined,
            viewMode === 'voltage' ? 240 : 135
          )}

        {(viewMode === 'stacked' || viewMode === 'current') &&
          renderSingleTrack(
            'Pack Current',
            'A',
            <Zap className="w-3.5 h-3.5 text-cyan-400" />,
            '#38bdf8', // Neon Sky Cyan
            (r) => r.current_a,
            undefined,
            undefined,
            0,
            'Zero Amperes (0A)',
            viewMode === 'current' ? 240 : 135
          )}

        {(viewMode === 'stacked' || viewMode === 'temperature') &&
          renderSingleTrack(
            'Cell Temperature',
            '°C',
            <Thermometer className="w-3.5 h-3.5 text-cyan-400" />,
            '#22d3ee', // Radiant Cyan
            (r) => r.temperature_c,
            undefined,
            undefined,
            config.tempAlertThreshold,
            `Thermal Threshold (>${config.tempAlertThreshold}°C)`,
            viewMode === 'temperature' ? 240 : 135
          )}

        {(viewMode === 'stacked' || viewMode === 'soc') &&
          renderSingleTrack(
            'State of Charge',
            '%',
            <Battery className="w-3.5 h-3.5 text-cyan-400" />,
            '#67e8f9', // Light Glow Cyan
            (r) => r.soc_pct,
            0,
            100,
            undefined,
            undefined,
            viewMode === 'soc' ? 240 : 135
          )}
      </div>
    </div>
  );
};
