package com.jc.backend.auth;

public interface GoogleIdentityVerifier {
    GoogleIdentity verify(String idToken);
}
