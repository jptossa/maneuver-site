import type { Grouping, Metric, Timescale } from "./types";

export function buildHref(
  path: string,
  params: { scale?: Timescale; date?: string; metric?: Metric; by?: Grouping },
) {
  const q = new URLSearchParams();
  if (params.scale) q.set("scale", params.scale);
  if (params.date) q.set("date", params.date);
  if (params.metric) q.set("metric", params.metric);
  // "type" is the default, so keep URLs clean and only write the non-default.
  if (params.by === "group") q.set("by", "group");
  const s = q.toString();
  return s ? `${path}?${s}` : path;
}
