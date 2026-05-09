import { FeedingForm } from "@/components/form/FeedingForm";
import { FeedingHistory } from "@/components/history/FeedingHistory";
import { PageHeader } from "@/components/shared/PageHeader";
import { Card } from "@/components/ui/card";
import { useFeedingRecords } from "@/context/FeedingRecordsContext";

export default function App() {
  const { entries, addFeedingRecord } = useFeedingRecords();

  return (
    <div className="cat-feeding-app-shell min-h-screen bg-gradient-to-b from-muted/40 via-background to-background">
      <div className="mx-auto flex min-h-screen max-w-6xl flex-col gap-8 px-4 py-8 sm:px-6 sm:py-10 lg:gap-10 lg:px-8 lg:py-12">
        <header className="shrink-0" role="banner">
          <Card className="overflow-hidden shadow-sm">
            <PageHeader />
          </Card>
        </header>

        <main
          id="cat-feeding-main"
          className="grid min-w-0 flex-1 grid-cols-1 gap-8 lg:grid-cols-2 lg:items-start lg:gap-10 xl:gap-12"
          aria-labelledby="cat-feeding-page-heading"
        >
          <section
            id="add-feeding"
            aria-labelledby="add-feeding-section-title"
            className="feeding-entry-section scroll-mt-8 min-w-0 space-y-3"
          >
            <h2 id="add-feeding-section-title" className="sr-only">
              Add a new feeding
            </h2>
            <FeedingForm onSubmit={addFeedingRecord} />
          </section>

          <section
            id="feeding-history"
            aria-labelledby="feeding-history-section-title"
            className="feeding-history-section scroll-mt-8 min-w-0 space-y-3 lg:sticky lg:top-8 lg:self-start"
          >
            <h2 id="feeding-history-section-title" className="sr-only">
              Review saved feeding history
            </h2>
            <FeedingHistory entries={entries} />
          </section>
        </main>
      </div>
    </div>
  );
}
