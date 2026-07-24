import FeedCard from "../components/FeedCard";
import LocationWeather from "../components/LocationWeather";
import StoryList from "../components/StoryList";
import useRegionStore from "../store/useRegionStore";

export default function FeedPage() {
  const { selectedRegion, setSelectedRegion } = useRegionStore();

  return (
    <main className="min-h-screen bg-sky-50">
      <div className="pt-24 pb-6">
        <section className="mx-auto max-w-screen-xl space-y-4 bg-white px-6 py-5">
          <LocationWeather selectedRegion={selectedRegion} onRegionChange={setSelectedRegion} />
          <StoryList />
        </section>

        <section className="mx-auto max-w-screen-xl px-4 pt-6">
          <FeedCard selectedRegion={selectedRegion} />
        </section>
      </div>
    </main>
  );
}
