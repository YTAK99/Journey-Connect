package com.jc.backend.admin;

import com.jc.backend.common.ApiResponse;
import jakarta.validation.Valid;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PatchMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/admin/account")
public class AdminAccountController {

    private final AdminAccountService service;

    public AdminAccountController(AdminAccountService service) {
        this.service = service;
    }

    @GetMapping
    ApiResponse<AdminAccountDtos.AccountView> current() {
        return ApiResponse.ok(service.current());
    }

    @PatchMapping("/email")
    ApiResponse<AdminAccountDtos.AccountView> changeEmail(
            @Valid @RequestBody AdminAccountDtos.ChangeEmailRequest request) {
        return ApiResponse.ok(service.changeEmail(request));
    }

    @PatchMapping("/password")
    ApiResponse<AdminAccountDtos.ChangeResult> changePassword(
            @Valid @RequestBody AdminAccountDtos.ChangePasswordRequest request) {
        return ApiResponse.ok(service.changePassword(request));
    }
}
