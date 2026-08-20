package com.jc.backend.intelligence.contentanalysis;

import java.time.Clock;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration(proxyBeanMethods = false)
@EnableScheduling
@ConditionalOnProperty(
        prefix = "app.intelligence.content-analysis",
        name = "worker-enabled",
        havingValue = "true")
public class ContentAnalysisWorkerRuntimeConfiguration {

    @Bean
    PostContentAnalysisWorker postContentAnalysisWorker(
            PostContentAnalysisJobStore jobStore,
            PostContentAnalysisInputSnapshotStore inputStore,
            PostContentAnalysisResultStore resultStore,
            ObjectProvider<ContentAnalysisProvider> providers,
            PostContentAnalysisValidator validator) {
        ContentAnalysisProvider provider = providers.getIfUnique();
        if (provider == null) {
            throw new IllegalStateException(
                    "content analysis worker requires exactly one ContentAnalysisProvider; "
                            + "enable content analysis provider runtime first");
        }

        return new PostContentAnalysisWorker(
                jobStore,
                inputStore,
                resultStore,
                provider,
                validator,
                Clock.systemUTC());
    }

    @Bean
    PostContentAnalysisWorkerTrigger postContentAnalysisWorkerTrigger(
            PostContentAnalysisWorker worker) {
        return new PostContentAnalysisWorkerTrigger(worker);
    }
}
