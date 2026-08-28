package com.jc.backend.crew;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.ArgumentMatchers.eq;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

import com.jc.backend.recommendation.p1.RecommendationP1ProfileSource;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.time.LocalDate;
import java.util.List;
import java.util.Optional;
import org.junit.jupiter.api.Test;

class CrewRecommendationServiceTest {

    @Test
    void returnsEmptyListWhenCandidateSourceHasNoEligibleCrew() {
        CrewRecommendationCandidateSource candidateSource =
                mock(CrewRecommendationCandidateSource.class);
        CrewRecommendationScorer scorer = mock(CrewRecommendationScorer.class);
        RecommendationP1ProfileSource profileSource =
                mock(RecommendationP1ProfileSource.class);
        UserRepository users = mock(UserRepository.class);
        UserAccount user = new UserAccount("empty@example.com", "hash", "empty-user");

        when(users.findById(42L)).thenReturn(Optional.of(user));
        when(candidateSource.findEligible(
                        eq(42L),
                        any(LocalDate.class),
                        eq(CrewRecommendationPolicy.RETRIEVAL_LIMIT)))
                .thenReturn(List.of());

        CrewRecommendationService service =
                new CrewRecommendationService(candidateSource, scorer, profileSource, users);

        assertThat(service.recommend(42L, 10)).isEmpty();
        verifyNoInteractions(profileSource, scorer);
    }
}
