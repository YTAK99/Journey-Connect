import { Plus } from "lucide-react";
import useLangStore from "../store/useLangStore";

const stories = [
  { id: 1, region: "서울", image: "https://images.unsplash.com/photo-1538485399081-7191377e8241?w=120&h=120&fit=crop" },
  { id: 2, region: "제주", image: "https://images.unsplash.com/photo-1578637387939-43c525550085?w=120&h=120&fit=crop" },
  { id: 3, region: "도쿄", image: "https://images.unsplash.com/photo-1503899036084-c55cdd92da26?w=120&h=120&fit=crop" },
  { id: 4, region: "부산", image: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?w=120&h=120&fit=crop" },
  { id: 5, region: "파리", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=120&h=120&fit=crop" },
  { id: 6, region: "발리", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=120&h=120&fit=crop" },
  { id: 7, region: "오사카", image: "https://images.unsplash.com/photo-1590523277543-a94d2e4eb00b?w=120&h=120&fit=crop" },
];

export default function StoryList() {
  const { currentLang } = useLangStore();

  return (
    // 원형 썸네일과 상하 간격을 함께 줄여 스토리 영역의 세로 비율을 가볍게 만듭니다.
    <div className="w-full py-1">
      <div className="flex items-center gap-5 overflow-x-auto py-1">
        <button type="button" className="group flex shrink-0 cursor-pointer flex-col items-center">
          <span className="flex h-14 w-14 items-center justify-center rounded-full border-2 border-dashed border-teal-400 bg-teal-50 transition group-hover:bg-teal-100">
            <Plus size={22} className="text-teal-500" />
          </span>
          <span className="mt-1.5 text-xs text-gray-600">{currentLang === "ko" ? "올리기" : "Post"}</span>
        </button>

        {stories.map((story) => (
          <button key={story.id} type="button" className="group flex shrink-0 cursor-pointer flex-col items-center">
            <span className="h-14 w-14 overflow-hidden rounded-full border-2 border-teal-500 p-0.5">
              <img
                src={story.image}
                alt={story.region}
                className="h-full w-full rounded-full object-cover transition duration-300 group-hover:scale-105"
              />
            </span>
            <span className="mt-1.5 max-w-[62px] truncate text-center text-xs text-gray-700">{story.region}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
