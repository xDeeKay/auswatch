import type { SourceAttribution } from "@/lib/source-attribution";

const linkClass = "underline decoration-amber/50 underline-offset-2 transition hover:text-amber hover:decoration-amber";

export function SourceCredit({ attribution }: { attribution: SourceAttribution }) {
  return (
    <div>
      <h2 className="font-heading text-base text-foreground">Source</h2>
      <p className="mt-2 text-sm text-foreground/70">
        Imported from {attribution.credit}, licensed{" "}
        {attribution.licenceUrl ? (
          <a href={attribution.licenceUrl} target="_blank" rel="noopener noreferrer" className={linkClass}>
            {attribution.licence}
          </a>
        ) : (
          attribution.licence
        )}
        . Adapted by AusWatch: fields were mapped to this register&apos;s format and the state was derived from the
        location.
      </p>
    </div>
  );
}
