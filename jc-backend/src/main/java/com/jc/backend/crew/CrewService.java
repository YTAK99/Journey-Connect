package com.jc.backend.crew;

import com.jc.backend.common.DomainException;
import com.jc.backend.common.PageResponse;
import com.jc.backend.notification.NotificationService;
import com.jc.backend.post.Tag;
import com.jc.backend.post.TagService;
import com.jc.backend.post.JourneyPost;
import com.jc.backend.post.JourneyPostRepository;
import com.jc.backend.post.RichTextSanitizer;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionService;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.net.URI;
import java.time.LocalDate;
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
    private static final int MAX_RECRUITING_OWNED_CREWS = 3;

    private final CrewRepository crews;
    private final CrewMemberRepository members;
    private final UserRepository users;
    private final RegionService regionService;
    private final TagService tagService;
    private final JourneyPostRepository posts;
    private final RichTextSanitizer richTextSanitizer;
    private final NotificationService notificationService;
    private final CrewRecommendationFeedbackService recommendationFeedback;

    public CrewService(
            CrewRepository crews,
            CrewMemberRepository members,
            UserRepository users,
            RegionService regionService,
            TagService tagService,
            JourneyPostRepository posts,
            RichTextSanitizer richTextSanitizer,
            NotificationService notificationService,
            CrewRecommendationFeedbackService recommendationFeedback) {
        this.crews = crews;
        this.members = members;
        this.users = users;
        this.regionService = regionService;
        this.tagService = tagService;
        this.posts = posts;
        this.richTextSanitizer = richTextSanitizer;
        this.notificationService = notificationService;
        this.recommendationFeedback = recommendationFeedback;
    }

    public PageResponse<CrewDtos.View> list(Pageable pageable) {
        return list(null, null, null, null, pageable);
    }

    public PageResponse<CrewDtos.View> list(Long viewerId, Pageable pageable) {
        return list(viewerId, null, null, null, pageable);
    }

    public PageResponse<CrewDtos.View> list(
            Long viewerId,
            String keyword,
            String region,
            CrewCategory category,
            Pageable pageable) {
        Page<Crew> page = crews.searchRecruiting(
                normalizeSearch(keyword),
                normalizeSearch(region),
                category,
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
        UserAccount owner = lockedUser(userId);
        ensureOwnedRecruitingLimit(userId);
        boolean approvalRequired = request.approvalRequired() == null
                || request.approvalRequired();
        List<Crew.RoutePlaceData> routePlaces = resolveRoutePlaces(request.routePlaces());
        List<JourneyPost> routes = resolveRoutes(userId, request.routeIds(), false);
        Region region = routePlaces.isEmpty()
                ? regionService.require(request.regionCode(), request.regionName())
                : routePlaces.get(0).region();
        Crew crew = new Crew(
                owner,
                region,
                request.title().trim(),
                request.description(),
                request.travelDate(),
                request.capacity(),
                approvalRequired,
                request.coverImageUrl(),
                tagService.resolve(request.tags()));
        crew.updateOpenChatUrl(normalizeOpenChatUrl(request.openChatUrl()));
        crew.updateCategoryAndRoutes(request.category(), routes);
        crew.replaceRoutePlaces(routePlaces);
        crew = crews.save(crew);
        members.save(new CrewMember(crew, owner, CrewMemberStatus.OWNER));
        return view(
                crew,
                1L,
                0L,
                crew.getTags().stream().map(tag -> tag.getName()).toList(),
                viewer(crew, userId, CrewMemberStatus.OWNER, 1L));
    }


    @Transactional
    public CrewDtos.View update(
            Long ownerId,
            Long crewId,
            CrewDtos.UpdateRequest request) {
        Crew crew = lockedCrew(crewId);
        ensureOwner(crew, ownerId);

        long memberCount = approvedMemberCount(crewId);
        int nextCapacity = request.capacity() == null ? crew.getCapacity() : request.capacity();
        if (nextCapacity < memberCount) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "CREW_CAPACITY_BELOW_ACTIVE_MEMBERS",
                    "현재 참가 인원보다 정원을 작게 설정할 수 없습니다.");
        }

        List<Crew.RoutePlaceData> nextRoutePlaces = request.routePlaces() == null
                ? null
                : resolveRoutePlaces(request.routePlaces());
        Region nextRegion = nextRoutePlaces == null
                ? crew.getRegion()
                : nextRoutePlaces.get(0).region();
        if (request.regionCode() != null || request.regionName() != null) {
            nextRegion = regionService.require(request.regionCode(), request.regionName());
        }

        String nextTitle = patchedRequired(
                request.title(),
                crew.getTitle(),
                "CREW_TITLE_REQUIRED",
                "크루 제목은 비워둘 수 없습니다.");
        String nextDescription = patchedRequired(
                request.description(),
                crew.getDescription(),
                "CREW_DESCRIPTION_REQUIRED",
                "크루 설명은 비워둘 수 없습니다.");
        LocalDate nextTravelDate = request.travelDate() == null
                ? crew.getTravelDate()
                : request.travelDate();
        String nextCoverImageUrl = request.coverImageUrl() == null
                ? crew.getCoverImageUrl()
                : normalizeOptional(request.coverImageUrl());
        String nextOpenChatUrl = request.openChatUrl() == null
                ? crew.getOpenChatUrl()
                : normalizeOpenChatUrl(request.openChatUrl());
        List<Tag> nextTags = request.tags() == null
                ? crew.getTags()
                : tagService.resolve(request.tags());
        CrewCategory nextCategory = request.category() == null
                ? crew.getCategory()
                : request.category();
        List<JourneyPost> nextRoutes = request.routeIds() == null
                ? crew.getRoutes()
                : resolveRoutes(ownerId, request.routeIds(), true);

        crew.updateDetails(
                nextRegion,
                nextTitle,
                nextDescription,
                nextTravelDate,
                nextCapacity,
                nextCoverImageUrl,
                nextTags);
        crew.updateOpenChatUrl(nextOpenChatUrl);
        crew.updateCategoryAndRoutes(nextCategory, nextRoutes);
        if (nextRoutePlaces != null) crew.replaceRoutePlaces(nextRoutePlaces);
        return managementView(crew, ownerId, memberCount);
    }

    @Transactional
    public CrewDtos.View closeRecruitment(Long ownerId, Long crewId) {
        Crew crew = lockedCrew(crewId);
        ensureOwner(crew, ownerId);
        crew.closeRecruitment();
        return managementView(crew, ownerId, approvedMemberCount(crewId));
    }

    @Transactional
    public CrewDtos.View reopenRecruitment(Long ownerId, Long crewId) {
        Crew crew = lockedCrew(crewId);
        ensureOwner(crew, ownerId);
        if (crew.getEndedAt() != null) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "CREW_ALREADY_ENDED",
                    "종료된 크루는 다시 모집할 수 없습니다.");
        }

        long memberCount = approvedMemberCount(crewId);
        if (memberCount >= crew.getCapacity()) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "CREW_FULL",
                    "정원이 가득 찬 크루는 모집을 재개할 수 없습니다.");
        }
        if (!crew.isRecruiting()) {
            lockedUser(ownerId);
            ensureOwnedRecruitingLimit(ownerId);
        }

        crew.reopenRecruitment();
        return managementView(crew, ownerId, memberCount);
    }

    /**
     * 참가 신청은 모집 중인 크루에 대해서만 허용하고, 정원이 가득 차면 거절합니다.
     * 이미 처리된 신청이 있으면 재신청이 아니라 기존 상태를 유지해 멱등하게 동작합니다.
     */
    @Transactional
    public CrewDtos.ApplicationView join(Long userId, Long crewId) {
        // 기존 내부 호출과 테스트 계약은 유지하되, HTTP API는 사용자가 입력한 메시지를 전달합니다.
        return join(userId, crewId, "참여 신청합니다.");
    }

    @Transactional
    public CrewDtos.ApplicationView join(Long userId, Long crewId, String message) {
        // 크루 행 잠금 뒤 정원을 다시 세어 동시 신청이 capacity를 넘지 않게 합니다.
        Crew crew = lockedCrew(crewId);
        ensureRecruiting(crew);
        UserAccount applicant = user(userId);

        CrewMember existing = members.findByCrewIdAndUserId(crewId, userId).orElse(null);
        if (existing != null && EXISTING_APPLICATION_STATUSES.contains(existing.getStatus())) {
            return applicationView(existing);
        }
        if (existing != null && existing.getStatus() == CrewMemberStatus.KICKED) {
            throw new DomainException(
                    HttpStatus.FORBIDDEN,
                    "CREW_MEMBER_KICKED",
                    "내보내기 된 크루에는 다시 참여할 수 없습니다.");
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
        String applicationMessage = normalizeApplicationMessage(message, crew.isApprovalRequired());
        CrewMember application;
        if (existing == null) {
            application = members.save(new CrewMember(crew, applicant, nextStatus));
            application.apply(nextStatus, applicationMessage);
        } else {
            existing.apply(nextStatus, applicationMessage);
            application = existing;
        }
        if (nextStatus == CrewMemberStatus.PENDING) {
            notificationService.crewApplication(
                    userId,
                    crew.getOwner().getId(),
                    crewId,
                    application.getId(),
                    LocalDateTime.now());
        } else {
            recommendationFeedback.recordApprovedJoin(userId, crewId);
        }
        return applicationView(application);
    }

    @Transactional
    public void kick(Long ownerId, Long crewId, Long memberUserId) {
        Crew crew = lockedCrew(crewId);
        ensureOwner(crew, ownerId);
        if (ownerId.equals(memberUserId)) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "CREW_OWNER_CANNOT_BE_KICKED",
                    "크루장은 내보낼 수 없습니다.");
        }
        CrewMember member = members.findByCrewIdAndUserId(crewId, memberUserId)
                .orElseThrow(() -> new DomainException(
                        HttpStatus.NOT_FOUND,
                        "CREW_MEMBER_NOT_FOUND",
                        "참여자를 찾을 수 없습니다."));
        if (member.getStatus() != CrewMemberStatus.APPROVED) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "CREW_MEMBER_NOT_ACTIVE",
                    "현재 참여 중인 멤버만 내보낼 수 있습니다.");
        }
        member.kick(user(ownerId));
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
            recommendationFeedback.recordApprovedJoin(application.getUser().getId(), crewId);
            notificationService.crewApproved(
                    ownerId,
                    application.getUser().getId(),
                    crewId,
                    application.getId(),
                    application.getReviewedAt());
        } else {
            application.reject(owner);
            notificationService.crewRejected(
                    ownerId,
                    application.getUser().getId(),
                    crewId,
                    application.getId(),
                    application.getReviewedAt());
        }
        return applicationView(application);
    }


    private CrewDtos.View managementView(Crew crew, Long ownerId, long memberCount) {
        return view(
                crew,
                memberCount,
                members.countByCrewIdAndStatusIn(crew.getId(), List.of(CrewMemberStatus.PENDING)),
                crew.getTags().stream().map(Tag::getName).toList(),
                viewer(crew, ownerId, CrewMemberStatus.OWNER, memberCount));
    }

    private String patchedRequired(
            String requested,
            String current,
            String code,
            String message) {
        if (requested == null) {
            return current;
        }
        String value = requested.trim();
        if (value.isBlank()) {
            throw new DomainException(HttpStatus.BAD_REQUEST, code, message);
        }
        return value;
    }

    private String normalizeOptional(String value) {
        String normalized = value.trim();
        return normalized.isBlank() ? null : normalized;
    }

    private String normalizeApplicationMessage(String value, boolean required) {
        String normalized = value == null ? null : value.trim();
        if (required && (normalized == null || normalized.isBlank())) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "CREW_APPLICATION_MESSAGE_REQUIRED",
                    "승인제 크루에는 가입 신청 메시지가 필요합니다.");
        }
        if (normalized != null && normalized.length() > 500) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "CREW_APPLICATION_MESSAGE_TOO_LONG",
                    "가입 신청 메시지는 500자 이내여야 합니다.");
        }
        return normalized == null || normalized.isBlank() ? null : normalized;
    }

    private String normalizeOpenChatUrl(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        String normalized = value.trim();
        try {
            URI uri = URI.create(normalized);
            if (!"https".equalsIgnoreCase(uri.getScheme())
                    || uri.getHost() == null
                    || uri.getUserInfo() != null) {
                throw new IllegalArgumentException("invalid open chat URL");
            }
            return normalized;
        } catch (IllegalArgumentException exception) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_CREW_OPEN_CHAT_URL",
                    "오픈채팅 주소는 유효한 HTTPS URL이어야 합니다.");
        }
    }

    private boolean travelDatePassed(LocalDate travelDate) {
        return travelDate != null && travelDate.isBefore(LocalDate.now());
    }

    private void ensureTravelDateNotPassed(LocalDate travelDate) {
        if (travelDatePassed(travelDate)) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "CREW_TRAVEL_DATE_PASSED",
                    "이미 지난 여행일의 크루는 모집할 수 없습니다.");
        }
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

    private void ensureOwnedRecruitingLimit(Long ownerId) {
        if (crews.countRecruitingByOwnerId(ownerId) >= MAX_RECRUITING_OWNED_CREWS) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "CREW_OWNER_ACTIVE_LIMIT_EXCEEDED",
                    "한 사용자는 모집 중인 크루를 최대 3개까지 개설할 수 있습니다.");
        }
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

    private UserAccount lockedUser(Long userId) {
        return users.findByIdForUpdate(userId)
                .orElseThrow(() -> new DomainException(
                        HttpStatus.NOT_FOUND,
                        "USER_NOT_FOUND",
                        "사용자를 찾을 수 없습니다."));
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
        boolean canAccessOpenChat = crew.getOpenChatUrl() != null
                && (owner || effectiveStatus == CrewMemberStatus.APPROVED);
        boolean canAccessChat = owner || effectiveStatus == CrewMemberStatus.APPROVED;

        return new CrewDtos.Viewer(
                effectiveStatus,
                owner,
                canJoin,
                canCancel,
                owner,
                canAccessOpenChat,
                canAccessChat);
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
                viewer != null && viewer.canAccessOpenChat()
                        ? crew.getOpenChatUrl()
                        : null,
                tags,
                crew.getCategory(),
                routeViews(crew.getRoutes()),
                routePlaceViews(crew.getRoutePlaces()),
                crew.getTravelDate(),
                crew.getCapacity(),
                memberCount,
                pendingCount,
                crew.isRecruiting(),
                crew.isApprovalRequired(),
                crew.getOwner().getId(),
                crew.getOwner().getNickname(),
                crew.getCreatedAt(),
                crew.getEndedAt(),
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
                application.getUser().getProfileImageUrl(),
                application.getApplicationMessage(),
                application.getStatus(),
                application.getReviewedBy() == null
                        ? null
                        : application.getReviewedBy().getId(),
                application.getReviewedAt(),
                application.getCreatedAt());
    }

    private List<JourneyPost> resolveRoutes(Long ownerId, List<Long> routeIds, boolean required) {
        if (routeIds == null || routeIds.isEmpty()) {
            if (required) {
                throw new DomainException(
                        HttpStatus.BAD_REQUEST,
                        "CREW_ROUTE_REQUIRED",
                        "여행 루트를 한 개 이상 선택해 주세요.");
            }
            return List.of();
        }
        List<Long> distinctIds = routeIds.stream().distinct().toList();
        List<JourneyPost> found = posts.findByIdInAndAuthorId(distinctIds, ownerId);
        Map<Long, JourneyPost> byId = found.stream()
                .collect(Collectors.toMap(JourneyPost::getId, route -> route));
        if (byId.size() != distinctIds.size()
                || found.stream().anyMatch(route -> !route.isPublished() || !route.isModerationVisible())) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_CREW_ROUTE",
                    "본인이 작성한 공개 여행 루트만 선택할 수 있습니다.");
        }
        return distinctIds.stream().map(byId::get).toList();
    }

    private List<CrewDtos.RouteView> routeViews(List<JourneyPost> routes) {
        return routes.stream().map(route -> new CrewDtos.RouteView(
                route.getId(),
                route.getTitle(),
                route.getRegionName(),
                route.getCoverImageUrl(),
                route.getTravelStartDate(),
                route.getTravelEndDate())).toList();
    }

    private List<Crew.RoutePlaceData> resolveRoutePlaces(List<CrewDtos.RoutePlaceRequest> places) {
        if (places == null || places.isEmpty()) return List.of();
        return places.stream().map(place -> {
            boolean hasClientCoordinates = place.latitude() != null && place.longitude() != null;
            Region region = hasClientCoordinates
                    ? regionService.requireClientPlace(
                            place.regionPlaceId(), place.regionName(), place.latitude(), place.longitude())
                    : regionService.require(place.regionCode(), place.regionName(), place.regionPlaceId());
            if (region.getCenter() == null) {
                throw new DomainException(
                        HttpStatus.BAD_REQUEST,
                        "CREW_ROUTE_COORDINATES_REQUIRED",
                        "경유지의 지도 좌표를 확인할 수 없습니다.");
            }
            List<Crew.RouteImageData> images = place.images() == null
                    ? List.of()
                    : place.images().stream()
                            .map(image -> new Crew.RouteImageData(
                                    image.imageUrl().trim(),
                                    normalizeAltText(image.altText())))
                            .toList();
            return new Crew.RoutePlaceData(
                    region,
                    richTextSanitizer.sanitizeRequired(place.content()),
                    images);
        }).toList();
    }

    private List<CrewDtos.RoutePlaceView> routePlaceViews(List<CrewRoutePlace> places) {
        return places.stream().map(place -> new CrewDtos.RoutePlaceView(
                place.getId(),
                regionService.view(place.getRegion()),
                place.getPlaceName(),
                place.getLatitude(),
                place.getLongitude(),
                place.getContent(),
                place.getSortOrder(),
                place.getImages().stream().map(image -> new CrewDtos.RouteImageView(
                        image.getId(),
                        image.getImageUrl(),
                        image.getSortOrder(),
                        image.getAltText())).toList())).toList();
    }

    private String normalizeAltText(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }
}
