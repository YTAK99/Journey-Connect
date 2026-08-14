package com.jc.backend.crew;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.assertj.core.api.Assertions.assertThat;

import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import jakarta.persistence.EntityManager;
import java.time.LocalDate;
import java.util.List;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@Transactional
class CrewContractIntegrationTest {

    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private CrewService crewService;
    @Autowired private EntityManager entityManager;

    @Test
    void crewPersistsCoverImageAndOrderedSharedTags() {
        String suffix = UUID.randomUUID().toString().substring(0, 8);
        UserAccount owner = users.save(new UserAccount(
                "crew-contract-" + suffix + "@example.com",
                "hash",
                "crew-contract-" + suffix));
        region(regions, "KR-SEOUL", "KR", "Seoul");

        CrewDtos.View created = crewService.create(owner.getId(), new CrewDtos.CreateRequest(
                "서울 야간 산책",
                "KR-SEOUL",
                null,
                "야경을 보며 걷는 크루",
                LocalDate.now().plusDays(5),
                8,
                true,
                "https://cdn.example.com/crew-cover.jpg",
                List.of("야경", "산책")));

        entityManager.flush();
        entityManager.clear();

        CrewDtos.View detail = crewService.detail(created.id());
        assertThat(detail.coverImageUrl()).isEqualTo("https://cdn.example.com/crew-cover.jpg");
        assertThat(detail.tags()).containsExactly("야경", "산책");
    }
}
