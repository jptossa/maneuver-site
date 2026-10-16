"""Scrape the adult physical-activity recommendations from the CDC.

Writes src/data/guidelines.json: the key points plus the three "recommended
levels" examples, each with its source URL. CDC web content is US-government
text; we still record the URL and retrieval date so the assistant can cite it.

    python scripts/scrape/scrape_guidelines.py [--selenium]
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

URL = "https://www.cdc.gov/physical-activity-basics/guidelines/adults.html"
OUT = Path(__file__).resolve().parents[2] / "src" / "data" / "guidelines.json"


def text(el) -> str:
    return " ".join(el.get_text(" ", strip=True).split())


def parse(html: str) -> dict:
    main = BeautifulSoup(html, "html.parser")
    main = main.find("main") or main

    key_points: list[str] = []
    levels: list[str] = []
    section = None
    for el in main.find_all(["h2", "h3", "li", "p"]):
        if el.name in ("h2", "h3"):
            section = text(el)
        elif section == "Key points" and el.name == "li":
            key_points.append(text(el))
        elif section == "Recommended levels for health benefits" and el.name == "p":
            t = text(el)
            # Skip the "Example N" labels and the "AND" separators between lines.
            # The muscle-strengthening line repeats under each of the three examples; keep it once.
            if t and not t.startswith("Example ") and t != "AND" and t not in levels:
                levels.append(t)

    if not key_points or not levels:
        raise ValueError("CDC page layout changed: key points or recommended levels not found")
    return {
        "targets": parse_targets(key_points, levels),
        "keyPoints": key_points,
        "recommendedLevels": levels,
    }


def parse_targets(key_points: list[str], levels: list[str]) -> dict:
    """Pull the weekly numbers out of the text so the app doesn't hard-code them."""

    def find(pattern: str, lines: list[str]) -> int:
        for line in lines:
            m = re.search(pattern, line)
            if m:
                return int(m.group(1))
        raise ValueError(f"CDC page wording changed: nothing matched {pattern!r}")

    moderate = find(r"(\d+) minutes of moderate-intensity", key_points)
    vigorous = find(r"[Vv]igorous-intensity[^.]*?(\d+) minutes", levels)
    muscle = find(r"(\d+) days of muscle-strengthening", key_points)
    # The app counts one vigorous minute as two moderate ones; fail if the CDC's numbers disagree.
    if moderate != 2 * vigorous:
        raise ValueError(f"Expected moderate = 2 x vigorous, got {moderate} and {vigorous}")
    return {
        "moderateMinutes": moderate,
        "vigorousMinutes": vigorous,
        "muscleStrengtheningDays": muscle,
    }


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--selenium", action="store_true", help="render the page in headless Chrome")
    args = ap.parse_args()

    data = parse(fetch_html(URL, use_selenium=args.selenium))
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(
            {
                "source": "CDC, Adult Activity: An Overview",
                "sourceUrl": URL,
                "retrievedAt": date.today().isoformat(),
                **data,
            },
            indent=2,
            ensure_ascii=False,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {len(data['keyPoints'])} key points and {len(data['recommendedLevels'])} level lines to {OUT}")


if __name__ == "__main__":
    main()
