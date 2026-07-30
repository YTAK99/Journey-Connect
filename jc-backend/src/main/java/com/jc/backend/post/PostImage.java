package com.jc.backend.post;

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

/** 게시물의 다중 이미지를 표시 순서와 함께 별도 테이블로 관리합니다. */
@Entity
@Table(name = "post_image", indexes = @Index(name = "idx_post_image_order", columnList = "post_id, sort_order"))
public class PostImage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "post_id", nullable = false)
    private JourneyPost post;

    @Column(name = "image_url", nullable = false, length = 500)
    private String imageUrl;

    @Column(name = "sort_order", nullable = false)
    private int sortOrder;

    @Column(name = "alt_text", length = 200)
    private String altText;

    protected PostImage() {}

    public PostImage(JourneyPost post, String imageUrl, int sortOrder, String altText) {
        this.post = post;
        this.imageUrl = imageUrl;
        this.sortOrder = sortOrder;
        this.altText = altText;
    }

    public Long getId() {
        return id;
    }

    public String getImageUrl() {
        return imageUrl;
    }

    public int getSortOrder() {
        return sortOrder;
    }

    public String getAltText() {
        return altText;
    }
}
