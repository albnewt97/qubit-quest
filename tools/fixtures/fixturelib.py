"""Shared helpers for the fixture generators in tools/fixtures.

- check_pins(): the installed packages must match requirements.txt exactly,
  because the answer keys depend on the library versions.
- write_manifest(out_dir): hashes every file in out_dir into MANIFEST.json, in
  the format tools/check-fixtures expects.
- dump_float(x): rounds and normalises a number for a fixture file.
"""

from __future__ import annotations

import hashlib
import json
import sys
from importlib import metadata
from pathlib import Path

HERE = Path(__file__).resolve().parent
REPO = HERE.parent.parent
DEFAULT_OUT = REPO / "fixtures" / "golden"
REQUIREMENTS = HERE / "requirements.txt"
MANIFEST = "MANIFEST.json"
EXEMPT = {MANIFEST, ".gitkeep"}


def read_pins() -> dict[str, str]:
    """Package name -> exact version, from requirements.txt."""
    pins: dict[str, str] = {}
    for line in REQUIREMENTS.read_text(encoding="utf-8").splitlines():
        line = line.split("#", 1)[0].strip()
        if not line:
            continue
        name, sep, version = line.partition("==")
        if not sep or not version:
            raise SystemExit(f"{REQUIREMENTS.name}: every line must be name==version, got {line!r}")
        pins[name.strip().lower()] = version.strip()
    return pins


def check_pins() -> dict[str, str]:
    """Stop unless every pinned package is installed at exactly its pinned version."""
    pins = read_pins()
    problems = []
    for name, want in sorted(pins.items()):
        try:
            got = metadata.version(name)
        except metadata.PackageNotFoundError:
            problems.append(f"  {name}: not installed (want {want})")
            continue
        if got != want:
            problems.append(f"  {name}: installed {got}, pinned {want}")
    if problems:
        sys.stderr.write(
            "Installed packages do not match tools/fixtures/requirements.txt:\n"
            + "\n".join(problems)
            + "\nInstall them with: pip install -r tools/fixtures/requirements.txt\n"
        )
        raise SystemExit(1)
    return pins


def dump_float(x: float, decimals: int) -> float:
    """Round to `decimals` places; -0.0 becomes 0.0 so the sign of zero never varies."""
    r = round(float(x), decimals)
    return 0.0 if r == 0 else r


def write_manifest(out_dir: Path, pins: dict[str, str]) -> Path:
    """Write MANIFEST.json listing the SHA-256 of every file in out_dir."""
    files: dict[str, str] = {}
    for path in sorted(p for p in out_dir.rglob("*") if p.is_file()):
        rel = path.relative_to(out_dir).as_posix()
        if rel in EXEMPT:
            continue
        files[rel] = hashlib.sha256(path.read_bytes()).hexdigest()
    manifest = {
        "meta": {"generator": "tools/fixtures/generate.py", "requirements": pins},
        "files": files,
    }
    target = out_dir / MANIFEST
    target.write_text(json.dumps(manifest, indent=2, sort_keys=True) + "\n", encoding="utf-8")
    return target
