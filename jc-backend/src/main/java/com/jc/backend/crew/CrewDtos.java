package com.jc.backend.crew;

import com.jc.backend.region.RegionDtos;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.AssertTrue;
import jakarta.validation.constraints.DecimalMax;
import jakarta.validation.constraints.DecimalMin;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** 엔티티를 직접 노출하지 않고 크루 API에 필요한 입력·출력 필드만 정의합니다. */
public final class CrewDtos {

    private CrewDtos() {}

    public record CreateRequest(
            @NotBlank @Size(max = 25) String title,
            @Size(max = 50) String regionCode,
            @Size(max = 100) String regionName,
            @NotBlank String description,
            @NotNull LocalDate travelDate,
            @Min(2) @Max(20) int capacity,
            Boolean approvalRequired,
            @Size(max = 500) String coverImageUrl,
            @Size(max = 500) String openChatUrl,
            @Size(max = 5) List<@NotBlank @Size(max = 20) String> tags,
            @NotNull CrewCategory category,
            @Size(max = 10) List<@NotNull Long> routeIds,
            @Size(max = 20) List<@Valid RoutePlaceRequest> routePlaces) {

        @AssertTrue(message = "여행 루트를 한 개 이상 만들어 주세요.")
        public boolean isRoutePresent() {
            return routePlaces != null && !routePlaces.isEmpty()
                    || routeIds != null && !routeIds.isEmpty();
        }

        public CreateRequest(
                String title,
                String regionCode,
                String regionName,
                String description,
                LocalDate travelDate,
                int capacity,
                Boolean approvalRequired,
                String coverImageUrl,
                String openChatUrl,
                List<String> tags,
                CrewCategory category,
                List<Long> routeIds) {
            this(title, regionCode, regionName, description, travelDate, capacity,
                    approvalRequired, coverImageUrl, openChatUrl, tags,
                    category, routeIds, List.of());
        }

        public CreateRequest(
                String title,
                String regionCode,
                String regionName,
                String description,
                LocalDate travelDate,
                int capacity,
                Boolean approvalRequired,
                String coverImageUrl,
                String openChatUrl,
                List<String> tags) {
            this(title, regionCode, regionName, description, travelDate, capacity,
                    approvalRequired, coverImageUrl, openChatUrl, tags,
                    CrewCategory.OTHER, List.of(), List.of());
        }

        public CreateRequest(
                String title,
                String regionCode,
                String regionName,
                String description,
                LocalDate travelDate,
                int capacity,
                Boolean approvalRequired,
                String coverImageUrl,
                List<String> tags) {
            this(
                    title, regionCode, regionName, description,
                    travelDate, capacity, approvalRequired, coverImageUrl, null, tags,
                    CrewCategory.OTHER, List.of(), List.of());
        }

        public CreateRequest(
                String title,
                String regionCode,
                String regionName,
                String description,
                LocalDate travelDate,
                int capacity,
                Boolean approvalRequired) {
            this(
                    title, regionCode, regionName, description,
                    travelDate, capacity, approvalRequired, null, null, List.of(),
                    CrewCategory.OTHER, List.of(), List.of());
        }
    }

    public record UpdateRequest(
            @Size(max = 25) String title,
            @Size(max = 50) String regionCode,
            @Size(max = 100) String regionName,
            String description,
            LocalDate travelDate,
            @Min(2) @Max(20) Integer capacity,
            @Size(max = 500) String coverImageUrl,
            @Size(max = 500) String openChatUrl,
            @Size(max = 5) List<@NotBlank @Size(max = 20) String> tags,
            CrewCategory category,
            @Size(max = 10) List<@NotNull Long> routeIds,
            @Size(min = 1, max = 20) List<@Valid RoutePlaceRequest> routePlaces) {

        public UpdateRequest(
                String title,
                String regionCode,
                String regionName,
                String description,
                LocalDate travelDate,
                Integer capacity,
                String coverImageUrl,
                String openChatUrl,
                List<String> tags) {
            this(title, regionCode, regionName, description, travelDate, capacity,
                    coverImageUrl, openChatUrl, tags, null, null, null);
        }

        public UpdateRequest(
                String title,
                String regionCode,
                String regionName,
                String description,
                LocalDate travelDate,
                Integer capacity,
                String coverImageUrl,
                List<String> tags) {
            this(
                    title, regionCode, regionName, description, travelDate,
                    capacity, coverImageUrl, null, tags, null, null, null);
        }
    }

    public record JoinRequest(@Size(max = 500) String message) {}

    public record ReviewRequest(CrewMemberStatus status) {}

    public record View(
            Long id,
            String title,
            String regionCode,
            String regionName,
            String description,
            String coverImageUrl,
            String openChatUrl,
            List<String> tags,
            CrewCategory category,
            List<RouteView> routes,
            List<RoutePlaceView> routePlaces,
            LocalDate travelDate,
            int capacity,
            long memberCount,
            long pendingApplicationCount,
            boolean recruiting,
            boolean approvalRequired,
            Long ownerId,
            String ownerNickname,
            LocalDateTime createdAt,
            LocalDateTime endedAt,
            Viewer viewer) {}

    public record RouteImageRequest(
            @NotBlank @Size(max = 500) String imageUrl,
            @Size(max = 200) String altText) {}

    public record RoutePlaceRequest(
            @Size(max = 50) String regionCode,
            @Size(max = 100) String regionName,
            @Size(max = 255) String regionPlaceId,
            @DecimalMin("-90.0") @DecimalMax("90.0") Double latitude,
            @DecimalMin("-180.0") @DecimalMax("180.0") Double longitude,
            @NotBlank String content,
            @Size(max = 10) List<@Valid RouteImageRequest> images) {

        public RoutePlaceRequest(
                String regionCode,
                String regionName,
                String regionPlaceId,
                String content,
                List<RouteImageRequest> images) {
            this(regionCode, regionName, regionPlaceId, null, null, content, images);
        }
    }

    public record RouteView(
            Long id,
            String title,
            String regionName,
            String coverImageUrl,
            LocalDate travelStartDate,
            LocalDate travelEndDate) {}

    public record RoutePlaceView(
            Long id,
            RegionDtos.View region,
            String placeName,
            Double latitude,
            Double longitude,
            String content,
            int sortOrder,
            List<RouteImageView> images) {}

    public record RouteImageView(
            Long id,
            String imageUrl,
            int sortOrder,
            String altText) {}

    public record Viewer(
            CrewMemberStatus membershipStatus,
            boolean owner,
            boolean canJoin,
            boolean canCancel,
            boolean canManageApplications,
            boolean canAccessOpenChat,
            boolean canAccessChat) {}

    public record MyCrewItem(
            View crew,
            CrewMemberStatus membershipStatus,
            LocalDateTime joinedOrAppliedAt) {}

    public enum MemberRole {
        OWNER,
        MEMBER
    }

    public record MemberView(
            Long userId,
            String nickname,
            String profileImageUrl,
            MemberRole role,
            LocalDateTime joinedAt) {}

    public record ApplicationView(
            Long id,
            Long crewId,
            Long userId,
            String userNickname,
            String userProfileImageUrl,
            String message,
            CrewMemberStatus status,
            Long reviewedBy,
            LocalDateTime reviewedAt,
            LocalDateTime createdAt) {}
}
