package com.jc.backend.crew;

import jakarta.persistence.LockModeType;
import java.util.List;
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
    @Query(
            value = """
                    select c
                    from Crew c
                    where c.recruiting = true
                      and (
                          :region is null
                          or lower(c.region.code) = :region
                          or lower(c.region.displayName) = :region
                      )
                      and (
                          :keyword is null
                          or lower(c.title) like concat('%', :keyword, '%')
                          or lower(c.description) like concat('%', :keyword, '%')
                          or lower(c.owner.nickname) like concat('%', :keyword, '%')
                          or lower(c.region.code) like concat('%', :keyword, '%')
                          or lower(c.region.displayName) like concat('%', :keyword, '%')
                          or lower(c.region.searchText) like concat('%', :keyword, '%')
                          or exists (
                              select candidate.id
                              from Crew candidate
                              join candidate.tags tag
                              where candidate.id = c.id
                                and lower(tag.name) like concat('%', :keyword, '%')
                          )
                      )
                      and (:category is null or c.category = :category)
                    order by c.createdAt desc, c.id desc
                    """,
            countQuery = """
                    select count(c)
                    from Crew c
                    where c.recruiting = true
                      and (
                          :region is null
                          or lower(c.region.code) = :region
                          or lower(c.region.displayName) = :region
                      )
                      and (
                          :keyword is null
                          or lower(c.title) like concat('%', :keyword, '%')
                          or lower(c.description) like concat('%', :keyword, '%')
                          or lower(c.owner.nickname) like concat('%', :keyword, '%')
                          or lower(c.region.code) like concat('%', :keyword, '%')
                          or lower(c.region.displayName) like concat('%', :keyword, '%')
                          or lower(c.region.searchText) like concat('%', :keyword, '%')
                          or exists (
                              select candidate.id
                              from Crew candidate
                              join candidate.tags tag
                              where candidate.id = c.id
                                and lower(tag.name) like concat('%', :keyword, '%')
                          )
                      )
                      and (:category is null or c.category = :category)
                    """)
    Page<Crew> searchRecruiting(
            @Param("keyword") String keyword,
            @Param("region") String region,
            @Param("category") CrewCategory category,
            Pageable pageable);

    @EntityGraph(attributePaths = {"owner", "region", "routePlaces", "routePlaces.region"})
    @Query("select c from Crew c where c.id = :crewId")
    Optional<Crew> findWithOwnerAndRegionById(@Param("crewId") Long crewId);

    @Query(value = """
            select ct.crew_id as "crewId",
                   t.name as "tagName",
                   ct.sort_order as "sortOrder"
            from crew_tag ct
            join tag t on t.id = ct.tag_id
            where ct.crew_id in (:crewIds)
            order by ct.crew_id, ct.sort_order
            """, nativeQuery = true)
    List<CrewTagProjection> findTagsByCrewIds(@Param("crewIds") List<Long> crewIds);

    @Query("""
            select count(c) from Crew c
            where c.owner.id = :ownerId and c.recruiting = true
            """)
    long countRecruitingByOwnerId(@Param("ownerId") Long ownerId);

    /** 동일 크루의 정원 판정과 승인 처리를 직렬화합니다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE) // 마지막 한 자리의 동시 승인/참가를 직렬화합니다.
    @Query("select c from Crew c where c.id = :crewId")
    Optional<Crew> findByIdForUpdate(@Param("crewId") Long crewId);
}
