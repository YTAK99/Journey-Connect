package com.jc.backend.intelligence.contentanalysis;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jc.backend.post.PostDtos;
import com.jc.backend.post.PostService;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.time.Duration;
import java.time.Instant;
import java.util.List;
import java.util.Set;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.condition.EnabledIfEnvironmentVariable;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.context.ApplicationContext;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.annotation.DirtiesContext;
import org.springframework.test.context.DynamicPropertyRegistry;
import org.springframework.test.context.DynamicPropertySource;
import org.springframework.test.web.servlet.MockMvc;

@EnabledIfEnvironmentVariable(
        named = "JC_AI_CONTENT_E2E_ENABLED",
        matches = "(?i:true|1|yes)")
@SpringBootTest
@AutoConfigureMockMvc
@DirtiesContext(classMode = DirtiesContext.ClassMode.AFTER_CLASS)
class PostContentAnalysisLiveE2ETest {

    private static final String MODEL_VERSION =
            environmentOrDefault("JC_AI_CONTENT_MODEL", "gemini-3.6-flash");

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private PostService postService;
    @Autowired private PostContentAnalysisReadService readService;
    @Autowired private JdbcTemplate jdbcTemplate;
    @Autowired private MockMvc mockMvc;
    @Autowired private ApplicationContext applicationContext;

    @DynamicPropertySource
    static void liveRuntimeProperties(DynamicPropertyRegistry registry) {
        registry.add("spring.ai.model.chat", () -> "google-genai");
        registry.add("spring.ai.google.genai.api-key",
                () -> requireEnvironment("GOOGLE_AI_API_KEY"));
        registry.add("spring.ai.google.genai.chat.options.model", () -> MODEL_VERSION);
        registry.add("spring.ai.google.genai.chat.options.temperature", () -> "0.1");

        registry.add("app.intelligence.content-analysis.enabled", () -> "true");
        registry.add("app.intelligence.content-analysis.model-version", () -> MODEL_VERSION);
        registry.add("app.intelligence.content-analysis.worker-enabled", () -> "true");
        registry.add("app.intelligence.content-analysis.worker-initial-delay-ms", () -> "5000");
        registry.add("app.intelligence.content-analysis.worker-poll-delay-ms", () -> "250");
    }

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
    void postWriteRunsThroughSchedulerGeminiPersistenceAndReadApi() throws Exception {
        assertThat(applicationContext.getBeansOfType(ContentAnalysisProvider.class)).hasSize(1);
        assertThat(applicationContext.getBeansOfType(PostContentAnalysisWorker.class)).hasSize(1);
        assertThat(applicationContext.getBeansOfType(PostContentAnalysisWorkerTrigger.class)).hasSize(1);

        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        UserAccount author = users.save(new UserAccount(
                "ca5-" + suffix + "@example.com",
                "hash",
                "ca5-" + suffix));
        Region seoul = region(
                regions,
                "KR-CA5-" + suffix.toUpperCase(),
                "KR",
                "Seoul " + suffix);

        PostDtos.Detail created = postService.create(
                author.getId(),
                new PostDtos.CreateRequest(
                        "성수동 카페와 서울숲 산책",
                        "<p>성수연방을 둘러본 뒤 근처 카페에 들렀고 서울숲까지 걸어갔습니다. "
                                + "사진 찍기 좋은 곳이 많았습니다.</p>",
                        seoul.getCode(),
                        null,
                        null,
                        null,
                        null,
                        null,
                        List.of("성수동", "카페", "산책"),
                        null));

        PostContentAnalysisReadView first = readService.current(created.id(), null);
        assertThat(first.status()).isIn("queued", "running", "succeeded");

        PostContentAnalysisReadView succeeded = awaitSucceeded(created.id(), Duration.ofSeconds(60));

        assertThat(succeeded.status()).isEqualTo("succeeded");
        assertThat(succeeded.result()).isNotNull();
        assertThat(succeeded.result().modelVersion()).isEqualTo(MODEL_VERSION);
        assertThat(succeeded.result().summary()).isNotBlank();
        assertThat(succeeded.result().sourceLanguage().toLowerCase()).startsWith("ko");
        assertThat(succeeded.result().suggestedTags()).hasSizeLessThanOrEqualTo(5);
        assertThat(succeeded.result().placeMentions()).hasSizeLessThanOrEqualTo(10);
        assertThat(succeeded.result().confidence()).isBetween(0.0, 1.0);

        Integer resultCount = jdbcTemplate.queryForObject(
                "select count(*) from public.post_content_analysis_result "
                        + "where analysis_run_id = ?",
                Integer.class,
                succeeded.analysisRunId());
        assertThat(resultCount).isEqualTo(1);

        mockMvc.perform(get("/api/v1/posts/{postId}/analysis", created.id()))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.status").value("succeeded"))
                .andExpect(jsonPath("$.data.analysisRunId").value(succeeded.analysisRunId()))
                .andExpect(jsonPath("$.data.result.modelVersion").value(MODEL_VERSION))
                .andExpect(jsonPath("$.data.result.summary").isNotEmpty());
    }

    private PostContentAnalysisReadView awaitSucceeded(long postId, Duration timeout)
            throws InterruptedException {
        Instant deadline = Instant.now().plus(timeout);
        Set<String> terminalFailures = Set.of("failed", "quarantined");

        while (Instant.now().isBefore(deadline)) {
            PostContentAnalysisReadView view = readService.current(postId, null);
            if ("succeeded".equals(view.status())) {
                return view;
            }
            if (terminalFailures.contains(view.status())) {
                throw new AssertionError(
                        "Content Analysis ended in "
                                + view.status()
                                + " with error code "
                                + view.lastErrorCode());
            }
            Thread.sleep(250);
        }

        PostContentAnalysisReadView last = readService.current(postId, null);
        throw new AssertionError(
                "Content Analysis did not succeed within "
                        + timeout.toSeconds()
                        + "s; last status="
                        + last.status()
                        + ", lastErrorCode="
                        + last.lastErrorCode());
    }

    private static String requireEnvironment(String name) {
        String value = System.getenv(name);
        if (value == null || value.isBlank()) {
            throw new IllegalStateException(name + " must be set for CA-5 live E2E");
        }
        return value.trim();
    }

    private static String environmentOrDefault(String name, String defaultValue) {
        String value = System.getenv(name);
        return value == null || value.isBlank() ? defaultValue : value.trim();
    }
}
