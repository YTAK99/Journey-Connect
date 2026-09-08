package com.jc.backend.intelligence.contentanalysis;

import java.util.Arrays;

public enum AnalysisStatus {
    QUEUED("queued"),
    RUNNING("running"),
    SUCCEEDED("succeeded"),
    FAILED("failed"),
    QUARANTINED("quarantined");

    private final String wireValue;

    AnalysisStatus(String wireValue) {
        this.wireValue = wireValue;
    }

    public String wireValue() {
        return wireValue;
    }

    public static AnalysisStatus fromWireValue(String value) {
        return Arrays.stream(values())
                .filter(status -> status.wireValue.equals(value))
                .findFirst()
                .orElseThrow(() -> new IllegalArgumentException("Unknown analysis status: " + value));
    }
}
