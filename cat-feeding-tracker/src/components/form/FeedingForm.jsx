import * as React from "react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";

const selectTriggerClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

const emptyErrors = {
  fedAt: "",
  foodGiven: "",
  foodReceived: "",
  likedAmount: "",
};

export function FeedingForm({ onSubmit }) {
  const [fedAt, setFedAt] = React.useState("");
  const [foodGiven, setFoodGiven] = React.useState("");
  const [foodReceived, setFoodReceived] = React.useState("");
  const [likedAmount, setLikedAmount] = React.useState("");
  const [errors, setErrors] = React.useState(emptyErrors);

  function validate() {
    const next = { ...emptyErrors };
    let valid = true;

    if (!fedAt.trim()) {
      next.fedAt = "Feeding date and time is required.";
      valid = false;
    }
    if (!foodGiven.trim()) {
      next.foodGiven = "Food given is required.";
      valid = false;
    }
    if (!foodReceived.trim()) {
      next.foodReceived = "Food the cat got is required.";
      valid = false;
    }
    if (!likedAmount) {
      next.likedAmount = "How much she liked it is required.";
      valid = false;
    }

    setErrors(next);
    return valid;
  }

  function handleSubmit(event) {
    event.preventDefault();
    if (!validate()) return;

    const entry = {
      fedAt: new Date(fedAt).toISOString(),
      foodGiven: foodGiven.trim(),
      foodReceived: foodReceived.trim(),
      likedAmount: Number(likedAmount),
    };

    onSubmit?.(entry);
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log a feeding</CardTitle>
        <CardDescription>Record when your cat was fed, what was offered, what she ate, and how she liked it.</CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-4">
          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="feeding-datetime">
              Feeding date &amp; time
            </label>
            <Input
              id="feeding-datetime"
              type="datetime-local"
              value={fedAt}
              onChange={(e) => setFedAt(e.target.value)}
              aria-invalid={Boolean(errors.fedAt)}
              aria-describedby={errors.fedAt ? "feeding-datetime-error" : undefined}
            />
            {errors.fedAt ? (
              <p id="feeding-datetime-error" className="text-sm font-medium text-destructive" role="alert">
                {errors.fedAt}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="feeding-food-given">
              Food given
            </label>
            <Input
              id="feeding-food-given"
              type="text"
              autoComplete="off"
              placeholder="e.g. wet food, kibble brand"
              value={foodGiven}
              onChange={(e) => setFoodGiven(e.target.value)}
              aria-invalid={Boolean(errors.foodGiven)}
              aria-describedby={errors.foodGiven ? "feeding-food-given-error" : undefined}
            />
            {errors.foodGiven ? (
              <p id="feeding-food-given-error" className="text-sm font-medium text-destructive" role="alert">
                {errors.foodGiven}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="feeding-food-received">
              Food the cat got
            </label>
            <Input
              id="feeding-food-received"
              type="text"
              autoComplete="off"
              placeholder="What she actually ate"
              value={foodReceived}
              onChange={(e) => setFoodReceived(e.target.value)}
              aria-invalid={Boolean(errors.foodReceived)}
              aria-describedby={errors.foodReceived ? "feeding-food-received-error" : undefined}
            />
            {errors.foodReceived ? (
              <p id="feeding-food-received-error" className="text-sm font-medium text-destructive" role="alert">
                {errors.foodReceived}
              </p>
            ) : null}
          </div>

          <div className="grid gap-2">
            <label className="text-sm font-medium leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70" htmlFor="feeding-liked">
              How much she liked it
            </label>
            <select
              id="feeding-liked"
              className={selectTriggerClass}
              value={likedAmount}
              onChange={(e) => setLikedAmount(e.target.value)}
              aria-invalid={Boolean(errors.likedAmount)}
              aria-describedby={errors.likedAmount ? "feeding-liked-error" : undefined}
            >
              <option value="">Choose a level</option>
              <option value="1">1 — Refused / disliked</option>
              <option value="2">2 — Picked at it</option>
              <option value="3">3 — Ate some</option>
              <option value="4">4 — Enjoyed it</option>
              <option value="5">5 — Loved it</option>
            </select>
            {errors.likedAmount ? (
              <p id="feeding-liked-error" className="text-sm font-medium text-destructive" role="alert">
                {errors.likedAmount}
              </p>
            ) : null}
          </div>

          <Button type="submit">Save</Button>
        </form>
      </CardContent>
    </Card>
  );
}
