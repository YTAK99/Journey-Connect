package com.jc.backend.recommendation.explore;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import org.junit.jupiter.api.Test;

class ExploreRolloutModeTest {

    @Test
    void blankDefaultsToLegacyAndParsingIsCaseInsensitive() {
        assertThat(ExploreRolloutMode.parse(null)).isEqualTo(ExploreRolloutMode.LEGACY);
        assertThat(ExploreRolloutMode.parse("  ")).isEqualTo(ExploreRolloutMode.LEGACY);
        assertThat(ExploreRolloutMode.parse("shadow")).isEqualTo(ExploreRolloutMode.SHADOW);
        assertThat(ExploreRolloutMode.parse("ACTIVE")).isEqualTo(ExploreRolloutMode.ACTIVE);
    }

    @Test
    void unsupportedModeFailsFast() {
        assertThatThrownBy(() -> ExploreRolloutMode.parse("canary"))
                .isInstanceOf(IllegalArgumentException.class)
                .hasMessageContaining("LEGACY, SHADOW, or ACTIVE");
    }
}
