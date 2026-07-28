package com.jc.backend.post;

import com.jc.backend.common.DomainException;
import java.util.regex.Pattern;
import org.owasp.html.HtmlPolicyBuilder;
import org.owasp.html.PolicyFactory;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;

/** 편집기 본문에서 서비스가 지원하는 서식만 남겨 스크립트 삽입을 차단합니다. */
@Component
public class RichTextSanitizer {

    private static final Pattern ALLOWED_FONT_STYLE = Pattern.compile(
            "(?i)^\\s*font-family\\s*:\\s*(?:Arial|Georgia|Trebuchet MS|Courier New)\\s*;?\\s*$");

    private final PolicyFactory policy = new HtmlPolicyBuilder()
            .allowElements(
                    "p", "br", "strong", "b", "em", "i", "u", "s",
                    "h2", "h3", "blockquote", "ul", "ol", "li", "span")
            .allowAttributes("style")
            .matching(ALLOWED_FONT_STYLE)
            .onElements("span")
            .toFactory();

    public String sanitizeRequired(String content) {
        String sanitized = policy.sanitize(content == null ? "" : content.trim());
        String readableText = sanitized
                .replaceAll("(?s)<[^>]*>", " ")
                .replace("&nbsp;", " ")
                .replace("&#160;", " ")
                .trim();
        if (readableText.isBlank()) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "POST_CONTENT_REQUIRED",
                    "여행 일정을 입력해주세요.");
        }
        return sanitized;
    }
}
