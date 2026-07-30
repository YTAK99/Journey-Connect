package com.jc.backend.region;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RegionRepository extends JpaRepository<Region, Long> {

    Optional<Region> findByCodeIgnoreCase(String code);

    Optional<Region> findFirstByDisplayNameIgnoreCase(String displayName);

    List<Region> findTop50ByDisplayNameContainingIgnoreCaseOrderByDisplayNameAsc(String keyword);

    List<Region> findTop50ByOrderByCountryCodeAscDisplayNameAsc();

    /**
     * PostGIS geography 거리 계산을 사용해 구면 거리를 미터 단위로 비교합니다.
     * 경도는 x, 위도는 y 순서로 ST_MakePoint에 전달해야 합니다.
     */
    @Query(value = """
            select *
            from region r
            where r.center is not null
              and ST_DWithin(
                    r.center::geography,
                    ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography,
                    :radiusMeters
              )
            order by ST_Distance(
                    r.center::geography,
                    ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326)::geography
              )
            limit :limit
            """, nativeQuery = true)
    List<Region> findNearby(
            @Param("latitude") double latitude,
            @Param("longitude") double longitude,
            @Param("radiusMeters") double radiusMeters,
            @Param("limit") int limit);
}
