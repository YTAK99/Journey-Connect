package com.jc.backend.upload;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;

import com.jc.backend.common.DomainException;
import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.io.TempDir;
import org.springframework.mock.web.MockMultipartFile;

class ImageStorageServiceTest {

    @TempDir Path tempDir;

    @Test
    void storesPngUsingGeneratedNameInsteadOfOriginalName() throws IOException {
        ImageStorageService storage = new ImageStorageService(tempDir.toString());
        storage.initialize();
        byte[] png = new byte[] {(byte) 0x89, 0x50, 0x4E, 0x47, 0x0D, 0x0A, 0x1A, 0x0A, 1};

        ImageStorageService.StoredImage stored = storage.store(
                new MockMultipartFile("file", "../../trip.png", "image/png", png));

        assertThat(stored.storedName()).endsWith(".png").doesNotContain("trip");
        assertThat(stored.originalName()).isEqualTo("trip.png");
        assertThat(Files.readAllBytes(tempDir.resolve(stored.storedName()))).isEqualTo(png);
    }

    @Test
    void rejectsFileWhoseBytesAreNotAnAllowedImage() {
        ImageStorageService storage = new ImageStorageService(tempDir.toString());
        storage.initialize();

        assertThatThrownBy(() -> storage.store(
                new MockMultipartFile("file", "fake.jpg", "image/jpeg", "not-image".getBytes())))
                .isInstanceOf(DomainException.class);
    }
}
