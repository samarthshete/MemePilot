import Image from "next/image";

type Screenshot = { src: string; alt: string; width: number; height: number };

/**
 * Premium phone frame. If a real `screenshot` is provided it renders via
 * next/image (explicit dimensions → no CLS; `priority` for the hero LCP).
 * Until the screenshots land in public/brand/, it shows an on-brand faux app
 * screen labelled with the feature — swapping in the real image is one prop.
 */
export function PhoneMockup({
  label,
  screenshot,
  priority = false,
  className = "",
}: {
  label: string;
  screenshot?: Screenshot;
  priority?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`relative w-full rounded-[2.75rem] bg-gradient-to-b from-cw-bezel to-cw-bg p-3 shadow-2xl ring-1 ring-inset ring-white/6 ${className}`}
    >
      <div className="overflow-hidden rounded-[2.25rem]">
        {screenshot ? (
          <Image
            src={screenshot.src}
            alt={screenshot.alt}
            width={screenshot.width}
            height={screenshot.height}
            priority={priority}
            className="block h-auto w-full"
          />
        ) : (
          <FauxScreen label={label} />
        )}
      </div>
    </div>
  );
}

/** Branded placeholder that mimics a trading screen until real assets exist. */
function FauxScreen({ label }: { label: string }) {
  return (
    <div className="flex aspect-[9/19.2] flex-col gap-4 bg-gradient-to-b from-cw-surface to-cw-bg p-5">
      <div className="flex items-center justify-between">
        <span className="font-mono text-[10px] tracking-widest text-cw-text-muted">
          9:41
        </span>
        <span className="size-2 rounded-full bg-cw-green/70" />
      </div>

      <div className="mt-2 space-y-1.5">
        <span className="block font-mono text-[11px] uppercase tracking-widest text-cw-text-muted">
          {label}
        </span>
        <span className="block font-mono text-3xl font-bold text-cw-text">
          $7.63M
        </span>
        <span className="font-mono text-sm font-bold text-cw-green">
          ▲ +434%
        </span>
      </div>

      {/* Faux line chart */}
      <svg
        viewBox="0 0 100 40"
        preserveAspectRatio="none"
        className="h-24 w-full"
        aria-hidden="true"
      >
        <polyline
          points="0,32 14,28 26,30 40,18 54,22 68,10 82,14 100,4"
          fill="none"
          stroke="var(--color-cw-green)"
          strokeWidth="1.6"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>

      <div className="mt-auto space-y-2.5">
        <div className="h-2.5 w-3/4 rounded-full bg-white/8" />
        <div className="h-2.5 w-1/2 rounded-full bg-white/8" />
        <div className="mt-4 grid grid-cols-2 gap-2.5">
          <div className="grid h-11 place-items-center rounded-xl bg-cw-green font-bold text-cw-bg">
            Buy
          </div>
          <div className="grid h-11 place-items-center rounded-xl border border-cw-red/60 font-bold text-cw-red">
            Sell
          </div>
        </div>
      </div>
    </div>
  );
}
