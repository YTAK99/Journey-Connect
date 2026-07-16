package com.jc.backend.post;

import com.jc.backend.common.BaseTimeEntity;
import com.jc.backend.region.Region;
import com.jc.backend.user.UserAccount;
import jakarta.persistence.CascadeType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Index;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.OneToMany;
import jakarta.persistence.OrderBy;
import jakarta.persistence.Table;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;

@Entity
@Table(
        name = "journey_post",
        indexes = {
            @Index(name = "idx_post_feed_cursor", columnList = "published, created_at, id"),
            @Index(name = "idx_post_region", columnList = "region_id")
        })
public class JourneyPost extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "author_id", nullable = false)
    private UserAccount author;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "region_id", nullable = false)
    private Region region;

    /** 기존 화면 호환과 읽기 성능을 위해 지역 표시명을 함께 보관합니다. 식별은 region_id만 사용합니다. */
    @Column(name = "region_name", nullable = false, length = 100)
    private String regionName;

    @Column(nullable = false, length = 120)
    private String title;

    @Column(nullable = false, columnDefinition = "text")
    private String content;

    /** 목록 카드용 대표 이미지 캐시입니다. 원본 목록은 post_image가 관리합니다. */
    @Column(name = "cover_image_url", length = 500)
    private String coverImageUrl;

    @OneToMany(mappedBy = "post", cascade = CascadeType.ALL, orphanRemoval = true)
    @OrderBy("sortOrder asc, id asc")
    private List<PostImage> images = new ArrayList<>();

    @Column(nullable = false)
    private long viewCount;

    @Column(nullable = false)
    private boolean published = true;

    protected JourneyPost() {}

    public JourneyPost(UserAccount author, Region region, String title, String content) {
        this.author = author;
        this.region = region;
        this.regionName = region.getDisplayName();
        this.title = title;
        this.content = content;
    }

    public void update(
            String title,
            String content,
            Region region,
            Boolean published) {
        if (title != null && !title.isBlank()) {
            this.title = title.trim();
        }
        if (content != null && !content.isBlank()) {
            this.content = content;
        }
        if (region != null) {
            this.region = region;
            this.regionName = region.getDisplayName();
        }
        if (published != null) {
            this.published = published;
        }
    }

    public void replaceImages(List<PostImageData> newImages) {
        images.clear();
        for (int index = 0; index < newImages.size(); index++) {
            PostImageData image = newImages.get(index);
            images.add(new PostImage(this, image.imageUrl(), index, image.altText()));
        }
        coverImageUrl = images.isEmpty() ? null : images.get(0).getImageUrl();
    }

    public void increaseView() {
        viewCount++;
    }

    public Long getId() {
        return id;
    }

    public UserAccount getAuthor() {
        return author;
    }

    public Region getRegion() {
        return region;
    }

    public String getTitle() {
        return title;
    }

    public String getContent() {
        return content;
    }

    public String getRegionName() {
        return regionName;
    }

    public String getCoverImageUrl() {
        return coverImageUrl;
    }

    public List<PostImage> getImages() {
        return Collections.unmodifiableList(images);
    }

    public long getViewCount() {
        return viewCount;
    }

    public boolean isPublished() {
        return published;
    }

    public record PostImageData(String imageUrl, String altText) {}
}
