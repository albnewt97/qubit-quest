#!/usr/bin/env python3
"""Answer-key generator for fixtures/golden: the entry point of `pnpm fixtures`.

Runs every generator in GENERATORS, each of which writes one JSON file, then
writes MANIFEST.json with the SHA-256 of every file in the output folder. The
files under fixtures/golden are never edited by hand.

Usage:
  pnpm fixtures                 regenerate fixtures/golden in place
  pnpm fixtures --out <dir>     write into <dir> instead (CI compares that copy
                                with the committed one; see compare:fixtures)

Needs Python 3 with the exact packages in tools/fixtures/requirements.txt:
  pip install -r tools/fixtures/requirements.txt
"""

from __future__ import annotations

import argparse
from pathlib import Path

from fixturelib import DEFAULT_OUT, check_pins, write_manifest

# Imported after the pin check, so a missing package gives the pin message.
GENERATORS = ["gen_statevector"]


def main() -> int:
    parser = argparse.ArgumentParser(description="Regenerate the answer keys in fixtures/golden.")
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="output folder (default: fixtures/golden)")
    args = parser.parse_args()
    pins = check_pins()
    args.out.mkdir(parents=True, exist_ok=True)
    for name in GENERATORS:
        module = __import__(name)
        print(f"{name}: wrote {module.generate(args.out)}")
    print(f"wrote {write_manifest(args.out, pins)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
