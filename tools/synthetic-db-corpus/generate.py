#!/usr/bin/env python3
from __future__ import annotations

import argparse
import hashlib
import json
import random
import re
from datetime import datetime, timedelta
from pathlib import Path

import legacy_generate as legacy

TARGET_REPOSITORY = "YTAK99/Journey-Connect"
TARGET_BRANCH = "develop"
TARGET_SCHEMA_COMMIT = "961f28bf445d0e38591ef60b15f8ac1e6a0cd768"
DEFAULT_ANCHOR = datetime(2026, 9, 1, 10, 0, 0)
CURRENT_CREW_STATUSES = {"OWNER", "PENDING", "APPROVED", "REJECTED", "CANCELLED"}
SCHEMA_PROFILE_TEAM_V23 = "team-v23"
SCHEMA_PROFILE_LOCAL_PRE_V19 = "local-pre-v19"
SCHEMA_PROFILES = (SCHEMA_PROFILE_TEAM_V23, SCHEMA_PROFILE_LOCAL_PRE_V19)
ANALYSIS_REPRESENTATIVE_LIMIT = 48
DEMO_NOTIFICATION_LIMIT = 32


# PRESENTATION_POST_CREW_DATASET_V2
PRESENTATION_DATASET_VERSION = "post-crew-v2"

# Stable named POIs for presentation data. Names match legacy.DS[*].places.
PRESENTATION_POIS = {
    "KR-SEOUL": {
        "성수": (37.5446, 127.0558), "서울숲": (37.5444, 127.0374),
        "연남": (37.5620, 126.9250), "망원": (37.5556, 126.9100),
        "을지로": (37.5660, 126.9910), "익선동": (37.5740, 126.9890),
        "한강": (37.5284, 126.9348), "북촌": (37.5826, 126.9830),
    },
    "KR-BUSAN": {
        "해운대": (35.1587, 129.1604), "광안리": (35.1532, 129.1187),
        "영도": (35.0912, 129.0684), "흰여울": (35.0787, 129.0438),
        "송정": (35.1786, 129.1997), "남포동": (35.0987, 129.0307),
    },
    "KR-JEJU": {
        "월정리": (33.5565, 126.7958), "성산": (33.4587, 126.9424),
        "애월": (33.4632, 126.3112), "협재": (33.3940, 126.2396),
        "세화": (33.5255, 126.8545), "오름": (33.4480, 126.7728),
    },
    "JP-TOKYO": {
        "시부야": (35.6595, 139.7005), "시모키타자와": (35.6616, 139.6681),
        "긴자": (35.6717, 139.7650), "아사쿠사": (35.7148, 139.7967),
        "키치죠지": (35.7033, 139.5797), "다이칸야마": (35.6481, 139.7031),
    },
    "JP-OSAKA": {
        "도톤보리": (34.6687, 135.5013), "우메다": (34.7055, 135.4983),
        "신세카이": (34.6525, 135.5063), "난바": (34.6663, 135.5019),
        "나카자키초": (34.7074, 135.5055), "오사카성": (34.6873, 135.5262),
    },
    "JP-KYOTO": {
        "기온": (35.0037, 135.7788), "아라시야마": (35.0094, 135.6668),
        "후시미이나리": (34.9671, 135.7727), "니시키시장": (35.0050, 135.7649),
        "철학의길": (35.0267, 135.7980),
    },
    "JP-FUKUOKA": {
        "텐진": (33.5903, 130.3980), "하카타": (33.5898, 130.4207),
        "오호리공원": (33.5860, 130.3764), "나카스": (33.5945, 130.4060),
        "다자이후": (33.5213, 130.5349),
    },
    "US-NYC": {
        "브루클린": (40.6782, -73.9442), "소호": (40.7233, -74.0030),
        "센트럴파크": (40.7829, -73.9654), "첼시": (40.7465, -74.0014),
        "덤보": (40.7033, -73.9888), "웨스트빌리지": (40.7358, -74.0036),
    },
    "US-LAX": {
        "산타모니카": (34.0195, -118.4912), "베니스비치": (33.9850, -118.4695),
        "그리피스": (34.1184, -118.3004), "실버레이크": (34.0869, -118.2702),
        "다운타운LA": (34.0407, -118.2468),
    },
    "US-SFO": {
        "피셔맨스워프": (37.8080, -122.4177), "미션": (37.7599, -122.4148),
        "골든게이트": (37.8199, -122.4783), "헤이즈밸리": (37.7764, -122.4242),
        "팰리스오브파인아츠": (37.8024, -122.4482),
    },
    "US-LAS": {
        "스트립": (36.1147, -115.1728), "벨라지오": (36.1126, -115.1767),
        "프리몬트": (36.1708, -115.1440), "레드락캐니언": (36.1355, -115.4272),
    },
    "US-HNL": {
        "와이키키": (21.2767, -157.8263), "다이아몬드헤드": (21.2620, -157.8057),
        "카일루아": (21.4022, -157.7394), "노스쇼어": (21.5939, -158.1034),
        "알라모아나": (21.2906, -157.8439),
    },
    "GU-GUM": {
        "투몬비치": (13.5143, 144.8059), "사랑의절벽": (13.5347, 144.8016),
        "리티디안": (13.6543, 144.8658), "아가나": (13.4757, 144.7489),
        "이나라한": (13.2737, 144.7485),
    },
    "TH-BKK": {
        "아리": (13.7796, 100.5440), "짜뚜짝": (13.7999, 100.5501),
        "차이나타운": (13.7390, 100.5094), "왓아룬": (13.7437, 100.4889),
        "통로": (13.7304, 100.5830), "아이콘시암": (13.7264, 100.5101),
    },
    "TW-TPE": {
        "시먼딩": (25.0421, 121.5078), "중산": (25.0521, 121.5202),
        "용캉제": (25.0333, 121.5299), "스린": (25.0950, 121.5246),
        "단수이": (25.1676, 121.4456), "다다오청": (25.0559, 121.5102),
    },
    "TW-KHH": {
        "보얼예술특구": (22.6209, 120.2817), "치진": (22.6122, 120.2693),
        "연지담": (22.6800, 120.2969), "류허야시장": (22.6324, 120.3015),
    },
    "FR-PAR": {
        "마레": (48.8590, 2.3622), "몽마르트": (48.8867, 2.3431),
        "생제르맹": (48.8539, 2.3337), "루브르": (48.8606, 2.3376),
        "에펠탑": (48.8584, 2.2945), "카날생마르탱": (48.8722, 2.3630),
    },
    "GB-LON": {
        "쇼디치": (51.5255, -0.0776), "소호": (51.5136, -0.1365),
        "노팅힐": (51.5094, -0.1986), "버러마켓": (51.5055, -0.0910),
        "사우스뱅크": (51.5076, -0.1110),
    },
    "CZ-PRG": {
        "구시가지": (50.0870, 14.4208), "카를교": (50.0865, 14.4114),
        "말라스트라나": (50.0870, 14.4040), "프라하성": (50.0909, 14.4005),
    },
    "ES-BCN": {
        "고딕지구": (41.3839, 2.1763), "사그라다파밀리아": (41.4036, 2.1744),
        "그라시아": (41.4002, 2.1560), "보케리아": (41.3817, 2.1717),
        "바르셀로네타": (41.3784, 2.1925),
    },
    "ES-MAD": {
        "말라사냐": (40.4261, -3.7039), "레티로": (40.4153, -3.6844),
        "라라티나": (40.4117, -3.7080), "프라도": (40.4138, -3.6921),
        "마요르광장": (40.4155, -3.7074),
    },
    "IT-ROM": {
        "트라스테베레": (41.8890, 12.4695), "콜로세움": (41.8902, 12.4922),
        "판테온": (41.8986, 12.4769), "보르게세": (41.9142, 12.4922),
        "나보나광장": (41.8992, 12.4731),
    },
    "IT-FLR": {
        "두오모": (43.7731, 11.2560), "우피치": (43.7678, 11.2553),
        "산타크로체": (43.7686, 11.2626), "미켈란젤로광장": (43.7629, 11.2650),
    },
    "IT-VCE": {
        "산마르코": (45.4342, 12.3388), "도르소두로": (45.4303, 12.3265),
        "리알토": (45.4380, 12.3358), "부라노": (45.4853, 12.4167),
        "무라노": (45.4570, 12.3530),
    },
}

_POST_TITLE_TEMPLATES = (
    "{first}에서 {last}까지, {d} {m} 하루 코스",
    "{first}·{second} 중심으로 걷는 {d} 하루",
    "{d}에서 천천히 즐긴 {m} 코스: {first}부터 {last}까지",
    "{first}에서 시작한 {d} 하루, 마지막은 {last}",
    "{d} {m} 여행에서 좋았던 {first} → {last} 동선",
    "{first}, {second}, {last}로 이어진 {d} 하루",
)

_POST_DETAIL_NOTES = (
    "사람이 몰리는 시간대를 조금 피해서 움직이니 사진을 남기기도 편했고, 중간중간 쉬어 갈 여유도 있었습니다.",
    "장소 수를 욕심내기보다 각 구간에 머무는 시간을 넉넉히 잡아서 이동 자체가 피곤하지 않았습니다.",
    "식사와 카페, 산책 시간을 한쪽에 몰지 않고 나눠 넣으니 하루 일정의 리듬이 훨씬 자연스러웠습니다.",
    "유명한 장소만 빠르게 훑기보다 주변 골목과 작은 가게까지 같이 보는 방식으로 동선을 잡았습니다.",
    "대중교통과 도보 이동을 섞어 계획해서 처음 가는 사람도 크게 헤매지 않고 따라가기 좋은 코스였습니다.",
)

_STOP_NOTES = (
    "주변을 바로 떠나기보다 천천히 한 바퀴 둘러보면 분위기를 느끼기 좋습니다.",
    "사진만 찍고 지나가기보다 근처 골목까지 같이 걸어보는 편이 이 장소의 매력을 더 잘 느낄 수 있었습니다.",
    "일정 사이에 잠깐 쉬어 가기 좋아서 다음 장소로 이동하기 전 호흡을 고르기 좋은 구간이었습니다.",
    "사람이 많은 중심 구간에서 조금만 벗어나도 한결 여유로운 분위기를 만날 수 있었습니다.",
)

_CREW_TITLE_TEMPLATES = (
    "{first}에서 {m} 같이 즐길 분 구해요",
    "{d} {m} 하루 동행, {first}에서 만나요",
    "{first} → {second} 소규모 {m} 크루",
    "{d}에서 천천히 걷고 먹는 하루, 같이 가실 분",
    "{first} 중심 {d} 하루 여행 멤버 모집",
)

_CREW_DETAIL_NOTES = (
    "일정을 빡빡하게 채우기보다 각 장소에서 충분히 머무는 쪽으로 진행하려고 합니다.",
    "사진을 많이 찍는 분도, 그냥 천천히 걷고 이야기하는 분도 부담 없이 참여할 수 있는 분위기를 생각하고 있습니다.",
    "처음 만나는 분들이 있는 만큼 무리한 일정 없이 식사와 휴식 시간을 넉넉하게 잡을 예정입니다.",
    "정해진 코스는 있지만 현장 분위기와 참여자 의견에 따라 한두 곳 정도는 유연하게 조정할 수 있습니다.",
)


def _presentation_rng(batch_id: str, key: str) -> random.Random:
    digest = hashlib.sha256(
        f"{batch_id}:{key}:{PRESENTATION_DATASET_VERSION}".encode("utf-8")
    ).hexdigest()
    return random.Random(int(digest[:16], 16))


def _presentation_catalog(destination) -> list[tuple[str, float, float]]:
    expected = destination.places.split("|")
    catalog = PRESENTATION_POIS.get(destination.code)
    if not catalog:
        raise ValueError(f"missing presentation POI catalog for {destination.code}")
    missing = [name for name in expected if name not in catalog]
    if missing:
        raise ValueError(f"missing presentation POIs for {destination.code}: {missing}")
    return [(name, catalog[name][0], catalog[name][1]) for name in expected]


def _extract_mood(post: dict) -> str:
    for tag in post.get("tags") or []:
        if tag in legacy.MOODS:
            return tag
    return "여행"


def _route_stop_content(
    destination,
    stop_name: str,
    next_name: str | None,
    mood: str,
    rng: random.Random,
) -> str:
    transition = (
        f"여기서 충분히 둘러본 뒤 다음 목적지인 {next_name}로 이동했습니다."
        if next_name
        else f"마지막 일정은 {stop_name}에서 여유 있게 마무리했습니다."
    )
    return (
        f"{destination.ko} {stop_name}에서는 {mood} 분위기를 느끼면서 주변을 천천히 둘러봤습니다. "
        f"{rng.choice(_STOP_NOTES)} "
        f"{transition}"
    )


def _enrich_presentation_posts(posts: list[dict], batch_id: str) -> None:
    for post in posts:
        destination = _destination(post["region_code"])
        catalog = _presentation_catalog(destination)
        rng = _presentation_rng(batch_id, post["key"])
        max_stops = min(5, len(catalog))
        stop_count = rng.choices(
            list(range(2, max_stops + 1)),
            weights=[18, 34, 30, 18][: max_stops - 1],
            k=1,
        )[0]
        selected = rng.sample(catalog, stop_count)
        mood = _extract_mood(post)

        start_minutes = rng.choice((510, 540, 570, 600))
        step_minutes = rng.choice((90, 100, 110, 120))
        route_stops = []
        for index, (name, lat, lon) in enumerate(selected, start=1):
            minutes = start_minutes + (index - 1) * step_minutes
            next_name = selected[index][0] if index < len(selected) else None
            route_stops.append(
                {
                    "order": index,
                    "place": name,
                    "time": f"{(minutes // 60) % 24:02d}:{minutes % 60:02d}",
                    "lat": lat,
                    "lon": lon,
                    "content": _route_stop_content(
                        destination, name, next_name, mood, rng
                    ),
                }
            )

        names = [stop["place"] for stop in route_stops]
        first, second, last = names[0], names[1], names[-1]
        middle = names[len(names) // 2]
        route_text = " → ".join(names)

        post["place"] = first
        post["route_stops"] = route_stops
        post["title"] = rng.choice(_POST_TITLE_TEMPLATES).format(
            first=first, second=second, last=last, d=destination.ko, m=mood
        )[:120]
        post["content"] = (
            f"{destination.ko}에서 {mood}을 중심으로 하루 동선을 짰습니다. "
            f"첫 일정은 {first}에서 시작해서 {route_text} 순서로 이동했습니다. "
            f"{rng.choice(_POST_DETAIL_NOTES)} "
            f"특히 {middle}에서는 예상보다 오래 머물렀는데, 주변을 천천히 둘러볼수록 분위기가 좋아서 일정에 여유를 둔 게 잘한 선택이었습니다. "
            f"마지막 {last}에서는 다음 이동을 서두르지 않고 풍경과 주변 분위기를 즐기면서 하루를 정리했습니다. "
            f"처음 {destination.ko}을 찾는 분이라면 장소를 많이 넣기보다 이 정도 동선으로 시작하면 이동 부담과 구경하는 재미의 균형이 좋습니다."
        )


def _enrich_presentation_crews(crews: list[dict], batch_id: str) -> None:
    for crew in crews:
        destination = _destination(crew["region_code"])
        catalog = _presentation_catalog(destination)
        rng = _presentation_rng(batch_id, crew["key"])
        first, second = rng.sample(catalog, 2)
        mood = next(
            (
                tag
                for tag in crew.get("tags") or []
                if tag in {"산책", "사진", "맛집", "카페", "야경", "쇼핑"}
            ),
            "여행",
        )
        approved = sum(
            1 for member in crew["members"] if member["status"] == "APPROVED"
        )
        pending = sum(
            1 for member in crew["members"] if member["status"] == "PENDING"
        )
        review_text = (
            "참여 신청은 간단히 확인한 뒤 승인하는 방식입니다."
            if crew.get("approval_required")
            else "신청 후 바로 참여할 수 있도록 열어둔 크루입니다."
        )
        recruiting_text = (
            f"현재 승인된 멤버는 {approved}명이고 추가 인원을 모집하고 있습니다."
            if crew.get("recruiting")
            else f"현재 승인된 멤버 {approved}명으로 모집을 마감한 상태입니다."
        )
        if pending:
            recruiting_text += f" 확인 대기 중인 신청도 {pending}건 있습니다."

        crew["title"] = rng.choice(_CREW_TITLE_TEMPLATES).format(
            first=first[0], second=second[0], d=destination.ko, m=mood
        )[:120]
        crew["description"] = (
            f"{crew['travel_date']}에 {destination.ko} {first[0]}에서 만나 {second[0]}까지 함께 이동하는 {mood} 중심 소규모 크루입니다. "
            f"{rng.choice(_CREW_DETAIL_NOTES)} "
            f"{review_text} {recruiting_text} "
            f"전체 정원은 {crew['capacity']}명이며, 서로의 여행 속도를 존중하면서 편하게 하루를 보내는 것을 가장 중요하게 생각합니다."
        )


def _validate_presentation_dataset(posts: list[dict], crews: list[dict]) -> None:
    for post in posts:
        stops = post.get("route_stops") or []
        if not 2 <= len(stops) <= 5:
            raise ValueError(f"{post['key']} must have 2..5 presentation route stops")
        names = [stop["place"] for stop in stops]
        coords = [(stop["lat"], stop["lon"]) for stop in stops]
        if len(names) != len(set(names)):
            raise ValueError(f"{post['key']} contains duplicate route place names")
        if len(coords) != len(set(coords)):
            raise ValueError(f"{post['key']} contains duplicate route coordinates")
        if len(post.get("content") or "") < 180:
            raise ValueError(f"{post['key']} presentation content is too short")
        if re.search(r" · \d{4}$", post.get("title") or ""):
            raise ValueError(f"{post['key']} still has a synthetic numeric title suffix")
        if any(len(stop.get("content") or "") < 80 for stop in stops):
            raise ValueError(f"{post['key']} contains a thin route-stop description")

    for crew in crews:
        if len(crew.get("description") or "") < 150:
            raise ValueError(f"{crew['key']} presentation crew description is too short")
        if re.search(r" · \d{3}$", crew.get("title") or ""):
            raise ValueError(f"{crew['key']} still has a synthetic numeric title suffix")


def _nickname_suffix(batch_id: str) -> str:
    return hashlib.sha1(batch_id.encode("utf-8")).hexdigest()[:4]


def _make_batch_safe(users: list[dict], batch_id: str) -> None:
    suffix = _nickname_suffix(batch_id)
    for user in users:
        user["nickname"] = f"{user['nickname'][:35]}-{suffix}"[:40]


def _destination(code: str):
    return next(destination for destination in legacy.DS if destination.code == code)


def _places_for_post(post: dict) -> list[dict]:
    destination = _destination(post["region_code"])
    stops = post.get("route_stops") or []
    if not stops:
        return [
            {
                "place": post["place"],
                "lat": destination.lat,
                "lon": destination.lon,
                "content": post.get("content"),
            }
        ]
    return [
        {
            "place": stop["place"],
            "lat": stop["lat"],
            "lon": stop["lon"],
            "content": stop.get("content"),
        }
        for stop in stops
    ]


def post_place_count(posts: list[dict]) -> int:
    return sum(len(_places_for_post(post)) for post in posts)


def representative_analysis_post_keys(
    posts: list[dict], limit: int = ANALYSIS_REPRESENTATIVE_LIMIT
) -> list[str]:
    by_region: dict[str, list[dict]] = {}
    for post in posts:
        by_region.setdefault(post["region_code"], []).append(post)
    selected: list[str] = []
    round_index = 0
    while len(selected) < limit:
        added = False
        for destination in legacy.DS:
            region_posts = by_region.get(destination.code, [])
            if round_index < len(region_posts):
                selected.append(region_posts[round_index]["key"])
                added = True
                if len(selected) >= limit:
                    break
        if not added:
            break
        round_index += 1
    return selected


def demo_open_chat_crew_keys(crews: list[dict]) -> list[str]:
    return [crew["key"] for index, crew in enumerate(crews) if index % 4 == 0]


def demo_notification_fixtures(
    posts: list[dict], crews: list[dict], limit: int = DEMO_NOTIFICATION_LIMIT
) -> list[dict]:
    fixtures: list[dict] = []

    def add(event_type, target_type, target_key, recipient_email, actor_email):
        if len(fixtures) < limit:
            fixtures.append(dict(
                type=event_type,
                target_type=target_type,
                target_key=target_key,
                recipient_email=recipient_email,
                actor_email=actor_email,
            ))

    for post in posts:
        if post["like_user_emails"] and sum(f["type"] == "post_like" for f in fixtures) < 8:
            add("post_like", "post", post["key"], post["author_email"], post["like_user_emails"][0])
        if post["commenters"] and sum(f["type"] == "post_comment" for f in fixtures) < 8:
            add("post_comment", "post", post["key"], post["author_email"], post["commenters"][0]["email"])
        if len(fixtures) >= 16:
            break

    for crew in crews:
        pending = next((m for m in crew["members"] if m["status"] == "PENDING"), None)
        approved = next((m for m in crew["members"] if m["status"] == "APPROVED"), None)
        historical_applicant = pending or approved
        if historical_applicant and sum(f["type"] == "crew_application" for f in fixtures) < 5:
            add("crew_application", "crew", crew["key"], crew["owner_email"], historical_applicant["email"])
        if approved and sum(f["type"] == "crew_approved" for f in fixtures) < 5:
            add("crew_approved", "crew", crew["key"], approved["email"], crew["owner_email"])
        if historical_applicant and sum(f["type"] == "crew_rejected" for f in fixtures) < 4:
            # Historical demo event: the same user may have re-applied and later reached the current status.
            add("crew_rejected", "crew", crew["key"], historical_applicant["email"], crew["owner_email"])
        if len(fixtures) >= limit:
            break
    return fixtures[:limit]


def _render_v19_post_places(posts: list[dict]) -> str:
    out = ["-- V19 compatibility: materialize post_place and bind post_image.place_id."]
    for post in posts:
        post_key = legacy.q(post["key"])
        region_code = legacy.q(post["region_code"])
        places = _places_for_post(post)
        for sort_order, place in enumerate(places):
            out.append(
                "INSERT INTO post_place(post_id,region_id,place_name,latitude,longitude,content,sort_order) "
                f"SELECT s.id,r.id,{legacy.q(place['place'])},{place['lat']},{place['lon']},"
                f"{legacy.q(place.get('content') or (place['place'] + ' 여행 기록'))},{sort_order} "
                f"FROM _sp s JOIN region r ON r.code={region_code} WHERE s.k={post_key};"
            )
        out.append(
            "UPDATE post_image i SET place_id=pp.id FROM _sp s, post_place pp "
            f"WHERE s.k={post_key} AND i.post_id=s.id AND pp.post_id=s.id "
            f"AND pp.sort_order=(i.sort_order % {len(places)});"
        )
    return "\n".join(out) + "\n"


def render_sql(
    batch_id: str,
    users: list[dict],
    posts: list[dict],
    crews: list[dict],
    anchor: datetime,
    *,
    schema_profile: str = SCHEMA_PROFILE_TEAM_V23,
) -> str:
    if schema_profile not in SCHEMA_PROFILES:
        raise ValueError(f"unsupported schema profile: {schema_profile}")

    base = legacy.render_sql(batch_id, users, posts, crews, anchor)
    if schema_profile == SCHEMA_PROFILE_LOCAL_PRE_V19:
        return base

    marker = "COMMIT;\n"
    if not base.endswith(marker):
        raise ValueError("legacy SQL no longer ends in COMMIT")
    return (
        base[: -len(marker)]
        + _render_v19_post_places(posts)
        + _render_v23_demo_extras(batch_id, posts, crews, anchor)
        + marker
    )


def _render_v23_demo_extras(
    batch_id: str, posts: list[dict], crews: list[dict], anchor: datetime
) -> str:
    out = ["-- V20-V23 demo fixtures: notifications and crew open-chat data."]
    for crew_key in demo_open_chat_crew_keys(crews):
        url = f"https://example.invalid/journey-connect-demo/{batch_id}/{crew_key}"
        out.append(
            "UPDATE crew c SET open_chat_url="
            f"{legacy.q(url)} FROM _sc s "
            f"WHERE s.k={legacy.q(crew_key)} AND c.id=s.id;"
        )
    for index, fixture in enumerate(demo_notification_fixtures(posts, crews)):
        temp_table = "_sp" if fixture["target_type"] == "post" else "_sc"
        created_at = (anchor + timedelta(minutes=index + 1)).strftime("%Y-%m-%d %H:%M:%S")
        dedupe = f"synthetic:{batch_id}:{fixture['type']}:{fixture['target_key']}:{index:02d}"
        out.append(
            "INSERT INTO user_notification("
            "recipient_id,actor_id,type,target_type,target_id,dedupe_key,created_at) "
            f"SELECT recipient.id,actor.id,{legacy.q(fixture['type'])},"
            f"{legacy.q(fixture['target_type'])},target.id,{legacy.q(dedupe)},"
            f"{legacy.q(created_at)}::timestamptz "
            f"FROM {temp_table} target "
            f"JOIN user_account recipient ON recipient.email={legacy.q(fixture['recipient_email'])} "
            f"JOIN user_account actor ON actor.email={legacy.q(fixture['actor_email'])} "
            f"WHERE target.k={legacy.q(fixture['target_key'])} "
            "ON CONFLICT(dedupe_key) DO NOTHING;"
        )
    return "\n".join(out) + "\n"


def validate_current(users: list[dict], posts: list[dict], crews: list[dict]) -> None:
    legacy.validate(users, posts, crews)
    if len({user["nickname"] for user in users}) != len(users):
        raise ValueError("batch-safe nicknames must remain unique")
    for crew in crews:
        statuses = {"OWNER", *(member["status"] for member in crew["members"])}
        if not statuses <= CURRENT_CREW_STATUSES:
            raise ValueError(f"unsupported Crew status: {statuses - CURRENT_CREW_STATUSES}")
    if any(not _places_for_post(post) for post in posts):
        raise ValueError("every post must have deterministic place source data")


def generate_data(
    *,
    seed: int = 20260825,
    batch_id: str = "demo-v2",
    users: int = 180,
    posts: int = 1800,
    crews: int = 120,
    anchor: datetime = DEFAULT_ANCHOR,
):
    rng = random.Random(seed)
    user_rows = legacy.users(rng, batch_id, users)
    _make_batch_safe(user_rows, batch_id)
    post_rows = legacy.posts(rng, batch_id, user_rows, posts, anchor)
    _enrich_presentation_posts(post_rows, batch_id)
    crew_rows = legacy.crews(rng, batch_id, user_rows, crews, anchor)
    _enrich_presentation_crews(crew_rows, batch_id)
    validate_current(user_rows, post_rows, crew_rows)
    _validate_presentation_dataset(post_rows, crew_rows)
    return user_rows, post_rows, crew_rows


def _target_for_profile(schema_profile: str) -> dict:
    if schema_profile == SCHEMA_PROFILE_TEAM_V23:
        return {
            "repository": TARGET_REPOSITORY,
            "branch": TARGET_BRANCH,
            "schemaCommit": TARGET_SCHEMA_COMMIT,
            "migrationRange": "V1..V23",
            "postPlaceMaterialization": True,
            "notificationFixtures": True,
            "crewOpenChatFixtures": True,
            "commentReplySchemaCompatible": True,
            "googleExternalIdentitySchemaCompatible": True,
        }
    if schema_profile == SCHEMA_PROFILE_LOCAL_PRE_V19:
        return {
            "schemaProfile": SCHEMA_PROFILE_LOCAL_PRE_V19,
            "migrationRange": "V17..V18-compatible legacy product schema",
            "postPlaceMaterialization": False,
            "note": "For local PostgreSQL schemas that have the restored #79 tables but do not yet have V19 post_place.",
        }
    raise ValueError(f"unsupported schema profile: {schema_profile}")


def write_outputs(
    output_dir: Path,
    *,
    seed: int,
    batch_id: str,
    users: list[dict],
    posts: list[dict],
    crews: list[dict],
    anchor: datetime,
    schema_profile: str = SCHEMA_PROFILE_TEAM_V23,
) -> dict:
    output_dir.mkdir(parents=True, exist_ok=True)
    seed_sql = render_sql(
        batch_id,
        users,
        posts,
        crews,
        anchor,
        schema_profile=schema_profile,
    )
    purge_sql = legacy.purge(batch_id)
    manifest = {
        "schemaVersion": 4,
        "batchId": batch_id,
        "seed": seed,
        "anchor": anchor.isoformat(),
        "schemaProfile": schema_profile,
        "target": _target_for_profile(schema_profile),
        "counts": {
            "users": len(users),
            "posts": len(posts),
            "postImages": sum(len(post["images"]) for post in posts),
            "postPlaces": post_place_count(posts)
            if schema_profile == SCHEMA_PROFILE_TEAM_V23
            else 0,
            "crews": len(crews),
            "crewOpenChatUrls": len(demo_open_chat_crew_keys(crews))
            if schema_profile == SCHEMA_PROFILE_TEAM_V23
            else 0,
            "notifications": len(demo_notification_fixtures(posts, crews))
            if schema_profile == SCHEMA_PROFILE_TEAM_V23
            else 0,
            "analysisRepresentativePosts": len(representative_analysis_post_keys(posts)),
        },
        "analysisRepresentativePostKeys": representative_analysis_post_keys(posts),
        "destinations": [legacy.asdict(destination) for destination in legacy.DS],
        "users": users,
        "posts": posts,
        "crews": crews,
    }
    (output_dir / "seed.sql").write_text(seed_sql, encoding="utf-8")
    (output_dir / "purge.sql").write_text(purge_sql, encoding="utf-8")
    (output_dir / "manifest.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(
        description="Generate the restored Journey Connect synthetic DB corpus for team V23 or a pre-V19 local DB."
    )
    parser.add_argument("--seed", type=int, default=20260825)
    parser.add_argument("--batch-id", default="demo-v2")
    parser.add_argument("--users", type=int, default=180)
    parser.add_argument("--posts", type=int, default=1800)
    parser.add_argument("--crews", type=int, default=120)
    parser.add_argument("--anchor", default=DEFAULT_ANCHOR.isoformat())
    parser.add_argument("--output-dir", default="build/synthetic-db-corpus")
    parser.add_argument(
        "--schema-profile",
        choices=SCHEMA_PROFILES,
        default=SCHEMA_PROFILE_TEAM_V23,
        help="team-v23 targets V1..V23; local-pre-v19 omits V19+ SQL.",
    )
    args = parser.parse_args()
    if args.users < 10 or args.posts < 1 or args.crews < 0:
        parser.error("users>=10, posts>=1, crews>=0 required")
    if not re.fullmatch(r"[a-z0-9][a-z0-9-]{0,30}", args.batch_id):
        parser.error("invalid batch-id")

    anchor = datetime.fromisoformat(args.anchor)
    users, posts, crews = generate_data(
        seed=args.seed,
        batch_id=args.batch_id,
        users=args.users,
        posts=args.posts,
        crews=args.crews,
        anchor=anchor,
    )
    manifest = write_outputs(
        Path(args.output_dir),
        seed=args.seed,
        batch_id=args.batch_id,
        users=users,
        posts=posts,
        crews=crews,
        anchor=anchor,
        schema_profile=args.schema_profile,
    )
    print(
        f"generated profile={args.schema_profile} {manifest['counts']} -> {args.output_dir}"
    )
    return 0


if __name__ == "__main__":
    raise SystemExit(main())