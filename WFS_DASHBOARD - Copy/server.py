# -*- coding: utf-8 -*-
import os, json, urllib.parse
from datetime import datetime
import requests
from flask import Flask, render_template, jsonify, request

APP_TITLE = "WFS Dashboard"

# --- WFS კონფიგი ---
# დარწმუნდით, რომ ეს მონაცემები 100%-ით სწორია
WFS_URL = "https://wblr.napr.gov.ge/data/SLR/ows"
WFS_USER = "wblr_user"  # შეცვალე საჭიროებისამებრ
WFS_PASS = "WFS_editor"  # შეცვალე საჭიროებისამებრ
TYPENAME = "SLR:GFLD_PARCELS"
SRSNAME = "EPSG:32638"

# --- მნიშვნელობების ლეიბლები ---
FUNCTION_LABELS = {"1": "სასოფლო-სამეურნეო", "2": "არასასოფლო-სამეურნეო"}
CATEGORY_LABELS = {"1": "საკარმიდამო", "2": "სახნავი", "3": "საძოვარი", "4": "სათიბი"}
AZOMVIS_LABELS = {
    "0": "პირველადი აზომვა",
    "1": "ცვლილება",
    "2": "გადამოწმება",
    "3": "წასაშლელი",
    "4": "სპორადული",
}

# --- Flask ---
app = Flask(
    __name__,
    static_url_path="/static",
    static_folder="static",
    template_folder="templates",
)


@app.route("/")
def index():
    return render_template("index.html", app_title=APP_TITLE)


def _split_multi(val: str):
    if not val:
        return []
    raw = [x.strip() for x in val.replace(",", " ").split()]
    return list(dict.fromkeys([x for x in raw if x]))


@app.route("/api/data")
def api_data():
    zones = _split_multi(request.args.get("zone", ""))
    sectors = _split_multi(request.args.get("sector", ""))
    date_from = request.args.get("date_from", "").strip()
    date_to = request.args.get("date_to", "").strip()
    azomvis = _split_multi(request.args.get("azomvis", ""))

    cql = []

    # --- ZONE ---
    if zones:
        if len(zones) == 1:
            cql.append(f"ZONE='{zones[0]}'")
        else:
            ors = " OR ".join([f"ZONE='{z}'" for z in zones])
            cql.append(f"({ors})")

    # --- SECTOR ---
    if sectors:
        if len(sectors) == 1:
            cql.append(f"SECTOR='{sectors[0]}'")
        else:
            ors = " OR ".join([f"SECTOR='{s}'" for s in sectors])
            cql.append(f"({ors})")

    # --- თარიღი (გასწორებული ლოგიკა) ---
    if date_from:
        start_date_time = f"{date_from} 00:00:00"
        if date_to:
            end_date_time = f"{date_to} 23:59:59"
        else:
            end_date_time = f"{date_from} 23:59:59"
        cql.append(f"DATE_ BETWEEN '{start_date_time}' AND '{end_date_time}'")

    # --- აზომვის ტიპი ---
    if azomvis:
        ors = " OR ".join([f"AZOMVIS_TIPI='{a}'" for a in azomvis])
        cql.append(f"({ors})")

    final_cql = " AND ".join([p for p in cql if p])

    params = {
        "service": "WFS",
        "version": "2.0.0",
        "request": "GetFeature",
        "typeNames": TYPENAME,
        "srsName": SRSNAME,
        "outputFormat": "application/json",
    }
    if final_cql:
        params["cql_filter"] = final_cql

    url = WFS_URL + "?" + urllib.parse.urlencode(params, safe=":=><' ")

    # --- !!! ყურადღება აქ !!! ---
    try:
        print(f"--- [WFS Request] ---")
        print(f"URL: {url}")

        r = requests.get(url, auth=(WFS_USER, WFS_PASS), timeout=60)
        r.raise_for_status()  # ეს გამოიწვევს შეცდომას, თუ სტატუსი არ არის 200

        data = r.json()
        features = data.get("features", [])

        print(f"--- [WFS Response] ---")
        print(f"Features received: {len(features)}")

        rows = []
        for ft in features:
            props = ft.get("properties", {}) or {}
            geom = ft.get("geometry")
            wkt_geom_text = json.dumps(geom, ensure_ascii=False) if geom else ""

            TAG = props.get("TAG", "")
            CAD = props.get("CADCODE", "")
            DATE = props.get("DATE_", "")
            ZONE = str(props.get("ZONE", "") or "")
            SECT = str(props.get("SECTOR", "") or "")
            FUNC = str(props.get("FUNCTION", "") or "")
            CAT = str(props.get("CATEGORY", "") or "")
            AZO = str(props.get("AZOMVIS_TIPI", "") or "")

            rows.append(
                {
                    "TAG": TAG,
                    "CADCODE": CAD,
                    "DATE_": DATE,
                    "ZONE": ZONE,
                    "SECTOR": SECT,
                    "FUNCTION": FUNC,
                    "FUNCTION_LABEL": FUNCTION_LABELS.get(FUNC, FUNC),
                    "CATEGORY": CAT,
                    "CATEGORY_LABEL": CATEGORY_LABELS.get(CAT, CAT),
                    "AZOMVIS_TIPI": AZO,
                    "AZOMVIS_TIPI_LABEL": AZOMVIS_LABELS.get(AZO, AZO),
                    "wkt_geom": wkt_geom_text,
                }
            )

        return jsonify(
            {
                "ok": True,
                "count": len(rows),
                "items": rows,
                "filter": " AND ".join(cql) if cql else "",
            }
        )

    except Exception as e:
        # <<< აქ დავამატეთ შეცდომის დაპრინტვა ტერმინალში >>>
        print("\n---!!! WFS ERROR !!!---")
        print(f"Failed URL: {url}")
        print(f"Error details: {e}")
        print("-----------------------\n")

        # დავაბრუნოთ შეცდომა ბრაუზერშიც
        return (
            jsonify(
                {
                    "ok": False,
                    "error": str(e),
                    "items": [],
                    "count": 0,
                    "filter": "ERROR",
                }
            ),
            200,
        )


if __name__ == "__main__":
    app.run(host="127.0.0.1", port=5000, debug=True)
