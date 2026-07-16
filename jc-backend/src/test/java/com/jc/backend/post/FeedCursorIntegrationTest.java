package com.jc.backend.post;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.persistence.EntityManager;
import java.time.LocalDateTime;
import org.springframework.jdbc.core.JdbcTemplate;
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

@SpringBootTest
@Transactional
class FeedCursorIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private JourneyPostRepository posts;
    @Autowired private PostService postService;
    @Autowired private EntityManager entityManager;
    @Autowired private JdbcTemplate jdbcTemplate;
    
    @Test
    void cursorFeedReturnsEveryPostOnceWithoutOffsetCountQueryContract() {
        // 고정 이름 H2 DB나 선행 테스트 데이터에 의존하지 않도록 현재 테스트 데이터를 명시적으로 격리합니다.
        posts.deleteAll();
        regions.deleteAll();
        users.deleteAll();

        UserAccount author = users.save(new UserAccount("cursor@example.com", "hash", "cursor-user"));
        Region seoul = regions.save(new Region("KR-SEOUL", "KR", "Seoul", null));
        posts.flush();

        List<JourneyPost> savedPosts = posts.findAll();
        LocalDateTime base = LocalDateTime.of(2026, 1, 1, 12, 0);

        for (int i = 0; i < savedPosts.size(); i++) {
            jdbcTemplate.update(
                    "update journey_post set created_at = ? where id = ?",
                    base.plusSeconds(i),
                    savedPosts.get(i).getId());
        }

entityManager.clear();

        List<Long> collected = new ArrayList<>();
        String cursor = null;
        boolean hasNext;
        do {
            CursorPageResponse<PostDtos.Summary> page = postService.feed(cursor, 2);
            collected.addAll(page.items().stream().map(PostDtos.Summary::id).toList());
            cursor = page.nextCursor();
            hasNext = page.hasNext();
        } while (hasNext);

        Set<Long> uniqueIds = new HashSet<>(collected);
        assertThat(collected).hasSize(5);
        assertThat(uniqueIds).hasSize(5);
    }
}
