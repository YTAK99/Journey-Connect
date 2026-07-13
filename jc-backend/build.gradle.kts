import org.jetbrains.kotlin.gradle.dsl.JvmTarget

plugins {
	// 사용자가 지정한 Spring Boot 3.5.x 버전 반영
	id("org.springframework.boot") version "3.5.16" // 3.5.x 최신 계열 매핑 (실제 사용 버전에 맞게 기입)
	id("io.spring.dependency-management") version "1.1.6"
	kotlin("jvm") version "2.0.0"            // Spring Boot 3.5대와 호환되는 Kotlin 2.x 버전 추천
	kotlin("plugin.spring") version "2.0.0"
	kotlin("plugin.jpa") version "2.0.0"     // JPA 엔티티 무인자 생성자 지원 플러그인
}

// 최종 확정된 Group과 Version
group = "com.journeyconnect"
version = "0.0.1-SNAPSHOT"

java {
	toolchain {
		languageVersion.set(JavaLanguageVersion.of(21)) // Java 21 설정
	}
}

repositories {
	mavenCentral()
	// Spring Boot 3.5.x가 마일스톤(M) 버전일 경우를 대비한 스프링 마일스톤 저장소 추가
	maven { url = uri("https://repo.spring.io/milestone") }
}

dependencies {
	// Spring Boot 기본 스타터
	implementation("org.springframework.boot:spring-boot-starter-data-jpa")
	implementation("org.springframework.boot:spring-boot-starter-security")
	implementation("org.springframework.boot:spring-boot-starter-validation")
	implementation("org.springframework.boot:spring-boot-starter-web")

	// Kotlin 환경 필수 의존성
	implementation("com.fasterxml.jackson.module:jackson-module-kotlin")
	implementation("org.jetbrains.kotlin:kotlin-reflect")

	// DB: PostgreSQL & PostGIS (공간 데이터 연산 패키지 필수 바인딩)
	implementation("org.postgresql:postgresql")
	implementation("org.hibernate.orm:hibernate-spatial") // JPA에서 geometry 데이터 호환용 다이얼렉트 포함

	// API 명세서 자동화: Springdoc Swagger UI (Spring Boot 3.x 지원 버전)
	implementation("org.springdoc:springdoc-openapi-starter-webmvc-ui:2.6.0")

	// 테스트 환경
	testImplementation("org.springframework.boot:spring-boot-starter-test")
	testImplementation("org.springframework.security:spring-security-test")
	testImplementation("org.jetbrains.kotlin:kotlin-test-junit5")
	testRuntimeOnly("org.junit.platform:junit-platform-launcher")
}

tasks.withType<org.jetbrains.kotlin.gradle.tasks.KotlinCompile> {
	compilerOptions {
		freeCompilerArgs.add("-Xjsr305=strict")
		jvmTarget.set(JvmTarget.JVM_21)
	}
}

tasks.withType<Test> {
	useJUnitPlatform()
}