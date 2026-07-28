import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { getApiErrorMessage } from "../services/apiClient";
import { getFeed, getFeedItems } from "../services/postApi";
import useLangStore from "../store/useLangStore";

const fallbackImage = "/ex_1.jpg";

const matchesRegion = (story, selectedRegion) => {
  if (!selectedRegion) return true;
  if (story.regionCode && story.regionCode.toLowerCase() === selectedRegion.id?.toLowerCase()) return true;

  const storyRegion = String(story.regionName || story.region?.name || "").toLowerCase().replace(/\s/g, "");
  if (!storyRegion) return false;
  const selectedNames = [selectedRegion.label?.ko, selectedRegion.label?.en]
    .filter(Boolean)
    .map((name) => String(name).toLowerCase().replace(/\s/g, ""));

  return selectedNames.some((name) => storyRegion.includes(name) || name.includes(storyRegion));
};

export default function StoryList({ selectedRegion }) {
  const { currentLang } = useLangStore();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let active = true;

    getFeed({ size: 20 })
      .then((feed) => {
        if (active) setStories(getFeedItems(feed));
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, "스토리를 불러오지 못했습니다."));
      });

    return () => {
      active = false;
    };
  }, []);

  const visibleStories = stories.filter((story) => matchesRegion(story, selectedRegion));

  return (
    // 원형 썸네일과 상하 간격을 함께 줄여 스토리 영역의 세로 비율을 가볍게 만듭니다.
    <div className="w-full py-1">
      <div className="flex items-center gap-5 overflow-x-auto py-1">
        <button
          type="button"
          onClick={() => navigate("/write")}
          className="group flex shrink-0 cursor-pointer flex-col items-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-teal-400 bg-teal-50 transition group-hover:bg-teal-100">
            <Plus size={22} className="text-teal-500" />
          </span>
          <span className="mt-1.5 text-xs text-gray-600">{currentLang === "ko" ? "올리기" : "Post"}</span>
        </button>

        {visibleStories.map((story) => {
          const region = story.regionName || story.region?.name || "지역 미정";

          return (
            <button key={story.id} type="button" className="group flex shrink-0 cursor-pointer flex-col items-center">
              <span className="h-14 w-14 overflow-hidden rounded-full border-2 border-teal-500 p-0.5">
                <img
                  src={story.coverImageUrl || fallbackImage}
                  alt={region}
                  className="h-full w-full rounded-full object-cover transition duration-300 group-hover:scale-105"
                  onError={(event) => {
                    event.currentTarget.onerror = null;
                    event.currentTarget.src = fallbackImage;
                  }}
                />
              </span>
              <span className="mt-1.5 max-w-[62px] truncate text-center text-xs text-gray-700">{region}</span>
            </button>
          );
        })}

        {!error && stories.length > 0 && visibleStories.length === 0 && (
          <p className="shrink-0 text-xs text-gray-500">해당 지역의 스토리가 없습니다.</p>
        )}
        {error && <p className="shrink-0 text-xs text-red-500">{error}</p>}
      </div>
    </div>
  );
}
