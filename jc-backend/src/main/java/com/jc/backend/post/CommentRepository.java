package com.jc.backend.post;

import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

/** 댓글 목록에서 작성자 정보를 함께 읽기 위한 JPA 저장소입니다. */
public interface CommentRepository extends JpaRepository<Comment, Long> {

    @EntityGraph(attributePaths = "author") // 페이지의 각 댓글마다 작성자를 재조회하는 N+1을 방지합니다.
    Page<Comment> findByPostIdOrderByCreatedAtAsc(Long postId, Pageable pageable);
}
