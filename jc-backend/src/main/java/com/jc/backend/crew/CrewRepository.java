package com.jc.backend.crew;

import jakarta.persistence.LockModeType;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 크루와 화면에 필요한 작성자·지역을 효율적으로 조회하는 JPA 저장소입니다. */
public interface CrewRepository extends JpaRepository<Crew, Long> {

    @EntityGraph(attributePaths = {"owner", "region"}) // 목록 순회 시 연관 객체별 추가 쿼리(N+1)를 방지합니다.
    Page<Crew> findByRecruitingTrueOrderByCreatedAtDescIdDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"owner", "region"})
    @Query("select c from Crew c where c.id = :crewId")
    Optional<Crew> findWithOwnerAndRegionById(@Param("crewId") Long crewId);

    /** 동일 크루의 정원 판정과 승인 처리를 직렬화합니다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE) // 마지막 한 자리의 동시 승인/참가를 직렬화합니다.
    @Query("select c from Crew c where c.id = :crewId")
    Optional<Crew> findByIdForUpdate(@Param("crewId") Long crewId);
}
