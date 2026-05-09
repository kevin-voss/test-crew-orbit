import { FeedingForm } from "@/components/form/FeedingForm";
import { FeedingHistory } from "@/components/history/FeedingHistory";
import { PageHeader } from "@/components/shared/PageHeader";
import { useFeedingRecords } from "@/context/FeedingRecordsContext";

export default function App() {
  const { entries, addFeedingRecord } = useFeedingRecords();

  return (
    <div className="mx-auto flex min-h-screen max-w-3xl flex-col gap-8 p-6">
      <PageHeader />
      <main className="flex flex-col gap-6">
        <FeedingForm onSubmit={addFeedingRecord} />
        <FeedingHistory entries={entries} />
      </main>
    </div>
  );
}
