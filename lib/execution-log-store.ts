/**
 * In-memory store for the latest trading cycle execution logs.
 * Written by the trading cron, read by the execution-logs API route.
 */

export interface LogEntry {
  action: string;
  asset?: string;
  details: string;
  timestamp: number;
}

export interface PositionEntry {
  asset: string;
  side: string;
  price: string;
  size: string;
  sizeMatched: string;
  status: string;
}

let _lastLogs: LogEntry[] = [];
let _lastPositions: PositionEntry[] = [];

export function setExecutionLogs(logs: LogEntry[], positions: PositionEntry[]) {
  _lastLogs = logs;
  _lastPositions = positions;
}

export function getExecutionLogs() {
  return { logs: _lastLogs, positions: _lastPositions };
}
