package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.post.PostDtos;
import com.jc.backend.post.PostService;
import com.jc.backend.post.Tag;
import com.jc.backend.post.TagRepository;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import jakarta.persistence.EntityManager;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import org.hibernate.SessionFactory;
import org.hibernate.stat.Statistics;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class ExploreVisibleSummaryQueryIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private TagRepository tags;
    @Autowired private PostService postService;
    @Autowired private EntityManager entityManager;

    @Test
    void visibleSummaryBulkPathKeepsJpaQueriesBoundedAcrossManyRegions() {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        UserAccount author = users.save(new UserAccount(
                "ex8-query-" + suffix + "@example.com",
                "hash",
                "ex8-query-" + suffix));
        Tag tag = tags.save(new Tag("query-tag", "q-" + suffix));

        List<JourneyPost> saved = new ArrayList<>();
        for (int index = 0; index < 25; index++) {
            Region region = regions.save(new Region(
                    "EX8Q-" + suffix.toUpperCase() + "-" + index,
                    "KR",
                    "EX8 Query Region " + index + " " + suffix,
                    null));
            regions.upsertTranslation(region.getId(), "ko", "테스트 지역 " + index);

            JourneyPost post = new JourneyPost(
                    author,
                    region,
                    "ex8-query-post-" + suffix + "-" + index,
                    "content");
            post.replaceTags(List.of(tag));
            saved.add(posts.save(post));
        }

        entityManager.flush();
        entityManager.clear();

        Statistics statistics = entityManager.getEntityManagerFactory()
                .unwrap(SessionFactory.class)
                .getStatistics();
        statistics.clear();

        List<Long> orderedIds = saved.stream().map(JourneyPost::getId).toList();
        List<PostDtos.Summary> result = postService.visibleSummariesByIds(orderedIds);

        assertThat(result).extracting(PostDtos.Summary::id).containsExactlyElementsOf(orderedIds);
        assertThat(result).allSatisfy(summary -> {
            assertThat(summary.tags()).containsExactly("query-tag");
            assertThat(summary.regionNames()).containsKey("ko");
        });

        // post + batched tags + likes + bookmarks + bulk region translations: candidate count와 무관한 고정 상한입니다.
        assertThat(statistics.getPrepareStatementCount()).isLessThanOrEqualTo(5);
    }
}
