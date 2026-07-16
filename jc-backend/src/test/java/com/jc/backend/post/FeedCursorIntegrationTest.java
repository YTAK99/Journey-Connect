package com.jc.backend.post;

import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.common.CursorPageResponse;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.util.ArrayList;
import java.util.HashSet;
import java.util.List;
import java.util.Set;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.data.domain.PageRequest;

@SpringBootTest
@Transactional
class FeedCursorIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private PostService postService;

    @Test
    void cursorFeedReturnsEveryPostOnceWithoutOffsetCountQueryContract() {
        // 고정 이름 H2 DB나 선행 테스트 데이터에 의존하지 않도록 현재 테스트 데이터를 명시적으로 격리합니다.
        posts.deleteAll();
        regions.deleteAll();
        users.deleteAll();

        UserAccount author = users.save(new UserAccount("cursor@example.com", "hash", "cursor-user"));
        Region seoul = regions.save(new Region("KR-SEOUL", "KR", "Seoul", null));
        for (int i = 1; i <= 5; i++) {
        posts.save(new JourneyPost(
                author,
                seoul,
                "post-" + i,
                "content-" + i
        ));
        }

        posts.flush();

        List<Long> expectedIds = posts.findByPublishedTrueOrderByCreatedAtDescIdDesc(
                        PageRequest.of(0, 10))
                .stream()
                .map(JourneyPost::getId)
                .toList();

        List<Long> collected = new ArrayList<>();
        String cursor = null;
        boolean hasNext;

        do {
            CursorPageResponse<PostDtos.Summary> page = postService.feed(cursor, 2);
            collected.addAll(page.items().stream()
                    .map(PostDtos.Summary::id)
                    .toList());
            cursor = page.nextCursor();
            hasNext = page.hasNext();
        } while (hasNext);

        assertThat(collected).containsExactlyElementsOf(expectedIds);
        assertThat(new HashSet<>(collected)).hasSameSizeAs(collected);