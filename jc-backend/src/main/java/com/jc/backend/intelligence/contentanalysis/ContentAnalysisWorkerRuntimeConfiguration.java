package com.jc.backend.intelligence.contentanalysis;

import java.time.Clock;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Qualifier;
import org.springframework.boot.autoconfigure.condition.ConditionalOnProperty;
import org.springframework.boot.context.properties.EnableConfigurationProperties;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.scheduling.annotation.EnableScheduling;

@Configuration(proxyBeanMethods = false)
@EnableScheduling
@EnableConfigurationProperties(ContentAnalysisRuntimeProperties.class)
@ConditionalOnProperty(
        prefix = "app.intelligence.content-analysis",
        name = "worker-enabled",
        havingValue = "true")
public class ContentAnalysisWorkerRuntimeConfiguration {

    private static final Logger log = LoggerFactory.getLogger(ContentAnalysisWorkerRuntimeConfiguration.class);

    @Bean(name = "contentAnalysisProviderExecutor", destroyMethod = "close")
    ExecutorService contentAnalysisProviderExecutor() {
        return Executors.newVirtualThreadPerTaskExecutor();
    }

    @Bean
    PostContentAnalysisWorker postContentAnalysisWorker(
            PostContentAnalysisJobStore jobStore,
            PostContentAnalysisInputSnapshotStore inputStore,
            PostContentAnalysisResultStore resultStore,
            ObjectProvider<ContentAnalysisProvider> providers,
            PostContentAnalysisValidator validator,
            ContentAnalysisRuntimeProperties properties,
            @Qualifier("contentAnalysisProviderExecutor") ExecutorService providerExecutor) {
        ContentAnalysisProvider provider = providers.getIfUnique();
        if (provider == null) {
            throw new IllegalStateException(
                    "content analysis worker requires exactly one ContentAnalysisProvider; "
                            + "enable content analysis provider runtime first");
        }

        PostContentAnalysisWorker worker = new PostContentAnalysisWorker(
                jobStore,
                inputStore,
                resultStore,
                provider,
                validator,
                Clock.systemUTC(),
                providerExecutor,
                properties.getProviderTimeout(),
                properties.getRateLimitCooldown(),
                properties.getRunningLeaseTimeout());
        log.info(
                "Content Analysis worker runtime enabled: provider={}, providerTimeout={}, rateLimitCooldown={}, runningLeaseTimeout={}",
                provider.providerId(),
                properties.getProviderTimeout(),
                properties.getRateLimitCooldown(),
                properties.getRunningLeaseTimeout());
        return worker;
    }

    @Bean
    PostContentAnalysisWorkerTrigger postContentAnalysisWorkerTrigger(
            PostContentAnalysisWorker worker) {
        return new PostContentAnalysisWorkerTrigger(worker);
    }
}
