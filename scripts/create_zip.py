#!/usr/bin/env python3
"""
Creates a clean, standalone ZIP package containing the 3-layer EV BMS Data Analyzer project.
Layers included:
  1. Layer 1: Frontend (React 19 UI, Native Oscilloscope SVG, Tailwind CSS)
  2. Layer 2: Middle Layer (BMS Parser, Validation Screening, Numerical Aggregation)
  3. Layer 3: Backend (Express REST API, Server Entry Point)
"""

import os
import zipfile

OUTPUT_ZIP = "ev-bms-analyzer-3layer.zip"
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))

EXCLUDE_DIRS = {
    "node_modules",
    ".git",
    "dist",
    ".aistudio",
    "__pycache__",
}

EXCLUDE_FILES = {
    OUTPUT_ZIP,
    ".DS_Store",
}

def create_project_zip():
    zip_path = os.path.join(BASE_DIR, OUTPUT_ZIP)
    if os.path.exists(zip_path):
        os.remove(zip_path)

    print(f"Creating 3-Layer Project Archive at {zip_path}...")

    with zipfile.ZipFile(zip_path, "w", zipfile.ZIP_DEFLATED) as zipf:
        for root, dirs, files in os.walk(BASE_DIR):
            # Prune excluded directories in-place
            dirs[:] = [d for d in dirs if d not in EXCLUDE_DIRS and not d.startswith(".")]

            for file in files:
                if file in EXCLUDE_FILES or file.endswith(".pyc") or file.endswith(".zip"):
                    continue

                full_path = os.path.join(root, file)
                rel_path = os.path.relpath(full_path, BASE_DIR)

                # Store file in archive
                zipf.write(full_path, rel_path)
                print(f"  + Added: {rel_path}")

    size_mb = os.path.getsize(zip_path) / (1024 * 1024)
    print(f"Successfully generated {OUTPUT_ZIP} ({size_mb:.2f} MB)")

if __name__ == "__main__":
    create_project_zip()
