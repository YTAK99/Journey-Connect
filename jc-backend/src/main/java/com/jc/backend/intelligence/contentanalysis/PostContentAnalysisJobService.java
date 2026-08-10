package com.jc.backend.intelligence.contentanalysis;

import java.time.Clock;
import java.time.Instant;
import java.util.Objects;
import java.util.UUID;
import java.util.function.Supplier;

public final class PostContentAnalysisJobService {

    public static final String PROMPT_VERSION = "post-analysis-prompt-v1";

    private final PostContentAnalysisValidator validator;
    private final PostContentAnalysisJobStore jobStore;
    private final PostContentAnalysisInputSnapshotStore inputStore;
    private final Clock clock;
    private final Supplier<String> runIdSupplier;

    public PostContentAnalysisJobService(
            PostContentAnalysisValidator validator,
            PostContentAnalysisJobStore jobStore,
            PostContentAnalysisInputSnapshotStore inputStore,
            Clock clock) {
        this(validator, jobStore, inputStore, clock, () -> "analysis:" + UUID.randomUUID());
    }

    PostContentAnalysisJobService(
            PostContentAnalysisValidator validator,
            PostContentAnalysisJobStore jobStore,
            PostContentAnalysisInputSnapshotStore inputStore,
            Clock clock,
            Supplier<String> runIdSupplier) {
        this.validator = Objects.requireNonNull(validator, "validator");
        this.jobStore = Objects.requireNonNull(jobStore, "jobStore");
        this.inputStore = Objects.requireNonNull(inputStore, "inputStore");
        this.clock = Objects.requireNonNull(clock, "clock");
        this.runIdSupplier = Objects.requireNonNull(runIdSupplier, "runIdSupplier");
    }

    public PostContentAnalysisJob enqueue(PostContentAnalysisInputV1 input) {
        validator.validateInput(input);

        return jobStore.findByDedupeKey(
                        input.postId(),
                        input.sourceContentVersion(),
                        PostContentAnalysisResultV1.SCHEMA_VERSION,
                        PROMPT_VERSION)
                .orElseGet(() -> createJob(input));
    }

    private PostContentAnalysisJob createJob(PostContentAnalysisInputV1 input) {
        inputStore.saveIfAbsent(input);
        Instant now = clock.instant();
        PostContentAnalysisJob job = PostContentAnalysisJob.queued(
                runIdSupplier.get(),
                input,
                PROMPT_VERSION,
                now);
        return jobStore.saveIfAbsent(job);
    }
}
