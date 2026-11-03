"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { formatDate, formatWeight } from "@/lib/format";

export interface WeightPoint {
  measuredOn: string;
  grams: number;
}

const HEIGHT = 220;
const PAD = { top: 16, right: 56, bottom: 28, left: 48 };
const DAY = 86_400_000;

/** Clean tick values (1, 2, 2.5, 5 × 10^n) covering [min, max]. */
function niceTicks(min: number, max: number, count = 4): number[] {
  if (min === max) {
    const pad = Math.max(1, Math.abs(min) * 0.1);
    min -= pad;
    max += pad;
  }
  const raw = (max - min) / count;
  const mag = 10 ** Math.floor(Math.log10(raw));
  const step = [1, 2, 2.5, 5, 10].map((m) => m * mag).find((s) => s >= raw) ?? raw;
  const start = Math.floor(min / step) * step;
  const ticks: number[] = [];
  for (let v = start; v <= max + step * 0.5; v += step) ticks.push(Number(v.toPrecision(12)));
  return ticks;
}

const shortDate = new Intl.DateTimeFormat("en-GB", {
  month: "short",
  year: "2-digit",
  timeZone: "UTC",
});

/**
 * Weight over time: one series, so no legend (the heading names it). 2px line,
 * 8px markers with a surface ring, the latest value labelled directly, a
 * crosshair + tooltip that snap to the nearest weigh-in (pointer or arrow keys),
 * and a table view for screen readers and anyone who prefers numbers.
 */
export function WeightChart({ points, unit }: { points: WeightPoint[]; unit: "kg" | "g" }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(600);
  const [active, setActive] = useState<number | null>(null);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const ro = new ResizeObserver(
      ([entry]) => entry && setWidth(Math.max(280, entry.contentRect.width)),
    );
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const data = useMemo(
    () =>
      [...points]
        .sort((a, b) => a.measuredOn.localeCompare(b.measuredOn))
        .map((p) => ({
          ...p,
          t: Date.parse(`${p.measuredOn}T00:00:00Z`),
          v: unit === "kg" ? p.grams / 1000 : p.grams,
        })),
    [points, unit],
  );

  const first = data[0];
  const last = data[data.length - 1];
  if (!first || !last || data.length < 2) {
    return (
      <p className="text-muted-foreground bg-muted rounded-xl px-4 py-3 text-sm">
        Add at least two weigh-ins to see a trend.
      </p>
    );
  }

  const values = data.map((d) => d.v);
  const ticks = niceTicks(Math.min(...values), Math.max(...values));
  const yMin = ticks[0] ?? Math.min(...values);
  const yMax = ticks[ticks.length - 1] ?? Math.max(...values);
  const t0 = first.t;
  const t1 = last.t === t0 ? t0 + DAY : last.t;
  const innerW = width - PAD.left - PAD.right;
  const innerH = HEIGHT - PAD.top - PAD.bottom;
  const x = (t: number) => PAD.left + ((t - t0) / (t1 - t0)) * innerW;
  const y = (v: number) => PAD.top + (1 - (v - yMin) / (yMax - yMin)) * innerH;
  const path = data
    .map((d, i) => `${i ? "L" : "M"}${x(d.t).toFixed(1)},${y(d.v).toFixed(1)}`)
    .join(" ");
  const fmt = (g: number) => formatWeight(g);
  const tickLabel = (v: number) => (unit === "kg" ? `${v} kg` : `${v} g`);

  /** Index of the weigh-in nearest to a horizontal pixel position. */
  const nearest = (px: number): number =>
    data.reduce(
      (best, d, i) => (Math.abs(x(d.t) - px) < Math.abs(x(data[best]?.t ?? t0) - px) ? i : best),
      0,
    );

  const a = active === null ? undefined : data[active];
  const middle = data[Math.floor(data.length / 2)];
  const xLabels = data.length <= 3 || !middle ? data.map((d) => d.t) : [t0, middle.t, last.t];

  return (
    <div className="flex flex-col gap-2">
      <div ref={wrap} className="relative w-full">
        <svg
          width={width}
          height={HEIGHT}
          role="img"
          aria-label={`Weight from ${formatDate(first.measuredOn)} to ${formatDate(last.measuredOn)}: ${fmt(first.grams)} to ${fmt(last.grams)}. Use the arrow keys to read each weigh-in, or open the table below.`}
          tabIndex={0}
          className="focus-visible:outline-ring block touch-pan-y rounded-lg"
          onPointerMove={(e) =>
            setActive(nearest(e.clientX - e.currentTarget.getBoundingClientRect().left))
          }
          onPointerLeave={() => setActive(null)}
          onFocus={() => setActive((i) => i ?? data.length - 1)}
          onBlur={() => setActive(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowLeft") setActive((i) => Math.max(0, (i ?? data.length) - 1));
            if (e.key === "ArrowRight") setActive((i) => Math.min(data.length - 1, (i ?? -1) + 1));
          }}
        >
          {/* Recessive grid + y ticks */}
          {ticks.map((v) => (
            <g key={v}>
              <line
                x1={PAD.left}
                x2={width - PAD.right}
                y1={y(v)}
                y2={y(v)}
                className="stroke-border"
                strokeWidth={1}
              />
              <text
                x={PAD.left - 8}
                y={y(v)}
                dy="0.32em"
                textAnchor="end"
                className="fill-muted-foreground text-xs"
              >
                {tickLabel(v)}
              </text>
            </g>
          ))}
          {xLabels.map((t, i) => (
            <text
              key={t}
              x={x(t)}
              y={HEIGHT - 6}
              textAnchor={i === 0 ? "start" : i === xLabels.length - 1 ? "end" : "middle"}
              className="fill-muted-foreground text-xs"
            >
              {shortDate.format(new Date(t))}
            </text>
          ))}

          <path
            d={path}
            fill="none"
            className="stroke-chart-1"
            strokeWidth={2}
            strokeLinejoin="round"
            strokeLinecap="round"
          />
          {data.map((d) => (
            <circle
              key={d.measuredOn + d.grams}
              cx={x(d.t)}
              cy={y(d.v)}
              r={4}
              className="fill-chart-1 stroke-card"
              strokeWidth={2}
            />
          ))}

          {/* Direct label: the latest value only */}
          <text
            x={x(last.t) + 8}
            y={y(last.v)}
            dy="0.32em"
            className="fill-foreground text-sm font-semibold"
          >
            {fmt(last.grams)}
          </text>

          {a ? (
            <g aria-hidden>
              <line
                x1={x(a.t)}
                x2={x(a.t)}
                y1={PAD.top}
                y2={PAD.top + innerH}
                className="stroke-muted-foreground"
                strokeWidth={1}
                strokeDasharray="3 3"
              />
              <circle
                cx={x(a.t)}
                cy={y(a.v)}
                r={6}
                className="fill-chart-1 stroke-card"
                strokeWidth={2}
              />
            </g>
          ) : null}
        </svg>
        {a ? (
          <div
            className="bg-popover text-popover-foreground pointer-events-none absolute top-1 rounded-lg border px-3 py-1.5 text-sm shadow-md"
            style={{ left: Math.min(Math.max(x(a.t) - 70, 0), width - 150) }}
          >
            <p className="font-semibold">{fmt(a.grams)}</p>
            <p className="text-muted-foreground text-xs">{formatDate(a.measuredOn)}</p>
          </div>
        ) : null}
        <p className="sr-only" aria-live="polite">
          {a ? `${formatDate(a.measuredOn)}: ${fmt(a.grams)}` : ""}
        </p>
      </div>

      <details className="text-sm">
        <summary className="text-primary cursor-pointer font-semibold">Show as table</summary>
        <table className="mt-2 w-full max-w-sm text-left">
          <caption className="sr-only">Weight history</caption>
          <thead>
            <tr className="text-muted-foreground border-b">
              <th scope="col" className="py-1.5 font-semibold">
                Date
              </th>
              <th scope="col" className="py-1.5 text-right font-semibold">
                Weight
              </th>
            </tr>
          </thead>
          <tbody>
            {[...data].reverse().map((d) => (
              <tr key={d.measuredOn + d.grams} className="border-b last:border-0">
                <td className="py-1.5">{formatDate(d.measuredOn)}</td>
                <td className="py-1.5 text-right tabular-nums">{fmt(d.grams)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </details>
    </div>
  );
}
