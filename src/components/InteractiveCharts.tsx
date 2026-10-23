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
      <div className="bg-[#0e131d] border border-slate-800/80 rounded-xl p-8 text-center text-slate-500 text-xs font-mono">
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
        <div className="bg-slate-900/30 border border-slate-800/80 rounded-lg p-4 text-center text-xs text-slate-500 font-mono">
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
      <div className="bg-slate-900/40 border border-slate-800/70 rounded-lg p-3 space-y-1.5">
        <div className="flex items-center justify-between text-xs px-1">
          <div className="flex items-center gap-2">
            <span className="text-slate-400">{icon}</span>
            <span className="font-medium text-slate-200">{title}</span>
            <span className="text-[11px] text-slate-500 font-mono">({unit})</span>
          </div>

          <div className="flex items-center gap-3 font-mono text-[11px] tabular-nums">
            {hoverVal !== null && hoverVal !== undefined ? (
              <span className="text-slate-100 font-medium">
                {hoverVal.toFixed(2)} {unit}
              </span>
            ) : (
              <span className="text-slate-500">
                Min {dataMin.toFixed(1)} · Max {dataMax.toFixed(1)} {unit}
              </span>
            )}
          </div>
        </div>

        <div className="w-full overflow-hidden">
          <svg
            viewBox={`0 0 ${svgWidth} ${trackHeight}`}
            className="w-full h-auto cursor-crosshair select-none block"
            onMouseMove={handleMouseMove}
            onMouseLeave={handleMouseLeave}
          >
            <defs>
              <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor={strokeColor} stopOpacity="0.12" />
                <stop offset="100%" stopColor={strokeColor} stopOpacity="0.0" />
              </linearGradient>
            </defs>

            {/* Grid lines */}
            <line
              x1={padding.left}
              y1={padding.top}
              x2={svgWidth - padding.right}
              y2={padding.top}
              stroke="#1e293b"
              strokeDasharray="2 4"
              strokeWidth="0.8"
            />
            <line
              x1={padding.left}
              y1={padding.top + innerHeight / 2}
              x2={svgWidth - padding.right}
              y2={padding.top + innerHeight / 2}
              stroke="#1e293b"
              strokeDasharray="2 4"
              strokeWidth="0.8"
            />
            <line
              x1={padding.left}
              y1={padding.top + innerHeight}
              x2={svgWidth - padding.right}
              y2={padding.top + innerHeight}
              stroke="#334155"
              strokeWidth="0.8"
            />

            {/* Y axis labels */}
            <text
              x={padding.left - 8}
              y={padding.top + 4}
              textAnchor="end"
              className="fill-slate-500 text-[10px] font-mono tabular-nums"
            >
              {maxY.toFixed(0)}
            </text>
            <text
              x={padding.left - 8}
              y={padding.top + innerHeight / 2 + 3}
              textAnchor="end"
              className="fill-slate-600 text-[10px] font-mono tabular-nums"
            >
              {((minY + maxY) / 2).toFixed(0)}
            </text>
            <text
              x={padding.left - 8}
              y={padding.top + innerHeight}
              textAnchor="end"
              className="fill-slate-500 text-[10px] font-mono tabular-nums"
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
                  stroke="#f59e0b"
                  strokeDasharray="3 3"
                  strokeWidth="1"
                />
                <text
                  x={svgWidth - padding.right - 4}
                  y={threshY - 3}
                  textAnchor="end"
                  className="fill-amber-400 text-[9px] font-mono tabular-nums"
                >
                  {thresholdLabel || `Threshold ${thresholdValue}${unit}`}
                </text>
              </g>
            )}

            {/* Area & Line */}
            {areaD && <path d={areaD} fill={`url(#${gradId})`} />}
            {pathD && (
              <path
                d={pathD}
                fill="none"
                stroke={strokeColor}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}

            {/* Hover Cursor Vertical Line */}
            {hoverX !== null && (
              <line
                x1={hoverX}
                y1={padding.top}
                x2={hoverX}
                y2={padding.top + innerHeight}
                stroke="#64748b"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
            )}

            {/* Hover Data Point Circle */}
            {hoverX !== null && hoverY !== null && (
              <circle
                cx={hoverX}
                cy={hoverY}
                r="3.5"
                fill={strokeColor}
                stroke="#090d16"
                strokeWidth="1.5"
              />
            )}

            {/* Time Ticks on bottom track */}
            <text
              x={padding.left}
              y={padding.top + innerHeight + 16}
              textAnchor="start"
              className="fill-slate-500 text-[9px] font-mono tabular-nums"
            >
              {formatTimeTick(minTime)}
            </text>
            <text
              x={padding.left + innerWidth / 2}
              y={padding.top + innerHeight + 16}
              textAnchor="middle"
              className="fill-slate-600 text-[9px] font-mono tabular-nums"
            >
              {formatTimeTick(minTime + timeSpan / 2)}
            </text>
            <text
              x={svgWidth - padding.right}
              y={padding.top + innerHeight + 16}
              textAnchor="end"
              className="fill-slate-500 text-[9px] font-mono tabular-nums"
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
      className="bg-[#0e131d] border border-slate-800/80 rounded-xl p-5 shadow-sm space-y-4"
    >
      {/* Chart Header & View Mode Switcher */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-slate-800/60 pb-4">
        <div>
          <h2 className="text-sm font-semibold text-slate-100 flex items-center gap-2">
            <LineChart className="w-4 h-4 text-slate-400" />
            <span>Time-Series Telemetry Channels</span>
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Synchronized timeline waveforms for terminal voltage, pack current, thermal state, and SoC.
          </p>
        </div>

        {/* View Mode Switcher */}
        <div className="bg-slate-900 p-0.5 rounded-lg border border-slate-800 flex items-center text-xs">
          <button
            onClick={() => setViewMode('stacked')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'stacked'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Synchronized (4-Channel)
          </button>
          <button
            onClick={() => setViewMode('voltage')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'voltage'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Voltage
          </button>
          <button
            onClick={() => setViewMode('current')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'current'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Current
          </button>
          <button
            onClick={() => setViewMode('temperature')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'temperature'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            Temperature
          </button>
          <button
            onClick={() => setViewMode('soc')}
            className={`px-2.5 py-1 rounded-md font-medium transition-all ${
              viewMode === 'soc'
                ? 'bg-slate-800 text-slate-100 shadow-sm'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            SoC
          </button>
        </div>
      </div>

      {/* Hover Inspection HUD Bar */}
      <div className="bg-slate-900/60 border border-slate-800/60 rounded-lg px-3.5 py-2 flex flex-wrap items-center justify-between gap-3 text-xs">
        <div className="flex items-center gap-2 font-mono text-[11px]">
          <Activity className="w-3.5 h-3.5 text-slate-400" />
          <span className="text-slate-400">HUD:</span>
          {hoveredRecord ? (
            <span className="text-slate-200">
              {hoveredRecord.timestamp} · Row #{hoveredRecord.rowNumber}
            </span>
          ) : (
            <span className="text-slate-500">Move cursor across waveforms to inspect data points</span>
          )}
        </div>

        {hoveredRecord && (
          <div className="flex flex-wrap items-center gap-3.5 font-mono text-[11px] tabular-nums">
            <span className="text-slate-300">
              V: <strong className="text-slate-100">{hoveredRecord.voltage_v !== null ? `${hoveredRecord.voltage_v} V` : 'null'}</strong>
            </span>
            <span className="text-slate-300">
              I: <strong className="text-slate-100">{hoveredRecord.current_a !== null ? `${hoveredRecord.current_a} A` : 'null'}</strong>
            </span>
            <span className="text-slate-300">
              T: <strong className="text-slate-100">{hoveredRecord.temperature_c !== null ? `${hoveredRecord.temperature_c} °C` : 'null'}</strong>
            </span>
            <span className="text-slate-300">
              SoC: <strong className="text-slate-100">{hoveredRecord.soc_pct !== null ? `${hoveredRecord.soc_pct} %` : 'null'}</strong>
            </span>
            <span className="text-slate-400 uppercase">
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
            <Zap className="w-3.5 h-3.5 text-slate-400" />,
            '#cbd5e1', // Clean platinum
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
            <Zap className="w-3.5 h-3.5 text-slate-400" />,
            '#38bdf8', // Steel sky blue
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
            <Thermometer className="w-3.5 h-3.5 text-slate-400" />,
            '#fb7185', // Subdued terracotta / coral
            (r) => r.temperature_c,
            undefined,
            undefined,
            config.tempAlertThreshold,
            `Exposure Baseline (>${config.tempAlertThreshold}°C)`,
            viewMode === 'temperature' ? 240 : 135
          )}

        {(viewMode === 'stacked' || viewMode === 'soc') &&
          renderSingleTrack(
            'State of Charge',
            '%',
            <Battery className="w-3.5 h-3.5 text-slate-400" />,
            '#34d399', // Clean sage green
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
