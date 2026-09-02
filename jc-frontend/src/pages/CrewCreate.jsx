import { useState } from "react";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { useNavigate } from "react-router";

function CrewCreate() {
  const navigate = useNavigate();

  const [title, setTitle] = useState("");
  const [region, setRegion] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [date, setDate] = useState("");
  const [maxMembers, setMaxMembers] = useState(8);
  const [image, setImage] = useState("");

  // 이미지 선택
  const handleImage = (event) => {
    const file = event.target.files?.[0];

    if (!file) return;

    if (!file.type.startsWith("image/")) {
      alert("이미지 파일만 선택해주세요.");
      return;
    }

    const reader = new FileReader();

    reader.onload = () => {
      setImage(reader.result);
    };

    reader.readAsDataURL(file);
  };

  // 크루 생성
  const handleSubmit = (event) => {
    event.preventDefault();

    if (!title.trim()) {
      alert("크루 제목을 입력해주세요.");
      return;
    }

    if (!region.trim()) {
      alert("여행 지역을 입력해주세요.");
      return;
    }

    if (!description.trim()) {
      alert("여행 경로를 입력해주세요.");
      return;
    }

    if (!date) {
      alert("여행 날짜를 선택해주세요.");
      return;
    }

    const parsedMembers = Number(maxMembers);
    if (isNaN(parsedMembers) || parsedMembers < 2) {
      alert("모집 인원은 최소 2명 이상이어야 합니다.");
      return;
    }

    let existingCrews = [];
    try {
      existingCrews = JSON.parse(localStorage.getItem("crews") || "[]");
    } catch (e) {
      console.error("Failed to parse crews from localStorage", e);
      existingCrews = [];
    }

    const newCrew = {
      id: Date.now(),
      title: title.trim(),
      region: region.trim(),
      description: description.trim(),
      tags: tags
        .split(",")
        .map((tag) => tag.trim())
        .filter(Boolean),
      date,
      maxMembers: parsedMembers,
      currentMembers: 1,
      image:
        image ||
        "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?auto=format&fit=crop&w=1000&q=80",
    };

    try {
      localStorage.setItem(
        "crews",
        JSON.stringify([newCrew, ...existingCrews])
      );
      alert("크루가 생성되었습니다!");
navigate("/crew");
    } catch (error) {
      alert("저장 공간이 부족하여 크루를 생성할 수 없습니다. 더 적은 용량의 이미지를 사용해 주세요.");
    }
  };

  return (
    <div className="min-h-screen bg-[#eef9ff]">
      <div className="mx-auto max-w-5xl px-6 py-8">
        <button
          type="button"
          onClick={() => navigate("/crew")}
          className="mb-6 flex items-center gap-2 text-sm font-medium text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft size={20} />
          크루 목록으로
        </button>

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">크루 만들기</h1>

          <p className="mt-2 text-sm text-gray-500">
            함께 여행하고 싶은 사람들을 모집해보세요.
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-6">
            {/* 대표 이미지 */}
            <div>
              <label className="text-sm font-semibold text-gray-800">
                대표 사진
              </label>

              <div className="mt-2">
                <label
                  htmlFor="crew-image"
                  className="flex h-52 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
                >
                  {image ? (
                    <img
                      src={image}
                      alt="크루 대표 이미지"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <ImagePlus size={40} className="mx-auto mb-2" />
                      <p className="text-sm">사진을 선택해주세요</p>
                    </div>
                  )}
                </label>

                <input
                  id="crew-image"
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  className="hidden"
                />
              </div>
            </div>

            {/* 지역 */}
            <div>
              <label
                htmlFor="crew-region"
                className="text-sm font-semibold text-gray-800"
              >
                여행 지역
              </label>

              <input
                id="crew-region"
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder="예: 서울, 제주, 도쿄"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-teal-500"
              />
            </div>

            {/* 제목 */}
            <div>
              <label
                htmlFor="crew-title"
                className="text-sm font-semibold text-gray-800"
              >
                크루 제목
              </label>

              <input
                id="crew-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="예: 7월 서울 성수동 빈티지 투어 같이 해요"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-teal-500"
              />
            </div>

            {/* 여행 경로 */}
            <div>
              <label
                htmlFor="crew-description"
                className="text-sm font-semibold text-gray-800"
              >
                여행 경로 / 소개
              </label>

              <textarea
                id="crew-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="어디를 여행할 예정인지 간단하게 적어주세요."
                rows={5}
                className="mt-2 w-full resize-none rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-teal-500"
              />
            </div>

            {/* 태그 */}
            <div>
              <label
                htmlFor="crew-tags"
                className="text-sm font-semibold text-gray-800"
              >
                태그
              </label>

              <input
                id="crew-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="예: 성수동, 빈티지, 카페"
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-teal-500"
              />

              <p className="mt-1 text-xs text-gray-400">
                태그는 쉼표(,)로 구분해주세요.
              </p>
            </div>

            {/* 날짜 + 인원 */}
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label
                  htmlFor="crew-date"
                  className="text-sm font-semibold text-gray-800"
                >
                  여행 날짜
                </label>

                <input
                  id="crew-date"
                  type="date"
                  value={date}
                  onChange={(e) => setDate(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-teal-500"
                />
              </div>

              <div>
                <label
                  htmlFor="crew-members"
                  className="text-sm font-semibold text-gray-800"
                >
                  모집 인원
                </label>

                <input
                  id="crew-members"
                  type="number"
                  min="2"
                  max="50"
                  value={maxMembers}
                  onChange={(e) => setMaxMembers(e.target.value)}
                  className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-teal-500"
                />
              </div>
            </div>

            {/* 버튼 */}
            <div className="flex gap-3 pt-4">
              <button
                type="button"
                onClick={() => navigate("/crew")}
                className="flex-1 rounded-xl border border-gray-300 py-3 font-semibold text-gray-700 hover:bg-gray-50"
              >
                취소
              </button>

              <button
                type="submit"
                className="flex-1 rounded-xl bg-[#16b8aa] py-3 font-semibold text-white hover:bg-[#12a99c]"
              >
                크루 만들기
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CrewCreate;