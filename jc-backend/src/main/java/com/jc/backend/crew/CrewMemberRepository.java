package com.jc.backend.crew;

import java.util.Collection;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 참가 상태 확인과 크루별 승인 인원 집계를 담당하는 JPA 저장소입니다. */
public interface CrewMemberRepository extends JpaRepository<CrewMember, Long> {

    Optional<CrewMember> findByCrewIdAndUserId(Long crewId, Long userId);

    boolean existsByCrewIdAndUserIdAndStatusIn(
            Long crewId,
            Long userId,
            Collection<CrewMemberStatus> statuses);

    long countByCrewIdAndStatusIn(Long crewId, Collection<CrewMemberStatus> statuses);

    // 인터페이스 프로젝션으로 크루별 집계값만 받아 엔티티 전체 로딩을 피합니다.
    @Query("""
            select m.crew.id as crewId, count(m.id) as total
            from CrewMember m
            where m.crew.id in :crewIds
              and m.status in :statuses
            group by m.crew.id
            """)
    List<CrewMemberCountProjection> countByCrewIdsAndStatuses(
            @Param("crewIds") List<Long> crewIds,
            @Param("statuses") Collection<CrewMemberStatus> statuses);

    @Query("""
            select m.crew.id as crewId, m.status as status
            from CrewMember m
            where m.crew.id in :crewIds
              and m.user.id = :userId
            """)
    List<CrewViewerMembershipProjection> findViewerMemberships(
            @Param("crewIds") List<Long> crewIds,
            @Param("userId") Long userId);

    @EntityGraph(attributePaths = {"crew", "crew.owner", "crew.region"})
    Page<CrewMember> findByUserIdAndStatusInOrderByUpdatedAtDescIdDesc(
            Long userId,
            Collection<CrewMemberStatus> statuses,
            Pageable pageable);

    @EntityGraph(attributePaths = {"crew", "user", "reviewedBy"}) // 응답 변환에 필요한 관계를 한 번에 로딩합니다.
    Page<CrewMember> findByCrewIdAndStatusOrderByCreatedAtAsc(
            Long crewId,
            CrewMemberStatus status,
            Pageable pageable);

    @EntityGraph(attributePaths = {"crew", "crew.owner", "user", "reviewedBy"})
    @Query("select m from CrewMember m where m.id = :memberId and m.crew.id = :crewId")
    Optional<CrewMember> findApplication(
            @Param("crewId") Long crewId,
            @Param("memberId") Long memberId);
}
