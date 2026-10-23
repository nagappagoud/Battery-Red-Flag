/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// LAYER 3: BACKEND LAYER — REST API ROUTER & CONTROLLERS
// ============================================================================

import { Router, Request, Response } from 'express';
import {
  analyzeBmsTelemetry,
  parseBmsCsv,
  DEFAULT_PLAUSIBILITY_CONFIG,
  SAMPLE_DATASETS,
  buildSummaryCsvContent,
  buildQualityReportCsvContent,
} from '../middle';
import fs from 'fs';
import path from 'path';

export const backendRouter = Router();

/**
 * Health check endpoint
 */
backendRouter.get('/health', (_req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'EV BMS Analyzer',
    layers: {
      layer1: 'Frontend (React 19 + Tailwind CSS + Native SVG Oscilloscope)',
      layer2: 'Middle Layer (BMS Ingestion, Quality Screening, Numerical Integration & Aggregation Engine)',
      layer3: 'Backend Layer (Express REST API & Static Asset Dispatcher)',
    },
    timestamp: new Date().toISOString(),
  });
});

/**
 * Returns default plausibility screening configuration
 */
backendRouter.get('/config/defaults', (_req: Request, res: Response) => {
  res.json(DEFAULT_PLAUSIBILITY_CONFIG);
});

/**
 * Ingests CSV telemetry data and returns complete 3-layer analysis
 */
backendRouter.post('/analyze', (req: Request, res: Response) => {
  try {
    let csvText = '';
    let customConfig = undefined;

    if (typeof req.body === 'string') {
      csvText = req.body;
    } else if (req.body && typeof req.body.csv === 'string') {
      csvText = req.body.csv;
      customConfig = req.body.config;
    }

    if (!csvText || !csvText.trim()) {
      res.status(400).json({ error: 'No CSV telemetry data provided in request body.' });
      return;
    }

    // Call Middle Layer business engine
    const analysis = analyzeBmsTelemetry(csvText, customConfig);
    res.json(analysis);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to process BMS telemetry', details: err?.message });
  }
});

/**
 * Validates data quality and returns discrepancy audit report only
 */
backendRouter.post('/validate', (req: Request, res: Response) => {
  try {
    let csvText = '';
    let config = DEFAULT_PLAUSIBILITY_CONFIG;

    if (typeof req.body === 'string') {
      csvText = req.body;
    } else if (req.body && typeof req.body.csv === 'string') {
      csvText = req.body.csv;
      if (req.body.config) config = { ...config, ...req.body.config };
    }

    const { qualityReport } = parseBmsCsv(csvText, config);
    res.json(qualityReport);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to validate BMS data', details: err?.message });
  }
});

/**
 * Lists reference demo datasets
 */
backendRouter.get('/samples', (_req: Request, res: Response) => {
  res.json(
    SAMPLE_DATASETS.map((s) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      badge: s.badge,
    }))
  );
});

/**
 * Serves raw CSV for a specific sample
 */
backendRouter.get('/samples/:id', (req: Request, res: Response) => {
  const sample = SAMPLE_DATASETS.find((s) => s.id === req.params.id);
  if (!sample) {
    res.status(404).json({ error: 'Sample dataset not found' });
    return;
  }
  res.type('text/csv').send(sample.csvContent);
});

/**
 * Generates and downloads summary CSV
 */
backendRouter.post('/export/summary-csv', (req: Request, res: Response) => {
  try {
    const analysis = req.body;
    const csvContent = buildSummaryCsvContent(analysis);
    res.setHeader('Content-Disposition', 'attachment; filename="bms_summary.csv"');
    res.type('text/csv').send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to build summary CSV', details: err?.message });
  }
});

/**
 * Generates and downloads quality audit CSV
 */
backendRouter.post('/export/quality-csv', (req: Request, res: Response) => {
  try {
    const report = req.body;
    const csvContent = buildQualityReportCsvContent(report);
    res.setHeader('Content-Disposition', 'attachment; filename="bms_quality_audit.csv"');
    res.type('text/csv').send(csvContent);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to build quality CSV', details: err?.message });
  }
});

/**
 * Streams the generated 3-layer project ZIP file
 */
backendRouter.get('/download-project-zip', (_req: Request, res: Response) => {
  const zipPath = path.resolve(process.cwd(), 'ev-bms-analyzer-3layer.zip');
  if (fs.existsSync(zipPath)) {
    res.setHeader('Content-Disposition', 'attachment; filename="ev-bms-analyzer-3layer.zip"');
    res.setHeader('Content-Type', 'application/zip');
    fs.createReadStream(zipPath).pipe(res);
  } else {
    res.status(404).json({
      error: 'Project ZIP is being compiled. Please re-run the export script or try again in a few seconds.',
    });
  }
});
