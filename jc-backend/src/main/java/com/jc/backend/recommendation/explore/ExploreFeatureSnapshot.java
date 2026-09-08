package com.jc.backend.recommendation.explore;

import java.time.Instant;
import java.util.List;
import java.util.Objects;

public record ExploreFeatureSnapshot(
        Instant referenceTime,
        Population population,
        List<ExploreCandidateFeatures> candidates) {

    public ExploreFeatureSnapshot {
        referenceTime = Objects.requireNonNull(referenceTime, "referenceTime");
        population = Objects.requireNonNull(population, "population");
        candidates = candidates == null ? List.of() : List.copyOf(candidates);
    }

    public record Population(
            int candidateCount,
            long viewP95,
            long likeP95,
            long bookmarkP95,
            long commentP95) {

        public Population {
            if (candidateCount < 0
                    || viewP95 < 0
                    || likeP95 < 0
                    || bookmarkP95 < 0
                    || commentP95 < 0) {
                throw new IllegalArgumentException("population statistics must not be negative");
            }
        }
    }
}
