package com.jc.backend.crew;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

/** 크루 전용 경유지에 첨부된 이미지를 표시 순서와 함께 저장합니다. */
@Entity
@Table(name = "crew_route_image")
public class CrewRouteImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "place_id", nullable = false)
    private CrewRoutePlace place;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "alt_text", length = 200)
    private String altText;

    protected CrewRouteImage() {}

    CrewRouteImage(CrewRoutePlace place, String imageUrl, int sortOrder, String altText) {
        this.place = place;
        this.imageUrl = imageUrl;
        this.sortOrder = sortOrder;
        this.altText = altText;
    }

    public Long getId() { return id; }
    public String getImageUrl() { return imageUrl; }
    public int getSortOrder() { return sortOrder; }
    public String getAltText() { return altText; }
}
