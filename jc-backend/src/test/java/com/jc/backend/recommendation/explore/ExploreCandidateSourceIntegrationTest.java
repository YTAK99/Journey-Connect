package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;

import java.sql.Timestamp;
import java.time.Instant;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.datasource.DriverManagerDataSource;

class ExploreCandidateSourceIntegrationTest {

    private static final Instant REFERENCE_TIME = Instant.parse("2026-08-13T07:00:00Z");

    private JdbcTemplate jdbc;
    private ExploreCandidateSource source;

    @BeforeEach
    void setUp() {
        DriverManagerDataSource dataSource = new DriverManagerDataSource();
        dataSource.setDriverClassName("org.h2.Driver");
        dataSource.setUrl("jdbc:h2:mem:explore_" + UUID.randomUUID()
                + ";MODE=PostgreSQL;DATABASE_TO_LOWER=TRUE;DB_CLOSE_DELAY=-1");
        dataSource.setUsername("sa");
        dataSource.setPassword("");
        jdbc = new JdbcTemplate(dataSource);
        source = new ExploreCandidateSource(jdbc);
        createSchema();
        seed();
    }

    @Test
    void returnsDeterministicUnionOfRecentAndQualitySlices() {
        List<ExploreCandidateRow> candidates = source.findCandidates(new ExploreCandidateQuery(
                REFERENCE_TIME,
                null,
                null,
                1,
                1));

        assertThat(candidates).extracting(ExploreCandidateRow::postId).containsExactly(101L, 102L);
        assertThat(candidates).extracting(ExploreCandidateRow::postId).doesNotHaveDuplicates();
        ExploreCandidateRow qualityCandidate = candidates.get(1);
        assertThat(qualityCandidate.bookmarkCount()).isEqualTo(2);
        assertThat(qualityCandidate.likeCount()).isEqualTo(3);
        assertThat(qualityCandidate.commentCount()).isEqualTo(2);
        assertThat(qualityCandidate.tagSlugs()).containsExactly("cafe", "walking");
    }

    @Test
    void appliesExplicitRegionAsHardFilterWithExistingSearchSemantics() {
        List<ExploreCandidateRow> candidates = source.findCandidates(new ExploreCandidateQuery(
                REFERENCE_TIME,
                "서울",
                null,
                10,
                10));

        assertThat(candidates).extracting(ExploreCandidateRow::postId).containsExactly(101L, 102L);
        assertThat(candidates).allMatch(candidate -> candidate.regionCode().equals("kr-11"));
    }

    @Test
    void countryAliasResolutionCanScopeAllRegionsInThatCountry() {
        List<ExploreCandidateRow> candidates = source.findCandidates(new ExploreCandidateQuery(
                REFERENCE_TIME,
                "대한민국",
                "KR",
                10,
                10));

        assertThat(candidates).extracting(ExploreCandidateRow::postId).containsExactly(101L, 103L, 102L);
    }

    @Test
    void excludesHiddenInactiveAuthorAndFuturePostsBeforeSliceSelection() {
        List<ExploreCandidateRow> candidates = source.findCandidates(new ExploreCandidateQuery(
                REFERENCE_TIME,
                null,
                null,
                20,
                20));

        assertThat(candidates).extracting(ExploreCandidateRow::postId)
                .containsExactly(101L, 103L, 102L)
                .doesNotContain(104L, 105L, 106L);
    }

    private void createSchema() {
        jdbc.execute("create table public.user_account (id bigint primary key, account_status varchar(20) not null)");
        jdbc.execute("create table public.region (id bigint primary key, code varchar(50) not null, country_code varchar(2) not null, search_text varchar(500))");
        jdbc.execute("create table public.journey_post (id bigint primary key, author_id bigint not null, region_id bigint not null, region_name varchar(100), published boolean not null, moderation_status varchar(20) not null, created_at timestamp with time zone not null, view_count bigint not null)");
        jdbc.execute("create table public.post_like (post_id bigint not null, user_id bigint not null)");
        jdbc.execute("create table public.bookmark (post_id bigint not null, user_id bigint not null)");
        jdbc.execute("create table public.post_comment (post_id bigint not null)");
        jdbc.execute("create table public.tag (id bigint primary key, normalized_name varchar(100) not null)");
        jdbc.execute("create table public.post_tag (post_id bigint not null, tag_id bigint not null, sort_order int not null)");
    }

    private void seed() {
        jdbc.update("insert into public.user_account(id, account_status) values (1, 'active'), (2, 'inactive')");
        jdbc.update("insert into public.region(id, code, country_code, search_text) values (11, 'KR-11', 'KR', '서울 Seoul Korea 대한민국'), (26, 'KR-26', 'KR', '부산 Busan Korea 대한민국')");

        insertPost(101, 1, 11, "서울", true, "visible", REFERENCE_TIME.minus(1, ChronoUnit.HOURS), 1);
        insertPost(102, 1, 11, "서울", true, "visible", REFERENCE_TIME.minus(60, ChronoUnit.DAYS), 100);
        insertPost(103, 1, 26, "부산", true, "visible", REFERENCE_TIME.minus(2, ChronoUnit.HOURS), 5);
        insertPost(104, 1, 11, "서울", true, "hidden", REFERENCE_TIME.minus(30, ChronoUnit.MINUTES), 1000);
        insertPost(105, 2, 11, "서울", true, "visible", REFERENCE_TIME.minus(20, ChronoUnit.MINUTES), 1000);
        insertPost(106, 1, 11, "서울", true, "visible", REFERENCE_TIME.plus(1, ChronoUnit.HOURS), 1000);

        jdbc.update("insert into public.post_like(post_id, user_id) values (102, 10), (102, 11), (102, 12)");
        jdbc.update("insert into public.bookmark(post_id, user_id) values (102, 10), (102, 11)");
        jdbc.update("insert into public.post_comment(post_id) values (102), (102)");
        jdbc.update("insert into public.tag(id, normalized_name) values (1, 'cafe'), (2, 'walking'), (3, 'night')");
        jdbc.update("insert into public.post_tag(post_id, tag_id, sort_order) values (102, 1, 0), (102, 2, 1), (103, 3, 0)");
    }

    private void insertPost(
            long id,
            long authorId,
            long regionId,
            String regionName,
            boolean published,
            String moderationStatus,
            Instant createdAt,
            long viewCount) {
        jdbc.update(
                "insert into public.journey_post(id, author_id, region_id, region_name, published, moderation_status, created_at, view_count) values (?, ?, ?, ?, ?, ?, ?, ?)",
                id,
                authorId,
                regionId,
                regionName,
                published,
                moderationStatus,
                Timestamp.from(createdAt),
                viewCount);
    }
}
