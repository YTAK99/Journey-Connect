package com.jc.backend.recommendation.p1;

import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.recommendation.RecommendationCandidateRow;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.time.Instant;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class RecommendationP1CandidateSourceRegionIntegrationTest {

    @Autowired private RecommendationP1CandidateSource candidateSource;
    @Autowired private JourneyPostRepository posts;
    @Autowired private RegionRepository regions;
    @Autowired private UserRepository users;

    @Test
    void regionIsAppliedInsideP1RetrievalBeforeCoreCandidateLimit() {
        String fixtureId = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        UserAccount viewer = users.save(new UserAccount(
                "p1-region-viewer-" + fixtureId + "@example.com", "hash", "viewer-" + fixtureId));
        UserAccount author = users.save(new UserAccount(
                "p1-region-author-" + fixtureId + "@example.com", "hash", "author-" + fixtureId));
        Region target = regions.save(new Region("KR-P1-A-" + fixtureId, "KR", "P1 A " + fixtureId, null));
        Region other = regions.save(new Region("KR-P1-B-" + fixtureId, "KR", "P1 B " + fixtureId, null));

        JourneyPost targetPost = posts.save(new JourneyPost(author, target, "target", "content"));
        JourneyPost otherPost = posts.save(new JourneyPost(author, other, "other", "content"));
        posts.flush();

        List<RecommendationCandidateRow> rows = candidateSource.findEligible(
                viewer.getId(), Instant.now().plusSeconds(1), target.getCode(), 300, 100);

        assertThat(rows).extracting(RecommendationCandidateRow::postId).contains(targetPost.getId());
        assertThat(rows).extracting(RecommendationCandidateRow::postId).doesNotContain(otherPost.getId());
        assertThat(rows).extracting(RecommendationCandidateRow::regionSlug)
                .allMatch(target.getCode().toLowerCase()::equals);
    }
}
