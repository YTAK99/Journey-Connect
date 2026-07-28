package com.jc.backend.post;

import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PostImageIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private PostService postService;

    @Test
    void postStoresOrderedImagesAndUsesFirstImageAsCover() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        String regionCode = "TT-" + suffix.toUpperCase();
        UserAccount author = users.save(new UserAccount(
                "images-" + suffix + "@example.com", "hash", "image-user-" + suffix));
        regions.save(new Region(regionCode, "TT", "Image test region", null));

        PostDtos.Detail created = postService.create(author.getId(), new PostDtos.CreateRequest(
                "multi image",
                "content",
                regionCode,
                null,
                null,
                List.of(
                        new PostDtos.ImageRequest("https://example.com/1.jpg", "first"),
                        new PostDtos.ImageRequest("https://example.com/2.jpg", "second")),
                null,
                null,
                List.of("cafe", "Tokyo")));

        assertThat(created.coverImageUrl()).isEqualTo("https://example.com/1.jpg");
        assertThat(created.images())
                .extracting(PostDtos.ImageView::imageUrl)
                .containsExactly(
                        "https://example.com/1.jpg",
                        "https://example.com/2.jpg");
        assertThat(created.tags()).containsExactly("cafe", "Tokyo");

        PostDtos.Detail updated = postService.update(author.getId(), created.id(), new PostDtos.UpdateRequest(
                null,
                null,
                null,
                null,
                null,
                List.of(),
                null,
                null,
                null,
                null));

        assertThat(updated.images()).isEmpty();
        assertThat(updated.coverImageUrl()).isNull();
    }
}
