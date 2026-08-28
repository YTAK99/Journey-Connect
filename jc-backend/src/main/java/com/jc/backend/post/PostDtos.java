package com.jc.backend.post;

import com.jc.backend.region.RegionDtos;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

/** 게시물 도메인의 요청 DTO와 목록·상세 응답 DTO를 엔티티에서 분리해 관리합니다. */
public final class PostDtos {

    private PostDtos() {}

    public record ImageRequest(
            @NotBlank @Size(max = 500) String imageUrl,
            @Size(max = 200) String altText) {}

    public record PlaceRequest(
            @Size(max = 50) String regionCode,
            @Size(max = 100) String regionName,
            @Size(max = 255) String regionPlaceId,
            @NotBlank String content,
            @Size(max = 10) List<@Valid ImageRequest> images) {}

    // List 내부의 @Valid가 각 이미지 URL과 대체 텍스트 제약까지 연쇄 검증합니다.
    public record CreateRequest(
            @NotBlank @Size(max = 120) String title,
            String content,
            @Size(max = 50) String regionCode,
            @Size(max = 100) String regionName,
            @Size(max = 500) String coverImageUrl,
            @Size(max = 10) List<@Valid ImageRequest> images,
            LocalDate travelStartDate,
            LocalDate travelEndDate,
            @Size(max = 5) List<@NotBlank @Size(max = 20) String> tags,
            @Size(max = 255) String regionPlaceId,
            @Size(min = 1, max = 20) List<@Valid PlaceRequest> places) {
        public CreateRequest(
                String title, String content, String regionCode, String regionName,
                String coverImageUrl, List<ImageRequest> images, LocalDate travelStartDate,
                LocalDate travelEndDate, List<String> tags, String regionPlaceId) {
            this(title, content, regionCode, regionName, coverImageUrl, images,
                    travelStartDate, travelEndDate, tags, regionPlaceId, null);
        }
    }

    public record UpdateRequest(
            @Size(max = 120) String title,
            String content,
            @Size(max = 50) String regionCode,
            @Size(max = 100) String regionName,
            @Size(max = 500) String coverImageUrl,
            @Size(max = 10) List<@Valid ImageRequest> images,
            LocalDate travelStartDate,
            LocalDate travelEndDate,
            @Size(max = 5) List<@NotBlank @Size(max = 20) String> tags,
            Boolean published,
            @Size(max = 255) String regionPlaceId,
            @Size(min = 1, max = 20) List<@Valid PlaceRequest> places) {
        public UpdateRequest(
                String title, String content, String regionCode, String regionName,
                String coverImageUrl, List<ImageRequest> images, LocalDate travelStartDate,
                LocalDate travelEndDate, List<String> tags, Boolean published,
                String regionPlaceId) {
            this(title, content, regionCode, regionName, coverImageUrl, images,
                    travelStartDate, travelEndDate, tags, published, regionPlaceId, null);
        }
    }

    public record CommentRequest(
            @NotBlank @Size(max = 1000) String content,
            Long parentCommentId) {

        public CommentRequest(String content) {
            this(content, null);
        }
    }

    public record Author(Long id, String nickname, String profileImageUrl) {}

    public record ImageView(Long id, String imageUrl, int sortOrder, String altText) {}

    public record PlaceView(
            Long id,
            RegionDtos.View region,
            String placeName,
            Double latitude,
            Double longitude,
            String content,
            int sortOrder,
            List<ImageView> images) {}

    public record Summary(
            Long id,
            String title,
            String content,
            String contentPreview,
            String regionCode,
            String regionPlaceId,
            String regionName,
            Map<String, String> regionNames,
            String regionSearchText,
            String coverImageUrl,
            List<String> tags,
            long viewCount,
            long likeCount,
            long bookmarkCount,
            long commentCount,
            boolean liked,
            boolean bookmarked,
            Author author,
            LocalDateTime createdAt) {

        /** 기존 테스트/내부 호출이 사용하던 Summary 생성자와의 소스 호환을 유지합니다. */
        public Summary(
                Long id,
                String title,
                String regionCode,
                String regionPlaceId,
                String regionName,
                Map<String, String> regionNames,
                String regionSearchText,
                String coverImageUrl,
                List<String> tags,
                long viewCount,
                long likeCount,
                long bookmarkCount,
                Author author,
                LocalDateTime createdAt) {
            this(
                    id, title, null, null,
                    regionCode, regionPlaceId, regionName, regionNames, regionSearchText,
                    coverImageUrl, tags, viewCount, likeCount, bookmarkCount,
                    0L, false, false, author, createdAt);
        }
    }

    public record Detail(
            Long id,
            String title,
            String content,
            RegionDtos.View region,
            String regionName,
            String coverImageUrl,
            List<ImageView> images,
            LocalDate travelStartDate,
            LocalDate travelEndDate,
            List<String> tags,
            long viewCount,
            long likeCount,
            long bookmarkCount,
            boolean liked,
            boolean bookmarked,
            Author author,
            LocalDateTime createdAt,
            LocalDateTime updatedAt,
            List<PlaceView> places) {}

    public record CommentView(
            Long id,
            String content,
            Long parentCommentId,
            Author author,
            LocalDateTime createdAt) {

        public CommentView(
                Long id,
                String content,
                Author author,
                LocalDateTime createdAt) {
            this(id, content, null, author, createdAt);
        }
    }
}
