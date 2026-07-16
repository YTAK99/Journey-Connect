package com.jc.backend.auth;

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
import jakarta.persistence.UniqueConstraint;
import java.time.Instant;

@Entity
@Table(
        name = "refresh_token",
        uniqueConstraints = @UniqueConstraint(name = "uk_refresh_token_hash", columnNames = "token_hash"),
        indexes = {
            @Index(name = "idx_refresh_token_user", columnList = "user_id"),
            @Index(name = "idx_refresh_token_expires", columnList = "expires_at")
        })
public class RefreshToken extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    /** 원문 토큰은 저장하지 않고 SHA-256 해시만 저장합니다. */
    @Column(name = "token_hash", nullable = false, length = 64)
    private String tokenHash;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    @Column(name = "revoked_at")
    private Instant revokedAt;

    protected RefreshToken() {}

    public RefreshToken(UserAccount user, String tokenHash, Instant expiresAt) {
        this.user = user;
        this.tokenHash = tokenHash;
        this.expiresAt = expiresAt;
    }

    public void revoke(Instant revokedAt) {
        if (this.revokedAt == null) {
            this.revokedAt = revokedAt;
        }
    }

    public boolean isUsableAt(Instant now) {
        return revokedAt == null && expiresAt.isAfter(now);
    }

    public UserAccount getUser() {
        return user;
    }

    public Instant getExpiresAt() {
        return expiresAt;
    }
}
