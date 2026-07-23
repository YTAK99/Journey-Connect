import Header from "../components/Header";
import LocationWeather from "../components/LocationWeather";
import SearchCard from "../components/SearchCard";

export default function SearchPage() {
    return (
        <div className="min-h-screen bg-sky-50">
            <Header />

            <div className="pt-24 pb-6">

                <div className="max-w-screen-xl mx-auto px-6 py-5 bg-white border-gray-100 space-y-4">
                    <LocationWeather />

                </div>
                    <SearchCard />
            </div>
        </div>
    );
}