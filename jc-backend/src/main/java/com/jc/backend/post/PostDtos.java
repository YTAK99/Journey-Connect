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

    // List 내부의 @Valid가 각 이미지 URL과 대체 텍스트 제약까지 연쇄 검증합니다.
    public record CreateRequest(
            @NotBlank @Size(max = 120) String title,
            @NotBlank String content,
            @Size(max = 50) String regionCode,
            @Size(max = 100) String regionName,
            @Size(max = 500) String coverImageUrl,
            @Size(max = 10) List<@Valid ImageRequest> images,
            LocalDate travelStartDate,
            LocalDate travelEndDate,
            @Size(max = 5) List<@NotBlank @Size(max = 20) String> tags,
            @Size(max = 255) String regionPlaceId) {}

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
            @Size(max = 255) String regionPlaceId) {}

    public record CommentRequest(@NotBlank @Size(max = 1000) String content) {}

    public record Author(Long id, String nickname, String profileImageUrl) {}

    public record ImageView(Long id, String imageUrl, int sortOrder, String altText) {}

    public record Summary(
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
            LocalDateTime createdAt) {}

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
            LocalDateTime updatedAt) {}

    public record CommentView(
            Long id,
            String content,
            Author author,
            LocalDateTime createdAt) {}
}
