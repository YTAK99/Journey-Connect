package com.jc.backend.auth;

import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface UserExternalIdentityRepository extends JpaRepository<UserExternalIdentity, Long> {

    @EntityGraph(attributePaths = "user")
    Optional<UserExternalIdentity> findByProviderAndProviderSubject(
            String provider,
            String providerSubject);

    @EntityGraph(attributePaths = "user")
    Optional<UserExternalIdentity> findByUserIdAndProvider(Long userId, String provider);
}
