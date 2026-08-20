package com.jc.backend.admin;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;

public final class UserReportDtos {

    private UserReportDtos() {}

    public record CreateRequest(
            @NotBlank @Size(max = 80) String reasonCategory,
            @Size(max = 1000) String reasonDetail) {}

    public record CreateResult(
            long reportId,
            String status) {}
}
