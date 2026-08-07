package com.jc.backend.intelligence.contentanalysis;

public record PlaceMentionCandidate(
        String mentionText,
        String normalizedNameCandidate,
        double confidence) {}
