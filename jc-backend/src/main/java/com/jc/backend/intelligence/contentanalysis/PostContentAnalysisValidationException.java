package com.jc.backend.intelligence.contentanalysis;

import java.util.List;

public final class PostContentAnalysisValidationException extends IllegalArgumentException {

    private static final long serialVersionUID = 1L;

    private final transient List<String> violations;

    public PostContentAnalysisValidationException(List<String> violations) {
        super(String.join("; ", violations));
        this.violations = List.copyOf(violations);
    }

    public List<String> violations() {
        return violations;
    }
}
