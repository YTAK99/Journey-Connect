package com.jc.backend.common;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.LocalDateTime;
import org.junit.jupiter.api.Test;

class CursorCodecTest {

    private final CursorCodec codec = new CursorCodec();

    @Test
    void regionalCursorIsBoundToRegionAndLegacyGlobalCursorStillDecodes() {
        LocalDateTime createdAt = LocalDateTime.of(2026, 9, 3, 12, 0);
        String regional = codec.encode(createdAt, 42L, "KR-SEOUL");

        assertThat(codec.decode(regional, "KR-SEOUL"))
                .isEqualTo(new CursorCodec.CursorPosition(createdAt, 42L, "KR-SEOUL"));
        assertThatThrownBy(() -> codec.decode(regional, "KR-BUSAN"))
                .isInstanceOf(DomainException.class);
        assertThatThrownBy(() -> codec.decode(regional, null))
                .isInstanceOf(DomainException.class);

        String legacy = codec.encode(createdAt, 42L);
        assertThat(codec.decode(legacy))
                .isEqualTo(new CursorCodec.CursorPosition(createdAt, 42L));
        assertThatThrownBy(() -> codec.decode(legacy, "KR-SEOUL"))
                .isInstanceOf(DomainException.class);
    }
}
