package com.jc.backend.domain.test.controller

import org.springframework.http.ResponseEntity
import org.springframework.web.bind.annotation.CrossOrigin
import org.springframework.web.bind.annotation.GetMapping
import org.springframework.web.bind.annotation.RequestMapping
import org.springframework.web.bind.annotation.RequestParam
import org.springframework.web.bind.annotation.RestController
import java.time.LocalDateTime

@CrossOrigin(origins = ["http://localhost:5173"], allowCredentials = "true")
@RestController
@RequestMapping("/api/v1/test") // 프론트엔드의 apiClient 기본 주소 규격 매핑
class TestController {

    /**
     * 프론트엔드 다국어 스토어와 연동을 테스트하기 위한 웰컴 API
     * GET http://localhost:8080/api/v1/test/welcome
     */
    @GetMapping("/welcome")
    fun getWelcomeMessage(
        @RequestParam(value = "lang", defaultValue = "ko") lang: String
    ): ResponseEntity<Map<String, String>> {

        // Zustand 스토어의 현재 언어 상태(currentLang)에 따라 메시지 분기
        val message = when (lang) {
            "en" -> "Welcome to Journey Connect! Backend connection is successful. 🚀"
            else -> "글로벌 여행 플랫폼 '여정(JC)'에 오신 것을 환영합니다! 백엔드 연동 성공! 🚀"
        }

        // 코틀린 표준 문법을 사용해 Map 객체 생성
        val responseBody = mapOf(
            "status" to "UP",
            "message" to message,
            "serverTime" to LocalDateTime.now().toString()
        )

        return ResponseEntity.ok(responseBody)
    }
}