package com.jc.backend.global.config

import io.swagger.v3.oas.models.Components
import io.swagger.v3.oas.models.OpenAPI
import io.swagger.v3.oas.models.info.Info
import io.swagger.v3.oas.models.security.SecurityRequirement
import io.swagger.v3.oas.models.security.SecurityScheme
import org.springframework.context.annotation.Bean
import org.springframework.context.annotation.Configuration

@Configuration
class SwaggerConfig {

    /**
     * Swagger 문서 상단에 토큰 기반 인증(JWT)을 테스트할 수 있는 'Authorize' 자물쇠 버튼을 생성하는 설정
     */
    @Bean
    fun customOpenAPI(): OpenAPI {
        val jwtSchemeName = "jwtAuth"
        val securityRequirement = SecurityRequirement().addList(jwtSchemeName)

        val components = Components()
            .addSecuritySchemes(jwtSchemeName, SecurityScheme()
                .name(jwtSchemeName)
                .type(SecurityScheme.Type.HTTP)
                .scheme("bearer")
                .bearerFormat("JWT")) // JWT 토큰 인증 타입 명시

        return OpenAPI()
            .info(Info()
                .title("Journey Connect (JC) API Specification")
                .description("글로벌 여행 정보 공유 플랫폼 '여정(JC)' 백엔드 Core API 명세서입니다.")
                .version("v1.0.0"))
            .addSecurityItem(securityRequirement)
            .components(components)
    }
}