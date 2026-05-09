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
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Recent feedings from this session. Persistence can be added later.</CardDescription>
      </CardHeader>
      <CardContent>
        {entries.length === 0 ? (
          <p className="text-sm text-muted-foreground">No entries yet.</p>
        ) : (
          <ul className="flex flex-col gap-3">
            {entries.map((entry) => (
              <li
                key={entry.id}
                className="rounded-md border border-border bg-card px-3 py-2 text-sm"
              >
                <p className="font-medium text-foreground">{formatFedAt(entry.fedAt)}</p>
                <p className="text-muted-foreground">
                  Given: <span className="text-foreground">{entry.foodGiven}</span>
                </p>
                <p className="text-muted-foreground">
                  Got: <span className="text-foreground">{entry.foodReceived}</span>
                </p>
                <p className="text-muted-foreground">
                  Liked: <span className="text-foreground">{entry.likedAmount}/5</span>
                </p>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}
