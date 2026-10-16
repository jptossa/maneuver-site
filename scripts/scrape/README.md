# Reference-data scrapers

Offline Python scripts, not part of the Next.js build or runtime. They write reviewed JSON into `src/data/`, which the app imports. Re-run them occasionally and review the diff.

```bash
pip install -r scripts/scrape/requirements.txt
python scripts/scrape/scrape_compendium.py   # -> src/data/compendium.json (MET values)
python scripts/scrape/scrape_guidelines.py   # -> src/data/guidelines.json (CDC weekly targets)
```

Both obey robots.txt, send an identifying User-Agent, wait 1.5 s between requests and cache raw HTML in `scripts/scrape/.cache/` (gitignored; delete it to force a refetch). Both sites serve static HTML, so Beautiful Soup is enough. Pass `--selenium` (needs Chrome) only if a source starts rendering its content with JavaScript.

Compendium terms: cite it, and do not change MET values or merge entries with different METs. `src/lib/met.ts` picks entries by code and copies the values unmodified.
