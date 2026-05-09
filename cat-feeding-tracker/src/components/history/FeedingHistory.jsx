import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

function formatFedAt(iso) {
  try {
    return new Date(iso).toLocaleString(undefined, {
      dateStyle: "medium",
      timeStyle: "short",
    });
  } catch {
    return iso;
  }
}

export function FeedingHistory({ entries = [] }) {
  return (
    <Card role="region" aria-labelledby="feeding-history-title">
      <CardHeader>
        <CardTitle id="feeding-history-title" className="text-xl font-semibold tracking-tight">
          Feeding history
        </CardTitle>
        <CardDescription>Saved feedings from this session appear here as you add them.</CardDescription>
      </CardHeader>
      <CardContent
        className={
          entries.length > 0
            ? "max-h-[min(60vh,32rem)] overflow-y-auto [scrollbar-gutter:stable]"
            : undefined
        }
      >
        {entries.length === 0 ? (
          <div
            className="flex flex-col items-center justify-center rounded-md border border-dashed border-border bg-muted/30 px-4 py-10 text-center"
            aria-live="polite"
          >
            <p className="text-sm font-medium text-foreground">No feeding records yet</p>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              After you save a feeding, it will show up in this list.
            </p>
          </div>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-border bg-card px-3 py-3 text-sm shadow-sm"
              >
                <p className="font-medium text-foreground">{formatFedAt(entry.fedAt)}</p>
                <dl className="mt-2 space-y-1.5">
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Food given
                    </dt>
                    <dd className="text-foreground">{entry.foodGiven}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      Food received
                    </dt>
                    <dd className="text-foreground">{entry.foodReceived}</dd>
                  </div>
                  <div>
                    <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      How much the cat liked it
                    </dt>
                    <dd className="text-foreground">
                      {entry.likedAmount}/5
                    </dd>
                  </div>
                </dl>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
