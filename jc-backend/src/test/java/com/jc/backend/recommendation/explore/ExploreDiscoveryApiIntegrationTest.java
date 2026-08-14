package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.jwt;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.sql.Timestamp;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.MvcResult;

@SpringBootTest
@AutoConfigureMockMvc
class ExploreDiscoveryApiIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private ObjectMapper objectMapper;
    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private JdbcTemplate jdbc;

    private String regionCode;
    private UserAccount viewer;
    private UserAccount secondViewer;
    private List<Long> eligibleIds;
    private long outsideRegionId;
    private long hiddenInitialId;
    private long inactiveAuthorPostId;
    private long futurePostId;
    private long unpublishedPostId;

    @BeforeEach
    void setUp() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        regionCode = "EX8-" + suffix.toUpperCase();

        viewer = users.save(new UserAccount(
                "ex8-viewer-" + suffix + "@example.com",
                "hash",
                "ex8-viewer-" + suffix));
        secondViewer = users.save(new UserAccount(
                "ex8-viewer2-" + suffix + "@example.com",
                "hash",
                "ex8-viewer2-" + suffix));
        UserAccount inactiveAuthor = users.save(new UserAccount(
                "ex8-inactive-" + suffix + "@example.com",
                "hash",
                "ex8-inactive-" + suffix));

        Region targetRegion = regions.save(new Region(
                regionCode,
                "KR",
                "EX8 Region " + suffix,
                null));
        Region outsideRegion = regions.save(new Region(
                "EX8-OUT-" + suffix.toUpperCase(),
                "JP",
                "EX8 Outside " + suffix,
                null));

        List<Long> ids = new ArrayList<>();
        for (int index = 0; index < 5; index++) {
            JourneyPost post = posts.save(new JourneyPost(
                    viewer,
                    targetRegion,
                    "ex8-eligible-" + suffix + "-" + index,
                    "content"));
            ids.add(post.getId());
        }
        eligibleIds = List.copyOf(ids);

        outsideRegionId = posts.save(new JourneyPost(
                viewer,
                outsideRegion,
                "ex8-outside-" + suffix,
                "content")).getId();

        JourneyPost hiddenInitial = posts.save(new JourneyPost(
                viewer,
                targetRegion,
                "ex8-hidden-" + suffix,
                "content"));
        hiddenInitialId = hiddenInitial.getId();
        jdbc.update(
                "update journey_post set moderation_status = 'hidden', hidden_at = current_timestamp where id = ?",
                hiddenInitialId);

        JourneyPost inactivePost = posts.save(new JourneyPost(
                inactiveAuthor,
                targetRegion,
                "ex8-inactive-" + suffix,
                "content"));
        inactiveAuthorPostId = inactivePost.getId();
        jdbc.update(
                "update user_account set account_status = 'suspended', suspended_at = current_timestamp where id = ?",
                inactiveAuthor.getId());

        JourneyPost futurePost = posts.save(new JourneyPost(
                viewer,
                targetRegion,
                "ex8-future-" + suffix,
                "content"));
        futurePostId = futurePost.getId();
        jdbc.update(
                "update journey_post set created_at = ?, updated_at = ? where id = ?",
                Timestamp.valueOf(LocalDateTime.now().plusDays(2)),
                Timestamp.valueOf(LocalDateTime.now().plusDays(2)),
                futurePostId);

        JourneyPost unpublished = new JourneyPost(
                viewer,
                targetRegion,
                "ex8-unpublished-" + suffix,
                "content");
        unpublished.update(null, null, null, false);
        unpublishedPostId = posts.save(unpublished).getId();
    }

    @Test
    void anonymousDiscoveryAppliesRegionAndEligibilityEndToEnd() throws Exception {
        MvcResult result = mockMvc.perform(get("/api/v1/explore/discovery")
                        .param("region", regionCode)
                        .param("size", "20"))
                .andExpect(status().isOk())
                .andReturn();

        List<Long> ids = itemIds(result);

        assertThat(ids).containsExactlyInAnyOrderElementsOf(eligibleIds);
        assertThat(ids).doesNotContain(
                outsideRegionId,
                hiddenInitialId,
                inactiveAuthorPostId,
                futurePostId,
                unpublishedPostId);
        assertThat(data(result).path("items"))
                .allSatisfy(item -> assertThat(item.path("regionCode").asText()).isEqualTo(regionCode));
        assertThat(data(result).path("hasNext").asBoolean()).isFalse();
    }

    @Test
    void cursorTraversalSkipsPostHiddenAfterFirstPageWithoutDuplicates() throws Exception {
        MvcResult first = mockMvc.perform(get("/api/v1/explore/discovery")
                        .param("region", regionCode)
                        .param("size", "2"))
                .andExpect(status().isOk())
                .andReturn();

        List<Long> collected = new ArrayList<>(itemIds(first));
        String cursor = nextCursor(first);
        assertThat(cursor).isNotBlank();

        long hiddenAfterFirstPage = eligibleIds.stream()
                .filter(id -> !collected.contains(id))
                .findFirst()
                .orElseThrow();
        jdbc.update(
                "update journey_post set moderation_status = 'hidden', hidden_at = current_timestamp where id = ?",
                hiddenAfterFirstPage);

        int pages = 1;
        while (cursor != null) {
            assertThat(pages).isLessThan(10);
            MvcResult next = mockMvc.perform(get("/api/v1/explore/discovery")
                            .param("region", regionCode)
                            .param("cursor", cursor)
                            .param("size", "2"))
                    .andExpect(status().isOk())
                    .andReturn();
            collected.addAll(itemIds(next));
            cursor = nextCursor(next);
            pages++;
        }

        List<Long> expectedVisible = eligibleIds.stream()
                .filter(id -> id != hiddenAfterFirstPage)
                .toList();
        assertThat(collected)
                .doesNotHaveDuplicates()
                .containsExactlyInAnyOrderElementsOf(expectedVisible)
                .doesNotContain(hiddenAfterFirstPage);
    }

    @Test
    void authenticatedCursorIsBoundToTheCreatingUser() throws Exception {
        MvcResult first = mockMvc.perform(get("/api/v1/explore/discovery")
                        .param("region", regionCode)
                        .param("size", "1")
                        .with(jwt().jwt(token -> token.subject(viewer.getId().toString()))))
                .andExpect(status().isOk())
                .andReturn();

        String cursor = nextCursor(first);
        assertThat(cursor).isNotBlank();

        mockMvc.perform(get("/api/v1/explore/discovery")
                        .param("region", regionCode)
                        .param("cursor", cursor)
                        .param("size", "1")
                        .with(jwt().jwt(token -> token.subject(secondViewer.getId().toString()))))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.code").value("EXPLORE_CURSOR_USER_MISMATCH"));
    }

    private JsonNode data(MvcResult result) throws Exception {
        return objectMapper.readTree(result.getResponse().getContentAsString()).path("data");
    }

    private List<Long> itemIds(MvcResult result) throws Exception {
        List<Long> ids = new ArrayList<>();
        for (JsonNode item : data(result).path("items")) {
            ids.add(item.path("id").asLong());
        }
        return ids;
    }

    private String nextCursor(MvcResult result) throws Exception {
        JsonNode value = data(result).get("nextCursor");
        return value == null || value.isNull() ? null : value.asText();
    }
}
