package com.jc.backend.intelligence.contentanalysis;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertNotNull;
import static org.junit.jupiter.api.Assertions.assertNull;
import static org.junit.jupiter.api.Assertions.assertTrue;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import java.time.Clock;
import java.time.Duration;
import java.util.Optional;
import java.util.concurrent.AbstractExecutorService;
import java.util.concurrent.TimeUnit;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class ContentAnalysisWorkerRuntimeConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
            .withInitializer(context -> new ContentAnalysisEnvironmentPostProcessor()
                    .postProcessEnvironment(context.getEnvironment(), null))
            .withUserConfiguration(ContentAnalysisWorkerRuntimeConfiguration.class)
            .withBean(PostContentAnalysisJobStore.class, () -> mock(PostContentAnalysisJobStore.class))
            .withBean(
                    PostContentAnalysisInputSnapshotStore.class,
                    () -> mock(PostContentAnalysisInputSnapshotStore.class))
            .withBean(
                    PostContentAnalysisResultStore.class,
                    () -> mock(PostContentAnalysisResultStore.class))
            .withBean(PostContentAnalysisValidator.class, PostContentAnalysisValidator::new);

    @Test
    void workerRuntimeIsAbsentByDefault() {
        contextRunner.run(context -> {
            assertNull(context.getStartupFailure());
            assertEquals(0, context.getBeanNamesForType(PostContentAnalysisWorker.class).length);
            assertEquals(0, context.getBeanNamesForType(PostContentAnalysisWorkerTrigger.class).length);
        });
    }

    @Test
    void enablingWorkerWithoutProviderFailsFast() {
        contextRunner
                .withPropertyValues(
                        "app.intelligence.content-analysis.worker-enabled=true",
                        "app.intelligence.content-analysis.worker-initial-delay-ms=3600000",
                        "app.intelligence.content-analysis.worker-poll-delay-ms=3600000")
                .run(context -> {
                    Throwable failure = context.getStartupFailure();
                    assertNotNull(failure);
                    assertTrue(messageChain(failure).contains(
                            "content analysis worker requires exactly one ContentAnalysisProvider"));
                });
    }

    @Test
    void enabledWorkerCreatesWorkerAndTriggerWhenProviderExists() {
        contextRunner
                .withBean(ContentAnalysisProvider.class, () -> mock(ContentAnalysisProvider.class))
                .withPropertyValues(
                        "app.intelligence.content-analysis.worker-enabled=true",
                        "app.intelligence.content-analysis.worker-initial-delay-ms=3600000",
                        "app.intelligence.content-analysis.worker-poll-delay-ms=3600000")
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    assertEquals(1, context.getBeanNamesForType(PostContentAnalysisWorker.class).length);
                    assertEquals(1, context.getBeanNamesForType(PostContentAnalysisWorkerTrigger.class).length);
                });
    }

    @Test
    void documentedEnvironmentAliasCreatesWorkerAndResolvesCanonicalProperty() {
        contextRunner
                .withBean(ContentAnalysisProvider.class, () -> mock(ContentAnalysisProvider.class))
                .withPropertyValues(
                        "JC_AI_CONTENT_ANALYSIS_WORKER_ENABLED=true",
                        "JC_AI_CONTENT_ANALYSIS_WORKER_INITIAL_DELAY_MS=3600000",
                        "JC_AI_CONTENT_ANALYSIS_WORKER_POLL_DELAY_MS=3600000",
                        "JC_AI_CONTENT_ANALYSIS_PROVIDER_TIMEOUT=3s",
                        "JC_AI_CONTENT_ANALYSIS_RATE_LIMIT_COOLDOWN=4s",
                        "JC_AI_CONTENT_ANALYSIS_RUNNING_LEASE_TIMEOUT=5s")
                .run(context -> {
                    assertNull(context.getStartupFailure());
                    assertEquals("true", context.getEnvironment().getProperty(
                            "app.intelligence.content-analysis.worker-enabled"));
                    assertEquals("3600000", context.getEnvironment().getProperty(
                            "app.intelligence.content-analysis.worker-poll-delay-ms"));
                    ContentAnalysisRuntimeProperties properties =
                            context.getBean(ContentAnalysisRuntimeProperties.class);
                    assertEquals(Duration.ofSeconds(3), properties.getProviderTimeout());
                    assertEquals(Duration.ofSeconds(4), properties.getRateLimitCooldown());
                    assertEquals(Duration.ofSeconds(5), properties.getRunningLeaseTimeout());
                    assertEquals(1, context.getBeanNamesForType(PostContentAnalysisWorker.class).length);
                    assertEquals(1, context.getBeanNamesForType(PostContentAnalysisWorkerTrigger.class).length);
                });
    }

    @Test
    void triggerClaimsAtMostOneReadyJobPerPoll() {
        PostContentAnalysisJobStore jobs = mock(PostContentAnalysisJobStore.class);
        PostContentAnalysisInputSnapshotStore inputs = mock(PostContentAnalysisInputSnapshotStore.class);
        PostContentAnalysisResultStore results = mock(PostContentAnalysisResultStore.class);
        ContentAnalysisProvider provider = mock(ContentAnalysisProvider.class);
        when(jobs.claimNextReady(any())).thenReturn(Optional.empty());

        PostContentAnalysisWorker worker = new PostContentAnalysisWorker(
                jobs,
                inputs,
                results,
                provider,
                new PostContentAnalysisValidator(),
                Clock.systemUTC(),
                new DirectExecutorService(),
                Duration.ofSeconds(1),
                Duration.ofSeconds(1),
                Duration.ofSeconds(2));
        PostContentAnalysisWorkerTrigger trigger = new PostContentAnalysisWorkerTrigger(worker);

        trigger.poll();

        verify(jobs).claimNextReady(any());
        verifyNoInteractions(inputs, results, provider);
    }

    private static String messageChain(Throwable throwable) {
        StringBuilder message = new StringBuilder();
        Throwable current = throwable;
        while (current != null) {
            if (current.getMessage() != null) {
                message.append(current.getMessage()).append('\n');
            }
            current = current.getCause();
        }
        return message.toString();
    }

    private static final class DirectExecutorService extends AbstractExecutorService {
        @Override
        public void shutdown() {}

        @Override
        public java.util.List<Runnable> shutdownNow() {
            return java.util.List.of();
        }

        @Override
        public boolean isShutdown() {
            return false;
        }

        @Override
        public boolean isTerminated() {
            return false;
        }

        @Override
        public boolean awaitTermination(long timeout, TimeUnit unit) {
            return true;
        }

        @Override
        public void execute(Runnable command) {
            command.run();
        }
    }
}
