#!/usr/bin/env python3
"""Answer-key generator for fixtures/golden (stub until M1).

Later milestones add generators that use Qiskit, Stim, PyMatching and sinter to
write JSON fixtures into fixtures/golden. Those files are never edited by hand.
"""

import sys

USAGE = """\
Usage: pnpm fixtures

Regenerates the JSON answer keys in fixtures/golden from Qiskit, Stim,
PyMatching and sinter. Needs Python 3.

Not implemented yet: no generators exist. The first (state-vector answer keys
from Qiskit) arrives in M1.
"""


def main() -> int:
    sys.stdout.write(USAGE)
    return 0


if __name__ == "__main__":
    sys.exit(main())
