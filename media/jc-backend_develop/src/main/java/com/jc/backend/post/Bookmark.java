package com.jc.backend.post;

import com.jc.backend.user.UserAccount;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

@Entity
@Table(
        name = "bookmark",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_bookmark",
                columnNames = {"post_id", "user_id"}))
public class Bookmark {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "post_id", nullable = false)
    private JourneyPost post;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    protected Bookmark() {}

    public Bookmark(JourneyPost post, UserAccount user) {
        this.post = post;
        this.user = user;
    }

    public JourneyPost getPost() {
        return post;
    }
}
