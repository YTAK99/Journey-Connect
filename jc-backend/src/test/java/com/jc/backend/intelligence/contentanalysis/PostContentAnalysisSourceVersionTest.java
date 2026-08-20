package com.jc.backend.intelligence.contentanalysis;

import static org.assertj.core.api.Assertions.assertThat;

import java.util.List;
import org.junit.jupiter.api.Test;

class PostContentAnalysisSourceVersionTest {

    @Test
    void sameCanonicalInputProducesSameVersion() {
        String first = PostContentAnalysisSourceVersion.from(
                "Seoul walk",
                "<p>Seoul Forest and cafe</p>",
                "Seoul",
                List.of("walking", "cafe"));
        String second = PostContentAnalysisSourceVersion.from(
                "Seoul walk",
                "<p>Seoul Forest and cafe</p>",
                "Seoul",
                List.of("walking", "cafe"));

        assertThat(first).isEqualTo(second);
        assertThat(first)
                .startsWith(PostContentAnalysisSourceVersion.VERSION_PREFIX)
                .hasSize(PostContentAnalysisSourceVersion.VERSION_PREFIX.length() + 64);
    }

    @Test
    void everyAnalysisInputFieldParticipatesInVersion() {
        String baseline = PostContentAnalysisSourceVersion.from(
                "Seoul walk",
                "<p>Seoul Forest and cafe</p>",
                "Seoul",
                List.of("walking", "cafe"));

        assertThat(PostContentAnalysisSourceVersion.from(
                "Changed title", "<p>Seoul Forest and cafe</p>", "Seoul", List.of("walking", "cafe")))
                .isNotEqualTo(baseline);
        assertThat(PostContentAnalysisSourceVersion.from(
                "Seoul walk", "<p>Changed content</p>", "Seoul", List.of("walking", "cafe")))
                .isNotEqualTo(baseline);
        assertThat(PostContentAnalysisSourceVersion.from(
                "Seoul walk", "<p>Seoul Forest and cafe</p>", "Busan", List.of("walking", "cafe")))
                .isNotEqualTo(baseline);
        assertThat(PostContentAnalysisSourceVersion.from(
                "Seoul walk", "<p>Seoul Forest and cafe</p>", "Seoul", List.of("cafe", "walking")))
                .isNotEqualTo(baseline);
    }
}
