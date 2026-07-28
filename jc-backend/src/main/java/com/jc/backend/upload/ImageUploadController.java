package com.jc.backend.upload;

import com.jc.backend.common.ApiResponse;
import com.jc.backend.common.DomainException;
import java.util.List;
import org.springframework.core.io.Resource;
import org.springframework.http.CacheControl;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.security.oauth2.jwt.Jwt;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.ResponseStatus;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.servlet.support.ServletUriComponentsBuilder;

/** 로그인 사용자의 여행 이미지를 받고 저장된 이미지는 공개 URL로 제공합니다. */
@RestController
@RequestMapping("/api/v1/uploads/images")
public class ImageUploadController {

    private final ImageStorageService storage;

    public ImageUploadController(ImageStorageService storage) {
        this.storage = storage;
    }

    @PostMapping(consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    @ResponseStatus(HttpStatus.CREATED)
    ApiResponse<List<ImageUploadView>> upload(
            @AuthenticationPrincipal Jwt token,
            @RequestParam("files") List<MultipartFile> files) {
        if (files == null || files.isEmpty()) {
            throw new DomainException(HttpStatus.BAD_REQUEST, "IMAGE_REQUIRED", "업로드할 이미지를 선택해주세요.");
        }
        if (files.size() > 10) {
            throw new DomainException(HttpStatus.BAD_REQUEST, "TOO_MANY_IMAGES", "이미지는 최대 10장까지 업로드할 수 있습니다.");
        }

        // token의 존재는 SecurityFilterChain이 보장합니다. subject 파싱으로 인증 토큰도 한 번 더 확인합니다.
        Long.parseLong(token.getSubject());
        List<ImageUploadView> uploaded = files.stream().map(file -> {
            ImageStorageService.StoredImage stored = storage.store(file);
            String imageUrl = ServletUriComponentsBuilder.fromCurrentContextPath()
                    .path("/api/v1/uploads/images/")
                    .path(stored.storedName())
                    .toUriString();
            return new ImageUploadView(imageUrl, stored.originalName(), stored.size());
        }).toList();
        return ApiResponse.created(uploaded);
    }

    @GetMapping("/{storedName:.+}")
    ResponseEntity<Resource> image(@PathVariable String storedName) {
        Resource resource = storage.load(storedName);
        return ResponseEntity.ok()
                .contentType(MediaType.parseMediaType(storage.contentType(storedName)))
                .cacheControl(CacheControl.noCache())
                .header(HttpHeaders.CONTENT_DISPOSITION, "inline")
                .body(resource);
    }

    public record ImageUploadView(String imageUrl, String originalName, long size) {}
}
