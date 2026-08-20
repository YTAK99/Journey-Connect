package com.jc.backend.recommendation.explore;

import java.io.ByteArrayInputStream;
import java.io.ByteArrayOutputStream;
import java.io.DataInputStream;
import java.io.DataOutputStream;
import java.io.EOFException;
import java.io.IOException;
import java.nio.charset.StandardCharsets;
import java.security.GeneralSecurityException;
import java.security.MessageDigest;
import java.time.Instant;
import java.util.ArrayList;
import java.util.Base64;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.Objects;
import java.util.Optional;
import java.util.Set;
import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

/**
 * Explore Discovery용 DB-free frozen ordering cursor.
 *
 * <p>payload는 암호화되지 않으므로 filter 원문이나 개인정보를 넣지 않습니다.
 * 무결성은 HMAC-SHA256으로 보장합니다.
 */
public final class ExploreCursorCodec {

    private static final int PAYLOAD_VERSION = 1;
    private static final int MIN_SECRET_BYTES = 32;
    private static final int MAX_TOKEN_BYTES = 64 * 1024;
    private static final Base64.Encoder BASE64_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_DECODER = Base64.getUrlDecoder();

    private final byte[] secret;

    public ExploreCursorCodec(byte[] secret) {
        Objects.requireNonNull(secret, "secret");
        if (secret.length < MIN_SECRET_BYTES) {
            throw new IllegalArgumentException("explore cursor HMAC secret must be at least 32 bytes");
        }
        this.secret = secret.clone();
    }

    public String encode(Snapshot snapshot) {
        Objects.requireNonNull(snapshot, "snapshot");
        byte[] payload = serialize(snapshot);
        byte[] signature = hmac(payload);
        return BASE64_ENCODER.encodeToString(payload) + "." + BASE64_ENCODER.encodeToString(signature);
    }

    public Snapshot decode(String token, Expectations expectations, Instant now) {
        Objects.requireNonNull(expectations, "expectations");
        Objects.requireNonNull(now, "now");
        if (token == null || token.isBlank()) {
            throw cursor(ExploreCursorException.Reason.INVALID, "explore cursor is required");
        }
        if (token.getBytes(StandardCharsets.UTF_8).length > MAX_TOKEN_BYTES) {
            throw cursor(ExploreCursorException.Reason.INVALID, "explore cursor is too large");
        }

        String[] parts = token.split("\\.", -1);
        if (parts.length != 2 || parts[0].isEmpty() || parts[1].isEmpty()) {
            throw cursor(ExploreCursorException.Reason.INVALID, "explore cursor format is invalid");
        }

        final byte[] payload;
        final byte[] suppliedSignature;
        try {
            payload = BASE64_DECODER.decode(parts[0]);
            suppliedSignature = BASE64_DECODER.decode(parts[1]);
        } catch (IllegalArgumentException exception) {
            throw new ExploreCursorException(
                    ExploreCursorException.Reason.INVALID,
                    "explore cursor encoding is invalid",
                    exception);
        }

        byte[] expectedSignature = hmac(payload);
        if (!MessageDigest.isEqual(expectedSignature, suppliedSignature)) {
            throw cursor(ExploreCursorException.Reason.TAMPERED, "explore cursor signature is invalid");
        }

        Snapshot snapshot = deserialize(payload);
        validateExpectations(snapshot, expectations, now);
        return snapshot;
    }

    public static String filterFingerprint(ExploreRequestContext context) {
        Objects.requireNonNull(context, "context");
        String canonical = context.mode().name()
                + "\n" + normalize(context.keyword())
                + "\n" + normalize(context.region());
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            return hex(digest.digest(canonical.getBytes(StandardCharsets.UTF_8)));
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }

    private void validateExpectations(Snapshot snapshot, Expectations expectations, Instant now) {
        if (!snapshot.rankingVersion().equals(expectations.rankingVersion())) {
            throw cursor(
                    ExploreCursorException.Reason.RANKING_VERSION_MISMATCH,
                    "explore cursor ranking version mismatch");
        }
        if (!snapshot.filterFingerprint().equals(expectations.filterFingerprint())) {
            throw cursor(
                    ExploreCursorException.Reason.FILTER_MISMATCH,
                    "explore cursor filter mismatch");
        }
        if (!snapshot.userBinding().equals(expectations.userBinding())) {
            throw cursor(
                    ExploreCursorException.Reason.USER_BINDING_MISMATCH,
                    "explore cursor user binding mismatch");
        }
        if (!now.isBefore(snapshot.expiresAt())) {
            throw cursor(ExploreCursorException.Reason.EXPIRED, "explore cursor expired");
        }
    }

    private byte[] serialize(Snapshot snapshot) {
        try {
            ByteArrayOutputStream bytes = new ByteArrayOutputStream();
            try (DataOutputStream output = new DataOutputStream(bytes)) {
                output.writeInt(PAYLOAD_VERSION);
                writeString(output, snapshot.rankingVersion());
                writeInstant(output, snapshot.referenceTime());
                writeString(output, snapshot.filterFingerprint());
                output.writeBoolean(snapshot.userBinding().isPresent());
                if (snapshot.userBinding().isPresent()) {
                    writeString(output, snapshot.userBinding().orElseThrow());
                }
                output.writeInt(snapshot.orderedPostIds().size());
                for (long postId : snapshot.orderedPostIds()) {
                    output.writeLong(postId);
                }
                output.writeInt(snapshot.nextOffset());
                writeInstant(output, snapshot.expiresAt());
            }
            return bytes.toByteArray();
        } catch (IOException exception) {
            throw new IllegalStateException("failed to serialize explore cursor", exception);
        }
    }

    private Snapshot deserialize(byte[] payload) {
        try (DataInputStream input = new DataInputStream(new ByteArrayInputStream(payload))) {
            int version = input.readInt();
            if (version != PAYLOAD_VERSION) {
                throw cursor(ExploreCursorException.Reason.INVALID, "unsupported explore cursor payload version");
            }
            String rankingVersion = readString(input);
            Instant referenceTime = readInstant(input);
            String filterFingerprint = readString(input);
            Optional<String> userBinding = input.readBoolean()
                    ? Optional.of(readString(input))
                    : Optional.empty();
            int count = input.readInt();
            if (count < 0 || count > 10_000) {
                throw cursor(ExploreCursorException.Reason.INVALID, "invalid explore cursor candidate count");
            }
            List<Long> orderedPostIds = new ArrayList<>(count);
            for (int index = 0; index < count; index++) {
                orderedPostIds.add(input.readLong());
            }
            int nextOffset = input.readInt();
            Instant expiresAt = readInstant(input);
            if (input.read() != -1) {
                throw cursor(ExploreCursorException.Reason.INVALID, "explore cursor contains trailing data");
            }
            return new Snapshot(
                    rankingVersion,
                    referenceTime,
                    filterFingerprint,
                    userBinding,
                    orderedPostIds,
                    nextOffset,
                    expiresAt);
        } catch (ExploreCursorException exception) {
            throw exception;
        } catch (EOFException exception) {
            throw new ExploreCursorException(
                    ExploreCursorException.Reason.INVALID,
                    "explore cursor payload is truncated",
                    exception);
        } catch (IOException | IllegalArgumentException exception) {
            throw new ExploreCursorException(
                    ExploreCursorException.Reason.INVALID,
                    "explore cursor payload is invalid",
                    exception);
        }
    }

    private byte[] hmac(byte[] payload) {
        try {
            Mac mac = Mac.getInstance("HmacSHA256");
            mac.init(new SecretKeySpec(secret, "HmacSHA256"));
            return mac.doFinal(payload);
        } catch (GeneralSecurityException exception) {
            throw new IllegalStateException("HmacSHA256 is unavailable", exception);
        }
    }

    private static void writeInstant(DataOutputStream output, Instant instant) throws IOException {
        output.writeLong(instant.getEpochSecond());
        output.writeInt(instant.getNano());
    }

    private static Instant readInstant(DataInputStream input) throws IOException {
        return Instant.ofEpochSecond(input.readLong(), input.readInt());
    }

    private static void writeString(DataOutputStream output, String value) throws IOException {
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        output.writeInt(bytes.length);
        output.write(bytes);
    }

    private static String readString(DataInputStream input) throws IOException {
        int length = input.readInt();
        if (length < 0 || length > MAX_TOKEN_BYTES) {
            throw cursor(ExploreCursorException.Reason.INVALID, "invalid explore cursor string length");
        }
        byte[] bytes = input.readNBytes(length);
        if (bytes.length != length) {
            throw new EOFException("truncated string");
        }
        return new String(bytes, StandardCharsets.UTF_8);
    }

    private static String normalize(String value) {
        return value == null ? "" : value.trim().toLowerCase(Locale.ROOT);
    }

    private static String hex(byte[] bytes) {
        StringBuilder builder = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            builder.append(Character.forDigit((value >>> 4) & 0x0f, 16));
            builder.append(Character.forDigit(value & 0x0f, 16));
        }
        return builder.toString();
    }

    private static ExploreCursorException cursor(ExploreCursorException.Reason reason, String message) {
        return new ExploreCursorException(reason, message);
    }

    public record Snapshot(
            String rankingVersion,
            Instant referenceTime,
            String filterFingerprint,
            Optional<String> userBinding,
            List<Long> orderedPostIds,
            int nextOffset,
            Instant expiresAt) {

        public Snapshot {
            rankingVersion = requireNonBlank(rankingVersion, "rankingVersion");
            if (!ExploreRankingPolicy.DISCOVERY_RANKING_VERSION.equals(rankingVersion)) {
                throw new IllegalArgumentException("Explore cursor only supports discovery ranking");
            }
            referenceTime = Objects.requireNonNull(referenceTime, "referenceTime");
            filterFingerprint = requireNonBlank(filterFingerprint, "filterFingerprint");
            userBinding = userBinding == null ? Optional.empty() : userBinding;
            userBinding = userBinding.map(value -> requireNonBlank(value, "userBinding"));
            orderedPostIds = orderedPostIds == null ? List.of() : List.copyOf(orderedPostIds);
            validatePostIds(orderedPostIds);
            if (nextOffset < 0 || nextOffset > orderedPostIds.size()) {
                throw new IllegalArgumentException("nextOffset is outside frozen ordering");
            }
            expiresAt = Objects.requireNonNull(expiresAt, "expiresAt");
            if (!expiresAt.isAfter(referenceTime)) {
                throw new IllegalArgumentException("expiresAt must be after referenceTime");
            }
        }

        public Snapshot withNextOffset(int newOffset) {
            return new Snapshot(
                    rankingVersion,
                    referenceTime,
                    filterFingerprint,
                    userBinding,
                    orderedPostIds,
                    newOffset,
                    expiresAt);
        }

        private static void validatePostIds(List<Long> postIds) {
            Set<Long> seen = new HashSet<>();
            for (Long postId : postIds) {
                if (postId == null || postId <= 0) {
                    throw new IllegalArgumentException("frozen post IDs must be positive");
                }
                if (!seen.add(postId)) {
                    throw new IllegalArgumentException("frozen post IDs must be unique");
                }
            }
        }
    }

    public record Expectations(
            String rankingVersion,
            String filterFingerprint,
            Optional<String> userBinding) {

        public Expectations {
            rankingVersion = requireNonBlank(rankingVersion, "rankingVersion");
            filterFingerprint = requireNonBlank(filterFingerprint, "filterFingerprint");
            userBinding = userBinding == null ? Optional.empty() : userBinding;
            userBinding = userBinding.map(value -> requireNonBlank(value, "userBinding"));
        }
    }

    private static String requireNonBlank(String value, String field) {
        Objects.requireNonNull(value, field);
        String normalized = value.trim();
        if (normalized.isEmpty()) {
            throw new IllegalArgumentException(field + " must not be blank");
        }
        return normalized;
    }
}
