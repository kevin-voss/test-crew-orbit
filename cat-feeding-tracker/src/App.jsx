import { FeedingForm } from "@/components/form/FeedingForm";
import { FeedingHistory } from "@/components/history/FeedingHistory";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { useFeedingRecords } from "@/context/FeedingRecordsContext";

export default function App() {
  const { entries, addFeedingRecord } = useFeedingRecords();

  return (
    <div className="cat-feeding-app-shell mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 lg:gap-10 lg:px-8">
      <header className="shrink-0" role="banner">
        <Card className="overflow-hidden">
          <PageHeader />
        </Card>
      </header>

      <main
        id="cat-feeding-main"
        className="grid min-w-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start lg:gap-10"
        aria-labelledby="cat-feeding-page-heading"
      >
        <section
          aria-label="Add a new feeding"
          className="feeding-entry-section min-w-0"
        >
          <FeedingForm onSubmit={addFeedingRecord} />
        </section>

        <section
          aria-label="Review saved feeding history"
          className="feeding-history-section min-w-0"
        >
          <FeedingHistory entries={entries} />
        </section>
      </main>
    </div>
  );
}
