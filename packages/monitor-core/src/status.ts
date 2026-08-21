import type { OperationalState } from "../../shared/src/types";

export interface ProbeResult {
  observedAt: string;
  success: boolean;
  httpStatus: number | null;
  validPayload: boolean;
  errorClass: string | null;
}

export function deriveOperationalState(results: ProbeResult[]): OperationalState {
  if (!results.length) return "unknown";
  const latest = results[results.length - 1];
  if (latest.httpStatus === 401 || latest.httpStatus === 403) return "auth-required";
  if (latest.httpStatus === 429) return "rate-limited";
  if (!latest.success) return results.slice(-3).every((r) => !r.success) ? "down" : "degraded";
  if (!latest.validPayload) return "degraded";
  return "operational";
}

export function shouldOpenIncident(results: ProbeResult[]): boolean {
  return results.length >= 3 && results.slice(-3).every((result) => !result.success);
}

export function availability(results: ProbeResult[]): number | null {
  if (!results.length) return null;
  return Math.round((results.filter((r) => r.success).length / results.length) * 10000) / 100;
}
