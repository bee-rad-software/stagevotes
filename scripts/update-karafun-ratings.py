"""Refresh the KaraFun song IDs and explicit ratings from its official CSV.

Usage: python scripts/update-karafun-ratings.py <CSV URL or local CSV path>
The CSV download is linked from https://www.karafun.com/karaoke-song-list.html.
"""
import csv
import json
import pathlib
import sys
import urllib.request

if len(sys.argv) != 2:
    raise SystemExit('Pass the KaraFun CSV URL or a local CSV path.')

source = sys.argv[1]
if source.startswith('https://www.karafun.com/'):
    lines = urllib.request.urlopen(source, timeout=40).read().decode('utf-8-sig').splitlines()
else:
    lines = pathlib.Path(source).read_text(encoding='utf-8-sig').splitlines()

rows = csv.DictReader(lines, delimiter=';')
if not {'Id', 'Explicit'}.issubset(rows.fieldnames or []):
    raise SystemExit('Missing KaraFun Id or Explicit column.')

ratings = {}
for row in rows:
    if row['Explicit'] not in ('0', '1'):
        raise SystemExit(f"Unknown explicit rating for song {row['Id']}")
    ratings[row['Id']] = int(row['Explicit'])

if len(ratings) < 50000:
    raise SystemExit('The catalog looks incomplete; existing ratings were not replaced.')

destination = pathlib.Path(__file__).resolve().parent.parent / 'lib' / 'karafunSongRatings.json'
destination.write_text(json.dumps(ratings, separators=(',', ':')) + '\n', encoding='utf-8')
print(f'Updated {len(ratings)} KaraFun song ratings ({sum(ratings.values())} explicit).')
