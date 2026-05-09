import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { CardDescription, CardHeader } from "@/components/ui/card";

export function PageHeader() {
  return (
    <CardHeader className="space-y-0 pb-6">
      <div className="min-w-0 space-y-3">
        <div className="flex flex-wrap items-center gap-2">
          <h1
            id="cat-feeding-page-heading"
            className="text-2xl font-semibold tracking-tight text-foreground md:text-3xl"
          >
            Cat feeding tracker
          </h1>
          <Badge variant="secondary" className="hidden font-normal sm:inline-flex">
            Browser only
          </Badge>
        </div>
        <CardDescription className="max-w-2xl text-base leading-relaxed">
          Log a feeding with the form, then review saved entries in the history panel. On wider screens the two
          line up side by side; everything stays in this tab with no sign-in or sync.
        </CardDescription>
        <div className="flex flex-wrap gap-2 pt-1" aria-label="Jump to sections">
          <Button variant="outline" size="sm" asChild>
            <a href="#add-feeding">Add a feeding</a>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <a href="#feeding-history">Review history</a>
          </Button>
        </div>
      </div>
    </CardHeader>
  );
}
