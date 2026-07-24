package com.jc.backend.crew;

import com.jc.backend.common.BaseTimeEntity;
import com.jc.backend.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import java.time.LocalDateTime;

@Entity
@Table(
        name = "crew_member",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_crew_member",
                columnNames = {"crew_id", "user_id"}))
public class CrewMember extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "crew_id", nullable = false)
    private Crew crew;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private CrewMemberStatus status;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "reviewed_by")
    private UserAccount reviewedBy;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    protected CrewMember() {}

    public CrewMember(Crew crew, UserAccount user, CrewMemberStatus status) {
        this.crew = crew;
        this.user = user;
        this.status = status;
    }

    public void reapply(CrewMemberStatus nextStatus) {
        if (status == CrewMemberStatus.OWNER || status == CrewMemberStatus.APPROVED) {
            return;
        }
        status = nextStatus;
        reviewedBy = null;
        reviewedAt = null;
    }

    public void approve(UserAccount reviewer) {
        status = CrewMemberStatus.APPROVED;
        reviewedBy = reviewer;
        reviewedAt = LocalDateTime.now();
    }

    public void reject(UserAccount reviewer) {
        status = CrewMemberStatus.REJECTED;
        reviewedBy = reviewer;
        reviewedAt = LocalDateTime.now();
    }

    public void cancel() {
        if (status != CrewMemberStatus.OWNER) {
            status = CrewMemberStatus.CANCELLED;
            reviewedBy = null;
            reviewedAt = LocalDateTime.now();
        }
    }

    public Long getId() {
        return id;
    }

    public Crew getCrew() {
        return crew;
    }

    public UserAccount getUser() {
        return user;
    }

    public CrewMemberStatus getStatus() {
        return status;
    }

    public UserAccount getReviewedBy() {
        return reviewedBy;
    }

    public LocalDateTime getReviewedAt() {
        return reviewedAt;
    }
}
