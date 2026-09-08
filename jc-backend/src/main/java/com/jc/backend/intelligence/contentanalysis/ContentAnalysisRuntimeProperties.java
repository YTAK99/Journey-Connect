package com.jc.backend.intelligence.contentanalysis;

import java.time.Duration;
import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.intelligence.content-analysis")
public final class ContentAnalysisRuntimeProperties {

    private boolean enabled;
    private boolean workerEnabled;
    private String modelVersion = "gemini-2.5-flash";
    private Duration providerTimeout = Duration.ofSeconds(60);
    private Duration rateLimitCooldown = Duration.ofMinutes(2);
    private Duration runningLeaseTimeout = Duration.ofMinutes(2);

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public boolean isWorkerEnabled() {
        return workerEnabled;
    }

    public void setWorkerEnabled(boolean workerEnabled) {
        this.workerEnabled = workerEnabled;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }

    public Duration getProviderTimeout() {
        return providerTimeout;
    }

    public void setProviderTimeout(Duration providerTimeout) {
        this.providerTimeout = providerTimeout;
    }

    public Duration getRateLimitCooldown() {
        return rateLimitCooldown;
    }

    public void setRateLimitCooldown(Duration rateLimitCooldown) {
        this.rateLimitCooldown = rateLimitCooldown;
    }

    public Duration getRunningLeaseTimeout() {
        return runningLeaseTimeout;
    }

    public void setRunningLeaseTimeout(Duration runningLeaseTimeout) {
        this.runningLeaseTimeout = runningLeaseTimeout;
    }
}
