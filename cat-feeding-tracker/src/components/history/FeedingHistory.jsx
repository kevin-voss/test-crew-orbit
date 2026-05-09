import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function FeedingHistory() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>History</CardTitle>
        <CardDescription>Saved feedings will appear here in a later task (in-memory or local storage only).</CardDescription>
      </CardHeader>
      <CardContent>
        <p className="text-sm text-muted-foreground">No entries yet.</p>
      </CardContent>
    </Card>
  );
}
