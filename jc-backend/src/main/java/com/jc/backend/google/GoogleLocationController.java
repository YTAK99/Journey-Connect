package com.jc.backend.google;

import com.jc.backend.common.ApiResponse;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

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
}
