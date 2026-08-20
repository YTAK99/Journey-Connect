package com.jc.backend.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.ArgumentMatchers.anyCollection;
import static org.mockito.Mockito.doAnswer;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.when;

import com.jc.backend.common.DomainException;
import java.util.ArrayList;
import java.util.List;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;

class TagServiceTest {

    private TagRepository repository;
    private TagService service;
    private final List<Tag> stored = new ArrayList<>();

    @BeforeEach
    void setUp() {
        repository = mock(TagRepository.class);
        service = new TagService(repository);
        doAnswer(invocation -> {
            String name = invocation.getArgument(0);
            String normalized = invocation.getArgument(1);
            if (stored.stream().noneMatch(tag -> tag.getNormalizedName().equals(normalized))) {
                stored.add(new Tag(name, normalized));
            }
            return null;
        }).when(repository).insertIfAbsent(org.mockito.ArgumentMatchers.anyString(), org.mockito.ArgumentMatchers.anyString());
        when(repository.findByNormalizedNameIn(anyCollection())).thenAnswer(invocation -> List.copyOf(stored));
    }

    @Test
    void removesHashAndPreservesInputOrder() {
        assertThat(service.resolve(List.of("#Jeju Cafe", "맛집")))
                .extracting(Tag::getName)
                .containsExactly("Jeju Cafe", "맛집");
    }

    @Test
    void rejectsDuplicatesIgnoringCaseAndSpaces() {
        assertThatThrownBy(() -> service.resolve(List.of("Jeju Cafe", "jeju  cafe")))
                .isInstanceOf(DomainException.class);
    }

    @Test
    void rejectsMoreThanFiveTags() {
        assertThatThrownBy(() -> service.resolve(List.of("1", "2", "3", "4", "5", "6")))
                .isInstanceOf(DomainException.class);
    }
}
