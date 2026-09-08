package com.jc.backend.intelligence.contentanalysis;

import java.util.Objects;
import org.springframework.scheduling.annotation.Scheduled;

public final class PostContentAnalysisWorkerTrigger {

    private final PostContentAnalysisWorker worker;

    public PostContentAnalysisWorkerTrigger(PostContentAnalysisWorker worker) {
        this.worker = Objects.requireNonNull(worker, "worker");
    }

    @Scheduled(
            fixedDelayString = "${app.intelligence.content-analysis.worker-poll-delay-ms:10000}",
            initialDelayString = "${app.intelligence.content-analysis.worker-initial-delay-ms:1000}")
    public void poll() {
        worker.runOnce();
    }
}
