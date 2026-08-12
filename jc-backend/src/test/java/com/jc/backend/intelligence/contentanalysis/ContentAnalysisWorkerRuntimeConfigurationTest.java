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
import java.util.Optional;
import org.junit.jupiter.api.Test;
import org.springframework.boot.test.context.runner.ApplicationContextRunner;

class ContentAnalysisWorkerRuntimeConfigurationTest {

    private final ApplicationContextRunner contextRunner = new ApplicationContextRunner()
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
                Clock.systemUTC());
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
}
