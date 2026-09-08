# Synthetic DB Corpus Schema Compatibility

## Profiles

| Profile | Intended schema | Places | Notifications | Crew open chat |
|---|---|---:|---:|---:|
| `team-v23` | `develop` @ `961f28bf445d0e38591ef60b15f8ac1e6a0cd768`, Flyway V1..V23 | yes | yes | yes |
| `local-pre-v19` | legacy local product schema without V19+ | no | no | no |

## Current `team-v23` contract

- V1/V2/V5/V17: users, posts, region, images, tags, crews
- V18: `user_notification`
- V19: `post_place`, `post_image.place_id`
- V20: Crew notification types and `crew` target type
- V21: `crew.open_chat_url`
- V22: comment reply column and `comment_reply` notification type
- V23: `user_external_identity`

### Materialized by `team-v23`

1. users / posts / images / tags / interactions
2. `post_place` and `post_image.place_id`
3. crews / crew membership / crew tags
4. deterministic demo `open_chat_url` on a subset of crews
5. bounded presentation notifications
6. representative post keys for real Content Analysis enqueue

### Not directly materialized

- Recommendation run/exposure/evaluation persistence
- Content Analysis job/attempt/result rows
- Google `user_external_identity`

Content Analysis coverage is produced by the application bootstrap and existing worker, not by fake result INSERTs.

## `local-pre-v19`

오래된 개발 DB 호환용입니다. 현재 팀 스키마로 설명하거나 사용하지 않습니다.
