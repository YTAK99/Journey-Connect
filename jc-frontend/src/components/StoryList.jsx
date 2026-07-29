import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { getApiErrorMessage } from "../services/apiClient";
import { getFeed, getFeedItems } from "../services/postApi";
import useLangStore from "../store/useLangStore";
import { getLocalizedRegionName, matchesSelectedRegion } from "../utils/region";

const fallbackImage = "/ex_1.jpg";

export default function StoryList({ selectedRegion }) {
  const { currentLang } = useLangStore();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [error, setError] = useState("");

  // 별도 스토리 데이터가 아니라 최신 게시글을 받아 현재 선택 지역의 원형 미리보기로 재사용합니다.
  useEffect(() => {
    let active = true;

    getFeed({ size: 100 })
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

  const visibleStories = stories.filter((story) => matchesSelectedRegion(story, selectedRegion));

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
          const region = getLocalizedRegionName(story, currentLang);

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
