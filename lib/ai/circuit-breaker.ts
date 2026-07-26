interface CircuitState {
  failures: number;
  openedAtMs: number | null;
  halfOpenInFlight: boolean;
}

const circuits = new Map<string, CircuitState>();

function stateFor(key: string): CircuitState {
  const existing = circuits.get(key);
  if (existing) return existing;
  const created: CircuitState = {
    failures: 0,
    openedAtMs: null,
    halfOpenInFlight: false,
  };
  circuits.set(key, created);
  return created;
}

export function tryEnterAiCircuit(
  key: string,
  nowMs: number,
  resetMs: number,
): boolean {
  const state = stateFor(key);
  if (state.openedAtMs === null) return true;
  if (nowMs - state.openedAtMs < resetMs) return false;
  if (state.halfOpenInFlight) return false;
  state.halfOpenInFlight = true;
  return true;
}

export function recordAiCircuitSuccess(key: string): void {
  circuits.set(key, {
    failures: 0,
    openedAtMs: null,
    halfOpenInFlight: false,
  });
}

export function recordAiCircuitFailure(
  key: string,
  nowMs: number,
  failureThreshold: number,
): void {
  const state = stateFor(key);
  state.halfOpenInFlight = false;
  state.failures += 1;
  if (state.failures >= failureThreshold) {
    state.openedAtMs = nowMs;
  }
}

export function releaseAiCircuitProbe(key: string): void {
  const state = circuits.get(key);
  if (state) state.halfOpenInFlight = false;
}

/** Test helper; production code should never need to reset breaker history. */
export function resetAiCircuitsForTests(): void {
  circuits.clear();
}

