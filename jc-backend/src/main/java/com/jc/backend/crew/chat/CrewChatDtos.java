package com.jc.backend.crew.chat;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import jakarta.validation.constraints.Size;
import java.time.LocalDateTime;
import java.util.List;

public final class CrewChatDtos {

    private CrewChatDtos() {}

    public record SendRequest(
            @NotNull CrewChatMessageType type,
            @NotBlank @Size(max = 1000) String content) {}

    public record MessageView(
            Long id,
            Long crewId,
            Long senderId,
            String senderNickname,
            String senderProfileImageUrl,
            CrewChatMessageType type,
            String content,
            LocalDateTime createdAt) {}

    public record History(
            List<MessageView> items,
            Long nextBeforeId,
            boolean hasMore) {}
}
