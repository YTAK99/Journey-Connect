package com.jc.backend.post;

import java.util.List;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface BookmarkRepository extends JpaRepository<Bookmark, Long> {

    long countByPostId(Long postId);

    boolean existsByPostIdAndUserId(Long postId, Long userId);

    void deleteByPostIdAndUserId(Long postId, Long userId);

    @Query("""
            select b.post.id as postId, count(b.id) as total
            from Bookmark b
            where b.post.id in :postIds
            group by b.post.id
            """)
    List<PostCountProjection> countByPostIds(@Param("postIds") List<Long> postIds);

    @EntityGraph(attributePaths = {"post", "post.author", "post.region"})
    @Query("""
            select b
            from Bookmark b
            where b.user.id = :userId
              and (b.post.published = true or b.post.author.id = :userId)
            order by b.id desc
            """)
    Page<Bookmark> findVisibleByUserId(@Param("userId") Long userId, Pageable pageable);
}
