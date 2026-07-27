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

/**
 * 게시물 본문, 이미지, 공개 여부, 조회수와 관련된 상태를 관리하는 엔티티입니다.
 *
 * <p>공개 게시물과 비공개 게시물의 구분은 서비스 계층에서 처리하고, 이 엔티티는 저장된 상태를 표현합니다.
 */
@Entity // 게시물 객체를 journey_post 테이블의 행으로 관리합니다.
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

    /**
     * 부분 수정은 새 값이 들어온 필드만 반영하고, 빈 문자열은 무시합니다.
     * 이 규칙은 게시물의 불변 조건을 유지하면서도 업데이트 요청을 유연하게 처리하기 위한 것입니다.
     */
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
