from __future__ import annotations

import json
import sys
import tempfile
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))

import generate


class SyntheticDbCorpusTest(unittest.TestCase):
    def rows(self, batch_id="test", seed=123):
        return generate.generate_data(seed=seed, batch_id=batch_id, users=20, posts=50, crews=10)

    def test_deterministic_generation(self):
        self.assertEqual(self.rows(), self.rows())
        self.assertNotEqual(self.rows(seed=123), self.rows(seed=124))

    def test_target_and_destinations(self):
        self.assertEqual(generate.TARGET_SCHEMA_COMMIT, "961f28bf445d0e38591ef60b15f8ac1e6a0cd768")
        self.assertEqual(generate.SCHEMA_PROFILE_TEAM_V23, "team-v23")
        self.assertEqual(len(generate.legacy.DS), 24)
        self.assertIn("US-HNL", {row.code for row in generate.legacy.DS})

    def test_team_v23_materializes_current_demo_contract(self):
        users, posts, crews = self.rows()
        sql = generate.render_sql(
            "test", users, posts, crews, generate.DEFAULT_ANCHOR,
            schema_profile=generate.SCHEMA_PROFILE_TEAM_V23,
        )
        self.assertIn("INSERT INTO post_place", sql)
        self.assertIn("UPDATE post_image i SET place_id=pp.id", sql)
        self.assertIn("UPDATE crew c SET open_chat_url=", sql)
        self.assertIn("INSERT INTO user_notification(", sql)
        self.assertIn("'crew_application'", sql)
        self.assertIn("'crew_approved'", sql)
        self.assertIn("'crew_rejected'", sql)
        self.assertNotIn("INSERT INTO recommendation_", sql)
        self.assertNotIn("INSERT INTO user_external_identity", sql)

    def test_local_pre_v19_omits_v19_plus_sql(self):
        users, posts, crews = self.rows()
        sql = generate.render_sql(
            "test", users, posts, crews, generate.DEFAULT_ANCHOR,
            schema_profile=generate.SCHEMA_PROFILE_LOCAL_PRE_V19,
        )
        self.assertNotIn("INSERT INTO post_place", sql)
        self.assertNotIn("open_chat_url", sql)
        self.assertNotIn("INSERT INTO user_notification", sql)
        self.assertIn("INSERT INTO crew_tag", sql)
        self.assertTrue(sql.endswith("COMMIT;\n"))

    def test_manifest_records_v23_profile_and_demo_coverage(self):
        users, posts, crews = self.rows()
        with tempfile.TemporaryDirectory() as tmp:
            manifest = generate.write_outputs(
                Path(tmp), seed=123, batch_id="test", users=users, posts=posts,
                crews=crews, anchor=generate.DEFAULT_ANCHOR,
                schema_profile=generate.SCHEMA_PROFILE_TEAM_V23,
            )
            self.assertEqual(manifest["schemaProfile"], "team-v23")
            self.assertEqual(manifest["target"]["migrationRange"], "V1..V23")
            self.assertGreater(manifest["counts"]["postPlaces"], 0)
            self.assertGreater(manifest["counts"]["crewOpenChatUrls"], 0)
            self.assertGreater(manifest["counts"]["notifications"], 0)
            self.assertLessEqual(manifest["counts"]["analysisRepresentativePosts"], generate.ANALYSIS_REPRESENTATIVE_LIMIT)
            self.assertEqual(len(manifest["analysisRepresentativePostKeys"]), manifest["counts"]["analysisRepresentativePosts"])
            saved = json.loads((Path(tmp) / "manifest.json").read_text(encoding="utf-8"))
            self.assertEqual(saved["schemaProfile"], "team-v23")

    def test_representative_analysis_keys_are_region_balanced(self):
        _, posts, _ = self.rows()
        keys = generate.representative_analysis_post_keys(posts)
        by_key = {post["key"]: post for post in posts}
        represented = {by_key[key]["region_code"] for key in keys}
        self.assertGreaterEqual(len(represented), 8)
        self.assertLessEqual(len(keys), generate.ANALYSIS_REPRESENTATIVE_LIMIT)

    # PRESENTATION_POST_CREW_DATASET_V2_TESTS
    def test_presentation_poi_catalog_covers_every_destination_place(self):
        for destination in generate.legacy.DS:
            expected = set(destination.places.split("|"))
            actual = set(generate.PRESENTATION_POIS[destination.code])
            self.assertEqual(expected, actual)

    def test_presentation_posts_are_dense_multi_stop_routes(self):
        _, posts, _ = self.rows()
        for post in posts:
            stops = post["route_stops"]
            self.assertGreaterEqual(len(stops), 2)
            self.assertLessEqual(len(stops), 5)
            self.assertGreaterEqual(len(post["content"]), 180)
            self.assertNotRegex(post["title"], r" · \d{4}$")
            self.assertEqual(len({stop["place"] for stop in stops}), len(stops))
            self.assertEqual(
                len({(stop["lat"], stop["lon"]) for stop in stops}),
                len(stops),
            )
            for stop in stops:
                self.assertGreaterEqual(len(stop["content"]), 80)
        self.assertGreaterEqual(generate.post_place_count(posts), len(posts) * 2)

    def test_presentation_route_coordinates_are_not_region_centroid_fallbacks(self):
        _, posts, _ = self.rows()
        for post in posts:
            destination = next(
                row for row in generate.legacy.DS if row.code == post["region_code"]
            )
            coords = {(stop["lat"], stop["lon"]) for stop in post["route_stops"]}
            self.assertNotEqual(coords, {(destination.lat, destination.lon)})

    def test_presentation_crews_have_natural_titles_and_detailed_descriptions(self):
        _, _, crews = self.rows()
        for crew in crews:
            self.assertGreaterEqual(len(crew["description"]), 150)
            self.assertNotRegex(crew["title"], r" · \d{3}$")
            self.assertIn(crew["region_code"], generate.PRESENTATION_POIS)

    def test_batch_safe_nicknames(self):
        alpha, _, _ = self.rows(batch_id="alpha")
        beta, _, _ = self.rows(batch_id="beta")
        self.assertTrue({u["nickname"] for u in alpha}.isdisjoint({u["nickname"] for u in beta}))

    def test_crew_statuses_are_current(self):
        _, _, crews = self.rows()
        for crew in crews:
            for member in crew["members"]:
                self.assertIn(member["status"], generate.CURRENT_CREW_STATUSES)


if __name__ == "__main__":
    unittest.main()
