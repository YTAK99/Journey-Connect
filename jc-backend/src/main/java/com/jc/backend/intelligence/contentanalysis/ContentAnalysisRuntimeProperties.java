package com.jc.backend.intelligence.contentanalysis;

import org.springframework.boot.context.properties.ConfigurationProperties;

@ConfigurationProperties(prefix = "app.intelligence.content-analysis")
public final class ContentAnalysisRuntimeProperties {

    private boolean enabled;
    private String modelVersion = "gemini-2.5-flash";

    public boolean isEnabled() {
        return enabled;
    }

    public void setEnabled(boolean enabled) {
        this.enabled = enabled;
    }

    public String getModelVersion() {
        return modelVersion;
    }

    public void setModelVersion(String modelVersion) {
        this.modelVersion = modelVersion;
    }
}
