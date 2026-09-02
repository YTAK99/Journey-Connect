package com.jc.backend.post;

import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.util.List;
import java.util.UUID;
import org.locationtech.jts.geom.Coordinate;
import org.locationtech.jts.geom.GeometryFactory;
import org.locationtech.jts.geom.PrecisionModel;
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
                List.of("cafe", "Tokyo"),
                null));

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
                null,
                null));

        assertThat(updated.images()).isEmpty();
        assertThat(updated.coverImageUrl()).isNull();
    }

    @Test
    void postStoresOrderedPlacesWithTheirOwnContentAndImages() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount author = users.save(new UserAccount(
                "route-" + suffix + "@example.com", "hash", "route-user-" + suffix));
        GeometryFactory geometryFactory = new GeometryFactory(new PrecisionModel(), 4326);
        Region first = regions.save(new Region(
                "RT-A-" + suffix.toUpperCase(),
                "KR",
                "First stop",
                geometryFactory.createPoint(new Coordinate(126.9780, 37.5665))));
        Region second = regions.save(new Region(
                "RT-B-" + suffix.toUpperCase(),
                "KR",
                "Second stop",
                geometryFactory.createPoint(new Coordinate(129.0756, 35.1796))));

        PostDtos.Detail created = postService.create(author.getId(), new PostDtos.CreateRequest(
                "route post",
                null,
                first.getCode(),
                null,
                "https://example.com/second.jpg",
                null,
                null,
                null,
                List.of("route"),
                null,
                List.of(
                        new PostDtos.PlaceRequest(
                                first.getCode(), null, null, "<p>first story</p>",
                                List.of(new PostDtos.ImageRequest("https://example.com/first.jpg", "first"))),
                        new PostDtos.PlaceRequest(
                                second.getCode(), null, null, "<p>second story</p>",
                                List.of(new PostDtos.ImageRequest("https://example.com/second.jpg", "second"))))));

        assertThat(created.region().code()).isEqualTo(first.getCode());
        assertThat(created.coverImageUrl()).isEqualTo("https://example.com/second.jpg");
        assertThat(created.content()).contains("first story", "second story");
        assertThat(created.places()).extracting(PostDtos.PlaceView::placeName)
                .containsExactly("First stop", "Second stop");
        assertThat(created.places()).extracting(PostDtos.PlaceView::latitude)
                .containsExactly(37.5665, 35.1796);
        assertThat(created.places().get(0).images()).extracting(PostDtos.ImageView::imageUrl)
                .containsExactly("https://example.com/first.jpg");
        assertThat(created.places().get(1).images()).extracting(PostDtos.ImageView::imageUrl)
                .containsExactly("https://example.com/second.jpg");
        assertThat(created.images()).extracting(PostDtos.ImageView::imageUrl)
                .containsExactly("https://example.com/first.jpg", "https://example.com/second.jpg");
    }
}
