package com.jc.backend.crew;

import static org.assertj.core.api.Assertions.assertThat;

import jakarta.validation.Validation;
import jakarta.validation.Validator;
import java.time.LocalDate;
import java.util.List;
import org.junit.jupiter.api.Test;

class CrewFeatureValidationTest {

    private final Validator validator = Validation.buildDefaultValidatorFactory().getValidator();

    @Test
    void createRequiresCategoryDateAndAtLeastOneRoute() {
        CrewDtos.CreateRequest request = new CrewDtos.CreateRequest(
                "여행 크루",
                "KR-SEOUL",
                null,
                "함께 여행해요",
                null,
                8,
                true,
                null,
                null,
                List.of(),
                null,
                List.of());

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("travelDate", "category", "routePresent")
                .doesNotContain("coverImageUrl");
    }

    @Test
    void titleCountsSpacesAndCannotExceedTwentyFiveCharacters() {
        CrewDtos.CreateRequest request = new CrewDtos.CreateRequest(
                "1234567890123456789012345 ",
                "KR-SEOUL",
                null,
                "함께 여행해요",
                LocalDate.now(),
                8,
                false,
                "https://example.com/cover.jpg",
                null,
                List.of(),
                CrewCategory.CAFE,
                List.of(1L));

        assertThat(validator.validate(request))
                .extracting(violation -> violation.getPropertyPath().toString())
                .contains("title");
    }

    @Test
    void coverIsOptionalWhenAStandaloneRoutePlaceExists() {
        CrewDtos.CreateRequest request = new CrewDtos.CreateRequest(
                "서울 산책 크루",
                null,
                "서울",
                "함께 걸어요",
                LocalDate.now(),
                8,
                false,
                null,
                null,
                List.of(),
                CrewCategory.WALKING,
                List.of(),
                List.of(new CrewDtos.RoutePlaceRequest(
                        null,
                        "서울숲",
                        "google-place-id",
                        "<p>서울숲을 함께 걸어요.</p>",
                        List.of())));

        assertThat(validator.validate(request)).isEmpty();
    }

    @Test
    void kickedMemberCannotBeReactivatedByReapply() {
        CrewMember member = new CrewMember(null, null, CrewMemberStatus.APPROVED);
        member.kick(null);
        member.apply(CrewMemberStatus.APPROVED, null);

        assertThat(member.getStatus()).isEqualTo(CrewMemberStatus.KICKED);
    }
}
