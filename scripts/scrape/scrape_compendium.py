"""Scrape MET values from the 2024 Adult Compendium of Physical Activities.

Writes src/data/compendium.json. Values are copied as published; the
Compendium's terms say not to change them or merge entries with different METs.

    python scripts/scrape/scrape_compendium.py [--selenium]
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import date
from pathlib import Path

from bs4 import BeautifulSoup

sys.path.insert(0, str(Path(__file__).parent))
from _common import fetch_html  # noqa: E402

BASE = "https://pacompendium.com"
# (two-digit major heading code, URL slug), from https://pacompendium.com/adult-compendium/
CATEGORIES = [
    ("01", "bicycling"),
    ("02", "conditioning-exercise"),
    ("03", "dancing"),
    ("04", "fishing-hunting"),
    ("05", "home-activities"),
    ("06", "home-repair"),
    ("07", "inactivity"),
    ("08", "lawn-garden"),
    ("09", "miscellaneous"),
    ("10", "music-playing"),
    ("11", "occupation"),
    ("12", "running"),
    ("13", "self-care"),
    ("14", "sexual-activity"),
    ("15", "sports"),
    ("16", "transportation"),
    ("17", "walking"),
    ("18", "water-activities"),
    ("19", "winter-activities"),
    ("20", "religious-activities"),
    ("21", "volunteer-activities"),
    ("22", "video-games"),
]
OUT = Path(__file__).resolve().parents[2] / "src" / "data" / "compendium.json"


def parse_table(html: str, major: str) -> list[dict]:
    soup = BeautifulSoup(html, "html.parser")
    rows: list[dict] = []
    for table in soup.find_all("table"):
        for tr in table.find_all("tr"):
            cells = [c.get_text(" ", strip=True) for c in tr.find_all(["td", "th"])]
            if len(cells) < 3 or not re.fullmatch(r"\d{5}", cells[0]):
                continue  # header row or something that isn't an activity
            code, met, description = cells[0], cells[1], cells[2]
            if not code.startswith(major):
                raise ValueError(f"code {code} on a page for heading {major}")
            rows.append({"code": code, "met": float(met), "description": description})
    return rows


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--selenium", action="store_true", help="render pages in headless Chrome")
    args = ap.parse_args()

    categories = []
    for major, slug in CATEGORIES:
        url = f"{BASE}/{slug}"
        rows = parse_table(fetch_html(url, use_selenium=args.selenium), major)
        if not rows:
            sys.exit(f"No activity rows found at {url}. If the page is JS-rendered, retry with --selenium.")
        print(f"{major} {slug}: {len(rows)} activities")
        categories.append({"code": major, "slug": slug, "url": url, "activities": rows})

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "source": "2024 Adult Compendium of Physical Activities",
                "sourceUrl": f"{BASE}/adult-compendium/",
                "citation": "Herrmann SD, et al. 2024 Adult Compendium of Physical Activities. J Sport Health Sci. 2024.",
                "retrievedAt": date.today().isoformat(),
                "categories": categories,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    total = sum(len(c["activities"]) for c in categories)
    print(f"Wrote {total} activities to {OUT}")


if __name__ == "__main__":
    main()
