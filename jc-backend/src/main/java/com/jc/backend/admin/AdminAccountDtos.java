package com.jc.backend.admin;

import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class AdminAccountDtos {

    private AdminAccountDtos() {}

    public record AccountView(
            long userId,
            String email,
            String displayName,
            String role,
            String accountStatus) {}

    public record ChangeEmailRequest(
            @Email @NotBlank @Size(max = 190) String email) {}

    public record ChangePasswordRequest(
            @NotBlank @Size(min = 8, max = 72) String newPassword) {}

    public record ChangeResult(boolean changed) {}
}
