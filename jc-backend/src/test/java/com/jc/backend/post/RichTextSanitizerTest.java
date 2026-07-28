package com.jc.backend.post;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jc.backend.common.DomainException;
import org.junit.jupiter.api.Test;

class RichTextSanitizerTest {

    private final RichTextSanitizer sanitizer = new RichTextSanitizer();

    @Test
    void keepsSupportedFormattingAndRemovesExecutableMarkup() {
        String sanitized = sanitizer.sanitizeRequired(
                "<h2>여행</h2><script>alert(1)</script><p onclick=\"alert(2)\"><strong>본문</strong>"
                        + "<span style=\"font-family: Georgia\">감성 기록</span></p>");

        assertThat(sanitized).contains(
                "<h2>여행</h2>",
                "<strong>본문</strong>",
                "style=\"font-family: Georgia\"");
        assertThat(sanitized).doesNotContain("script", "onclick");
    }

    @Test
    void rejectsMarkupWithoutReadableText() {
        assertThatThrownBy(() -> sanitizer.sanitizeRequired("<p><br></p>"))
                .isInstanceOf(DomainException.class);
    }
}
