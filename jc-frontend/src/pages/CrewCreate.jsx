import { useState } from "react";
import { ArrowLeft, ImagePlus } from "lucide-react";
import { useNavigate } from "react-router";
import useTranslation from "../i18n/useTranslation";

function CrewCreate() {
  const navigate = useNavigate();
  const { t } = useTranslation();

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
      alert(t("crewCreate.imageOnly"));
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
      alert(t("crewCreate.titleRequired"));
      return;
    }

    if (!region.trim()) {
      alert(t("crewCreate.regionRequired"));
      return;
    }

    if (!description.trim()) {
      alert(t("crewCreate.routeRequired"));
      return;
    }

    if (!date) {
      alert(t("crewCreate.dateRequired"));
      return;
    }

    const parsedMembers = Number(maxMembers);
    if (Number.isNaN(parsedMembers) || parsedMembers < 2 || parsedMembers > 20) {
      alert(t("crewCreate.membersInvalid"));
      return;
    }

    let existingCrews = [];
    try {
      existingCrews = JSON.parse(localStorage.getItem("crews") || "[]");
    } catch (e) {
      console.error("Failed to parse crews from localStorage", e);
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
      alert(t("crewCreate.created"));
      navigate("/crew");
    } catch {
      alert(t("crewCreate.storageFailed"));
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
          {t("crewCreate.back")}
        </button>

        <div className="rounded-2xl bg-white p-8 shadow-sm">
          <h1 className="text-2xl font-bold text-gray-900">{t("crewCreate.title")}</h1>

          <p className="mt-2 text-sm text-gray-500">
            {t("crewCreate.description")}
          </p>

          <form onSubmit={handleSubmit} noValidate className="mt-8 space-y-6">
            {/* 대표 이미지 */}
            <div>
              <label className="text-sm font-semibold text-gray-800">
                {t("crewCreate.image")}
              </label>

              <div className="mt-2">
                <label
                  htmlFor="crew-image"
                  className="flex h-52 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 hover:bg-gray-100"
                >
                  {image ? (
                    <img
                      src={image}
                      alt={t("crewCreate.imageAlt")}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="text-center text-gray-400">
                      <ImagePlus size={40} className="mx-auto mb-2" />
                      <p className="text-sm">{t("crewCreate.chooseImage")}</p>
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
                {t("crewCreate.region")}
              </label>

              <input
                id="crew-region"
                type="text"
                value={region}
                onChange={(e) => setRegion(e.target.value)}
                placeholder={t("crewCreate.regionPlaceholder")}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-teal-500"
              />
            </div>

            {/* 제목 */}
            <div>
              <label
                htmlFor="crew-title"
                className="text-sm font-semibold text-gray-800"
              >
                {t("crewCreate.crewTitle")}
              </label>

              <input
                id="crew-title"
                type="text"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder={t("crewCreate.titlePlaceholder")}
                className="mt-2 w-full rounded-xl border border-gray-300 px-4 py-3 text-sm outline-none focus:border-teal-500"
              />
            </div>

            {/* 여행 경로 */}
            <div>
              <label
                htmlFor="crew-description"
                className="text-sm font-semibold text-gray-800"
              >
                {t("crewCreate.route")}
              </label>

              <textarea
                id="crew-description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder={t("crewCreate.routePlaceholder")}
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
                {t("crewCreate.tags")}
              </label>

              <input
                id="crew-tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder={t("crewCreate.tagsPlaceholder")}
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
                  {t("crewCreate.date")}
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
                  {t("crewCreate.members")}
                </label>

                <input
                  id="crew-members"
                  type="number"
                  min="2"
                  max="20"
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
                {t("crewCreate.cancel")}
              </button>

              <button
                type="submit"
                className="flex-1 rounded-xl bg-[#16b8aa] py-3 font-semibold text-white hover:bg-[#12a99c]"
              >
                {t("crewCreate.submit")}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}

export default CrewCreate;
