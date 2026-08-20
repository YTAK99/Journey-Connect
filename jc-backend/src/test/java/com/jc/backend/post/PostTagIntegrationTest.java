package com.jc.backend.post;

import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.common.PageResponse;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import jakarta.persistence.EntityManager;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.data.domain.PageRequest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class PostTagIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private PostService postService;
    @Autowired private EntityManager entityManager;

    @Test
    void storesOrderedTagsAndFindsPostByTagKeyword() {
        String unique = UUID.randomUUID().toString().substring(0, 8);
        UserAccount author = users.save(new UserAccount(
                "tag-" + unique + "@example.com", "hash", "tag-user-" + unique));
        Region region = regions.save(new Region("TT-" + unique, "TT", "Tag Region " + unique, null));

        PostDtos.Detail created = postService.create(author.getId(), new PostDtos.CreateRequest(
                "tag integration post",
                "<p>ordinary content</p>",
                region.getCode(),
                null,
                null,
                List.of(),
                null,
                null,
                List.of("HiddenGem" + unique, "Cafe"),
                null));

        entityManager.flush();
        entityManager.clear();

        PostDtos.Detail reloaded = postService.detail(created.id(), author.getId());
        assertThat(reloaded.tags()).containsExactly("HiddenGem" + unique, "cafe");

        PageResponse<PostDtos.Summary> search = postService.explore(
                "hiddengem" + unique,
                null,
                PageRequest.of(0, 10));
        assertThat(search.items())
                .extracting(PostDtos.Summary::id)
                .contains(created.id());

        postService.update(author.getId(), created.id(), new PostDtos.UpdateRequest(
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                null,
                List.of("Cafe", "Updated" + unique),
                null,
                null));
        entityManager.flush();
        entityManager.clear();

        assertThat(postService.detail(created.id(), author.getId()).tags())
                .containsExactly("cafe", "Updated" + unique);
    }
}
