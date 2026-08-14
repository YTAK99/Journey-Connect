package com.jc.backend.post;

/** 게시물 목록 카드에 필요한 반응 집계와 현재 사용자 상태를 한 번에 읽는 projection입니다. */
public interface PostSummaryMetricsProjection {

    Long getPostId();

    long getLikeCount();

    long getBookmarkCount();

    long getCommentCount();

    Boolean getLiked();

    Boolean getBookmarked();
}
