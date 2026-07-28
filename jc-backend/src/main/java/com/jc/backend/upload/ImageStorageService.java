package com.jc.backend.upload;

import com.jc.backend.common.DomainException;
import jakarta.annotation.PostConstruct;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.nio.file.StandardOpenOption;
import java.util.Locale;
import java.util.Map;
import java.util.UUID;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.Resource;
import org.springframework.core.io.UrlResource;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.multipart.MultipartFile;

/** 업로드 이미지를 애플리케이션 외부 디렉터리에 안전한 임의 이름으로 저장합니다. */
@Service
public class ImageStorageService {

    public static final long MAX_FILE_SIZE = 5L * 1024L * 1024L;

    private static final Map<String, String> CONTENT_TYPES = Map.of(
            "jpg", "image/jpeg",
            "png", "image/png",
            "webp", "image/webp",
            "gif", "image/gif");

    private final Path root;

    public ImageStorageService(@Value("${app.upload.directory:./uploads/images}") String directory) {
        this.root = Path.of(directory).toAbsolutePath().normalize();
    }

    @PostConstruct
    void initialize() {
        try {
            Files.createDirectories(root);
        } catch (IOException exception) {
            throw new IllegalStateException("이미지 업로드 폴더를 만들 수 없습니다.", exception);
        }
    }

    public StoredImage store(MultipartFile file) {
        if (file == null || file.isEmpty()) {
            throw invalid("빈 이미지 파일은 업로드할 수 없습니다.");
        }
        if (file.getSize() > MAX_FILE_SIZE) {
            throw invalid("이미지는 한 장당 5MB 이하만 업로드할 수 있습니다.");
        }

        try {
            byte[] bytes = file.getBytes();
            String extension = detectExtension(bytes);
            String storedName = UUID.randomUUID() + "." + extension;
            Path destination = root.resolve(storedName).normalize();
            if (!destination.getParent().equals(root)) {
                throw invalid("올바르지 않은 파일 이름입니다.");
            }
            Files.write(destination, bytes, StandardOpenOption.CREATE_NEW);
            return new StoredImage(
                    storedName,
                    safeOriginalName(file.getOriginalFilename()),
                    CONTENT_TYPES.get(extension),
                    bytes.length);
        } catch (DomainException exception) {
            throw exception;
        } catch (IOException exception) {
            throw new DomainException(
                    HttpStatus.INTERNAL_SERVER_ERROR,
                    "IMAGE_STORE_FAILED",
                    "이미지를 저장하지 못했습니다.");
        }
    }

    public Resource load(String storedName) {
        if (storedName == null || !storedName.toLowerCase(Locale.ROOT)
                .matches("[0-9a-f-]{36}\\.(jpg|png|webp|gif)")) {
            throw notFound();
        }
        Path file = root.resolve(storedName).normalize();
        if (!file.getParent().equals(root) || !Files.isRegularFile(file)) {
            throw notFound();
        }
        try {
            return new UrlResource(file.toUri());
        } catch (IOException exception) {
            throw notFound();
        }
    }

    public String contentType(String storedName) {
        int dot = storedName.lastIndexOf('.');
        return dot < 0
                ? "application/octet-stream"
                : CONTENT_TYPES.getOrDefault(storedName.substring(dot + 1).toLowerCase(Locale.ROOT), "application/octet-stream");
    }

    private String detectExtension(byte[] bytes) {
        if (startsWith(bytes, 0xFF, 0xD8, 0xFF)) return "jpg";
        if (startsWith(bytes, 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A)) return "png";
        if (startsWithAscii(bytes, "GIF87a") || startsWithAscii(bytes, "GIF89a")) return "gif";
        if (bytes.length >= 12
                && asciiAt(bytes, 0, "RIFF")
                && asciiAt(bytes, 8, "WEBP")) return "webp";
        throw invalid("JPEG, PNG, WebP, GIF 이미지 파일만 업로드할 수 있습니다.");
    }

    private boolean startsWith(byte[] bytes, int... signature) {
        if (bytes.length < signature.length) return false;
        for (int index = 0; index < signature.length; index++) {
            if ((bytes[index] & 0xFF) != signature[index]) return false;
        }
        return true;
    }

    private boolean startsWithAscii(byte[] bytes, String value) {
        return asciiAt(bytes, 0, value);
    }

    private boolean asciiAt(byte[] bytes, int offset, String value) {
        if (bytes.length < offset + value.length()) return false;
        for (int index = 0; index < value.length(); index++) {
            if (bytes[offset + index] != (byte) value.charAt(index)) return false;
        }
        return true;
    }

    private String safeOriginalName(String originalName) {
        if (originalName == null || originalName.isBlank()) return "image";
        String normalized = originalName.replace('\\', '/');
        String name = normalized.substring(normalized.lastIndexOf('/') + 1).trim();
        return name.length() > 200 ? name.substring(name.length() - 200) : name;
    }

    private DomainException invalid(String message) {
        return new DomainException(HttpStatus.BAD_REQUEST, "INVALID_IMAGE", message);
    }

    private DomainException notFound() {
        return new DomainException(HttpStatus.NOT_FOUND, "IMAGE_NOT_FOUND", "이미지를 찾을 수 없습니다.");
    }

    public record StoredImage(String storedName, String originalName, String contentType, long size) {}
}
