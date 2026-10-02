import { Button } from "@/components/ui/Button";

export function Pagination({
  page,
  totalPages,
  hrefFor,
}: {
  page: number;
  totalPages: number;
  hrefFor: (targetPage: number) => string;
}) {
  if (totalPages <= 1) return null;

  return (
    <div className="flex items-center justify-between">
      {page > 1 ? (
        <Button href={hrefFor(page - 1)} tone="secondary" size="sm">
          &larr; Prev
        </Button>
      ) : (
        <Button tone="secondary" size="sm" disabled>
          &larr; Prev
        </Button>
      )}
      <span className="font-label text-xs text-foreground/50">
        Page {page} of {totalPages}
      </span>
      {page < totalPages ? (
        <Button href={hrefFor(page + 1)} tone="secondary" size="sm">
          Next &rarr;
        </Button>
      ) : (
        <Button tone="secondary" size="sm" disabled>
          Next &rarr;
        </Button>
      )}
    </div>
  );
}
