package com.jc.backend.auth;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.ObjectProvider;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.mail.MailException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.stereotype.Component;

/** SMTP가 구성된 환경에서만 재설정 토큰을 메일로 전달하며 토큰 원문을 로그에 남기지 않습니다. */
@Component
public class PasswordResetMailService {

    private static final Logger log = LoggerFactory.getLogger(PasswordResetMailService.class);

    private final JavaMailSender mailSender;
    private final String from;
    private final String resetBaseUrl;

    public PasswordResetMailService(
            ObjectProvider<JavaMailSender> mailSenderProvider,
            @Value("${app.security.password-reset-mail-from:no-reply@journey-connect.local}")
                    String from,
            @Value("${app.security.password-reset-base-url:http://localhost:5173/reset-password}")
                    String resetBaseUrl) {
        this.mailSender = mailSenderProvider.getIfAvailable();
        this.from = from;
        this.resetBaseUrl = resetBaseUrl;
    }

    public boolean send(String email, String rawToken) {
        if (mailSender == null) {
            log.warn("Password reset mail was not sent because JavaMailSender is not configured");
            return false;
        }

        String separator = resetBaseUrl.contains("?") ? "&" : "?";
        String resetUrl = resetBaseUrl + separator + "token=" + rawToken;
        SimpleMailMessage message = new SimpleMailMessage();
        message.setFrom(from);
        message.setTo(email);
        message.setSubject("Journey Connect 비밀번호 재설정");
        message.setText("""
                Journey Connect 비밀번호 재설정 요청이 접수되었습니다.

                아래 링크에서 새 비밀번호를 설정해 주세요.
                %s

                본인이 요청하지 않았다면 이 메일을 무시해 주세요.
                """.formatted(resetUrl));
        try {
            mailSender.send(message);
            return true;
        } catch (MailException exception) {
            log.warn("Password reset mail delivery failed: {}", exception.getClass().getSimpleName());
            return false;
        }
    }
}
