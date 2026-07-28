package com.jc.backend.post;

import com.jc.backend.common.DomainException;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;

/** 사용자 입력 태그를 검증·정규화하고 기존 태그를 재사용합니다. */
@Service
public class TagService {

    private static final int MAX_TAGS = 5;
    private static final int MAX_TAG_LENGTH = 20;

    private final TagRepository tags;

    public TagService(TagRepository tags) {
        this.tags = tags;
    }

    public List<Tag> resolve(List<String> requestedTags) {
        if (requestedTags == null || requestedTags.isEmpty()) return List.of();
        if (requestedTags.size() > MAX_TAGS) {
            throw invalid("태그는 최대 5개까지 입력할 수 있습니다.");
        }

        LinkedHashMap<String, String> namesByNormalized = new LinkedHashMap<>();
        for (String requestedTag : requestedTags) {
            String displayName = displayName(requestedTag);
            String normalizedName = normalizedName(displayName);
            if (namesByNormalized.putIfAbsent(normalizedName, displayName) != null) {
                throw invalid("같은 태그를 중복해서 입력할 수 없습니다.");
            }
        }

        namesByNormalized.forEach((normalizedName, displayName) ->
                tags.insertIfAbsent(displayName, normalizedName));

        Map<String, Tag> savedByNormalized = new LinkedHashMap<>();
        tags.findByNormalizedNameIn(namesByNormalized.keySet())
                .forEach(tag -> savedByNormalized.put(tag.getNormalizedName(), tag));

        List<Tag> resolved = new ArrayList<>();
        namesByNormalized.keySet().forEach(normalizedName -> {
            Tag tag = savedByNormalized.get(normalizedName);
            if (tag == null) {
                throw new IllegalStateException("저장된 태그를 찾을 수 없습니다: " + normalizedName);
            }
            resolved.add(tag);
        });
        return resolved;
    }

    private String displayName(String value) {
        String name = value == null
                ? ""
                : value.trim().replaceFirst("^#+", "").trim().replaceAll("\\s+", " ");
        if (name.isBlank()) throw invalid("빈 태그는 입력할 수 없습니다.");
        if (name.length() > MAX_TAG_LENGTH) {
            throw invalid("태그는 20자 이하로 입력해주세요.");
        }
        return name;
    }

    private String normalizedName(String displayName) {
        return displayName.toLowerCase(Locale.ROOT).replaceAll("\\s+", "");
    }

    private DomainException invalid(String message) {
        return new DomainException(HttpStatus.BAD_REQUEST, "INVALID_TAGS", message);
    }
}
