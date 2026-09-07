export const CREW_CATEGORIES = [
  { value: "FOOD", ko: "맛집", en: "Food" },
  { value: "CAFE", ko: "카페·디저트", en: "Cafe" },
  { value: "ATTRACTION", ko: "명소", en: "Attractions" },
  { value: "NATURE", ko: "자연·힐링", en: "Nature" },
  { value: "CULTURE", ko: "문화·역사", en: "Culture" },
  { value: "FESTIVAL", ko: "축제·이벤트", en: "Festivals" },
  { value: "SHOPPING", ko: "쇼핑", en: "Shopping" },
  { value: "ACTIVITY", ko: "액티비티", en: "Activities" },
  { value: "SPORTS", ko: "스포츠·레저", en: "Sports" },
  { value: "WALKING", ko: "산책·트레킹", en: "Walking" },
  { value: "PHOTO", ko: "사진", en: "Photography" },
  { value: "STAY", ko: "숙박", en: "Stay" },
  { value: "DRIVE", ko: "드라이브", en: "Drive" },
  { value: "TRAVEL_MATE", ko: "여행메이트", en: "Travel mates" },
  { value: "OTHER", ko: "기타", en: "Other" },
];

export const crewCategoryLabel = (value, lang = "ko") =>
  CREW_CATEGORIES.find((category) => category.value === value)?.[lang] ||
  (lang === "ko" ? "기타" : "Other");

export const crewStatusLabel = (status, lang = "ko") => {
  const labels = {
    OWNER: { ko: "내가 만든 크루", en: "My crew" },
    APPROVED: { ko: "참여 중", en: "Joined" },
    PENDING: { ko: "승인 대기", en: "Pending" },
    REJECTED: { ko: "신청 거절", en: "Rejected" },
    CANCELLED: { ko: "참여 취소", en: "Cancelled" },
    KICKED: { ko: "참여 종료", en: "Removed" },
  };
  return labels[status]?.[lang] || status;
};

export const DEFAULT_CREW_IMAGE = "/home_img_1.png";

export const getStableCrewColor = (value) => {
  const hash = String(value ?? "journey").split("").reduce(
    (result, character) => ((result * 31) + character.charCodeAt(0)) >>> 0,
    0,
  );
  const hue = Math.round((hash * 137.508) % 360);
  return `hsl(${hue} 62% 72%)`;
};
