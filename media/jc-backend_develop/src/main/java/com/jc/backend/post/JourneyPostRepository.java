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

public interface JourneyPostRepository extends JpaRepository<JourneyPost, Long> {

    @EntityGraph(attributePaths = {"author", "region"})
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
                    :keyword is null
                    or lower(p.title) like lower(concat('%', :keyword, '%'))
                    or lower(p.content) like lower(concat('%', :keyword, '%'))
                    or lower(p.regionName) like lower(concat('%', :keyword, '%'))
              )
              and (
                    :region is null
                    or lower(p.region.code) = lower(:region)
                    or lower(p.regionName) = lower(:region)
              )
            order by p.createdAt desc, p.id desc
            """)
    Page<JourneyPost> explore(
            @Param("keyword") String keyword,
            @Param("region") String region,
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
