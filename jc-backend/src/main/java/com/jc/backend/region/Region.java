package com.jc.backend.region;

import com.jc.backend.common.BaseTimeEntity;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.Table;
import jakarta.persistence.UniqueConstraint;
import org.locationtech.jts.geom.Point;

@Entity
@Table(
        name = "region",
        uniqueConstraints = @UniqueConstraint(name = "uk_region_code", columnNames = "code"),
        indexes = {
            @Index(name = "idx_region_country", columnList = "country_code"),
            @Index(name = "idx_region_display_name", columnList = "display_name")
        })
public class Region extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    /** API와 외부 연동에서 변하지 않는 지역 식별자입니다. 예: KR-SEOUL. */
    @Column(nullable = false, length = 50)
    private String code;

    @Column(name = "country_code", nullable = false, length = 2)
    private String countryCode;

    @Column(name = "display_name", nullable = false, length = 100)
    private String displayName;

    /** WGS84 좌표이며 경도(x), 위도(y) 순서로 저장합니다. */
    @Column(columnDefinition = "geometry(Point,4326)")
    private Point center;

    protected Region() {}

    public Region(String code, String countryCode, String displayName, Point center) {
        this.code = code.trim().toUpperCase();
        this.countryCode = countryCode.trim().toUpperCase();
        this.displayName = displayName.trim();
        this.center = center;
    }

    public Long getId() {
        return id;
    }

    public String getCode() {
        return code;
    }

    public String getCountryCode() {
        return countryCode;
    }

    public String getDisplayName() {
        return displayName;
    }

    public Point getCenter() {
        return center;
    }
}
