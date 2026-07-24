package com.jc.backend.common;

import java.nio.charset.StandardCharsets;
import java.time.LocalDateTime;
import java.time.format.DateTimeParseException;
import java.util.Base64;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/**
 * 피드 정렬 키(createdAt, id)를 URL-safe Base64 문자열로 변환합니다.
 * 커서는 인증 정보가 아니라 조회 위치이므로 암호화하지 않지만, 형식이 잘못되면 400으로 거절합니다.
 */
@Component
public class CursorCodec {

    private static final String SEPARATOR = "|";

    public String encode(LocalDateTime createdAt, Long id) {
        String raw = createdAt + SEPARATOR + id;
        return Base64.getUrlEncoder()
                .withoutPadding()
                .encodeToString(raw.getBytes(StandardCharsets.UTF_8));
    }

    public CursorPosition decode(String cursor) {
        if (cursor == null || cursor.isBlank()) {
            return CursorPosition.initial();
        }

        try {
            String raw = new String(
                    Base64.getUrlDecoder().decode(cursor),
                    StandardCharsets.UTF_8);
            String[] parts = raw.split("\\|", -1);
            if (parts.length != 2) {
                throw invalidCursor();
            }
            return new CursorPosition(
                    LocalDateTime.parse(parts[0]),
                    Long.parseLong(parts[1]));
        } catch (IllegalArgumentException | DateTimeParseException exception) {
            throw invalidCursor();
        }
    }

    private DomainException invalidCursor() {
        return new DomainException(
                HttpStatus.BAD_REQUEST,
                "INVALID_CURSOR",
                "피드 커서 형식이 올바르지 않습니다.");
    }

    public record CursorPosition(LocalDateTime createdAt, Long id) {

        public static CursorPosition initial() {
            return new CursorPosition(null, null);
        }

        public boolean isInitial() {
            return createdAt == null || id == null;
        }
    }
}
