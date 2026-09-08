package com.jc.backend.intelligence.contentanalysis;

import java.nio.ByteBuffer;
import java.nio.charset.StandardCharsets;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.HexFormat;
import java.util.List;

public final class PostContentAnalysisSourceVersion {

    public static final String VERSION_PREFIX = "post-analysis-source-v1:";
    private static final String CANONICALIZATION_MARKER = "post-analysis-source-v1";

    private PostContentAnalysisSourceVersion() {}

    public static String from(
            String title,
            String content,
            String regionName,
            List<String> sourceTags) {
        MessageDigest digest = sha256();
        update(digest, CANONICALIZATION_MARKER);
        update(digest, title);
        update(digest, content);
        update(digest, regionName);

        List<String> tags = sourceTags == null ? List.of() : sourceTags;
        digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(tags.size()).array());
        for (String tag : tags) {
            update(digest, tag);
        }
        return VERSION_PREFIX + HexFormat.of().formatHex(digest.digest());
    }

    private static void update(MessageDigest digest, String value) {
        if (value == null) {
            digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(-1).array());
            return;
        }
        byte[] bytes = value.getBytes(StandardCharsets.UTF_8);
        digest.update(ByteBuffer.allocate(Integer.BYTES).putInt(bytes.length).array());
        digest.update(bytes);
    }

    private static MessageDigest sha256() {
        try {
            return MessageDigest.getInstance("SHA-256");
        } catch (NoSuchAlgorithmException exception) {
            throw new IllegalStateException("SHA-256 is unavailable", exception);
        }
    }
}
