package com.jc.backend.intelligence.contentanalysis;

import java.time.Clock;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

@Configuration(proxyBeanMethods = false)
public class ContentAnalysisApplicationConfiguration {

    @Bean
    PostContentAnalysisJobService postContentAnalysisJobService(
            PostContentAnalysisValidator validator,
            PostContentAnalysisJobStore jobStore,
            PostContentAnalysisInputSnapshotStore inputStore) {
        return new PostContentAnalysisJobService(
                validator,
                jobStore,
                inputStore,
                Clock.systemUTC());
    }
}
