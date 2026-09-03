package com.jc.backend.recommendation;

import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class RecommendationCandidateSourceRegionIntegrationTest {

    @Autowired private RecommendationCandidateSource candidateSource;
    @Autowired private JourneyPostRepository posts;
    @Autowired private RegionRepository regions;
    @Autowired private UserRepository users;

    @Test
    void regionIsAppliedBeforeRecommendationCandidateLimit() {
        String fixtureId = UUID.randomUUID().toString().replace("-", "").substring(0, 10);
        UserAccount viewer = users.save(new UserAccount(
                "candidate-viewer-" + fixtureId + "@example.com", "hash", "viewer-" + fixtureId));
        UserAccount author = users.save(new UserAccount(
                "candidate-author-" + fixtureId + "@example.com", "hash", "author-" + fixtureId));
        Region target = regions.save(new Region("KR-CAND-A-" + fixtureId, "KR", "Candidate A " + fixtureId, null));
        Region other = regions.save(new Region("KR-CAND-B-" + fixtureId, "KR", "Candidate B " + fixtureId, null));

        JourneyPost targetPost = posts.save(new JourneyPost(author, target, "target", "content"));
        JourneyPost otherPost = posts.save(new JourneyPost(author, other, "other", "content"));
        posts.flush();

        List<RecommendationCandidateRow> rows = candidateSource.findEligible(
                viewer.getId(), target.getCode(), 100);

        assertThat(rows).extracting(RecommendationCandidateRow::postId).contains(targetPost.getId());
        assertThat(rows).extracting(RecommendationCandidateRow::postId).doesNotContain(otherPost.getId());
        assertThat(rows).extracting(RecommendationCandidateRow::regionSlug)
                .allMatch(target.getCode().toLowerCase()::equals);
    }
}
