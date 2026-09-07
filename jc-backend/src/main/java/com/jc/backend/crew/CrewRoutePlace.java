package com.jc.backend.crew;

import com.jc.backend.region.Region;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.hibernate.annotations.BatchSize;

/** 게시글과 분리된 크루 전용 여행 경유지를 순서대로 보관합니다. */
@Entity
@Table(name = "crew_route_place")
public class CrewRoutePlace {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "crew_id", nullable = false)
    private Crew crew;

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

    @OneToMany(mappedBy = "place", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder asc, id asc")
    @BatchSize(size = 100)
    private List<CrewRouteImage> images = new ArrayList<>();

    protected CrewRoutePlace() {}

    CrewRoutePlace(Crew crew, Region region, String content, int sortOrder, List<Crew.RouteImageData> images) {
        this.crew = crew;
        this.region = region;
        this.placeName = region.getDisplayName();
        this.latitude = region.getCenter() == null ? null : region.getCenter().getY();
        this.longitude = region.getCenter() == null ? null : region.getCenter().getX();
        this.content = content;
        this.sortOrder = sortOrder;
        for (int index = 0; index < images.size(); index++) {
            Crew.RouteImageData image = images.get(index);
            this.images.add(new CrewRouteImage(this, image.imageUrl(), index, image.altText()));
        }
    }

    public Long getId() { return id; }
    public Region getRegion() { return region; }
    public String getPlaceName() { return placeName; }
    public Double getLatitude() { return latitude; }
    public Double getLongitude() { return longitude; }
    public String getContent() { return content; }
    public int getSortOrder() { return sortOrder; }
    public List<CrewRouteImage> getImages() { return Collections.unmodifiableList(images); }
}
