package com.jc.backend.auth;

import jakarta.persistence.LockModeType;
import java.time.Instant;
import java.util.Optional;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Lock;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface PasswordResetTokenRepository extends JpaRepository<PasswordResetToken, Long> {

    @Lock(LockModeType.PESSIMISTIC_WRITE)
    @EntityGraph(attributePaths = "user")
    @Query("select p from PasswordResetToken p where p.tokenHash = :tokenHash")
    Optional<PasswordResetToken> findByTokenHashForUpdate(
            @Param("tokenHash") String tokenHash);

    @Modifying
    @Query("""
            update PasswordResetToken p
            set p.usedAt = :usedAt
            where p.user.id = :userId and p.usedAt is null
            """)
    int invalidateAllByUserId(
            @Param("userId") Long userId,
            @Param("usedAt") Instant usedAt);

    @Modifying
    @Query("""
            update PasswordResetToken p
            set p.usedAt = :usedAt
            where p.user.id = :userId and p.id <> :keepId and p.usedAt is null
            """)
    int invalidateOthersByUserId(
            @Param("userId") Long userId,
            @Param("keepId") Long keepId,
            @Param("usedAt") Instant usedAt);
}
