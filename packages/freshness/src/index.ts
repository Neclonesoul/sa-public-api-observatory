import type { FreshnessState } from "../../shared/src/types";

export type Cadence = "realtime" | "minute" | "hourly" | "daily" | "weekdays" | "weekly" | "monthly" | "quarterly" | "annual" | "event-driven" | "irregular" | "unknown";

const cadenceSeconds: Partial<Record<Cadence, number>> = {
  realtime: 300, minute: 300, hourly: 7200, daily: 172800,
  weekdays: 259200, weekly: 1209600, monthly: 5356800,
  quarterly: 16070400, annual: 63244800,
};

export function classifyFreshness(lastUpdate: Date | null, cadence: Cadence, now = new Date()): FreshnessState {
  if (!lastUpdate || cadence === "unknown" || cadence === "irregular" || cadence === "event-driven") return "unknown";
  const allowance = cadenceSeconds[cadence];
  if (!allowance) return "unknown";
  const age = Math.max(0, (now.getTime() - lastUpdate.getTime()) / 1000);
  if (age <= allowance * 0.75) return "fresh";
  if (age <= allowance) return "due";
  if (age <= allowance * 1.5) return "late";
  return "stale";
}
