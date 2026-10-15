import type { Metric, Timescale } from "./types";

export function buildHref(
  path: string,
  params: { scale?: Timescale; date?: string; metric?: Metric },
) {
  const q = new URLSearchParams();
  if (params.scale) q.set("scale", params.scale);
  if (params.date) q.set("date", params.date);
  if (params.metric) q.set("metric", params.metric);
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}
