import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { createFeedingRecord } from "@/state/feedingRecords";

const selectTriggerClass = cn(
  "flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background",
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2",
  "disabled:cursor-not-allowed disabled:opacity-50",
);

const feedingFormSchema = z.object({
  fedAt: z.string().min(1, "Feeding date and time is required."),
  foodGiven: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, "Food given is required.")),
  foodReceived: z
    .string()
    .transform((v) => v.trim())
    .pipe(z.string().min(1, "Food the cat got is required.")),
  likedAmount: z
    .string()
    .min(1, "How much she liked it is required.")
    .regex(/^[1-5]$/, "Choose a level from 1 to 5."),
});

export function FeedingForm({ onSubmit }) {
  const form = useForm({
    resolver: zodResolver(feedingFormSchema),
    defaultValues: {
      fedAt: "",
      foodGiven: "",
      foodReceived: "",
      likedAmount: "",
    },
    mode: "onSubmit",
  });

  function handleValidSubmit(values) {
    onSubmit?.(createFeedingRecord(values));
    form.reset();
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Log a feeding</CardTitle>
        <CardDescription>Record when your cat was fed, what was offered, what she ate, and how she liked it.</CardDescription>
      </CardHeader>
      <CardContent>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(handleValidSubmit)} noValidate className="flex flex-col gap-4">
            <FormField
              control={form.control}
              name="fedAt"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Feeding date &amp; time</FormLabel>
                  <FormControl>
                    <Input type="datetime-local" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="foodGiven"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Food given</FormLabel>
                  <FormControl>
                    <Input type="text" autoComplete="off" placeholder="e.g. wet food, kibble brand" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="foodReceived"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Food the cat got</FormLabel>
                  <FormControl>
                    <Input type="text" autoComplete="off" placeholder="What she actually ate" {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="likedAmount"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>How much she liked it</FormLabel>
                  <FormControl>
                    <select className={selectTriggerClass} {...field}>
                      <option value="">Choose a level</option>
                      <option value="1">1 — Refused / disliked</option>
                      <option value="2">2 — Picked at it</option>
                      <option value="3">3 — Ate some</option>
                      <option value="4">4 — Enjoyed it</option>
                      <option value="5">5 — Loved it</option>
                    </select>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Button type="submit">Save</Button>
          </form>
        </Form>
      </CardContent>
    </Card>
  );
}
