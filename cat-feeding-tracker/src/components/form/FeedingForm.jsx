import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

export function FeedingForm() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Log a feeding</CardTitle>
        <CardDescription>Placeholder fields for a future feeding form (client-side only).</CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4 sm:flex-row sm:items-end">
        <div className="grid w-full max-w-sm gap-2">
          <label className="text-sm font-medium" htmlFor="feeding-time">
            Time
          </label>
          <Input id="feeding-time" type="time" disabled aria-disabled />
        </div>
        <Button type="button" disabled>
          Save (coming soon)
        </Button>
      </CardContent>
    </Card>
  );
}
