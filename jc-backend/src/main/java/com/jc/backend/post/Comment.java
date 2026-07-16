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

@Entity
@Table(name = "post_comment", indexes = @Index(name = "idx_comment_post", columnList = "post_id"))
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

    @Column(nullable = false, length = 1000)
    private String content;

    protected Comment() {}

    public Comment(JourneyPost post, UserAccount author, String content) {
        this.post = post;
        this.author = author;
        this.content = content;
    }

    public Long getId() {
        return id;
    }

    public UserAccount getAuthor() {
        return author;
    }

    public String getContent() {
        return content;
    }
}
