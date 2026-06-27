"use client";

import { useEffect, useRef, useState } from "react";
import {
  AreaSeries,
  createChart,
  type IChartApi,
  type ISeriesApi,
  type UTCTimestamp,
} from "lightweight-charts";

const RANGES = ["1D", "1W", "1M"] as const;
type Range = (typeof RANGES)[number];
type Status = "loading" | "ready" | "degraded";
type Point = { time: number; value: number };

const RETRY_MS = 15_000; // auto-retry a degraded chart (cached server-side)

/**
 * Area price chart (close prices) fed by /api/ohlcv. Brand-green, dark,
 * transparent background, responsive; the chart is created once and re-data'd
 * on range/address change. Never the source of a crash — shows a clean overlay
 * for loading / empty / error.
 */
export function PriceChart({ address }: { address: string }) {
  const [range, setRange] = useState<Range>("1D");
  const [status, setStatus] = useState<Status>("loading");
  const [reloadTick, setReloadTick] = useState(0);
  const containerRef = useRef<HTMLDivElement>(null);
  const chartRef = useRef<IChartApi | null>(null);
  const seriesRef = useRef<ISeriesApi<"Area"> | null>(null);
  const retryRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Create the chart once.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const chart = createChart(el, {
      width: el.clientWidth,
      height: 300,
      layout: {
        background: { color: "transparent" },
        textColor: "#8A93A6",
        attributionLogo: false,
      },
      grid: {
        vertLines: { visible: false },
        horzLines: { color: "rgba(255,255,255,0.05)" },
      },
      rightPriceScale: { borderVisible: false },
      timeScale: { borderVisible: false, timeVisible: true },
      crosshair: { horzLine: { visible: false }, vertLine: { labelVisible: false } },
      handleScroll: false,
      handleScale: false,
    });
    const series = chart.addSeries(AreaSeries, {
      lineColor: "#11FE9C",
      topColor: "rgba(17,254,156,0.30)",
      bottomColor: "rgba(17,254,156,0.00)",
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
    chartRef.current = chart;
    seriesRef.current = series;

    const resize = new ResizeObserver(() => {
      chart.applyOptions({ width: el.clientWidth });
    });
    resize.observe(el);

    return () => {
      resize.disconnect();
      chart.remove();
      chartRef.current = null;
      seriesRef.current = null;
    };
  }, []);

  // Fetch + render data on address/range change (and on each auto-retry tick).
  // setState only after awaits / inside the retry timeout (never synchronously in
  // the effect body). A degraded result (rate-limited/empty/network) AUTO-RETRIES
  // every ~15s instead of dying on a permanent "Chart unavailable".
  useEffect(() => {
    let active = true;
    if (retryRef.current) {
      clearTimeout(retryRef.current);
      retryRef.current = null;
    }
    void (async () => {
      let next: Status = "ready";
      try {
        const res = await fetch(
          `/api/ohlcv?address=${encodeURIComponent(address)}&range=${range}`,
          { cache: "no-store" },
        );
        const data = (await res.json()) as {
          points?: Point[];
          unavailable?: boolean;
        };
        const points = data.points ?? [];
        if (data.unavailable || points.length === 0) {
          next = "degraded";
          seriesRef.current?.setData([]);
        } else {
          seriesRef.current?.setData(
            points.map((p) => ({ time: p.time as UTCTimestamp, value: p.value })),
          );
          chartRef.current?.timeScale().fitContent();
        }
      } catch {
        next = "degraded"; // network hiccup → keep retrying, never a dead chart
      }
      if (!active) return;
      setStatus(next);
      if (next === "degraded") {
        retryRef.current = setTimeout(() => {
          if (active) setReloadTick((t) => t + 1);
        }, RETRY_MS);
      }
    })();
    return () => {
      active = false;
      if (retryRef.current) {
        clearTimeout(retryRef.current);
        retryRef.current = null;
      }
    };
  }, [address, range, reloadTick]);

  return (
    <div>
      <div className="mb-3 flex gap-1.5">
        {RANGES.map((r) => (
          <button
            key={r}
            type="button"
            onClick={() => setRange(r)}
            aria-pressed={range === r}
            className={`rounded-lg px-3 py-1 font-mono text-xs font-bold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cw-green ${
              range === r
                ? "bg-cw-green/15 text-cw-green"
                : "text-cw-text-muted hover:text-cw-text"
            }`}
          >
            {r}
          </button>
        ))}
      </div>

      <div className="relative">
        <div ref={containerRef} className="h-[300px] w-full" />
        {status !== "ready" && (
          <div className="pointer-events-none absolute inset-0 grid place-items-center px-4 text-center">
            <span className="font-mono text-sm text-cw-text-muted">
              {status === "loading"
                ? "Loading chart…"
                : "Chart temporarily unavailable — retrying…"}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}
