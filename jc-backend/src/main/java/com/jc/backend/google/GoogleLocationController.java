package com.jc.backend.google;

import com.jc.backend.common.ApiResponse;
import java.util.List;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

/** 프론트에 API 키를 노출하지 않고 Google 장소·날씨 정보를 중계하는 REST 진입점입니다. */
@RestController
@RequestMapping("/api/v1/google")
public class GoogleLocationController {

    private final GoogleLocationService googleLocationService;

    public GoogleLocationController(GoogleLocationService googleLocationService) {
        this.googleLocationService = googleLocationService;
    }

    @GetMapping("/location-summary")
    ApiResponse<GoogleLocationDtos.LocationSummary> locationSummary(
            @RequestParam String query,
            @RequestParam(defaultValue = "ko") String languageCode) {
        return ApiResponse.ok(googleLocationService.lookup(query, languageCode));
    }

    @GetMapping("/location-suggestions")
    ApiResponse<List<GoogleLocationDtos.LocationSuggestion>> locationSuggestions(
            @RequestParam String query,
            @RequestParam(defaultValue = "ko") String languageCode,
            @RequestParam(defaultValue = "region") String scope) {
        return ApiResponse.ok(googleLocationService.suggest(query, languageCode, scope));
    }
}
