package com.jc.backend.intelligence.journeyai;

import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Pattern;
import jakarta.validation.constraints.Size;
import java.util.List;

public final class JourneyAiDtos {

    private JourneyAiDtos() {}

    public record HistoryMessage(
            @NotBlank @Pattern(regexp = "user|assistant") String role,
            @NotBlank @Size(max = 1500) String content) {}

    public record ChatRequest(
            @NotBlank @Size(max = 2000) String message,
            Long currentPostId,
            @Size(max = 100) String region,
            @Size(max = 6) List<@Valid HistoryMessage> history) {}

    public record SuggestedPost(
            Long id,
            String title,
            String coverImageUrl,
            String regionName,
            List<String> themes,
            List<String> travelStyles,
            String reason) {}

    public record Place(
            String name,
            Double latitude,
            Double longitude,
            int order,
            Long sourcePostId) {}

    public record ChatResponse(
            String answer,
            List<SuggestedPost> suggestedPosts,
            List<Place> places,
            int groundedPostCount) {}
}
