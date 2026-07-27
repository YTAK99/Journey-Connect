package com.jc.backend.crew;

import com.jc.backend.common.BaseTimeEntity;
import com.jc.backend.region.Region;
import com.jc.backend.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import java.time.LocalDate;

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

    private LocalDate travelDate;

    @Column(nullable = false)
    private int capacity;

    @Column(nullable = false)
    private boolean recruiting = true;

    @Column(name = "approval_required", nullable = false)
    private boolean approvalRequired = true;

    protected Crew() {}

    public Crew(
            UserAccount owner,
            Region region,
            String title,
            String description,
            LocalDate travelDate,
            int capacity,
            boolean approvalRequired) {
        this.owner = owner;
        this.region = region;
        this.regionName = region.getDisplayName();
        this.title = title;
        this.description = description;
        this.travelDate = travelDate;
        this.capacity = capacity;
        this.approvalRequired = approvalRequired;
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
}
