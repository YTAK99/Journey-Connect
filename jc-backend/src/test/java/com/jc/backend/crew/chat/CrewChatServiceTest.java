package com.jc.backend.crew.chat;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jc.backend.common.DomainException;
import org.junit.jupiter.api.Test;

class CrewChatServiceTest {

    @Test
    void acceptsApplicationOwnedUploadImagePath() {
        String imagePath = "/api/v1/uploads/images/2f71ca53-31c0-4e3d-80c5-2e3db681b1cd.jpg";

        assertThat(CrewChatService.normalizeContent(
                new CrewChatDtos.SendRequest(CrewChatMessageType.IMAGE, imagePath)))
                .isEqualTo(imagePath);
    }

    @Test
    void keepsAcceptingAbsoluteHttpImageUrls() {
        String imageUrl = "https://cdn.example.com/crew/image.png";

        assertThat(CrewChatService.normalizeContent(
                new CrewChatDtos.SendRequest(CrewChatMessageType.IMAGE, imageUrl)))
                .isEqualTo(imageUrl);
    }

    @Test
    void rejectsArbitraryRelativeAndUnsafeImageUrls() {
        for (String imageUrl : new String[] {
                "/api/v1/uploads/images/../secret.jpg",
                "/other/image.jpg",
                "javascript:alert(1)"
        }) {
            assertThatThrownBy(() -> CrewChatService.normalizeContent(
                    new CrewChatDtos.SendRequest(CrewChatMessageType.IMAGE, imageUrl)))
                    .isInstanceOfSatisfying(DomainException.class, exception ->
                            assertThat(exception.getCode()).isEqualTo("INVALID_CHAT_IMAGE_URL"));
        }
    }

    @Test
    void leavesTextMessagesUnchangedExceptForSurroundingWhitespace() {
        assertThat(CrewChatService.normalizeContent(
                new CrewChatDtos.SendRequest(CrewChatMessageType.TEXT, "  hello  ")))
                .isEqualTo("hello");
    }
}
