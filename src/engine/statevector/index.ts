// State-vector engine: up to 12 qubits, exact complex amplitudes.
export {
  dagger,
  gateMatrix,
  INVERSE_GATE,
  isNamedGate,
  isRotation,
  isUnitary,
  multiply,
  NAMED_GATES,
  withPhase,
  type Matrix2,
  type NamedGate,
} from "./matrix.ts";
export { MAX_QUBITS, NORM_TOLERANCE, StateVector, type BlochVector } from "./state.ts";
export { equalUpToGlobalPhase, fidelity, inner, PHASE_EQUALITY_TOLERANCE } from "./compare.ts";
export {
  CircuitError,
  cnot,
  controlled,
  cz,
  gate,
  inverse,
  measure,
  opQubits,
  swap,
  toffoli,
  unitary,
  validateCircuit,
  type Circuit,
  type Column,
  type GateOp,
  type MeasureOp,
  type Op,
  type SwapOp,
  type UnitaryOp,
} from "./circuit.ts";
export { applyOp, run, type Measurement, type RunResult } from "./run.ts";
export {
  randomCircuit,
  randomOp,
  randomState,
  randomUnitary,
  type RandomCircuitOptions,
} from "./random.ts";
