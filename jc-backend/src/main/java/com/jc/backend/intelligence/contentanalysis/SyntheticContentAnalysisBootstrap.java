package com.jc.backend.intelligence.contentanalysis;

import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.post.Tag;
import java.util.ArrayList;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.ApplicationArguments;
import org.springframework.boot.ApplicationRunner;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.data.domain.PageRequest;
import org.springframework.stereotype.Component;
import org.springframework.transaction.annotation.Transactional;

@Component
@ConditionalOnProperty(
        prefix = "jc.ai.content-analysis.demo-bootstrap",
        name = "enabled",
        havingValue = "true")
public class SyntheticContentAnalysisBootstrap implements ApplicationRunner {

    private static final Logger log = LoggerFactory.getLogger(SyntheticContentAnalysisBootstrap.class);
    private static final String SYNTHETIC_EMAIL_PATTERN = "synthetic.%@journey-connect.local";

    private final JourneyPostRepository posts;
    private final PostContentAnalysisJobService jobs;
    private final int limit;
    private final int candidateLimit;

    public SyntheticContentAnalysisBootstrap(
            JourneyPostRepository posts,
            PostContentAnalysisJobService jobs,
            @Value("${jc.ai.content-analysis.demo-bootstrap.limit:48}") int limit,
            @Value("${jc.ai.content-analysis.demo-bootstrap.candidate-limit:2000}") int candidateLimit) {
        this.posts = posts;
        this.jobs = jobs;
        this.limit = Math.min(Math.max(limit, 1), 48);
        this.candidateLimit = Math.min(Math.max(candidateLimit, this.limit), 5000);
    }

    @Override
    @Transactional
    public void run(ApplicationArguments args) {
        List<JourneyPost> candidates = posts.findSyntheticContentAnalysisCandidates(
                SYNTHETIC_EMAIL_PATTERN, PageRequest.of(0, candidateLimit));
        List<JourneyPost> selected = selectRepresentatives(candidates, limit);
        for (JourneyPost post : selected) {
            List<String> tags = post.getTags().stream().map(Tag::getName).toList();
            String sourceVersion = PostContentAnalysisSourceVersion.from(
                    post.getTitle(), post.getContent(), post.getRegionName(), tags);
            jobs.enqueue(new PostContentAnalysisInputV1(
                    post.getId(), post.getTitle(), post.getContent(), post.getRegionName(), tags, sourceVersion));
        }
        log.info("Synthetic Content Analysis demo bootstrap queued {} representative posts from {} candidates",
                selected.size(), candidates.size());
    }

    static List<JourneyPost> selectRepresentatives(List<JourneyPost> candidates, int limit) {
        List<JourneyPost> selected = new ArrayList<>();
        Map<String, Integer> selectedPerRegion = new HashMap<>();
        for (JourneyPost post : candidates) {
            if (selected.size() >= limit) break;
            String regionCode = post.getRegion() == null ? "" : post.getRegion().getCode();
            int count = selectedPerRegion.getOrDefault(regionCode, 0);
            if (count >= 2) continue;
            selected.add(post);
            selectedPerRegion.put(regionCode, count + 1);
        }
        return List.copyOf(selected);
    }
}
