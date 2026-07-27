package com.jc.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

/** 애플리케이션 실행과 컴포넌트 스캔의 시작점입니다. */
@SpringBootApplication // 자동 설정·컴포넌트 스캔·설정 클래스 기능을 한 번에 활성화합니다.
public class JcBackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(JcBackendApplication.class, args);
    }
}
