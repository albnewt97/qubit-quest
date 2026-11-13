#!/usr/bin/env python3
"""State-vector answer keys from Qiskit: fixtures/golden/statevector.json.

200 random circuits on 1 to 6 qubits, drawn from a fixed seed, in the engine's
Circuit format (src/engine/statevector/circuit.ts): columns of operations on
disjoint qubits. Each circuit's final state comes from qiskit.quantum_info
Statevector, starting from |0...0>.

Qubit order. Our engine puts qubit 0 on the leftmost bit of the ket (basis index
= sum of q_k * 2^(n-1-k)); Qiskit puts it on the rightmost. Wire k is Qiskit
qubit k, so only the amplitude list is reordered: our index i holds Qiskit's
amplitude at bit-reverse(i). This file is the only place that conversion
happens for these fixtures.

Self-check. Before any operation is written, Qiskit's operator for it is
compared with the matrix built directly from our definition of the gate
(identity unless every control is 1, then the 2x2 matrix on the target), with
global phase included, to 1e-12. If they ever disagree, the generator stops
rather than writing a fixture that would look like an engine bug.

Angles and unitary entries are written at full precision (JSON round-trips a
float64 exactly); final amplitudes are rounded to 12 decimals.

Run through `pnpm fixtures` (tools/fixtures/generate.py). Run alone, it also
rewrites MANIFEST.json in the output folder.
"""

from __future__ import annotations

import argparse
import json
import math
from pathlib import Path

import numpy as np
from qiskit import QuantumCircuit
from qiskit.circuit.library import (
    HGate,
    IGate,
    RXGate,
    RYGate,
    RZGate,
    SdgGate,
    SGate,
    SwapGate,
    TdgGate,
    TGate,
    UnitaryGate,
    XGate,
    YGate,
    ZGate,
)
from qiskit.quantum_info import Operator, Statevector

from fixturelib import DEFAULT_OUT, check_pins, dump_float, write_manifest

FILE = "statevector.json"
SEED = 20261114
COUNT = 200
MAX_QUBITS = 6
MAX_COLUMNS = 15
MAX_CONTROLS = 3
DECIMALS = 12
SELF_CHECK_TOL = 1e-12

NAMED = ["i", "x", "y", "z", "h", "s", "sdg", "t", "tdg", "rx", "ry", "rz"]
ROTATIONS = {"rx", "ry", "rz"}
QISKIT_GATE = {
    "i": IGate,
    "x": XGate,
    "y": YGate,
    "z": ZGate,
    "h": HGate,
    "s": SGate,
    "sdg": SdgGate,
    "t": TGate,
    "tdg": TdgGate,
    "rx": RXGate,
    "ry": RYGate,
    "rz": RZGate,
}


def definition(name: str, theta: float | None) -> np.ndarray:
    """Our definition of each named gate, written out independently of Qiskit."""
    r = 1 / math.sqrt(2)
    w = complex(r, r)  # e^(i pi/4)
    fixed = {
        "i": [[1, 0], [0, 1]],
        "x": [[0, 1], [1, 0]],
        "y": [[0, -1j], [1j, 0]],
        "z": [[1, 0], [0, -1]],
        "h": [[r, r], [r, -r]],
        "s": [[1, 0], [0, 1j]],
        "sdg": [[1, 0], [0, -1j]],
        "t": [[1, 0], [0, w]],
        "tdg": [[1, 0], [0, w.conjugate()]],
    }
    if name in fixed:
        return np.array(fixed[name], dtype=complex)
    assert theta is not None
    c, s = math.cos(theta / 2), math.sin(theta / 2)
    if name == "rx":
        return np.array([[c, -1j * s], [-1j * s, c]], dtype=complex)
    if name == "ry":
        return np.array([[c, -s], [s, c]], dtype=complex)
    if name == "rz":
        return np.array([[complex(c, -s), 0], [0, complex(c, s)]], dtype=complex)
    raise ValueError(name)


def controlled_definition(u: np.ndarray, k: int) -> np.ndarray:
    """Matrix of u on the target with k controls, in Qiskit's little-endian order
    over qargs [c_1, ..., c_k, target]: qarg j is bit j, so the target is bit k."""
    dim = 2 ** (k + 1)
    m = np.eye(dim, dtype=complex)
    on = (1 << k) - 1  # every control bit set
    for a in (0, 1):
        for b in (0, 1):
            m[on | (a << k), on | (b << k)] = u[a, b]
    return m


def self_check(gate, want: np.ndarray, label: str) -> None:
    got = Operator(gate).data
    err = float(np.max(np.abs(got - want)))
    if not err <= SELF_CHECK_TOL:
        raise SystemExit(
            f"gen_statevector: Qiskit's operator for {label} differs from our definition "
            f"by {err:.3e} (limit {SELF_CHECK_TOL:g}, phase included). Not writing fixtures."
        )


def random_unitary(rng: np.random.Generator) -> np.ndarray:
    """e^(i a) Rz(b) Ry(c) Rz(d) with uniform angles: a general 2x2 unitary."""
    a, b, c, d = (float(x) for x in rng.uniform(-math.pi, math.pi, size=4))
    return np.exp(1j * a) * definition("rz", b) @ definition("ry", c) @ definition("rz", d)


def pick_controls(rng: np.random.Generator, free: int) -> int:
    if free < 2 or rng.random() < 0.5:
        return 0
    return int(rng.integers(1, min(MAX_CONTROLS, free - 1) + 1))


def random_column(rng: np.random.Generator, n: int, qc: QuantumCircuit) -> list[dict]:
    """One column of ops on disjoint qubits; each op is appended to qc as it is drawn."""
    free = [int(q) for q in rng.permutation(n)]
    ops: list[dict] = []
    while free and not (ops and rng.random() < 0.15):
        roll = rng.random()
        if roll < 0.15 and len(free) >= 2:
            a, b = free.pop(), free.pop()
            self_check(SwapGate(), _swap_matrix(), "swap")
            qc.append(SwapGate(), [a, b])
            ops.append({"kind": "swap", "targets": [a, b]})
            continue
        k = pick_controls(rng, len(free))
        target = free.pop()
        controls = [free.pop() for _ in range(k)]
        if roll < 0.75:
            name = NAMED[int(rng.integers(len(NAMED)))]
            theta = float(rng.uniform(-2 * math.pi, 2 * math.pi)) if name in ROTATIONS else None
            base = QISKIT_GATE[name](theta) if theta is not None else QISKIT_GATE[name]()
            u = definition(name, theta)
            op: dict = {"kind": "gate", "gate": name, "target": target}
            label = name
        else:
            u = random_unitary(rng)
            base = UnitaryGate(u)
            op = {
                "kind": "unitary",
                "matrix": {
                    "re": [float(x) for x in u.real.flatten()],
                    "im": [float(x) for x in u.imag.flatten()],
                },
                "target": target,
            }
            label = "unitary"
        if controls:
            op["controls"] = controls
        if op["kind"] == "gate" and op["gate"] in ROTATIONS:
            op["theta"] = theta
        gate = base.control(k) if k else base
        self_check(gate, controlled_definition(u, k), f"{label} with {k} control(s)")
        qc.append(gate, [*controls, target])
        ops.append(op)
    return ops


def _swap_matrix() -> np.ndarray:
    m = np.zeros((4, 4), dtype=complex)
    for i in range(4):
        m[((i & 1) << 1) | (i >> 1), i] = 1
    return m


def to_our_order(amps: np.ndarray, n: int) -> np.ndarray:
    """Qiskit index (qubit 0 = least significant bit) -> ours (qubit 0 = most significant)."""
    out = np.empty_like(amps)
    for i in range(2**n):
        rev = int(format(i, f"0{n}b")[::-1], 2)
        out[i] = amps[rev]
    return out


def op_labels(op: dict) -> list[str]:
    """Coverage labels; the same scheme as src/engine/statevector/golden.test.ts."""
    if op["kind"] == "swap":
        return ["swap"]
    k = len(op.get("controls", []))
    name = op["gate"] if op["kind"] == "gate" else "unitary"
    labels = [name if k == 0 else f"c-{name}"]
    if k >= 3:
        labels.append("3+ controls")
    if (name, k) == ("x", 1):
        labels.append("cx")
    if (name, k) == ("z", 1):
        labels.append("cz")
    if (name, k) == ("x", 2):
        labels.append("ccx")
    return labels


def build() -> dict:
    rng = np.random.default_rng(SEED)
    circuits = []
    seen: set[str] = set()
    for cid in range(COUNT):
        n = 1 + cid % MAX_QUBITS
        qc = QuantumCircuit(n)
        columns = [random_column(rng, n, qc) for _ in range(int(rng.integers(1, MAX_COLUMNS + 1)))]
        for col in columns:
            for op in col:
                seen.update(op_labels(op))
        amps = to_our_order(Statevector.from_instruction(qc).data, n)
        circuits.append(
            {
                "id": cid,
                "qubits": n,
                "columns": columns,
                "re": [dump_float(a.real, DECIMALS) for a in amps],
                "im": [dump_float(a.imag, DECIMALS) for a in amps],
            }
        )
    want = {*NAMED, *(f"c-{g}" for g in NAMED), "unitary", "c-unitary", "cx", "cz", "ccx", "swap", "3+ controls"}
    missing = sorted(want - seen)
    if missing:
        raise SystemExit(f"gen_statevector: seed {SEED} does not cover {missing}; change SEED.")
    return {
        "format": 1,
        "generator": "tools/fixtures/gen_statevector.py",
        "seed": SEED,
        "qubitOrder": "qubit 0 is the leftmost bit of the ket: index = sum of q_k * 2^(n-1-k)",
        "decimals": DECIMALS,
        "circuits": circuits,
    }


def serialise(data: dict) -> str:
    """Stable text: header fields, then one circuit per line for readable diffs."""
    head = {k: v for k, v in data.items() if k != "circuits"}
    lines = ["{"]
    for key, value in head.items():
        lines.append(f"  {json.dumps(key)}: {json.dumps(value)},")
    lines.append('  "circuits": [')
    body = [f"    {json.dumps(c, separators=(',', ':'))}" for c in data["circuits"]]
    lines.append(",\n".join(body))
    lines.append("  ]")
    lines.append("}")
    return "\n".join(lines) + "\n"


def generate(out_dir: Path) -> Path:
    target = out_dir / FILE
    target.write_text(serialise(build()), encoding="utf-8")
    return target


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--out", type=Path, default=DEFAULT_OUT, help="output folder")
    args = parser.parse_args()
    pins = check_pins()
    args.out.mkdir(parents=True, exist_ok=True)
    print(f"wrote {generate(args.out)}")
    print(f"wrote {write_manifest(args.out, pins)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
