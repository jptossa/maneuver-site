import type { CSSProperties } from "react";

// Recharts takes inline styles/props, so the theme tokens from globals.css are
// passed as var() strings and follow the light/dark toggle without re-rendering.
export const AXIS_TICK = { fill: "var(--chart-text)", fontSize: 12 };
export const AXIS_LINE = { stroke: "var(--chart-grid)" };
export const GRID_STROKE = "var(--chart-grid)";

export const TOOLTIP_CONTENT: CSSProperties = {
  background: "var(--tooltip-bg)",
  border: "1px solid var(--tooltip-border)",
  borderRadius: 6,
  color: "var(--text)",
};
export const TOOLTIP_LABEL: CSSProperties = {
  color: "var(--brass)",
  fontFamily: "var(--font-display)",
};
export const TOOLTIP_ITEM: CSSProperties = { color: "var(--text)" };
export const LEGEND_STYLE: CSSProperties = {
  color: "var(--chart-text)",
  fontSize: 12,
};
