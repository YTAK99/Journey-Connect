package com.jc.backend.auth;

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
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

/** 비밀번호 재설정 원문 토큰 대신 SHA-256 해시와 1회 사용 상태만 저장합니다. */
@Entity
@Table(
        name = "password_reset_token",
        uniqueConstraints = @UniqueConstraint(
                name = "uk_password_reset_token_hash",
                columnNames = "token_hash"),
        indexes = {
            @Index(name = "idx_password_reset_user", columnList = "user_id"),
            @Index(name = "idx_password_reset_expires", columnList = "expires_at")
        })
public class PasswordResetToken {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "used_at")
    private Instant usedAt;

    @Column(name = "created_at", nullable = false, updatable = false)
    private Instant createdAt;

    protected PasswordResetToken() {}

    public PasswordResetToken(
            UserAccount user,
            String tokenHash,
            Instant expiresAt,
            Instant createdAt) {
        this.user = user;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
        this.createdAt = createdAt;
    }

    public boolean isUsableAt(Instant now) {
        return usedAt == null && expiresAt.isAfter(now);
    }

    public void consume(Instant now) {
        if (usedAt == null) {
            usedAt = now;
        }
    }

    public Long getId() {
        return id;
    }

    public UserAccount getUser() {
        return user;
    }
}
