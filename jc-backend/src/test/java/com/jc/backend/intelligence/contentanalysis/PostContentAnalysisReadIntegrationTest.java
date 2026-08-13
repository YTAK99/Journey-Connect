package com.jc.backend.intelligence.contentanalysis;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jc.backend.common.DomainException;
import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.post.PostDtos;
import com.jc.backend.post.PostService;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.web.servlet.MockMvc;

@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PostContentAnalysisReadIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private PostService postService;
    @Autowired private PostContentAnalysisReadService readService;
    @Autowired private PostContentAnalysisJobStore jobs;
    @Autowired private PostContentAnalysisResultStore results;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private MockMvc mockMvc;

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
    void currentReadTracksExactCurrentSourceVersionAndNeverReturnsStaleResult() throws Exception {
        Fixture fixture = fixture("read-current");

        PostDtos.Detail created = postService.create(
                fixture.author().getId(),
                new PostDtos.CreateRequest(
                        "Seoul walk",
                        "<p>Seoul Forest and cafe.</p>",
                        fixture.region().getCode(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of("walking", "cafe"),
                        null));

        PostContentAnalysisReadView queued = readService.current(created.id(), null);
        assertThat(queued.status()).isEqualTo("queued");
        assertThat(queued.result()).isNull();

        mockMvc.perform(get("/api/v1/posts/{postId}/analysis", created.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("queued"))
                .andExpect(jsonPath("$.data.sourceContentVersion").value(queued.sourceContentVersion()));

        Instant claimAt = Instant.now().plusSeconds(5);
        PostContentAnalysisJob running = jobs.claimNextReady(claimAt).orElseThrow();
        Instant completedAt = claimAt.plusMillis(1);
        PostContentAnalysisResultV1 result = new PostContentAnalysisResultV1(
                running.analysisRunId(),
                PostContentAnalysisResultV1.SCHEMA_VERSION,
                running.sourceContentVersion(),
                "en",
                "fake-model-v1",
                running.promptVersion(),
                AnalysisStatus.SUCCEEDED,
                "A walk through Seoul Forest with a cafe stop.",
                List.of(ContentTheme.CAFE, ContentTheme.LOCAL_EXPERIENCE),
                List.of(TravelStyle.WALKING),
                List.of("seoul-forest", "cafe"),
                List.of(),
                0.95,
                completedAt);
        results.append(result);
        jobs.save(running.markSucceeded(completedAt));

        PostContentAnalysisReadView succeeded = readService.current(created.id(), null);
        assertThat(succeeded.status()).isEqualTo("succeeded");
        assertThat(succeeded.analysisRunId()).isEqualTo(running.analysisRunId());
        assertThat(succeeded.result()).isNotNull();
        assertThat(succeeded.result().summary()).isEqualTo(result.summary());
        assertThat(succeeded.result().themes()).containsExactly("cafe", "local_experience");

        PostDtos.Detail changed = postService.update(
                fixture.author().getId(),
                created.id(),
                new PostDtos.UpdateRequest(
                        null,
                        "<p>Changed itinerary in Busan.</p>",
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null,
                        null));

        PostContentAnalysisReadView changedView = readService.current(changed.id(), null);
        assertThat(changedView.status()).isEqualTo("queued");
        assertThat(changedView.sourceContentVersion()).isNotEqualTo(succeeded.sourceContentVersion());
        assertThat(changedView.analysisRunId()).isNotEqualTo(succeeded.analysisRunId());
        assertThat(changedView.result()).isNull();
    }

    @Test
    void legacyPostWithoutJobReturnsNotRequestedAndPrivatePostRemainsHidden() throws Exception {
        Fixture fixture = fixture("read-access");
        JourneyPost legacy = posts.save(new JourneyPost(
                fixture.author(),
                fixture.region(),
                "Legacy post",
                "Legacy content"));

        PostContentAnalysisReadView legacyView = readService.current(legacy.getId(), null);
        assertThat(legacyView.status()).isEqualTo("not_requested");
        assertThat(legacyView.analysisRunId()).isNull();
        assertThat(legacyView.result()).isNull();

        PostDtos.Detail created = postService.create(
                fixture.author().getId(),
                new PostDtos.CreateRequest(
                        "Private trip",
                        "<p>Private travel note.</p>",
                        fixture.region().getCode(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of("solo"),
                        null));
        postService.update(
                fixture.author().getId(),
                created.id(),
                new PostDtos.UpdateRequest(
                        null, null, null, null, null, null, null, null, null, false, null));

        assertThatThrownBy(() -> readService.current(created.id(), null))
                .isInstanceOf(DomainException.class)
                .satisfies(exception -> assertThat(((DomainException) exception).getCode())
                        .isEqualTo("POST_NOT_FOUND"));

        PostContentAnalysisReadView ownerView =
                readService.current(created.id(), fixture.author().getId());
        assertThat(ownerView.status()).isEqualTo("queued");

        mockMvc.perform(get("/api/v1/posts/{postId}/analysis", created.id()))
                .andExpect(status().isNotFound());
    }

    private Fixture fixture(String prefix) {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        UserAccount author = users.save(new UserAccount(
                prefix + "-" + suffix + "@example.com",
                "hash",
                prefix + "-" + suffix));
        Region region = region(
                regions,
                "KR-" + prefix.toUpperCase().replace("-", "") + "-" + suffix.toUpperCase(),
                "KR",
                "Seoul " + suffix);
        return new Fixture(author, region);
    }

    private record Fixture(UserAccount author, Region region) {}
}
