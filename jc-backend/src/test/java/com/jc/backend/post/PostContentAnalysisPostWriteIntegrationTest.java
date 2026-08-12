package com.jc.backend.post;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.intelligence.contentanalysis.AnalysisStatus;
import com.jc.backend.intelligence.contentanalysis.ContentAnalysisProvider;
import com.jc.backend.intelligence.contentanalysis.PostContentAnalysisInputSnapshotStore;
import com.jc.backend.intelligence.contentanalysis.PostContentAnalysisInputV1;
import com.jc.backend.intelligence.contentanalysis.PostContentAnalysisJob;
import com.jc.backend.intelligence.contentanalysis.PostContentAnalysisJobStore;
import com.jc.backend.intelligence.contentanalysis.PostContentAnalysisSourceVersion;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;

@SpringBootTest
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PostContentAnalysisPostWriteIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private PostService postService;
    @Autowired private PostContentAnalysisJobStore jobs;
    @Autowired private PostContentAnalysisInputSnapshotStore inputs;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private ApplicationContext applicationContext;

    @BeforeEach
    void cleanContentAnalysisTables() {
        jdbcTemplate.execute("""
                truncate table
                    public.post_content_analysis_result,
                    public.post_content_analysis_attempt,
                    public.post_content_analysis_job,
                    public.post_content_analysis_input_snapshot
                cascade
                """);
    }

    @Test
    void createQueuesSnapshotAndNonAnalysisUpdateDedupesWithoutProvider() {
        String suffix = suffix();
        UserAccount author = users.save(new UserAccount(
                "ca4a-" + suffix + "@example.com",
                "hash",
                "ca4a-" + suffix));
        Region seoul = region(regions, "KR-CA4A-" + suffix.toUpperCase(), "KR", "Seoul " + suffix);

        PostDtos.Detail created = postService.create(author.getId(), new PostDtos.CreateRequest(
                "Seoul walk",
                "<p>Seoul Forest and a nearby cafe.</p>",
                seoul.getCode(),
                null,
                null,
                null,
                null,
                null,
                List.of("walking", "cafe"),
                null));

        assertThat(applicationContext.getBeansOfType(ContentAnalysisProvider.class)).isEmpty();
        assertThat(jobCount(created.id())).isEqualTo(1);

        PostContentAnalysisJob queued = jobs.findByDedupeKey(
                        created.id(),
                        expectedVersion(created.title(), created.content(), created.regionName(), created.tags()),
                        "post-content-analysis-v1",
                        "post-analysis-prompt-v1")
                .orElseThrow();
        assertThat(queued.status()).isEqualTo(AnalysisStatus.QUEUED);

        PostContentAnalysisInputV1 snapshot = inputs
                .find(created.id(), queued.sourceContentVersion())
                .orElseThrow();
        assertThat(snapshot.title()).isEqualTo(created.title());
        assertThat(snapshot.content()).isEqualTo(created.content());
        assertThat(snapshot.regionName()).isEqualTo(created.regionName());
        assertThat(snapshot.sourceTags()).containsExactlyElementsOf(created.tags());

        postService.update(author.getId(), created.id(), new PostDtos.UpdateRequest(
                null,
                null,
                null,
                null,
                "https://example.com/cover.jpg",
                null,
                null,
                null,
                null,
                null,
                null));

        assertThat(jobCount(created.id())).isEqualTo(1);
    }

    @Test
    void changingEachAnalysisFieldCreatesNewSourceVersionAndJob() {
        String suffix = suffix();
        UserAccount author = users.save(new UserAccount(
                "ca4b-" + suffix + "@example.com",
                "hash",
                "ca4b-" + suffix));
        Region seoul = region(regions, "KR-CA4B-" + suffix.toUpperCase(), "KR", "Seoul " + suffix);
        Region busan = region(regions, "KR-CA4C-" + suffix.toUpperCase(), "KR", "Busan " + suffix);

        PostDtos.Detail current = postService.create(author.getId(), new PostDtos.CreateRequest(
                "Original title",
                "<p>Original travel content.</p>",
                seoul.getCode(),
                null,
                null,
                null,
                null,
                null,
                List.of("walking", "cafe"),
                null));
        assertThat(jobCount(current.id())).isEqualTo(1);

        current = postService.update(author.getId(), current.id(), new PostDtos.UpdateRequest(
                "Changed title", null, null, null, null, null, null, null, null, null, null));
        assertThat(jobCount(current.id())).isEqualTo(2);
        assertLatestSnapshotMatches(current);

        current = postService.update(author.getId(), current.id(), new PostDtos.UpdateRequest(
                null, "<p>Changed travel content.</p>", null, null, null, null, null, null, null, null, null));
        assertThat(jobCount(current.id())).isEqualTo(3);
        assertLatestSnapshotMatches(current);

        current = postService.update(author.getId(), current.id(), new PostDtos.UpdateRequest(
                null, null, busan.getCode(), null, null, null, null, null, null, null, null));
        assertThat(jobCount(current.id())).isEqualTo(4);
        assertLatestSnapshotMatches(current);

        current = postService.update(author.getId(), current.id(), new PostDtos.UpdateRequest(
                null, null, null, null, null, null, null, null, List.of("food", "friends"), null, null));
        assertThat(jobCount(current.id())).isEqualTo(5);
        assertLatestSnapshotMatches(current);
    }

    private void assertLatestSnapshotMatches(PostDtos.Detail post) {
        String version = expectedVersion(post.title(), post.content(), post.regionName(), post.tags());
        PostContentAnalysisInputV1 snapshot = inputs.find(post.id(), version).orElseThrow();
        assertThat(snapshot.title()).isEqualTo(post.title());
        assertThat(snapshot.content()).isEqualTo(post.content());
        assertThat(snapshot.regionName()).isEqualTo(post.regionName());
        assertThat(snapshot.sourceTags()).containsExactlyElementsOf(post.tags());
    }

    private int jobCount(Long postId) {
        Integer count = jdbcTemplate.queryForObject(
                "select count(*) from public.post_content_analysis_job where post_id = ?",
                Integer.class,
                postId);
        return count == null ? 0 : count;
    }

    private static String expectedVersion(
            String title,
            String content,
            String regionName,
            List<String> tags) {
        return PostContentAnalysisSourceVersion.from(title, content, regionName, tags);
    }

    private static String suffix() {
        return UUID.randomUUID().toString().replace("-", "").substring(0, 8);
    }
}
