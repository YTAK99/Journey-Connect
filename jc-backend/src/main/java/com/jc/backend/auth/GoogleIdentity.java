package com.jc.backend.auth;

public record GoogleIdentity(
        String subject,
        String email,
        String name,
        String pictureUrl,
        String hostedDomain) {}
