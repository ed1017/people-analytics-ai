"""Re-extract the bounded reference from the three original workbooks; no network.

Usage: python tests/manual/verify-compensation-oews.py WORKBOOK_DIRECTORY
Add --write to regenerate the checked-in subset after reviewing source changes.
Requires openpyxl in the verification environment; no application dependency.
"""
import argparse
import hashlib
import json
from pathlib import Path

import openpyxl

ROOT = Path(__file__).resolve().parents[2]
BASE = json.loads((ROOT / "lib/data/bls-oews-may2025.json").read_text())
TARGET = ROOT / "lib/data/compensation-oews-may2025.json"
SOC = {"15-1252", "15-2051", "29-1141"}
AREAS = {"national_M2025_dl.xlsx": "99", "state_M2025_dl.xlsx": "36", "MSA_M2025_dl.xlsx": "35620"}
KINDS = {"99": "national", "36": "state", "35620": "metro"}
FIELDS = ["AREA", "AREA_TITLE", "AREA_TYPE", "NAICS", "I_GROUP", "OWN_CODE", "OCC_CODE", "OCC_TITLE", "O_GROUP", "TOT_EMP", "EMP_PRSE", "A_PCT10", "A_PCT25", "A_MEDIAN", "A_PCT75", "A_PCT90", "ANNUAL", "HOURLY"]


def extract(directory):
    records, sources = [], []
    for original in BASE["original_workbooks"]:
        file = directory / original["name"]
        digest = hashlib.sha256(file.read_bytes()).hexdigest()
        assert digest == original["sha256"], f"Source hash changed: {file.name}; review before updating"
        book = openpyxl.load_workbook(file, read_only=True, data_only=True)
        assert book["Field Descriptions"]["A1"].value == "May 2025 OEWS Estimates"
        notes = " ".join(str(value) for row in book["Field Descriptions"].values for value in row if value is not None)
        assert "$239,200" in notes and "wage estimate is not available" in notes
        sheet = book.worksheets[0]
        iterator = sheet.iter_rows(values_only=True)
        headings = next(iterator)
        found = []
        for index, values in enumerate(iterator, 2):
            row = dict(zip(headings, values))
            if row.get("AREA") != AREAS[file.name] or row.get("OCC_CODE") not in SOC:
                continue
            if row.get("O_GROUP") != "detailed" or row.get("NAICS") != "000000" or row.get("OWN_CODE") != "1235":
                continue
            assert row["I_GROUP"] == "cross-industry"
            prior = next(r for r in BASE["records"] if r["AREA"] == row["AREA"] and r["OCC_CODE"] == row["OCC_CODE"])
            for field in ["TOT_EMP", "EMP_PRSE", "A_PCT10", "A_PCT25", "A_MEDIAN", "A_PCT75", "A_PCT90"]:
                assert prior[field] == row[field], f"Existing reference differs: {file.name} {index} {field}"
            found.append({**{field: row[field] for field in FIELDS}, "source_workbook": file.name, "source_sheet": sheet.title, "source_row": index})
        assert len(found) == 3 and {r["OCC_CODE"] for r in found} == SOC
        records.extend(found)
        sources.append({"name": file.name, "sha256": digest, "url": BASE["sources"][KINDS[AREAS[file.name]]]})
        book.close()
    return {"schema_version": 1, "period": "May 2025", "release_date": "2026-05-15", "verified_at": "2026-10-05", "country": "US", "currency": "USD", "wage_basis": "annual", "annual_top_code_usd": 239200, "sources": sources, "records": records}


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("directory", type=Path)
    parser.add_argument("--write", action="store_true")
    args = parser.parse_args()
    result = extract(args.directory)
    if args.write:
        TARGET.write_text(json.dumps(result, indent=2) + "\n")
    else:
        assert json.loads(TARGET.read_text()) == result, "Checked-in subset differs from exact source extraction"
    print("Verified all 9 records, exact source hashes, field definitions, source-row coordinates and existing reference parity.")
