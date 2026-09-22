import { cn } from "@/lib/cn";

export type DiffRow = { key: string; label: string; before: string; after: string };

export function DiffTable({
  rows,
  beforeLabel = "BEFORE",
  afterLabel = "AFTER",
}: {
  rows: DiffRow[];
  beforeLabel?: string;
  afterLabel?: string;
}) {
  if (rows.length === 0) return null;

  return (
    <table className="mt-3 w-full table-fixed text-sm">
      <thead>
        <tr className="text-left font-label text-xs font-normal text-parchment/50">
          <th className="w-2/5 pb-1 pr-4 font-normal">FIELD</th>
          <th className="w-[30%] pb-1 pr-4 font-normal">{beforeLabel}</th>
          <th className="w-[30%] pb-1 font-normal">{afterLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => {
          const changed = row.before !== row.after;
          return (
            <tr key={row.key} className="border-t border-parchment/10">
              <td className="break-words py-1.5 pr-4 text-parchment/50">{row.label}</td>
              <td className="break-words py-1.5 pr-4 text-parchment/70">{row.before}</td>
              <td className={cn("break-words py-1.5", changed ? "text-amber" : "text-parchment/70")}>{row.after}</td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}
