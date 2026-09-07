package com.jc.backend.crew;

import com.jc.backend.common.BaseTimeEntity;
import com.jc.backend.post.Tag;
import com.jc.backend.post.JourneyPost;
import com.jc.backend.region.Region;
import com.jc.backend.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinTable;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToMany;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderColumn;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import org.hibernate.annotations.BatchSize;

/**
 * 크루의 기본 정보와 모집 상태를 관리하는 엔티티입니다.
 *
 * <p>region_id는 실제 식별자로 사용하고, region_name은 기존 응답 호환과 표시용으로 함께 유지합니다.
 */
@Entity // 크루의 상태와 모집 조건을 crew 테이블에 저장하는 JPA 엔티티입니다.
@Table(name = "crew", indexes = @Index(name = "idx_crew_region", columnList = "region_id"))
public class Crew extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "owner_id", nullable = false)
    private UserAccount owner;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "region_id", nullable = false)
    private Region region;

    /** 기존 응답 필드 호환을 위한 표시명 캐시이며 식별에는 region_id를 사용합니다. */
    @Column(name = "region_name", nullable = false, length = 100)
    private String regionName;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String description;

    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @Column(name = "open_chat_url", length = 500)
    private String openChatUrl;

    private LocalDate travelDate;

    @Column(nullable = false)
    private int capacity;

    @Column(nullable = false)
    private boolean recruiting = true;

    @Column(name = "approval_required", nullable = false)
    private boolean approvalRequired = true;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private CrewCategory category = CrewCategory.OTHER;

    @Column(name = "ended_at")
    private LocalDateTime endedAt;

    protected Crew() {}

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "crew_tag",
            joinColumns = @JoinColumn(name = "crew_id"),
            inverseJoinColumns = @JoinColumn(name = "tag_id"))
    @OrderColumn(name = "sort_order")
    private List<Tag> tags = new ArrayList<>();

    @ManyToMany(fetch = FetchType.LAZY)
    @JoinTable(
            name = "crew_route",
            joinColumns = @JoinColumn(name = "crew_id"),
            inverseJoinColumns = @JoinColumn(name = "post_id"))
    @OrderColumn(name = "sort_order")
    private List<JourneyPost> routes = new ArrayList<>();

    @OneToMany(mappedBy = "crew", cascade = jakarta.persistence.CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder asc, id asc")
    @BatchSize(size = 100)
    private List<CrewRoutePlace> routePlaces = new ArrayList<>();

    public Crew(
            UserAccount owner,
            Region region,
            String title,
            String description,
            LocalDate travelDate,
            int capacity,
            boolean approvalRequired) {
        this(owner, region, title, description, travelDate, capacity, approvalRequired, null, List.of());
    }

    public Crew(
            UserAccount owner,
            Region region,
            String title,
            String description,
            LocalDate travelDate,
            int capacity,
            boolean approvalRequired,
            String coverImageUrl,
            List<Tag> tags) {
        this.owner = owner;
        this.region = region;
        this.regionName = region.getDisplayName();
        this.title = title;
        this.description = description;
        this.travelDate = travelDate;
        this.capacity = capacity;
        this.approvalRequired = approvalRequired;
        this.coverImageUrl = coverImageUrl;
        replaceTags(tags);
    }

    public void updateDetails(
            Region region,
            String title,
            String description,
            LocalDate travelDate,
            int capacity,
            String coverImageUrl,
            List<Tag> tags) {
        this.region = region;
        this.regionName = region.getDisplayName();
        this.title = title;
        this.description = description;
        this.travelDate = travelDate;
        this.capacity = capacity;
        this.coverImageUrl = coverImageUrl;
        replaceTags(tags);
    }

    public void updateOpenChatUrl(String openChatUrl) {
        this.openChatUrl = openChatUrl;
    }

    public void updateCategoryAndRoutes(CrewCategory category, List<JourneyPost> routes) {
        this.category = category == null ? CrewCategory.OTHER : category;
        this.routes.clear();
        if (routes != null) this.routes.addAll(routes);
    }

    public void replaceRoutePlaces(List<RoutePlaceData> places) {
        routePlaces.clear();
        if (places == null) return;
        for (int index = 0; index < places.size(); index++) {
            RoutePlaceData place = places.get(index);
            routePlaces.add(new CrewRoutePlace(this, place.region(), place.content(), index, place.images()));
        }
    }

    public void closeRecruitment() {
        recruiting = false;
        endedAt = LocalDateTime.now();
    }

    public void reopenRecruitment() {
        recruiting = true;
        endedAt = null;
    }

    public void replaceTags(List<Tag> tags) {
        this.tags.clear();
        if (tags != null) this.tags.addAll(tags);
    }

    public Long getId() {
        return id;
    }

    public UserAccount getOwner() {
        return owner;
    }

    public Region getRegion() {
        return region;
    }

    public String getTitle() {
        return title;
    }

    public String getRegionName() {
        return regionName;
    }

    public String getDescription() {
        return description;
    }

    public String getCoverImageUrl() {
        return coverImageUrl;
    }

    public String getOpenChatUrl() {
        return openChatUrl;
    }

    public List<Tag> getTags() {
        return List.copyOf(tags);
    }

    public LocalDate getTravelDate() {
        return travelDate;
    }

    public int getCapacity() {
        return capacity;
    }

    public boolean isRecruiting() {
        return recruiting;
    }

    public boolean isApprovalRequired() {
        return approvalRequired;
    }

    public CrewCategory getCategory() {
        return category;
    }

    public List<JourneyPost> getRoutes() {
        return List.copyOf(routes);
    }

    public List<CrewRoutePlace> getRoutePlaces() {
        return List.copyOf(routePlaces);
    }

    public LocalDateTime getEndedAt() {
        return endedAt;
    }

    public record RouteImageData(String imageUrl, String altText) {}

    public record RoutePlaceData(Region region, String content, List<RouteImageData> images) {}
}
