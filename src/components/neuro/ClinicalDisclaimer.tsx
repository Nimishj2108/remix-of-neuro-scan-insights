import { CLINICAL_DISCLAIMER } from "@/lib/clinical/types";

/**
 * Persistent decision-support disclaimer. Must stay visible anywhere
 * AI-derived findings, triage, or reports are shown.
 */
export default function ClinicalDisclaimer({
  className = "",
}: {
  className?: string;
}) {
  return (
    <div
      role="note"
      className={`pixel-border-sm p-3 bg-dark-base/60 ${className}`}
    >
      <p className="font-pixel text-[8px] text-coral mb-2 tracking-wider">
        AI-ASSISTED TRIAGE SUPPORT
      </p>
      <p className="font-mono text-xs text-cream/70 leading-snug">
        {CLINICAL_DISCLAIMER}
      </p>
    </div>
  );
}
