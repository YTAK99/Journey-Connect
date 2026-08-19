package com.jc.backend.crew;

import static com.jc.backend.support.TestRegionFixtures.region;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.get;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.jsonPath;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.status;

import com.jc.backend.region.Region;
import com.jc.backend.region.RegionRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Locale;
import java.util.UUID;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;

@SpringBootTest
@AutoConfigureMockMvc
@Transactional
class CrewSearchIntegrationTest {

    @Autowired private MockMvc mockMvc;
    @Autowired private UserRepository users;
    @Autowired private RegionRepository regions;
    @Autowired private CrewService crewService;

    @Test
    void crewListFiltersByKeywordAndRegionWithoutChangingPublicAccess() throws Exception {
        String suffix = UUID.randomUUID().toString().replace("-", "").substring(0, 8);
        String seoulCode = ("T-SEOUL-" + suffix).toUpperCase(Locale.ROOT);
        String busanCode = ("T-BUSAN-" + suffix).toUpperCase(Locale.ROOT);
        String photoTag = "사진" + suffix;
        String uniqueOwnerKeyword = "ownersearch" + suffix;

        UserAccount seoulOwner = users.save(new UserAccount(
                "crew-search-seoul-" + suffix + "@example.com",
                "hash",
                uniqueOwnerKeyword));
        UserAccount busanOwner = users.save(new UserAccount(
                "crew-search-busan-" + suffix + "@example.com",
                "hash",
                "busan-owner-" + suffix));
        Region seoul = region(regions, seoulCode, "KR", "Seoul-" + suffix);
        Region busan = region(regions, busanCode, "KR", "Busan-" + suffix);

        crewService.create(seoulOwner.getId(), new CrewDtos.CreateRequest(
                "야경 산책 " + suffix,
                seoul.getCode(),
                null,
                "도심 야경을 함께 걷습니다.",
                LocalDate.now().plusDays(10),
                6,
                true,
                null,
                List.of(photoTag)));
        crewService.create(busanOwner.getId(), new CrewDtos.CreateRequest(
                "해변 드라이브 " + suffix,
                busan.getCode(),
                null,
                "바다를 보며 이동합니다.",
                LocalDate.now().plusDays(12),
                6,
                true,
                null,
                List.of("드라이브" + suffix)));

        mockMvc.perform(get("/api/v1/crews")
                        .param("keyword", photoTag)
                        .param("region", seoulCode.toLowerCase(Locale.ROOT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].title").value("야경 산책 " + suffix))
                .andExpect(jsonPath("$.data.items[0].regionCode").value(seoulCode));

        mockMvc.perform(get("/api/v1/crews")
                        .param("keyword", uniqueOwnerKeyword.toUpperCase(Locale.ROOT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].ownerNickname").value(uniqueOwnerKeyword));

        mockMvc.perform(get("/api/v1/crews")
                        .param("region", busan.getDisplayName().toUpperCase(Locale.ROOT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.data.items.length()").value(1))
                .andExpect(jsonPath("$.data.items[0].regionCode").value(busanCode));
    }
}
