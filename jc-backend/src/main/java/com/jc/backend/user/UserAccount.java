package com.jc.backend.user;

import com.jc.backend.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;

/** 인증 주체와 공개 프로필 정보를 함께 보관하는 사용자 엔티티입니다. */
@Entity
@Table(
        name = "user_account",
        uniqueConstraints = {
            @UniqueConstraint(name = "uk_user_email", columnNames = "email"),
            @UniqueConstraint(name = "uk_user_nickname", columnNames = "nickname")
        })
public class UserAccount extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 190)
    private String email;

    @Column(nullable = false, length = 100)
    private String passwordHash;

    @Column(nullable = false, length = 40)
    private String nickname;

    @Column(length = 300)
    private String bio;

    @Column(length = 500)
    private String profileImageUrl;

    @Column(nullable = false, length = 20)
    private String role = "user";

    @Column(name = "account_status", nullable = false, length = 20)
    private String accountStatus = "active";

    @Column(name = "suspended_at")
    private java.time.LocalDateTime suspendedAt;

    protected UserAccount() {}

    public UserAccount(String email, String passwordHash, String nickname) {
        this.email = email;
        this.passwordHash = passwordHash;
        this.nickname = nickname;
    }

    public void updateProfile(String nickname, String bio, String profileImageUrl) {
        if (nickname != null && !nickname.isBlank()) {
            this.nickname = nickname.trim();
        }
        this.bio = bio;
        this.profileImageUrl = profileImageUrl;
    }

    public Long getId() {
        return id;
    }

    public String getEmail() {
        return email;
    }

    public String getPasswordHash() {
        return passwordHash;
    }

    public String getNickname() {
        return nickname;
    }

    public String getBio() {
        return bio;
    }

    public String getProfileImageUrl() { return profileImageUrl; }
    public String getRole() { return role; }
    public String getAccountStatus() { return accountStatus; }
    public java.time.LocalDateTime getSuspendedAt() { return suspendedAt; }
    public boolean isActive() { return "active".equals(accountStatus); }
}
