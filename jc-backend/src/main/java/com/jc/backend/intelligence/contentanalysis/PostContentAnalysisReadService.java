package com.jc.backend.intelligence.contentanalysis;

import com.jc.backend.common.DomainException;
import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.post.Tag;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class PostContentAnalysisReadService {

    private final JourneyPostRepository posts;
    private final PostContentAnalysisJobStore jobs;
    private final PostContentAnalysisResultStore results;

    public PostContentAnalysisReadService(
            JourneyPostRepository posts,
            PostContentAnalysisJobStore jobs,
            PostContentAnalysisResultStore results) {
        this.posts = posts;
        this.jobs = jobs;
        this.results = results;
    }

    public PostContentAnalysisReadView current(long postId, Long viewerId) {
        JourneyPost post = readablePost(postId, viewerId);
        List<String> sourceTags = post.getTags().stream().map(Tag::getName).toList();
        String sourceContentVersion = PostContentAnalysisSourceVersion.from(
                post.getTitle(),
                post.getContent(),
                post.getRegionName(),
                sourceTags);

        PostContentAnalysisJob job = jobs.findByDedupeKey(
                        postId,
                        sourceContentVersion,
                        PostContentAnalysisResultV1.SCHEMA_VERSION,
                        PostContentAnalysisJobService.PROMPT_VERSION)
                .orElse(null);

        if (job == null) {
            return PostContentAnalysisReadView.notRequested(postId, sourceContentVersion);
        }

        PostContentAnalysisResultV1 result = null;
        if (job.status() == AnalysisStatus.SUCCEEDED) {
            result = results.findByAnalysisRunId(job.analysisRunId())
                    .orElseThrow(() -> new IllegalStateException(
                            "Succeeded Content Analysis job is missing result: "
                                    + job.analysisRunId()));
            if (!sourceContentVersion.equals(result.sourceContentVersion())) {
                throw new IllegalStateException(
                        "Content Analysis result source version does not match current job");
            }
        }

        return PostContentAnalysisReadView.from(job, result);
    }

    private JourneyPost readablePost(long postId, Long viewerId) {
        JourneyPost post = posts.findWithDetailById(postId)
                .orElseThrow(this::postNotFound);
        if (!post.isModerationVisible()) {
            throw postNotFound();
        }
        if (post.isPublished()) {
            return post;
        }
        if (viewerId != null && post.getAuthor().getId().equals(viewerId)) {
            return post;
        }
        throw postNotFound();
    }

    private DomainException postNotFound() {
        return new DomainException(
                HttpStatus.NOT_FOUND,
                "POST_NOT_FOUND",
                "게시물을 찾을 수 없습니다.");
    }
}
