package com.jc.backend.intelligence.contentanalysis;

import com.jc.backend.common.ApiResponse;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/v1/posts")
public class PostContentAnalysisController {

    private final PostContentAnalysisReadService readService;

    public PostContentAnalysisController(PostContentAnalysisReadService readService) {
        this.readService = readService;
    }

    @GetMapping("/{postId}/analysis")
    ApiResponse<PostContentAnalysisReadView> current(
            @PathVariable long postId,
            @AuthenticationPrincipal Jwt token) {
        return ApiResponse.ok(readService.current(postId, userIdOrNull(token)));
    }

    private Long userIdOrNull(Jwt token) {
        return token == null ? null : Long.parseLong(token.getSubject());
    }
}
