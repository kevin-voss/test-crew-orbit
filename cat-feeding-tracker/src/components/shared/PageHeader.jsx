import { CardDescription, CardHeader } from "@/components/ui/card";

export function PageHeader() {
  return (
    <CardHeader>
      <h1 id="cat-feeding-page-heading" className="text-2xl font-semibold tracking-tight md:text-3xl">
        Cat feeding tracker
      </h1>
      <CardDescription className="max-w-2xl text-base leading-relaxed">
        Log meals in the browser only — no server or sync. Use the form to add a feeding, then review saved
        entries in the history panel (on wide screens the form and history appear side by side).
      </CardDescription>
    </CardHeader>
  );
}
