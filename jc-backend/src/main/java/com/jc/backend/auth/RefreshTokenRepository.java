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

/** 리프레시 토큰 조회·잠금·만료 데이터 정리를 담당하는 JPA 저장소입니다. */
public interface RefreshTokenRepository extends JpaRepository<RefreshToken, Long> {

    /** 동일 리프레시 토큰의 동시 재사용을 막기 위해 회전 시 행 잠금을 획득합니다. */
    @Lock(LockModeType.PESSIMISTIC_WRITE) // 갱신 중 같은 토큰 행을 다른 트랜잭션이 변경하지 못하게 잠급니다.
    @EntityGraph(attributePaths = "user") // 지연 로딩 사용자도 한 쿼리에서 함께 가져옵니다.
    @Query("select r from RefreshToken r where r.tokenHash = :tokenHash")
    Optional<RefreshToken> findByTokenHashForUpdate(@Param("tokenHash") String tokenHash);

    @Modifying // SELECT가 아닌 삭제 JPQL임을 Spring Data에 알립니다.
    @Query("delete from RefreshToken r where r.expiresAt < :cutoff")
    int deleteExpiredBefore(@Param("cutoff") Instant cutoff);

    @Modifying
    @Query("""
            update RefreshToken r
            set r.revokedAt = :revokedAt
            where r.user.id = :userId and r.revokedAt is null
            """)
    int revokeAllByUserId(
            @Param("userId") Long userId,
            @Param("revokedAt") Instant revokedAt);
}
