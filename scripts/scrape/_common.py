"""Shared helpers for the reference-data scrapers: polite fetching with a cache.

Rules: identify ourselves, obey robots.txt, throttle, and cache raw HTML so
re-runs don't hit the source again. Selenium is only used when asked for.
"""

from __future__ import annotations

import hashlib
import time
import urllib.robotparser
from pathlib import Path
from urllib.parse import urlparse

import requests

USER_AGENT = "ManeuverSiteBot/0.1 (personal project; offline reference-data build)"
CACHE_DIR = Path(__file__).parent / ".cache"
DELAY_SECONDS = 1.5

_robots: dict[str, urllib.robotparser.RobotFileParser] = {}
_last_request = 0.0


def allowed(url: str) -> bool:
    parts = urlparse(url)
    origin = f"{parts.scheme}://{parts.netloc}"
    if origin not in _robots:
        rp = urllib.robotparser.RobotFileParser()
        resp = requests.get(f"{origin}/robots.txt", headers={"User-Agent": USER_AGENT}, timeout=30)
        # robots.txt that is missing (404) means everything is allowed.
        rp.parse(resp.text.splitlines() if resp.ok else [])
        _robots[origin] = rp
    return _robots[origin].can_fetch(USER_AGENT, url)


def _throttle() -> None:
    global _last_request
    wait = DELAY_SECONDS - (time.monotonic() - _last_request)
    if wait > 0:
        time.sleep(wait)
    _last_request = time.monotonic()


def _fetch_selenium(url: str) -> str:
    # Imported lazily: selenium is an optional extra and most pages don't need it.
    from selenium import webdriver
    from selenium.webdriver.chrome.options import Options

    opts = Options()
    opts.add_argument("--headless=new")
    opts.add_argument(f"--user-agent={USER_AGENT}")
    driver = webdriver.Chrome(options=opts)
    try:
        driver.get(url)
        return driver.page_source
    finally:
        driver.quit()


def fetch_html(url: str, use_selenium: bool = False) -> str:
    """Return the page HTML, from the cache when present."""
    CACHE_DIR.mkdir(exist_ok=True)
    key = hashlib.sha1(f"{url}|{use_selenium}".encode()).hexdigest()[:16]
    cached = CACHE_DIR / f"{key}.html"
    if cached.exists():
        return cached.read_text(encoding="utf-8")

    if not allowed(url):
        raise PermissionError(f"robots.txt disallows fetching {url}")
    _throttle()
    if use_selenium:
        html = _fetch_selenium(url)
    else:
        resp = requests.get(url, headers={"User-Agent": USER_AGENT}, timeout=30)
        resp.raise_for_status()
        # The CDC page is UTF-8 but not always labelled; don't let requests guess latin-1.
        resp.encoding = resp.encoding if resp.encoding and resp.encoding.lower() != "iso-8859-1" else "utf-8"
        html = resp.text
    cached.write_text(html, encoding="utf-8")
    return html
