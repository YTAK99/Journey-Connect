package com.jc.backend.recommendation.explore;

public final class ExploreCursorException extends IllegalArgumentException {

    private final Reason reason;

    public ExploreCursorException(Reason reason, String message) {
        super(message);
        this.reason = reason;
    }

    public ExploreCursorException(Reason reason, String message, Throwable cause) {
        super(message, cause);
        this.reason = reason;
    }

    public Reason reason() {
        return reason;
    }

    public enum Reason {
        INVALID,
        TAMPERED,
        EXPIRED,
        RANKING_VERSION_MISMATCH,
        FILTER_MISMATCH,
        USER_BINDING_MISMATCH
    }
}
