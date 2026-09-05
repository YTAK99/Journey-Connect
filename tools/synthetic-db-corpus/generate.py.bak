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
            }
        ]
    return [
        {
            "place": stop["place"],
            "lat": stop["lat"],
            "lon": stop["lon"],
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
                f"{legacy.q(place['place'] + ' synthetic route stop')},{sort_order} "
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
    crew_rows = legacy.crews(rng, batch_id, user_rows, crews, anchor)
    validate_current(user_rows, post_rows, crew_rows)
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