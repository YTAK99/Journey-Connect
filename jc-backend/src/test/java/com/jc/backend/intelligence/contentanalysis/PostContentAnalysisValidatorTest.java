package com.jc.backend.intelligence.contentanalysis;

import static org.assertj.core.api.Assertions.assertThatThrownBy;

import java.time.Instant;
import java.util.List;
import org.junit.jupiter.api.Test;

class PostContentAnalysisValidatorTest {

    private final PostContentAnalysisValidator validator = new PostContentAnalysisValidator();

    @Test
    void acceptsValidSeongsuAnalysis() {
        PostContentAnalysisInputV1 input = validInput();
        validator.validateResult(validResult(input), input);
    }

    @Test
    void rejectsPlaceMentionThatDoesNotExistInSourcePost() {
        PostContentAnalysisInputV1 input = validInput();
        PostContentAnalysisResultV1 invalid = new PostContentAnalysisResultV1(
                "analysis:8bc24b12-31ad-4e4b-a9d1-c048b4a54121",
                PostContentAnalysisResultV1.SCHEMA_VERSION,
                input.sourceContentVersion(),
                "ko",
                "gemini-2.5-flash-2026-06",
                "post-analysis-prompt-v1",
                AnalysisStatus.SUCCEEDED,
                "성수동 여행 후기입니다.",
                List.of(ContentTheme.SHOPPING),
                List.of(TravelStyle.WALKING),
                List.of("성수동"),
                List.of(new PlaceMentionCandidate("남산타워", "남산서울타워", 0.93)),
                0.91,
                Instant.parse("2026-08-07T01:00:00Z"));

        assertThatThrownBy(() -> validator.validateResult(invalid, input))
                .isInstanceOf(PostContentAnalysisValidationException.class)
                .hasMessageContaining("must appear in the source post");
    }

    @Test
    void rejectsUnversionedModelIdentifier() {
        PostContentAnalysisInputV1 input = validInput();
        PostContentAnalysisResultV1 valid = validResult(input);
        PostContentAnalysisResultV1 invalid = new PostContentAnalysisResultV1(
                valid.analysisRunId(),
                valid.schemaVersion(),
                valid.sourceContentVersion(),
                valid.sourceLanguage(),
                "latest",
                valid.promptVersion(),
                valid.status(),
                valid.summary(),
                valid.themes(),
                valid.travelStyles(),
                valid.suggestedTags(),
                valid.placeMentions(),
                valid.confidence(),
                valid.createdAt());

        assertThatThrownBy(() -> validator.validateResult(invalid, input))
                .isInstanceOf(PostContentAnalysisValidationException.class)
                .hasMessageContaining("explicit immutable version");
    }

    static PostContentAnalysisInputV1 validInput() {
        return new PostContentAnalysisInputV1(
                123L,
                "성수동 빈티지숍이랑 카페 하루 코스",
                "토요일 오후에 성수동을 돌아다녔습니다. 먼저 성수연방에 들러 구경하고, 근처 빈티지숍 두 곳을 둘러봤습니다. 점심은 대림창고 근처에서 먹었고 마지막에는 서울숲까지 걸어갔습니다. 성수역부터 서울숲까지 대부분 걸어서 이동할 수 있었습니다.",
                "서울 성동구",
                List.of("성수동", "빈티지", "카페"),
                "post:123:content:4");
    }

    static PostContentAnalysisResultV1 validResult(PostContentAnalysisInputV1 input) {
        return new PostContentAnalysisResultV1(
                "analysis:8bc24b12-31ad-4e4b-a9d1-c048b4a54121",
                PostContentAnalysisResultV1.SCHEMA_VERSION,
                input.sourceContentVersion(),
                "ko",
                "gemini-2.5-flash-2026-06",
                "post-analysis-prompt-v1",
                AnalysisStatus.SUCCEEDED,
                "성수연방과 빈티지숍을 둘러본 뒤 서울숲까지 걸어간 성수동 하루 여행 후기입니다.",
                List.of(ContentTheme.SHOPPING, ContentTheme.CAFE, ContentTheme.LOCAL_EXPERIENCE),
                List.of(TravelStyle.WALKING, TravelStyle.SHORT_TRIP),
                List.of("성수연방", "서울숲", "도보여행"),
                List.of(
                        new PlaceMentionCandidate("성수연방", "성수연방", 0.96),
                        new PlaceMentionCandidate("대림창고", "대림창고", 0.91),
                        new PlaceMentionCandidate("서울숲", "서울숲", 0.98),
                        new PlaceMentionCandidate("성수역", "성수역", 0.97)),
                0.94,
                Instant.parse("2026-08-07T01:00:00Z"));
    }
}
