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
import {
  checkSupabaseHealth,
  persistBmsDataset,
  getPersistedSessions,
  loadPersistedSessionData,
  acknowledgeAlertInSupabase,
  saveInvestigationToSupabase,
  getSupabaseCredentials,
  SUPABASE_PROJECT_ID,
  SUPABASE_REGION,
} from './supabase';

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

// ============================================================================
// SUPABASE POSTGRESQL INTEGRATION ROUTES
// ============================================================================

/**
 * Returns Supabase connection status, health check, and schema readiness
 */
backendRouter.get('/supabase/status', async (_req: Request, res: Response) => {
  try {
    const status = await checkSupabaseHealth();
    res.json(status);
  } catch (err: any) {
    res.status(500).json({
      configured: false,
      connected: false,
      projectId: SUPABASE_PROJECT_ID,
      region: SUPABASE_REGION,
      error: err?.message || 'Error executing Supabase health probe',
    });
  }
});

/**
 * Persists an ingested BMS dataset into Supabase PostgreSQL
 */
backendRouter.post('/supabase/save', async (req: Request, res: Response) => {
  try {
    const { vehicleId, sourceName, dataSource, isSimulated, analysis, config } = req.body;

    if (!analysis || !analysis.records || !analysis.vehicleGroups) {
      res.status(400).json({ error: 'Valid BMS analysis data payload is required.' });
      return;
    }

    const resolvedVehicleId =
      vehicleId ||
      analysis.vehicleIds?.[0] ||
      Object.keys(analysis.vehicleGroups)?.[0] ||
      'EV-01';

    const result = await persistBmsDataset({
      vehicleId: resolvedVehicleId,
      sourceName: sourceName || 'Ingested Telemetry Stream',
      dataSource: dataSource || 'uploaded_csv',
      isSimulated: Boolean(isSimulated),
      analysis,
      config: config || DEFAULT_PLAUSIBILITY_CONFIG,
    });

    res.json(result);
  } catch (err: any) {
    console.error('[API /supabase/save] Error:', err);
    res.status(500).json({
      error: 'Failed to persist dataset to Supabase PostgreSQL',
      details: err?.message,
    });
  }
});

/**
 * Lists previously persisted BMS telemetry sessions
 */
backendRouter.get('/supabase/sessions', async (_req: Request, res: Response) => {
  try {
    const sessions = await getPersistedSessions();
    res.json(sessions);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to fetch sessions from Supabase', details: err?.message });
  }
});

/**
 * Loads a specific persisted session with its synchronized battery readings
 */
backendRouter.get('/supabase/sessions/:id', async (req: Request, res: Response) => {
  try {
    const sessionId = req.params.id;
    const sessionData = await loadPersistedSessionData(sessionId);

    if (!sessionData) {
      res.status(404).json({ error: 'Session not found in Supabase' });
      return;
    }

    res.json(sessionData);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to load session details', details: err?.message });
  }
});

/**
 * Acknowledges a BMS alert in Supabase
 */
backendRouter.post('/supabase/alerts/:id/ack', async (req: Request, res: Response) => {
  try {
    const alertId = req.params.id;
    const { acknowledgedBy, notes } = req.body || {};

    const success = await acknowledgeAlertInSupabase({
      alertId,
      acknowledgedBy: acknowledgedBy || 'Battery Safety Engineer',
      notes,
    });

    if (!success) {
      res.status(500).json({ error: 'Could not update alert acknowledgement status in database' });
      return;
    }

    res.json({ success: true, alertId });
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to acknowledge alert', details: err?.message });
  }
});

/**
 * Saves or updates investigation results
 */
backendRouter.post('/supabase/investigations', async (req: Request, res: Response) => {
  try {
    const { sessionId, vehicleId, status, engineerNotes, rootCauseCategory, findings, investigatedBy } = req.body;

    if (!sessionId || !vehicleId) {
      res.status(400).json({ error: 'sessionId and vehicleId are required' });
      return;
    }

    const saved = await saveInvestigationToSupabase({
      sessionId,
      vehicleId,
      status: status || 'pending',
      engineerNotes: engineerNotes || '',
      rootCauseCategory: rootCauseCategory || 'unspecified',
      findings: findings || {},
      investigatedBy,
    });

    if (!saved) {
      res.status(500).json({ error: 'Could not save investigation to Supabase' });
      return;
    }

    res.json(saved);
  } catch (err: any) {
    res.status(500).json({ error: 'Failed to save investigation record', details: err?.message });
  }
});

