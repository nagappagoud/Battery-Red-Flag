/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

// ============================================================================
// LAYER 2: MIDDLE LAYER — PUBLIC API ENTRY POINT
// ============================================================================

export * from './types';
export * from './bmsParser';
export * from './bmsAggregator';
export * from './bmsExporter';
export * from './sampleData';

import { parseBmsCsv } from './bmsParser';
import { groupAndSummarizeBmsData } from './bmsAggregator';
import { BMSAnalysisResult, PlausibilityConfig, DEFAULT_PLAUSIBILITY_CONFIG } from './types';

/**
 * Unified Middle Layer engine facade: takes raw CSV input and config,
 * returns validated records, quality discrepancy audit, and grouped session summaries.
 */
export function analyzeBmsTelemetry(
  csvText: string,
  customConfig?: Partial<PlausibilityConfig>
): BMSAnalysisResult {
  const config: PlausibilityConfig = {
    ...DEFAULT_PLAUSIBILITY_CONFIG,
    ...(customConfig || {}),
  };

  const { records, qualityReport } = parseBmsCsv(csvText, config);
  const { vehicleGroups, vehicleIds } = groupAndSummarizeBmsData(records, config);

  return {
    records,
    qualityReport,
    vehicleGroups,
    vehicleIds,
    configUsed: config,
  };
}
