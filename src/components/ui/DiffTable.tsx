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
    <table className="mt-3 w-full text-sm">
      <thead>
        <tr className="text-left font-mono text-xs tracking-[0.05em] text-amber">
          <th className="pb-1 pr-4">FIELD</th>
          <th className="pb-1 pr-4">{beforeLabel}</th>
          <th className="pb-1">{afterLabel}</th>
        </tr>
      </thead>
      <tbody>
        {rows.map((row) => (
          <tr key={row.key} className="border-t border-parchment/10">
            <td className="py-1.5 pr-4 text-parchment/70">{row.label}</td>
            <td className="py-1.5 pr-4 text-parchment/85">{row.before}</td>
            <td className="py-1.5 text-amber">{row.after}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
