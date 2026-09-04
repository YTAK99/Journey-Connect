package com.jc.backend.crew.chat;

import com.jc.backend.common.ApiResponse;
import jakarta.validation.Valid;
import jakarta.validation.constraints.Max;
import jakarta.validation.constraints.Min;
import java.security.Principal;
import org.springframework.messaging.handler.annotation.DestinationVariable;
import org.springframework.messaging.handler.annotation.MessageMapping;
import org.springframework.messaging.simp.SimpMessagingTemplate;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@Validated
@RestController
@RequestMapping("/api/v1/crews/{crewId}/messages")
public class CrewChatController {

    private final CrewChatService chatService;
    private final SimpMessagingTemplate messaging;

    public CrewChatController(CrewChatService chatService, SimpMessagingTemplate messaging) {
        this.chatService = chatService;
        this.messaging = messaging;
    }

    @GetMapping
    ApiResponse<CrewChatDtos.History> history(
            @AuthenticationPrincipal Jwt token,
            @PathVariable Long crewId,
            @RequestParam(required = false) Long beforeId,
            @RequestParam(defaultValue = "50") @Min(1) @Max(100) int size) {
        return ApiResponse.ok(chatService.history(userId(token), crewId, beforeId, size));
    }

    @MessageMapping("/crews/{crewId}/messages")
    public void send(
            @DestinationVariable Long crewId,
            Principal principal,
            @Valid CrewChatDtos.SendRequest request) {
        CrewChatDtos.MessageView saved = chatService.send(
                Long.parseLong(principal.getName()), crewId, request);
        messaging.convertAndSend("/topic/crews/" + crewId, saved);
    }

    private long userId(Jwt token) {
        return Long.parseLong(token.getSubject());
    }
}
