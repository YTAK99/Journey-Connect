package com.jc.backend.post;

import com.jc.backend.region.Region;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "post_place")
public class PostPlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private JourneyPost post;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "region_id", nullable = false)
    private Region region;

    @Column(name = "place_name", nullable = false, length = 100)
    private String placeName;

    private Double latitude;
    private Double longitude;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    protected PostPlace() {}

    PostPlace(JourneyPost post, Region region, String content, int sortOrder) {
        this.post = post;
        this.region = region;
        this.placeName = region.getDisplayName();
        this.latitude = region.getCenter() == null ? null : region.getCenter().getY();
        this.longitude = region.getCenter() == null ? null : region.getCenter().getX();
        this.content = content;
        this.sortOrder = sortOrder;
    }

    public Long getId() { return id; }
    public Region getRegion() { return region; }
    public String getPlaceName() { return placeName; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public String getContent() { return content; }
    public int getSortOrder() { return sortOrder; }
}
