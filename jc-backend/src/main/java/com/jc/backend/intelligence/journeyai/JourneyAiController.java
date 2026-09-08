package com.jc.backend.intelligence.journeyai;

import com.jc.backend.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/journey-ai")
public class JourneyAiController {

    private final JourneyAiService journeyAiService;

    public JourneyAiController(JourneyAiService journeyAiService) {
        this.journeyAiService = journeyAiService;
    }

    @PostMapping("/chat")
    ApiResponse<JourneyAiDtos.ChatResponse> chat(
            @AuthenticationPrincipal Jwt token,
            @Valid @RequestBody JourneyAiDtos.ChatRequest request) {
        return ApiResponse.ok(journeyAiService.chat(Long.parseLong(token.getSubject()), request));
    }
}
