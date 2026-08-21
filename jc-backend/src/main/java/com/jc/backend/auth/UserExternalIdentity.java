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

@Entity
@Table(
        name = "user_external_identity",
        uniqueConstraints = {
            @UniqueConstraint(
                    name = "uk_external_identity_provider_subject",
                    columnNames = {"provider", "provider_subject"}),
            @UniqueConstraint(
                    name = "uk_external_identity_user_provider",
                    columnNames = {"user_id", "provider"})
        },
        indexes = @Index(name = "idx_external_identity_user", columnList = "user_id"))
public class UserExternalIdentity extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "user_id", nullable = false)
    private UserAccount user;

    @Column(nullable = false, length = 30)
    private String provider;

    @Column(name = "provider_subject", nullable = false, length = 255)
    private String providerSubject;

    @Column(name = "email_snapshot", length = 190)
    private String emailSnapshot;

    protected UserExternalIdentity() {}

    public UserExternalIdentity(
            UserAccount user,
            String provider,
            String providerSubject,
            String emailSnapshot) {
        this.user = user;
        this.provider = provider;
        this.providerSubject = providerSubject;
        this.emailSnapshot = emailSnapshot;
    }

    public Long getId() {
        return id;
    }

    public UserAccount getUser() {
        return user;
    }

    public String getProvider() {
        return provider;
    }

    public String getProviderSubject() {
        return providerSubject;
    }

    public String getEmailSnapshot() {
        return emailSnapshot;
    }
}
