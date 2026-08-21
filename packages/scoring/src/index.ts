export interface ScoreComponents {
  availability: number | null;
  freshness: number | null;
  documentation: number;
  machineReadability: number;
  stability: number | null;
  licenceClarity: number;
  standards: number;
}

export function observatoryScore(input: ScoreComponents, freshnessApplicable = true) {
  const weighted = [
    [input.availability, 30], [freshnessApplicable ? input.freshness : null, freshnessApplicable ? 25 : 0],
    [input.documentation, freshnessApplicable ? 15 : 24], [input.machineReadability, freshnessApplicable ? 10 : 16],
    [input.stability, freshnessApplicable ? 10 : 35], [input.licenceClarity, freshnessApplicable ? 5 : 15],
    [input.standards, freshnessApplicable ? 5 : 10],
  ] as const;
  const known = weighted.filter(([value, weight]) => value !== null && weight > 0);
  if (!known.length) return null;
  const weightTotal = known.reduce((sum, [, weight]) => sum + weight, 0);
  return Math.round(known.reduce((sum, [value, weight]) => sum + (value as number) * weight, 0) / weightTotal);
}
