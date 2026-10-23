# Supabase Schema & Database Migrations

**Project:** Battery-Red-Flag  
**Project ID:** `gnckwhhsdquaxfyzlxhi`  
**Endpoint:** `https://gnckwhhsdquaxfyzlxhi.supabase.co`  
**Region:** `ap-northeast-2`

## Schema Structure

1. **`vehicles`**: Stores EV battery pack profiles (Vehicle ID, model, pack capacity kWh, nominal voltage).
2. **`telemetry_sessions`**: Segmented drive/charge/idle session aggregations with integrated metrics ($\Delta\text{Ah}$, $\text{kWh}$, exposure times, min/max/mean parametric stats).
3. **`battery_readings`**: High-frequency synchronized time-series records (timestamp, voltage, current, temperature, SOC, mode, validation flags, raw telemetry).
4. **`bms_alerts`**: Plausibility and quality violation alerts with acknowledgement tracking (`acknowledged`, `acknowledged_at`, `acknowledged_by`, `acknowledgement_notes`).
5. **`investigation_results`**: Engineering diagnostic logs, root-cause categorization, and remediation status.

## How to Apply Migrations

### Option A: Using the Supabase Dashboard SQL Editor (Recommended)
1. Navigate to [Supabase Dashboard > SQL Editor](https://supabase.com/dashboard/project/gnckwhhsdquaxfyzlxhi/sql).
2. Copy the entire contents of `supabase/migrations/20261023000000_init_bms_schema.sql`.
3. Click **Run**.
4. All tables, foreign key constraints, indexes, and Row Level Security policies will be created.

### Option B: Using the Supabase CLI
```bash
npx supabase db push --db-url "postgresql://postgres:[YOUR-PASSWORD]@db.gnckwhhsdquaxfyzlxhi.supabase.co:5432/postgres"
```
