package com.jc.backend.crew;

import com.jc.backend.common.DomainException;
import com.jc.backend.common.PageResponse;
import com.jc.backend.post.TagService;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionService;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.time.LocalDateTime;
import java.util.Collection;
import java.util.Collections;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/**
 * 크루 생성, 참가 신청, 승인/거절, 정원 관리 흐름을 담당합니다.
 *
 * <p>정원과 승인 상태는 동시에 변경될 수 있으므로, 참가 신청과 승인 처리에는 크루 행 잠금과
 * 멤버 상태 검증을 함께 사용해 경쟁 조건을 줄입니다.
 */
@Service
@Transactional(readOnly = true) // 목록·상세는 읽기 최적화하고 상태 변경 메서드에서만 쓰기를 허용합니다.
public class CrewService {

    private static final Collection<CrewMemberStatus> ACTIVE_STATUSES =
            List.of(CrewMemberStatus.OWNER, CrewMemberStatus.APPROVED);
    private static final Collection<CrewMemberStatus> EXISTING_APPLICATION_STATUSES =
            List.of(CrewMemberStatus.OWNER, CrewMemberStatus.PENDING, CrewMemberStatus.APPROVED);
    private static final Collection<CrewMemberStatus> MY_CREW_STATUSES =
            List.of(CrewMemberStatus.OWNER, CrewMemberStatus.APPROVED, CrewMemberStatus.PENDING);

    private final CrewRepository crews;
    private final CrewMemberRepository members;
    private final UserRepository users;
    private final RegionService regionService;
    private final TagService tagService;

    public CrewService(
            CrewRepository crews,
            CrewMemberRepository members,
            UserRepository users,
            RegionService regionService,
            TagService tagService) {
        this.crews = crews;
        this.members = members;
        this.users = users;
        this.regionService = regionService;
        this.tagService = tagService;
    }

    public PageResponse<CrewDtos.View> list(Pageable pageable) {
        return list(null, null, null, pageable);
    }

    public PageResponse<CrewDtos.View> list(Long viewerId, Pageable pageable) {
        return list(viewerId, null, null, pageable);
    }

    public PageResponse<CrewDtos.View> list(
            Long viewerId,
            String keyword,
            String region,
            Pageable pageable) {
        Page<Crew> page = crews.searchRecruiting(
                normalizeSearch(keyword),
                normalizeSearch(region),
                pageable);
        List<Long> crewIds = page.getContent().stream().map(Crew::getId).toList();
        Map<Long, Long> activeCounts = countMap(crewIds, ACTIVE_STATUSES);
        Map<Long, Long> pendingCounts = countMap(crewIds, List.of(CrewMemberStatus.PENDING));
        Map<Long, List<String>> tagsByCrewId = tagMap(crewIds);
        Map<Long, CrewMemberStatus> viewerStatuses = viewerStatusMap(crewIds, viewerId);

        return PageResponse.from(page.map(crew -> {
            long memberCount = activeCounts.getOrDefault(crew.getId(), 0L);
            return view(
                    crew,
                    memberCount,
                    pendingCounts.getOrDefault(crew.getId(), 0L),
                    tagsByCrewId.getOrDefault(crew.getId(), List.of()),
                    viewer(crew, viewerId, viewerStatuses.get(crew.getId()), memberCount));
        }));
    }

    public CrewDtos.View detail(Long crewId) {
        return detail(null, crewId);
    }

    public CrewDtos.View detail(Long viewerId, Long crewId) {
        Crew crew = findCrew(crewId);
        Map<Long, List<String>> tagsByCrewId = tagMap(List.of(crewId));
        long memberCount = members.countByCrewIdAndStatusIn(crewId, ACTIVE_STATUSES);
        CrewMemberStatus viewerStatus = viewerId == null
                ? null
                : members.findByCrewIdAndUserId(crewId, viewerId)
                        .map(CrewMember::getStatus)
                        .orElse(null);
        return view(
                crew,
                memberCount,
                members.countByCrewIdAndStatusIn(crewId, List.of(CrewMemberStatus.PENDING)),
                tagsByCrewId.getOrDefault(crewId, List.of()),
                viewer(crew, viewerId, viewerStatus, memberCount));
    }

    public PageResponse<CrewDtos.MemberView> members(Long crewId, Pageable pageable) {
        findCrew(crewId);
        return PageResponse.from(members
                .findByCrewIdAndStatusInOrderByCreatedAtAscIdAsc(
                        crewId,
                        ACTIVE_STATUSES,
                        pageable)
                .map(this::memberView));
    }

    public PageResponse<CrewDtos.MyCrewItem> myCrews(Long userId, Pageable pageable) {
        user(userId);
        Page<CrewMember> page = members.findByUserIdAndStatusInOrderByUpdatedAtDescIdDesc(
                userId,
                MY_CREW_STATUSES,
                pageable);
        List<Long> crewIds = page.getContent().stream()
                .map(member -> member.getCrew().getId())
                .toList();
        Map<Long, Long> activeCounts = countMap(crewIds, ACTIVE_STATUSES);
        Map<Long, Long> pendingCounts = countMap(crewIds, List.of(CrewMemberStatus.PENDING));
        Map<Long, List<String>> tagsByCrewId = tagMap(crewIds);

        return PageResponse.from(page.map(member -> {
            Crew crew = member.getCrew();
            long memberCount = activeCounts.getOrDefault(crew.getId(), 0L);
            CrewDtos.View crewView = view(
                    crew,
                    memberCount,
                    pendingCounts.getOrDefault(crew.getId(), 0L),
                    tagsByCrewId.getOrDefault(crew.getId(), List.of()),
                    viewer(crew, userId, member.getStatus(), memberCount));
            return new CrewDtos.MyCrewItem(
                    crewView,
                    member.getStatus(),
                    joinedOrAppliedAt(member));
        }));
    }

    @Transactional
    public CrewDtos.View create(Long userId, CrewDtos.CreateRequest request) {
        UserAccount owner = user(userId);
        Region region = regionService.require(request.regionCode(), request.regionName());
        boolean approvalRequired = request.approvalRequired() == null
                || request.approvalRequired();
        Crew crew = crews.save(new Crew(
                owner,
                region,
                request.title().trim(),
                request.description(),
                request.travelDate(),
                request.capacity(),
                approvalRequired,
                request.coverImageUrl(),
                tagService.resolve(request.tags())));
        members.save(new CrewMember(crew, owner, CrewMemberStatus.OWNER));
        return view(
                crew,
                1L,
                0L,
                crew.getTags().stream().map(tag -> tag.getName()).toList(),
                viewer(crew, userId, CrewMemberStatus.OWNER, 1L));
    }

    /**
     * 참가 신청은 모집 중인 크루에 대해서만 허용하고, 정원이 가득 차면 거절합니다.
     * 이미 처리된 신청이 있으면 재신청이 아니라 기존 상태를 유지해 멱등하게 동작합니다.
     */
    @Transactional
    public CrewDtos.ApplicationView join(Long userId, Long crewId) {
        // 크루 행 잠금 뒤 정원을 다시 세어 동시 신청이 capacity를 넘지 않게 합니다.
        Crew crew = lockedCrew(crewId);
        ensureRecruiting(crew);
        UserAccount applicant = user(userId);

        CrewMember existing = members.findByCrewIdAndUserId(crewId, userId).orElse(null);
        if (existing != null && EXISTING_APPLICATION_STATUSES.contains(existing.getStatus())) {
            return applicationView(existing);
        }

        if (approvedMemberCount(crewId) >= crew.getCapacity()) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "CREW_FULL",
                    "크루 정원이 가득 찼습니다.");
        }

        CrewMemberStatus nextStatus = crew.isApprovalRequired()
                ? CrewMemberStatus.PENDING
                : CrewMemberStatus.APPROVED;
        CrewMember application;
        if (existing == null) {
            application = members.save(new CrewMember(crew, applicant, nextStatus));
        } else {
            existing.reapply(nextStatus);
            application = existing;
        }
        return applicationView(application);
    }

    @Transactional
    public void cancelJoin(Long userId, Long crewId) {
        CrewMember application = members.findByCrewIdAndUserId(crewId, userId)
                .orElseThrow(() -> new DomainException(
                        HttpStatus.NOT_FOUND,
                        "CREW_APPLICATION_NOT_FOUND",
                        "크루 참가 내역을 찾을 수 없습니다."));
        if (application.getStatus() == CrewMemberStatus.OWNER) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "CREW_OWNER_CANNOT_CANCEL",
                    "크루장은 참가를 취소할 수 없습니다.");
        }
        application.cancel();
    }

    public PageResponse<CrewDtos.ApplicationView> applications(
            Long ownerId,
            Long crewId,
            Pageable pageable) {
        Crew crew = findCrew(crewId);
        ensureOwner(crew, ownerId);
        return PageResponse.from(members
                .findByCrewIdAndStatusOrderByCreatedAtAsc(
                        crewId,
                        CrewMemberStatus.PENDING,
                        pageable)
                .map(this::applicationView));
    }

    /**
     * 크루장은 참가 신청을 승인하거나 거절할 수 있으며, 승인 시점에 정원 초과 여부를 다시 확인합니다.
     * 이미 처리된 신청은 다시 변경되지 않도록 상태 검증을 수행합니다.
     */
    @Transactional
    public CrewDtos.ApplicationView review(
            Long ownerId,
            Long crewId,
            Long applicationId,
            CrewDtos.ReviewRequest request) {
        Crew crew = lockedCrew(crewId);
        ensureOwner(crew, ownerId);
        if (request.status() != CrewMemberStatus.APPROVED
                && request.status() != CrewMemberStatus.REJECTED) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_CREW_REVIEW_STATUS",
                    "승인 또는 거절 상태만 지정할 수 있습니다.");
        }

        CrewMember application = members.findApplication(crewId, applicationId)
                .orElseThrow(() -> new DomainException(
                        HttpStatus.NOT_FOUND,
                        "CREW_APPLICATION_NOT_FOUND",
                        "크루 참가 신청을 찾을 수 없습니다."));
        if (application.getStatus() != CrewMemberStatus.PENDING) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "CREW_APPLICATION_ALREADY_REVIEWED",
                    "이미 처리된 참가 신청입니다.");
        }

        UserAccount owner = user(ownerId);
        if (request.status() == CrewMemberStatus.APPROVED) {
            if (approvedMemberCount(crewId) >= crew.getCapacity()) {
                throw new DomainException(
                        HttpStatus.CONFLICT,
                        "CREW_FULL",
                        "크루 정원이 가득 찼습니다.");
            }
            application.approve(owner);
        } else {
            application.reject(owner);
        }
        return applicationView(application);
    }

    private Map<Long, List<String>> tagMap(List<Long> crewIds) {
        if (crewIds.isEmpty()) {
            return Map.of();
        }
        return crews.findTagsByCrewIds(crewIds).stream()
                .collect(Collectors.groupingBy(
                        CrewTagProjection::getCrewId,
                        LinkedHashMap::new,
                        Collectors.mapping(CrewTagProjection::getTagName, Collectors.toList())));
    }

    private Map<Long, CrewMemberStatus> viewerStatusMap(List<Long> crewIds, Long viewerId) {
        if (viewerId == null || crewIds.isEmpty()) {
            return Map.of();
        }
        return members.findViewerMemberships(crewIds, viewerId).stream()
                .collect(Collectors.toUnmodifiableMap(
                        CrewViewerMembershipProjection::getCrewId,
                        CrewViewerMembershipProjection::getStatus));
    }

    private Map<Long, Long> countMap(
            List<Long> crewIds,
            Collection<CrewMemberStatus> statuses) {
        if (crewIds.isEmpty()) {
            return Collections.emptyMap();
        }
        return members.countByCrewIdsAndStatuses(crewIds, statuses)
                .stream()
                .collect(Collectors.toUnmodifiableMap(
                        CrewMemberCountProjection::getCrewId,
                        CrewMemberCountProjection::getTotal,
                        (existing, ignored) -> existing));
    }

    private long approvedMemberCount(Long crewId) {
        return members.countByCrewIdAndStatusIn(crewId, ACTIVE_STATUSES);
    }

    private String normalizeSearch(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return value.trim().toLowerCase(Locale.ROOT);
    }

    private Crew findCrew(Long crewId) {
        return crews.findWithOwnerAndRegionById(crewId)
                .orElseThrow(this::crewNotFound);
    }

    private Crew lockedCrew(Long crewId) {
        return crews.findByIdForUpdate(crewId)
                .orElseThrow(this::crewNotFound);
    }

    private void ensureRecruiting(Crew crew) {
        if (!crew.isRecruiting()) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "CREW_CLOSED",
                    "모집이 종료된 크루입니다.");
        }
    }

    private void ensureOwner(Crew crew, Long userId) {
        if (!crew.getOwner().getId().equals(userId)) {
            throw new DomainException(
                    HttpStatus.FORBIDDEN,
                    "CREW_OWNER_REQUIRED",
                    "크루장만 참가 신청을 관리할 수 있습니다.");
        }
    }

    private DomainException crewNotFound() {
        return new DomainException(
                HttpStatus.NOT_FOUND,
                "CREW_NOT_FOUND",
                "크루를 찾을 수 없습니다.");
    }

    private UserAccount user(Long userId) {
        return users.findById(userId)
                .orElseThrow(() -> new DomainException(
                        HttpStatus.NOT_FOUND,
                        "USER_NOT_FOUND",
                        "사용자를 찾을 수 없습니다."));
    }

    private CrewDtos.Viewer viewer(
            Crew crew,
            Long viewerId,
            CrewMemberStatus membershipStatus,
            long memberCount) {
        if (viewerId == null) {
            return null;
        }

        boolean owner = crew.getOwner().getId().equals(viewerId);
        CrewMemberStatus effectiveStatus = owner ? CrewMemberStatus.OWNER : membershipStatus;
        boolean canJoin = !owner
                && (effectiveStatus == null
                        || effectiveStatus == CrewMemberStatus.REJECTED
                        || effectiveStatus == CrewMemberStatus.CANCELLED)
                && crew.isRecruiting()
                && memberCount < crew.getCapacity();
        boolean canCancel = effectiveStatus == CrewMemberStatus.PENDING
                || effectiveStatus == CrewMemberStatus.APPROVED;

        return new CrewDtos.Viewer(
                effectiveStatus,
                owner,
                canJoin,
                canCancel,
                owner);
    }

    private LocalDateTime joinedOrAppliedAt(CrewMember member) {
        if (member.getStatus() == CrewMemberStatus.PENDING) {
            return member.getUpdatedAt();
        }
        if (member.getStatus() == CrewMemberStatus.APPROVED
                && member.getReviewedAt() != null) {
            return member.getReviewedAt();
        }
        return member.getCreatedAt();
    }

    private CrewDtos.View view(
            Crew crew,
            long memberCount,
            long pendingCount,
            List<String> tags,
            CrewDtos.Viewer viewer) {
        return new CrewDtos.View(
                crew.getId(),
                crew.getTitle(),
                crew.getRegion().getCode(),
                crew.getRegionName(),
                crew.getDescription(),
                crew.getCoverImageUrl(),
                tags,
                crew.getTravelDate(),
                crew.getCapacity(),
                memberCount,
                pendingCount,
                crew.isRecruiting(),
                crew.isApprovalRequired(),
                crew.getOwner().getId(),
                crew.getOwner().getNickname(),
                crew.getCreatedAt(),
                viewer);
    }

    private CrewDtos.MemberView memberView(CrewMember member) {
        return new CrewDtos.MemberView(
                member.getUser().getId(),
                member.getUser().getNickname(),
                member.getUser().getProfileImageUrl(),
                member.getStatus() == CrewMemberStatus.OWNER
                        ? CrewDtos.MemberRole.OWNER
                        : CrewDtos.MemberRole.MEMBER,
                joinedOrAppliedAt(member));
    }

    private CrewDtos.ApplicationView applicationView(CrewMember application) {
        return new CrewDtos.ApplicationView(
                application.getId(),
                application.getCrew().getId(),
                application.getUser().getId(),
                application.getUser().getNickname(),
                application.getStatus(),
                application.getReviewedBy() == null
                        ? null
                        : application.getReviewedBy().getId(),
                application.getReviewedAt(),
                application.getCreatedAt());
    }
}
