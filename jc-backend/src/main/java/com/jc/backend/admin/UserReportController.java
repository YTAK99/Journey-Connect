package com.jc.backend.admin;

import com.jc.backend.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

/** 일반 사용자의 신고 생성 진입점입니다. 관리자 조회·처리 API와 저장소를 공유합니다. */
@RestController
@RequestMapping("/api/v1/posts")
public class UserReportController {

    private final UserReportService reports;

    public UserReportController(UserReportService reports) {
        this.reports = reports;
    }

    @PostMapping("/{postId}/reports")
    ApiResponse<UserReportDtos.CreateResult> reportPost(
            @AuthenticationPrincipal Jwt token,
            @PathVariable long postId,
            @Valid @RequestBody UserReportDtos.CreateRequest request) {
        return ApiResponse.ok(reports.reportPost(userId(token), postId, request));
    }

    private long userId(Jwt token) {
        return Long.parseLong(token.getSubject());
    }
}
