package com.jc.backend.intelligence.contentanalysis;

import java.util.LinkedHashMap;
import java.util.Map;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.env.EnvironmentPostProcessor;
import org.springframework.core.env.ConfigurableEnvironment;
import org.springframework.core.env.MapPropertySource;
import org.springframework.core.env.StandardEnvironment;
import org.springframework.util.StringUtils;

/**
 * Maps the documented local-run environment variables to the canonical Spring
 * properties before auto-configuration conditions are evaluated.
 */
public final class ContentAnalysisEnvironmentPostProcessor implements EnvironmentPostProcessor {

    static final String PROPERTY_SOURCE_NAME = "contentAnalysisEnvironmentAliases";

    private static final Map<String, String> ALIASES = Map.of(
            "JC_AI_CONTENT_ANALYSIS_ENABLED",
            "app.intelligence.content-analysis.enabled",
            "JC_AI_CONTENT_ANALYSIS_WORKER_ENABLED",
            "app.intelligence.content-analysis.worker-enabled",
            "JC_AI_CONTENT_ANALYSIS_WORKER_POLL_DELAY_MS",
            "app.intelligence.content-analysis.worker-poll-delay-ms",
            "JC_AI_CONTENT_ANALYSIS_WORKER_INITIAL_DELAY_MS",
            "app.intelligence.content-analysis.worker-initial-delay-ms",
            "JC_AI_CONTENT_ANALYSIS_PROVIDER_TIMEOUT",
            "app.intelligence.content-analysis.provider-timeout",
            "JC_AI_CONTENT_ANALYSIS_RATE_LIMIT_COOLDOWN",
            "app.intelligence.content-analysis.rate-limit-cooldown",
            "JC_AI_CONTENT_ANALYSIS_RUNNING_LEASE_TIMEOUT",
            "app.intelligence.content-analysis.running-lease-timeout",
            "SPRING_AI_CHAT_MODEL",
            "spring.ai.model.chat");

    @Override
    public void postProcessEnvironment(
            ConfigurableEnvironment environment,
            SpringApplication application) {
        Map<String, Object> canonicalProperties = new LinkedHashMap<>();
        ALIASES.forEach((alias, canonical) -> {
            String value = environment.getProperty(alias);
            if (StringUtils.hasText(value)) {
                canonicalProperties.put(canonical, value);
            }
        });

        if (canonicalProperties.isEmpty()) {
            return;
        }

        environment.getPropertySources().remove(PROPERTY_SOURCE_NAME);
        MapPropertySource aliases = new MapPropertySource(PROPERTY_SOURCE_NAME, canonicalProperties);
        if (environment.getPropertySources().contains(
                StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME)) {
            environment.getPropertySources().addAfter(
                    StandardEnvironment.SYSTEM_ENVIRONMENT_PROPERTY_SOURCE_NAME,
                    aliases);
        } else {
            environment.getPropertySources().addFirst(aliases);
        }
    }
}
