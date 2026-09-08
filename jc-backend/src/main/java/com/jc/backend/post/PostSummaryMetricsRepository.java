package com.jc.backend.post;

import java.util.List;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.Repository;
import org.springframework.data.repository.query.Param;

/** 목록 카드의 count/viewer-state를 게시물 수와 무관한 단일 집계 쿼리로 제공합니다. */
public interface PostSummaryMetricsRepository extends Repository<JourneyPost, Long> {

    @Query(value = """
            select p.id as "postId",
                   (select count(*) from post_like l where l.post_id = p.id) as "likeCount",
                   (select count(*) from bookmark b where b.post_id = p.id) as "bookmarkCount",
                   (select count(*) from post_comment c where c.post_id = p.id) as "commentCount",
                   case
                     when cast(:viewerId as bigint) is null then false
                     else exists (
                       select 1 from post_like viewer_like
                       where viewer_like.post_id = p.id and viewer_like.user_id = cast(:viewerId as bigint)
                     )
                   end as "liked",
                   case
                     when cast(:viewerId as bigint) is null then false
                     else exists (
                       select 1 from bookmark viewer_bookmark
                       where viewer_bookmark.post_id = p.id and viewer_bookmark.user_id = cast(:viewerId as bigint)
                     )
                   end as "bookmarked"
            from journey_post p
            where p.id in (:postIds)
            """, nativeQuery = true)
    List<PostSummaryMetricsProjection> findByPostIds(
            @Param("postIds") List<Long> postIds,
            @Param("viewerId") Long viewerId);
}
