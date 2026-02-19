#!/usr/bin/env python3
"""
Fetch ETF holdings data from cbonds.com.

Usage:
    python3 cbonds_fetch.py <ISIN>

Outputs JSON to stdout:
    { "holdings": [{ "name": "...", "weight": 4.56 }, ...], "cbondsId": "1807" }

Requires: curl_cffi (pip install curl_cffi)
"""

import sys
import json
import re

def main():
    if len(sys.argv) < 2:
        print(json.dumps({"error": "Missing ISIN argument"}))
        sys.exit(1)

    isin = sys.argv[1].strip().upper()

    try:
        from curl_cffi import requests
    except ImportError:
        print(json.dumps({"error": "curl_cffi not installed. Run: pip install curl_cffi"}))
        sys.exit(1)

    # Step 1: Resolve ISIN → cbonds numeric ETF ID via suggest API
    suggest_url = f"https://cbonds.com/api/etf/exchange_traded_funds/suggest/{isin}/"
    try:
        r = requests.get(
            suggest_url,
            impersonate="chrome",
            headers={"Accept": "application/json"},
            timeout=15,
        )
        if r.status_code != 200:
            print(json.dumps({"error": f"Suggest API returned status {r.status_code}"}))
            sys.exit(1)
        data = r.json()
        items = data.get("response", {}).get("items", [])
        if not items:
            print(json.dumps({"error": f"No ETF found on cbonds for ISIN {isin}", "holdings": []}))
            sys.exit(0)
        cbonds_id = items[0]["id"]
    except Exception as e:
        print(json.dumps({"error": f"Failed to resolve cbonds ID: {e}"}))
        sys.exit(1)

    # Step 2: Fetch the ETF detail page
    etf_url = f"https://cbonds.com/etf/{cbonds_id}/"
    try:
        r = requests.get(etf_url, impersonate="chrome", timeout=30)
        if r.status_code != 200:
            print(json.dumps({"error": f"ETF page returned status {r.status_code}"}))
            sys.exit(1)
        html = r.text
    except Exception as e:
        print(json.dumps({"error": f"Failed to fetch ETF page: {e}"}))
        sys.exit(1)

    # Step 3: Extract the embedded `structure` JSON variable
    structure_match = re.search(
        r'(?:var\s+)?structure\s*[:=]\s*(\[[\s\S]*?\])\s*[,;]', html
    )
    if not structure_match:
        print(json.dumps({"error": "Could not find structure data in page", "holdings": [], "cbondsId": cbonds_id}))
        sys.exit(0)

    try:
        structure = json.loads(structure_match.group(1))
    except json.JSONDecodeError as e:
        print(json.dumps({"error": f"Failed to parse structure JSON: {e}"}))
        sys.exit(1)

    # Step 4: Convert to simplified holdings list
    holdings = []
    for item in structure:
        name = item.get("asset_name", "").strip()
        # weight.numeric is a decimal (e.g. 0.045573 = 4.5573%)
        weight_num = item.get("weight.numeric")
        weight_rounded = item.get("weight.rounded")

        # Try to extract ISIN from various possible field names
        isin_val = (
            item.get("isin", "") or
            item.get("asset_isin", "") or
            item.get("emitent_isin", "") or
            ""
        ).strip() if isinstance(item.get("isin", item.get("asset_isin", item.get("emitent_isin"))), str) else ""

        # Try to extract ticker
        ticker_val = (
            item.get("ticker", "") or
            item.get("asset_ticker", "") or
            ""
        ).strip() if isinstance(item.get("ticker", item.get("asset_ticker")), str) else ""

        if not name:
            continue

        if weight_num is not None:
            try:
                weight = round(float(weight_num) * 100, 2)
            except (ValueError, TypeError):
                weight = 0.0
        elif weight_rounded is not None:
            try:
                weight = float(weight_rounded)
            except (ValueError, TypeError):
                weight = 0.0
        else:
            weight = 0.0

        entry = {"name": name, "weight": weight}
        if isin_val:
            entry["isin"] = isin_val
        if ticker_val:
            entry["ticker"] = ticker_val
        holdings.append(entry)

    # Sort by weight descending
    holdings.sort(key=lambda x: x["weight"], reverse=True)

    # Log available structure fields for debugging (first item only)
    available_fields = list(structure[0].keys()) if structure else []

    result = {
        "holdings": holdings,
        "cbondsId": cbonds_id,
        "totalCount": len(holdings),
        "availableFields": available_fields,
    }
    print(json.dumps(result))


if __name__ == "__main__":
    main()
