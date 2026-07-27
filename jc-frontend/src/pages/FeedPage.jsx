import FeedCard from "../components/FeedCard";
import LocationWeather from "../components/LocationWeather";
import StoryList from "../components/StoryList";
import useRegionStore from "../store/useRegionStore";
import { useSearchParams } from "react-router-dom";

export default function FeedPage() {
  const [searchParams] = useSearchParams();
  const { selectedRegion, setSelectedRegion } = useRegionStore();
  const keyword = (searchParams.get("q") || "").trim();

  return (
    <main className="min-h-screen bg-sky-50 dark:bg-slate-950">
      <div className="pt-20 pb-4">
        <section className="mx-auto max-w-screen-xl space-y-2 bg-white px-6 py-3 dark:bg-slate-900">
          <LocationWeather selectedRegion={selectedRegion} onRegionChange={setSelectedRegion} />
          <StoryList />
        </section>

        <section className="mx-auto max-w-screen-xl px-4 pt-3">
          <FeedCard selectedRegion={selectedRegion} keyword={keyword} />
        </section>
      </div>
    </main>
  );
}
