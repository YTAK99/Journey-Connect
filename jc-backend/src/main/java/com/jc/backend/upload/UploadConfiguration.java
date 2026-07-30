package com.jc.backend.upload;

import jakarta.servlet.MultipartConfigElement;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.web.servlet.MultipartConfigFactory;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;
import org.springframework.util.unit.DataSize;

/** 로컬 설정 파일이 오래된 환경에서도 이미지 업로드 제한을 동일하게 적용합니다. */
@Configuration
public class UploadConfiguration {

    @Bean
    MultipartConfigElement multipartConfigElement(
            @Value("${app.upload.directory:./uploads/images}") String uploadDirectory) {
        Path multipartTempDirectory = Path.of(uploadDirectory)
                .toAbsolutePath()
                .normalize()
                .resolve(".tmp");
        try {
            Files.createDirectories(multipartTempDirectory);
        } catch (IOException exception) {
            throw new IllegalStateException("이미지 업로드 임시 폴더를 만들 수 없습니다.", exception);
        }

        MultipartConfigFactory factory = new MultipartConfigFactory();
        factory.setMaxFileSize(DataSize.ofMegabytes(5));
        factory.setMaxRequestSize(DataSize.ofMegabytes(50));
        factory.setLocation(multipartTempDirectory.toString());
        return factory.createMultipartConfig();
    }
}
