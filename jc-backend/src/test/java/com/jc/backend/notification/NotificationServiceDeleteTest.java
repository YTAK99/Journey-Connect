package com.jc.backend.notification;

import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.mockito.Mockito.mock;
import static org.mockito.Mockito.verify;
import static org.mockito.Mockito.when;

import com.jc.backend.common.DomainException;
import org.junit.jupiter.api.Test;
import org.springframework.jdbc.core.JdbcTemplate;

class NotificationServiceDeleteTest {

    @Test
    void deletesOnlyTheRecipientsOwnNotification() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        NotificationService service = new NotificationService(jdbc);
        when(jdbc.update(
                "delete from user_notification where id = ? and recipient_id = ?",
                41L,
                7L)).thenReturn(1);

        NotificationDtos.UpdateResult result = service.delete(7L, 41L);

        assertThat(result.updatedCount()).isEqualTo(1);
        verify(jdbc).update(
                "delete from user_notification where id = ? and recipient_id = ?",
                41L,
                7L);
    }

    @Test
    void hidesWhetherAnotherUsersNotificationExists() {
        JdbcTemplate jdbc = mock(JdbcTemplate.class);
        NotificationService service = new NotificationService(jdbc);

        assertThatThrownBy(() -> service.delete(7L, 99L))
                .isInstanceOfSatisfying(DomainException.class, exception -> {
                    assertThat(exception.getStatus().value()).isEqualTo(404);
                    assertThat(exception.getCode()).isEqualTo("NOTIFICATION_NOT_FOUND");
                });
    }
}
