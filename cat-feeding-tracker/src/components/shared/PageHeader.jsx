import { CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export function PageHeader() {
  return (
    <CardHeader className="px-0 pt-0">
      <CardTitle>Cat feeding tracker</CardTitle>
      <CardDescription>
        Log meals in the browser only — no server or sync. Form and history sections below are ready for
        follow-up features.
      </CardDescription>
    </CardHeader>
  );
}
