package com.jc.backend.post;

import com.jc.backend.region.RegionDtos;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public final class PostDtos {

    private PostDtos() {}

    public record ImageRequest(
            @NotBlank @Size(max = 500) String imageUrl,
            @Size(max = 200) String altText) {}

    public record CreateRequest(
            @NotBlank @Size(max = 120) String title,
            @NotBlank String content,
            @Size(max = 50) String regionCode,
            @Size(max = 100) String regionName,
            @Size(max = 500) String coverImageUrl,
            @Size(max = 10) List<@Valid ImageRequest> images) {}

    public record UpdateRequest(
            @Size(max = 120) String title,
            String content,
            @Size(max = 50) String regionCode,
            @Size(max = 100) String regionName,
            @Size(max = 500) String coverImageUrl,
            @Size(max = 10) List<@Valid ImageRequest> images,
            Boolean published) {}

    public record CommentRequest(@NotBlank @Size(max = 1000) String content) {}

    public record Author(Long id, String nickname, String profileImageUrl) {}

    public record ImageView(Long id, String imageUrl, int sortOrder, String altText) {}

    public record Summary(
            Long id,
            String title,
            String regionCode,
            String regionName,
            String coverImageUrl,
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
