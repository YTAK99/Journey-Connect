package com.jc.backend.region;

import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface RegionRepository extends JpaRepository<Region, Long> {

    Optional<Region> findByCodeIgnoreCase(String code);

    Optional<Region> findFirstByDisplayNameIgnoreCase(String displayName);

    Optional<Region> findByGooglePlaceId(String googlePlaceId);

    List<Region> findTop50ByDisplayNameContainingIgnoreCaseOrderByDisplayNameAsc(String keyword);

    List<Region> findTop50ByOrderByCountryCodeAscDisplayNameAsc();

    @Modifying
    @Query(value = """
            insert into region (code, country_code, display_name, created_at, updated_at)
            values (:code, :countryCode, :displayName, current_timestamp, current_timestamp)
            on conflict (code) do nothing
            """, nativeQuery = true)
    int insertIfMissing(
            @Param("code") String code,
            @Param("countryCode") String countryCode,
            @Param("displayName") String displayName);

    @Modifying
    @Query(value = """
            insert into region (code, country_code, display_name, google_place_id, center, created_at, updated_at)
            values (:code, :countryCode, :displayName, :placeId,
                    ST_SetSRID(ST_MakePoint(:longitude, :latitude), 4326), current_timestamp, current_timestamp)
            on conflict do nothing
            """, nativeQuery = true)
    int insertGoogleRegionIfMissing(
            @Param("code") String code,
            @Param("countryCode") String countryCode,
            @Param("displayName") String displayName,
            @Param("placeId") String placeId,
            @Param("latitude") double latitude,
            @Param("longitude") double longitude);

    @Modifying
    @Query(value = """
            insert into region_translation (region_id, language_code, display_name)
            values (:regionId, :languageCode, :displayName)
            on conflict (region_id, language_code) do update set display_name = excluded.display_name
            """, nativeQuery = true)
    int upsertTranslation(
            @Param("regionId") Long regionId,
            @Param("languageCode") String languageCode,
            @Param("displayName") String displayName);

    @Query(value = """
            select language_code as languageCode, display_name as displayName
            from region_translation
            where region_id = :regionId
            """, nativeQuery = true)
    List<RegionTranslationProjection> findTranslations(@Param("regionId") Long regionId);

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
