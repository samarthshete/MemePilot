import { PhoneMockup } from "./PhoneMockup";
import { Reveal } from "./Reveal";

type Screenshot = { src: string; alt: string; width: number; height: number };

/**
 * One alternating feature row: bold header + one punchy line beside a phone.
 * Desktop: text/phone side-by-side, sides swap when `reversed`. Mobile: stacks
 * text-first for readability. Reveals on scroll (reduced-motion safe).
 */
export function FeatureRow({
  index,
  titleLead,
  titleAccent,
  body,
  label,
  screenshot,
  reversed = false,
}: {
  index: string;
  titleLead: string;
  titleAccent: string;
  body: string;
  label: string;
  screenshot?: Screenshot;
  reversed?: boolean;
}) {
  return (
    <Reveal>
      <div className="grid items-center gap-[clamp(1.75rem,4vw,3.5rem)] py-[clamp(1.75rem,4vw,3rem)] md:grid-cols-2">
        <div className={reversed ? "md:order-2" : undefined}>
          <span className="font-mono text-[13px] font-bold text-cw-green">
            {index}
          </span>
          <h3 className="mt-2.5 text-[clamp(1.75rem,3.6vw,2.875rem)] font-black leading-none tracking-[-0.03em]">
            {titleLead} <span className="text-cw-green">{titleAccent}</span>
          </h3>
          <p className="mt-4 max-w-[420px] text-[clamp(0.9375rem,1.4vw,1.125rem)] font-medium leading-relaxed text-cw-text-muted">
            {body}
          </p>
        </div>

        <div
          className={`flex justify-center ${reversed ? "md:order-1" : undefined}`}
        >
          <PhoneMockup
            label={label}
            screenshot={screenshot}
            className="w-full max-w-[280px]"
          />
        </div>
      </div>
    </Reveal>
  );
}
