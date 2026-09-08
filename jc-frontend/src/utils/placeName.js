import { translate } from "../i18n";

// 상세 장소명을 우선하고, 없을 때만 상위 지역명과 순번 기반 이름을 사용합니다.
export const getPlaceName = (place, index, lang) => place.placeName
  || place.region?.localizedNames?.[lang]
  || place.region?.displayName
  || translate(lang, "routeMap.stop", { count: index + 1 });
