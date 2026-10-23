/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface SampleDatasetOption {
  id: string;
  title: string;
  description: string;
  badge: string;
  csvContent: string;
}

export const SAMPLE_STANDARD_CYCLE = `timestamp,vehicle_id,voltage_v,current_a,temperature_c,soc_pct,mode
2026-10-22T08:00:00Z,EV-FLEET-101,398.4,-32.5,24.2,85.0,driving
2026-10-22T08:02:00Z,EV-FLEET-101,396.1,-58.2,25.1,83.8,driving
2026-10-22T08:04:00Z,EV-FLEET-101,394.0,-84.6,26.5,82.4,driving
2026-10-22T08:06:00Z,EV-FLEET-101,397.8,18.4,27.0,82.6,driving
2026-10-22T08:08:00Z,EV-FLEET-101,392.5,-95.0,28.3,81.1,driving
2026-10-22T08:10:00Z,EV-FLEET-101,390.2,-72.1,29.4,79.8,driving
2026-10-22T08:12:00Z,EV-FLEET-101,388.0,-64.3,30.2,78.6,driving
2026-10-22T08:14:00Z,EV-FLEET-101,385.9,-88.4,31.5,77.1,driving
2026-10-22T08:16:00Z,EV-FLEET-101,384.1,-110.2,33.0,75.3,driving
2026-10-22T08:18:00Z,EV-FLEET-101,386.4,22.1,33.4,75.7,driving
2026-10-22T08:20:00Z,EV-FLEET-101,382.7,-78.9,34.2,74.4,driving
2026-10-22T08:22:00Z,EV-FLEET-101,381.0,-65.4,35.0,73.3,driving
2026-10-22T08:24:00Z,EV-FLEET-101,379.2,-82.0,35.8,71.9,driving
2026-10-22T08:26:00Z,EV-FLEET-101,377.6,-54.0,36.2,71.0,driving
2026-10-22T08:28:00Z,EV-FLEET-101,376.1,-42.5,36.5,70.3,driving
2026-10-22T08:30:00Z,EV-FLEET-101,378.0,0.0,36.0,70.3,idle
2026-10-22T08:35:00Z,EV-FLEET-101,378.1,0.0,34.8,70.3,idle
2026-10-22T08:40:00Z,EV-FLEET-101,378.2,0.0,33.5,70.3,idle
2026-10-22T08:45:00Z,EV-FLEET-101,378.0,0.0,32.4,70.3,idle
2026-10-22T09:00:00Z,EV-FLEET-101,382.5,125.0,33.8,72.0,charging
2026-10-22T09:05:00Z,EV-FLEET-101,389.4,124.5,37.2,76.5,charging
2026-10-22T09:10:00Z,EV-FLEET-101,396.0,123.8,41.0,81.0,charging
2026-10-22T09:15:00Z,EV-FLEET-101,401.8,118.2,44.5,85.2,charging
2026-10-22T09:20:00Z,EV-FLEET-101,406.2,95.0,46.8,88.5,charging
2026-10-22T09:25:00Z,EV-FLEET-101,408.0,62.4,47.9,91.0,charging
2026-10-22T09:30:00Z,EV-FLEET-101,409.1,38.0,46.5,93.0,charging
2026-10-22T09:35:00Z,EV-FLEET-101,409.8,20.5,44.2,94.5,charging
2026-10-22T09:40:00Z,EV-FLEET-101,410.0,5.2,41.5,95.0,charging
2026-10-22T09:45:00Z,EV-FLEET-101,409.5,0.0,38.8,95.0,idle`;

export const SAMPLE_MULTI_VEHICLE = `timestamp,vehicle_id,voltage_v,current_a,temperature_c,soc_pct,mode
2026-10-22T10:00:00Z,BUS-04,360.2,-145.0,28.0,65.0,driving
2026-10-22T10:05:00Z,BUS-04,357.8,-180.2,29.5,62.8,driving
2026-10-22T10:10:00Z,BUS-04,362.4,45.0,30.8,63.4,driving
2026-10-22T10:15:00Z,BUS-04,355.1,-210.0,32.5,60.5,driving
2026-10-22T10:20:00Z,BUS-04,353.0,-165.4,34.0,58.2,driving
2026-10-22T10:25:00Z,BUS-04,350.5,-155.0,35.2,56.0,driving
2026-10-22T10:30:00Z,BUS-04,356.0,0.0,35.0,56.0,idle
2026-10-22T10:00:00Z,SEDAN-09,388.5,-35.0,22.0,82.0,driving
2026-10-22T10:05:00Z,SEDAN-09,386.0,-42.0,23.1,81.0,driving
2026-10-22T10:10:00Z,SEDAN-09,384.2,-38.5,24.0,80.1,driving
2026-10-22T10:15:00Z,SEDAN-09,382.0,-55.0,25.2,78.8,driving
2026-10-22T10:20:00Z,SEDAN-09,385.0,15.0,25.8,79.1,driving
2026-10-22T10:25:00Z,SEDAN-09,380.5,-40.0,26.5,78.2,driving
2026-10-22T10:30:00Z,SEDAN-09,381.0,0.0,26.0,78.2,idle`;

export const SAMPLE_QUALITY_ANOMALIES = `timestamp,vehicle_id,voltage_v,current_a,temperature_c,soc_pct,mode
2026-10-22T12:00:00Z,TRUCK-99,380.0,-45.0,25.0,75.0,driving
2026-10-22T12:01:00Z,TRUCK-99,379.2,-50.2,25.5,74.4,driving
2026-10-22T12:02:00Z,TRUCK-99,, -48.0,26.1,73.8,driving
2026-10-22T12:03:00Z,TRUCK-99,378.0,-62.0,CORRUPT,73.2,driving
2026-10-22T12:04:00Z,TRUCK-99,377.1,-55.0,27.2,72.6,driving
2026-10-22T12:04:00Z,TRUCK-99,377.1,-55.0,27.2,72.6,driving
2026-10-22T12:01:30Z,TRUCK-99,379.5,-42.0,25.8,74.0,driving
2026-10-22T12:06:00Z,TRUCK-99,585.0,-40.0,28.5,71.5,driving
2026-10-22T12:07:00Z,TRUCK-99,375.0,-45.0,72.5,70.9,driving
2026-10-22T12:08:00Z,TRUCK-99,374.2,-48.0,46.0,105.0,driving
2026-10-22T12:09:00Z,TRUCK-99,373.5,-50.0,48.2,69.5,driving
2026-10-22T12:10:00Z,TRUCK-99,372.8,0.0,47.0,69.5,idle`;

export const SAMPLE_DATASETS: SampleDatasetOption[] = [
  {
    id: 'standard_drive_charge',
    title: 'Standard Drive & DC Fast-Charge Cycle',
    description: 'Clean sequential telemetry showing driving discharge, idle rest, and high-rate DC charging with thermal ramp.',
    badge: 'Recommended',
    csvContent: SAMPLE_STANDARD_CYCLE.trim(),
  },
  {
    id: 'multi_vehicle',
    title: 'Multi-Vehicle Fleet Telemetry',
    description: 'Two separate vehicles (BUS-04 heavy duty & SEDAN-09 passenger) for testing group separation.',
    badge: 'Fleet Multi-ID',
    csvContent: SAMPLE_MULTI_VEHICLE.trim(),
  },
  {
    id: 'quality_anomalies',
    title: 'Telemetry with Data-Quality Flaws',
    description: 'Demonstrates detection of missing values, corrupt strings, duplicate timestamps, out-of-order packets, and screening range violations.',
    badge: 'Quality Screening Test',
    csvContent: SAMPLE_QUALITY_ANOMALIES.trim(),
  },
];

/**
 * Creates and downloads a sample CSV file in the browser
 */
export function downloadCsvFile(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * Creates and downloads a JSON file in the browser
 */
export function downloadJsonFile(data: any, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.setAttribute('href', url);
  link.setAttribute('download', filename);
  link.style.visibility = 'hidden';
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
