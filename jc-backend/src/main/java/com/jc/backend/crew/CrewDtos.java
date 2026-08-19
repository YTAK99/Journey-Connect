package com.jc.backend.crew;

import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

/** 엔티티를 직접 노출하지 않고 크루 API에 필요한 입력·출력 필드만 정의합니다. */
public final class CrewDtos {

    private CrewDtos() {}

    public record CreateRequest(
            @NotBlank @Size(max = 120) String title,
            @Size(max = 50) String regionCode,
            @Size(max = 100) String regionName,
            @NotBlank String description,
            LocalDate travelDate,
            @Min(2) @Max(100) int capacity,
            Boolean approvalRequired,
            @Size(max = 500) String coverImageUrl,
            @Size(max = 5) List<@NotBlank @Size(max = 20) String> tags) {

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
                    travelDate, capacity, approvalRequired, null, List.of());
        }
    }

    public record ReviewRequest(CrewMemberStatus status) {}

    public record View(
            Long id,
            String title,
            String regionCode,
            String regionName,
            String description,
            String coverImageUrl,
            List<String> tags,
            LocalDate travelDate,
            int capacity,
            long memberCount,
            long pendingApplicationCount,
            boolean recruiting,
            boolean approvalRequired,
            Long ownerId,
            String ownerNickname,
            LocalDateTime createdAt,
            Viewer viewer) {}

    public record Viewer(
            CrewMemberStatus membershipStatus,
            boolean owner,
            boolean canJoin,
            boolean canCancel,
            boolean canManageApplications) {}

    public record MyCrewItem(
            View crew,
            CrewMemberStatus membershipStatus,
            LocalDateTime joinedOrAppliedAt) {}

    public record ApplicationView(
            Long id,
            Long crewId,
            Long userId,
            String userNickname,
            CrewMemberStatus status,
            Long reviewedBy,
            LocalDateTime reviewedAt,
            LocalDateTime createdAt) {}
}
