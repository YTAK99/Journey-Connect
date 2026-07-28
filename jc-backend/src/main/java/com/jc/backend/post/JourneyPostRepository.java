package com.jc.backend.post;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

/** 피드 정렬·검색·작성자별 목록과 상세 연관 데이터를 조회하는 게시물 저장소입니다. */
public interface JourneyPostRepository extends JpaRepository<JourneyPost, Long> {

    @EntityGraph(attributePaths = {"author", "region"}) // 목록 DTO에 필요한 관계를 즉시 로딩해 N+1을 막습니다.
    Page<JourneyPost> findByPublishedTrueOrderByCreatedAtDescIdDesc(Pageable pageable);

    @EntityGraph(attributePaths = {"author", "region"})
    Page<JourneyPost> findByAuthorIdAndPublishedTrueOrderByCreatedAtDescIdDesc(
            Long authorId,
            Pageable pageable);

    @EntityGraph(attributePaths = {"author", "region"})
    Page<JourneyPost> findByAuthorIdOrderByCreatedAtDescIdDesc(Long authorId, Pageable pageable);

    @EntityGraph(attributePaths = {"author", "region"})
    @Query("""
            select p
            from JourneyPost p
            where p.published = true
              and (
                    :keyword = ''
                    or lower(p.title) like lower(concat('%', :keyword, '%'))
                    or lower(p.content) like lower(concat('%', :keyword, '%'))
                    or lower(p.regionName) like lower(concat('%', :keyword, '%'))
                    or lower(p.region.searchText) like lower(concat('%', :keyword, '%'))
                    or (:keywordCountryCode <> '' and p.region.countryCode = :keywordCountryCode)
                    or exists (
                        select t.id from p.tags t
                        where lower(t.name) like lower(concat('%', :keyword, '%'))
                    )
              )
              and (
                    :region = ''
                    or lower(p.region.code) = lower(:region)
                    or lower(p.regionName) = lower(:region)
                    or lower(p.region.searchText) like lower(concat('%', :region, '%'))
                    or (:regionCountryCode <> '' and p.region.countryCode = :regionCountryCode)
              )
            order by p.createdAt desc, p.id desc
            """)
    Page<JourneyPost> explore(
            @Param("keyword") String keyword,
            @Param("region") String region,
            @Param("keywordCountryCode") String keywordCountryCode,
            @Param("regionCountryCode") String regionCountryCode,
            Pageable pageable);

    /**
     * 커서가 없으면 최신부터, 있으면 마지막 항목보다 오래된 행만 조회합니다.
     * createdAt이 같은 경우 PK를 보조 정렬키로 사용해 중복·누락을 방지합니다.
     */
    @EntityGraph(attributePaths = {"author", "region"})
    @Query("""
            select p
            from JourneyPost p
            where p.published = true
              and (
                    :cursorCreatedAt is null
                    or p.createdAt < :cursorCreatedAt
                    or (p.createdAt = :cursorCreatedAt and p.id < :cursorId)
              )
            order by p.createdAt desc, p.id desc
            """)
    List<JourneyPost> findFeedAfter(
            @Param("cursorCreatedAt") LocalDateTime cursorCreatedAt,
            @Param("cursorId") Long cursorId,
            Pageable pageable);

    /** 상세 응답은 다중 이미지까지 사용하므로 한 번에 조회합니다. */
    @EntityGraph(attributePaths = {"author", "region", "images"})
    @Query("select p from JourneyPost p where p.id = :postId")
    Optional<JourneyPost> findWithDetailById(@Param("postId") Long postId);
}
