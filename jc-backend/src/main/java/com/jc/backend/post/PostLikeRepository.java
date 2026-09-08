package com.jc.backend.post;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PostLikeRepository extends JpaRepository<PostLike, Long> {

    long countByPostId(Long postId);

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    void deleteByPostIdAndUserId(Long postId, Long userId);

    @Query("""
            select l.post.id as postId, count(l.id) as total
            from PostLike l
            where l.post.id in :postIds
            group by l.post.id
            """)
    List<PostCountProjection> countByPostIds(@Param("postIds") List<Long> postIds);

    @EntityGraph(attributePaths = {"post", "post.author", "post.region"})
    @Query("""
            select l
            from PostLike l
            where l.user.id = :userId
              and l.post.published = true
              and l.post.moderationStatus = 'visible'
              and l.post.author.accountStatus = 'active'
            order by l.id desc
            """)
    Page<PostLike> findVisibleByUserId(
            @Param("userId") Long userId, Pageable pageable);
}
