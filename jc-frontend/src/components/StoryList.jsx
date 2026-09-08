import { useEffect, useState } from "react";
import { Plus } from "lucide-react";
import { useNavigate } from "react-router";
import { getApiErrorMessage } from "../services/apiClient";
import { getFeed, getFeedItems } from "../services/postApi";
import { getLocalizedRegionName, matchesSelectedRegion } from "../utils/region";
import useTranslation from "../i18n/useTranslation";

const fallbackImage = "/ex_1.jpg";

export default function StoryList({ selectedRegion }) {
  const { currentLang, t } = useTranslation();
  const navigate = useNavigate();
  const [stories, setStories] = useState([]);
  const [error, setError] = useState("");

  const serverRegion = selectedRegion?.code || "";

  // 별도 스토리 데이터가 아니라 최신 게시글을 받아 현재 선택 지역의 원형 미리보기로 재사용합니다.
  useEffect(() => {
    let active = true;

    getFeed({ region: serverRegion || undefined, size: 20 })
      .then((feed) => {
        if (active) setStories(getFeedItems(feed));
      })
      .catch((requestError) => {
        if (active) setError(getApiErrorMessage(requestError, t("stories.loadFailed")));
      });

    return () => {
      active = false;
    };
  }, [serverRegion, t]);

  const visibleStories = serverRegion
    ? stories
    : stories.filter((story) => matchesSelectedRegion(story, selectedRegion));

  return (
    // 원형 썸네일과 상하 간격을 함께 줄여 스토리 영역의 세로 비율을 가볍게 만듭니다.
    <div className="w-full py-1">
      <div className="flex items-center gap-5 overflow-x-auto py-1">
        <button
          type="button"
          onClick={() => navigate("/write")}
          className="group flex shrink-0 cursor-pointer flex-col items-center"
        >
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-teal-400 bg-teal-50 transition group-hover:bg-teal-100 dark:border-teal-600 dark:bg-teal-950/40 dark:group-hover:bg-teal-900/60">
            <Plus size={22} className="text-teal-500 dark:text-teal-300" />
          </span>
          <span className="mt-1.5 text-xs text-gray-600 dark:text-slate-300">{t("stories.post")}</span>
        </button>

        {visibleStories.map((story) => {
          const region = getLocalizedRegionName(story, currentLang);

          return (
            <button
              key={story.id}
              type="button"
              onClick={() => navigate(`/post/${story.id}`)}
              className="group flex shrink-0 cursor-pointer flex-col items-center"
            >
              <span className="h-14 w-14 overflow-hidden rounded-full border-2 border-teal-500 p-0.5 dark:border-teal-300">
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
              <span className="mt-1.5 max-w-[62px] truncate text-center text-xs text-gray-700 dark:text-slate-200">{region}</span>
            </button>
          );
        })}

        {!error && stories.length > 0 && visibleStories.length === 0 && (
          <p className="shrink-0 text-xs text-gray-500 dark:text-slate-400">{t("stories.emptyRegion")}</p>
        )}
        {error && <p className="shrink-0 text-xs text-red-500 dark:text-red-400">{error}</p>}
      </div>
    </div>
  );
}
