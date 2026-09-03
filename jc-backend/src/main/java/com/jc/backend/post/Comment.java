package com.jc.backend.post;

import com.jc.backend.common.BaseTimeEntity;
import com.jc.backend.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** 게시물에 달린 댓글과 작성자 관계를 저장하는 JPA 엔티티입니다. */
@Entity
@Table(name = "post_comment", indexes = {
        @Index(name = "idx_comment_post", columnList = "post_id"),
        @Index(name = "idx_comment_parent", columnList = "parent_comment_id")
})
public class Comment extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private JourneyPost post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "author_id", nullable = false)
    private UserAccount author;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "parent_comment_id")
    private Comment parent;

    @Column(nullable = false, length = 1000)
    private String content;

    protected Comment() {}

    public Comment(JourneyPost post, UserAccount author, String content) {
        this(post, author, content, null);
    }

    public Comment(JourneyPost post, UserAccount author, String content, Comment parent) {
        this.post = post;
        this.author = author;
        this.content = content;
        this.parent = parent;
    }

    public Long getId() {
        return id;
    }

    public JourneyPost getPost() {
        return post;
    }

    public UserAccount getAuthor() {
        return author;
    }

    public Comment getParent() {
        return parent;
    }

    public String getContent() {
        return content;
    }

    public void updateContent(String content) {
        this.content = content;
    }
}
