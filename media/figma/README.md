# 여정 / Journey Connect (JC)

> 누군가의 여행이, 당신의 여정이 되다.  
> 지역별 여행정보를 한눈에 — 진짜 여행자들의 실전 정보 커뮤니티

---

## 목차

1. [프로젝트 개요](#1-프로젝트-개요)
2. [기술 스택](#2-기술-스택)
3. [사전 준비 (Prerequisites)](#3-사전-준비)
4. [프론트엔드 로컬 실행](#4-프론트엔드-로컬-실행)
5. [백엔드 로컬 실행](#5-백엔드-로컬-실행)
6. [데이터베이스 설정 (PostgreSQL + PostGIS)](#6-데이터베이스-설정)
7. [환경 변수 관리](#7-환경-변수-관리)
8. [API 명세서 (Swagger)](#8-api-명세서-swagger)
9. [전체 실행 순서 요약](#9-전체-실행-순서-요약)
10. [주의사항 및 팁](#10-주의사항-및-팁)

---

## 1. 프로젝트 개요

| 항목 | 내용 |
|---|---|
| 서비스명 (국내) | 여정 |
| 서비스명 (글로벌) | Journey Connect (JC) |
| 핵심 가치 | 글로벌 사용자들이 실시간으로 여정을 공유하고, 찐 현지 정보와 동선을 연결하는 오픈 커뮤니티 |
| 주요 기능 | 지역별 여행 피드, Google Maps 연동 동선, AI 요약/태그, 크루(소모임), 다국어 지원 |

---

## 2. 기술 스택

### Frontend
| 기술 | 버전 | 역할 |
|---|---|---|
| React | 18.x | UI 프레임워크 |
| React Router | 7.x | SPA 라우팅 |
| Axios | 최신 | HTTP 클라이언트 |
| Tailwind CSS | 4.x | 스타일링 |
| Zustand | 최신 | 전역 상태 관리 |
| react-i18next | 최신 | 다국어(KO/EN) 지원 |
| Vite | 6.x | 빌드 도구 |

### Backend
| 기술 | 버전 | 역할 |
|---|---|---|
| Spring Boot | 3.x | 백엔드 프레임워크 |
| Java | 17+ | 언어 |
| Spring Security + JWT | - | 인증/인가 |
| Spring Data JPA | - | 기본 CRUD |
| QueryDSL | - | 복잡한 쿼리 (PostGIS 거리 조회 등) |
| Lombok | - | 보일러플레이트 제거 |
| Springdoc (Swagger) | - | API 문서 자동화 |

### Database & Infra
| 기술 | 역할 |
|---|---|
| PostgreSQL 16+ | 메인 데이터베이스 |
| PostGIS 3+ | 위치 기반 쿼리 (반경 5km 주변 여정 추천) |
| AWS S3 | 이미지/파일 업로드 |
| AWS EC2 | 서버 배포 |

### 외부 API
| API | 역할 |
|---|---|
| Google Maps Places API | 장소 검색, 좌표 추출, 카테고리 자동 인식 |
| Anthropic Claude API | 본문 AI 요약, 스타일 태그 자동 생성 |
| Google Translate API | 게시글 번역 보기 기능 |

---

## 3. 사전 준비

### 공통 설치 확인
```bash
# Node.js 18 이상
node --version

# Java 17 이상
java -version

# PostgreSQL 클라이언트
psql --version
```

### 패키지 매니저
이 프로젝트 프론트엔드는 **pnpm**을 사용합니다.
```bash
npm install -g pnpm
```

---

## 4. 프론트엔드 로컬 실행

### 4-1. 의존성 설치
```bash
cd frontend/   # 또는 code/ (현재 Figma Make 기준: /code 폴더)
pnpm install
```

### 4-2. 환경 변수 설정
`frontend/.env` 파일을 생성하세요. `.env.example`을 복사해서 시작하면 됩니다.

```bash
cp .env.example .env
```

```env
# frontend/.env
VITE_API_BASE_URL=http://localhost:8080/api/v1
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_api_key_here
```

> ⚠️ **절대로 `.env` 파일을 Git에 올리지 마세요.** `.gitignore`에 포함되어 있어야 합니다.

### 4-3. package.json에 dev 스크립트 추가

현재 `package.json`의 `scripts`에 `dev`가 없으면 추가하세요:

```json
"scripts": {
  "dev": "vite",
  "build": "vite build",
  "preview": "vite preview"
}
```

### 4-4. 개발 서버 실행
```bash
pnpm dev
```
브라우저에서 http://localhost:5173 접속

### 4-5. 프로덕션 빌드
```bash
pnpm build      # dist/ 폴더 생성
pnpm preview    # 빌드 결과 로컬 미리보기
```

### 4-6. 다국어(i18n) 파일 구조 (구현 시 참고)

실제 구현 시 `react-i18next`를 도입해 아래 구조로 운영합니다:
```
frontend/
└── src/
    └── locales/
        ├── ko.json    # 한국어 번역 파일
        └── en.json    # 영어 번역 파일
```

```bash
pnpm add react-i18next i18next
```

---

## 5. 백엔드 로컬 실행

### 5-1. Spring Boot 프로젝트 생성 (신규 시작 시)

[start.spring.io](https://start.spring.io) 에서 아래 설정으로 생성:

| 항목 | 값 |
|---|---|
| Project | Gradle - Groovy |
| Language | Java |
| Spring Boot | 3.x.x |
| Java | 17 |
| Dependencies | Spring Web, Spring Data JPA, Spring Security, PostgreSQL Driver, Lombok, Validation |

### 5-2. 추가 의존성 (`build.gradle`)

```groovy
dependencies {
    // 기본 Spring Boot 의존성 외 추가

    // JWT
    implementation 'io.jsonwebtoken:jjwt-api:0.12.3'
    runtimeOnly 'io.jsonwebtoken:jjwt-impl:0.12.3'
    runtimeOnly 'io.jsonwebtoken:jjwt-jackson:0.12.3'

    // QueryDSL (복잡한 위치 쿼리용)
    implementation 'com.querydsl:querydsl-jpa:5.0.0:jakarta'
    annotationProcessor 'com.querydsl:querydsl-apt:5.0.0:jakarta'
    annotationProcessor 'jakarta.annotation:jakarta.annotation-api'
    annotationProcessor 'jakarta.persistence:jakarta.persistence-api'

    // Springdoc (Swagger UI 자동 생성)
    implementation 'org.springdoc:springdoc-openapi-starter-webmvc-ui:2.3.0'

    // AWS S3 (이미지 업로드)
    implementation 'io.awspring.cloud:spring-cloud-aws-starter-s3:3.1.1'

    // 다국어 에러 메시지는 Spring의 MessageSource 기본 기능 사용
}
```

### 5-3. `application.yml` 설정

```yaml
# backend/src/main/resources/application.yml

spring:
  datasource:
    url: jdbc:postgresql://localhost:5432/journey_db
    username: ${DB_USERNAME}
    password: ${DB_PASSWORD}
    driver-class-name: org.postgresql.Driver

  jpa:
    hibernate:
      ddl-auto: update   # 개발 환경. 운영은 validate 또는 none
    show-sql: true
    properties:
      hibernate:
        dialect: org.hibernate.dialect.PostgreSQLDialect
        format_sql: true

  servlet:
    multipart:
      max-file-size: 10MB
      max-request-size: 30MB

  messages:
    basename: messages   # messages_ko.properties, messages_en.properties 자동 로드

server:
  port: 8080

# JWT
jwt:
  secret: ${JWT_SECRET}
  expiration: 86400000   # 24시간 (ms)

# Anthropic Claude API
anthropic:
  api-key: ${ANTHROPIC_API_KEY}
  model: claude-sonnet-4-6

# Google Maps
google:
  maps:
    api-key: ${GOOGLE_MAPS_API_KEY}

# AWS S3
cloud:
  aws:
    s3:
      bucket: ${AWS_S3_BUCKET}
    credentials:
      access-key: ${AWS_ACCESS_KEY}
      secret-key: ${AWS_SECRET_KEY}
    region:
      static: ap-northeast-2

# Swagger / Springdoc
springdoc:
  swagger-ui:
    path: /swagger-ui.html
  api-docs:
    path: /api-docs

# CORS
cors:
  allowed-origins: http://localhost:5173
```

### 5-4. 환경 변수 파일 (`backend/.env` 또는 시스템 환경 변수)

```env
# backend/.env  (로컬 개발용 - Git 제외 필수)
DB_USERNAME=postgres
DB_PASSWORD=your_db_password
JWT_SECRET=your_super_secret_jwt_key_at_least_256_bits
ANTHROPIC_API_KEY=sk-ant-...
GOOGLE_MAPS_API_KEY=AIza...
AWS_S3_BUCKET=journey-uploads
AWS_ACCESS_KEY=AKIA...
AWS_SECRET_KEY=...
```

### 5-5. 다국어 메시지 파일

```
backend/src/main/resources/
├── messages_ko.properties
└── messages_en.properties
```

```properties
# messages_ko.properties
error.post.not.found=게시글을 찾을 수 없습니다.
error.user.not.found=사용자를 찾을 수 없습니다.
error.unauthorized=로그인이 필요합니다.
error.forbidden=권한이 없습니다.

# messages_en.properties
error.post.not.found=Post not found.
error.user.not.found=User not found.
error.unauthorized=Login required.
error.forbidden=You do not have permission.
```

### 5-6. CORS 설정 클래스

```java
// CorsConfig.java
@Configuration
public class CorsConfig {
    @Value("${cors.allowed-origins}")
    private String allowedOrigins;

    @Bean
    public CorsConfigurationSource corsConfigurationSource() {
        CorsConfiguration config = new CorsConfiguration();
        config.setAllowedOrigins(List.of(allowedOrigins));
        config.setAllowedMethods(List.of("GET","POST","PUT","PATCH","DELETE","OPTIONS"));
        config.setAllowedHeaders(List.of("*"));
        config.setAllowCredentials(true);

        UrlBasedCorsConfigurationSource source = new UrlBasedCorsConfigurationSource();
        source.registerCorsConfiguration("/api/**", config);
        return source;
    }
}
```

### 5-7. 백엔드 실행

```bash
cd backend/
./gradlew bootRun
# 또는 IDE(IntelliJ)에서 JourneyApplication.java 실행
```

---

## 6. 데이터베이스 설정

### 6-1. PostgreSQL + PostGIS 설치

**macOS (Homebrew)**
```bash
brew install postgresql@16
brew install postgis
brew services start postgresql@16
```

**Ubuntu/Debian**
```bash
sudo apt install postgresql-16 postgresql-16-postgis-3
sudo systemctl start postgresql
```

**Windows**
- [PostgreSQL 공식 인스톨러](https://www.postgresql.org/download/windows/) 다운로드
- 설치 중 Stack Builder에서 PostGIS 3.x 선택 설치

### 6-2. DB 및 사용자 생성

```sql
-- psql 접속 후 실행
CREATE USER journey_user WITH PASSWORD 'your_password';
CREATE DATABASE journey_db OWNER journey_user;
\c journey_db

-- PostGIS 확장 설치 (위치 기반 쿼리 필수)
CREATE EXTENSION IF NOT EXISTS postgis;
CREATE EXTENSION IF NOT EXISTS postgis_topology;

-- 확인
SELECT PostGIS_Version();
```

### 6-3. DBeaver 연결 설정

| 항목 | 값 |
|---|---|
| Host | localhost |
| Port | 5432 |
| Database | journey_db |
| Username | journey_user |
| Password | your_password |

> PostgreSQL 드라이버를 DBeaver에서 자동 다운로드하도록 허용하면 됩니다.

### 6-4. 주요 테이블 설계 참고 (스네이크 케이스 필수)

```sql
-- 사용자 테이블
CREATE TABLE users (
    id           BIGSERIAL PRIMARY KEY,
    email        VARCHAR(255) UNIQUE NOT NULL,
    password     VARCHAR(255) NOT NULL,
    nickname     VARCHAR(100) NOT NULL,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);

-- 여정(게시글) 테이블
CREATE TABLE journey_post (
    id           BIGSERIAL PRIMARY KEY,
    user_id      BIGINT REFERENCES users(id),
    title        VARCHAR(500) NOT NULL,
    body         TEXT,
    region       VARCHAR(100),
    category     VARCHAR(50),
    rating       NUMERIC(3,1),
    ai_summary   TEXT,
    location     GEOMETRY(Point, 4326),  -- PostGIS 좌표
    address      VARCHAR(500),
    view_count   INTEGER DEFAULT 0,
    created_at   TIMESTAMP DEFAULT NOW(),
    updated_at   TIMESTAMP DEFAULT NOW()
);

-- 위치 기반 인덱스 (반경 쿼리 성능)
CREATE INDEX idx_journey_post_location ON journey_post USING GIST(location);

-- 태그 테이블
CREATE TABLE tag (
    id    BIGSERIAL PRIMARY KEY,
    name  VARCHAR(100) UNIQUE NOT NULL
);

-- 게시글-태그 매핑
CREATE TABLE journey_post_tag (
    post_id BIGINT REFERENCES journey_post(id) ON DELETE CASCADE,
    tag_id  BIGINT REFERENCES tag(id),
    PRIMARY KEY (post_id, tag_id)
);

-- 댓글 (대댓글: parent_id 자기참조)
CREATE TABLE comment (
    id         BIGSERIAL PRIMARY KEY,
    post_id    BIGINT REFERENCES journey_post(id) ON DELETE CASCADE,
    user_id    BIGINT REFERENCES users(id),
    parent_id  BIGINT REFERENCES comment(id),  -- NULL이면 최상위 댓글
    body       TEXT NOT NULL,
    created_at TIMESTAMP DEFAULT NOW()
);

-- 좋아요
CREATE TABLE post_like (
    user_id BIGINT REFERENCES users(id),
    post_id BIGINT REFERENCES journey_post(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, post_id)
);
```

---

## 7. 환경 변수 관리

### .gitignore 필수 항목 확인

```gitignore
# Frontend
frontend/.env
frontend/.env.local
frontend/.env.production

# Backend
backend/.env
backend/src/main/resources/application-secret.yml

# 기타
.DS_Store
node_modules/
*.class
build/
dist/
```

### API 키 보안 원칙

- 로컬: `.env` 파일 → `application.yml`에서 `${ENV_VAR}` 형태로 참조
- CI/CD (GitHub Actions): GitHub Secrets에 등록
- 운영 (AWS EC2): EC2 인스턴스의 환경 변수 또는 AWS Secrets Manager 사용

---

## 8. API 명세서 (Swagger)

백엔드 실행 후 아래 URL에서 Swagger UI 확인:

```
http://localhost:8080/swagger-ui.html
```

### 주요 API 엔드포인트 규칙

```
GET    /api/v1/journeys              # 여정 목록 (페이징, 필터)
POST   /api/v1/journeys              # 여정 작성
GET    /api/v1/journeys/{id}         # 여정 상세
PUT    /api/v1/journeys/{id}         # 여정 수정
DELETE /api/v1/journeys/{id}         # 여정 삭제

GET    /api/v1/journeys/{id}/comments       # 댓글 목록
POST   /api/v1/journeys/{id}/comments       # 댓글 작성
POST   /api/v1/journeys/{id}/comments/{cid}/replies  # 대댓글

POST   /api/v1/journeys/{id}/like    # 좋아요 토글
POST   /api/v1/journeys/{id}/scrap   # 스크랩 토글

GET    /api/v1/journeys/nearby?lat=&lng=&radius=5000   # 반경 5km 주변 여정

POST   /api/v1/ai/summarize          # AI 요약 (Claude API)
POST   /api/v1/ai/translate          # 번역 (Google Translate)

POST   /api/v1/auth/signup           # 회원가입
POST   /api/v1/auth/login            # 로그인 (JWT 발급)
POST   /api/v1/auth/refresh          # 토큰 갱신

GET    /api/v1/users/me              # 내 정보
GET    /api/v1/users/me/journeys     # 내가 쓴 글 (페이징)

GET    /api/v1/crews                 # 크루 목록
POST   /api/v1/crews                 # 크루 생성
POST   /api/v1/crews/{id}/join       # 크루 참여
```

---

## 9. 전체 실행 순서 요약

```bash
# 1. PostgreSQL 시작
brew services start postgresql@16    # macOS
# sudo systemctl start postgresql   # Linux

# 2. DB 생성 (최초 1회)
psql -U postgres -c "CREATE DATABASE journey_db;"
psql -U postgres -d journey_db -c "CREATE EXTENSION postgis;"

# 3. 백엔드 실행 (터미널 1)
cd backend/
./gradlew bootRun
# → http://localhost:8080

# 4. 프론트엔드 실행 (터미널 2)
cd frontend/
pnpm install && pnpm dev
# → http://localhost:5173

# 5. Postman 또는 Swagger로 API 테스트
# → http://localhost:8080/swagger-ui.html
```

---

## 10. 주의사항 및 팁

### 코드 명명 규칙

| 위치 | 규칙 | 예시 |
|---|---|---|
| React 컴포넌트 파일 | PascalCase | `CreatePost.jsx`, `FeedCard.jsx` |
| React 변수/함수 | camelCase | `handleSearchLocation`, `fetchNearbyJourneys` |
| Spring 클래스 | PascalCase | `PostController`, `JourneyService` |
| Spring 메서드/변수 | camelCase | `getNearbyJourneys`, `userId` |
| DB 테이블/컬럼 | snake_case | `journey_post`, `user_id`, `created_at` |

### 주석 규칙

복잡한 로직에만 **'왜(Why)' 중심 주석**을 작성합니다:

```java
// PostGIS ST_DWithin을 사용하는 이유:
// 일반 유클리드 거리 계산은 위도/경도 곡률을 무시해 오차가 크다.
// ST_DWithin은 구면 거리를 기반으로 하므로 실제 지도 거리와 일치한다.
// 단위: meters (미터)
return journeyRepository.findNearbyJourneys(point, radiusInMeters);
```

### 날짜 형식 통일

모든 날짜는 `YYYY-MM-DD HH:mm:ss` 형식으로 통일합니다.
```java
// Spring에서 전역 설정
@JsonFormat(pattern = "yyyy-MM-dd HH:mm:ss")
private LocalDateTime createdAt;
```

### AI 요약 프롬프트 예시 (Claude API)

```
여행 후기 게시글을 3줄 이내로 핵심만 요약해주세요.
- 장소의 특징과 분위기
- 실용적인 팁 (가격, 시간, 주의사항)
- 추천 여부

[게시글 본문]
{post_body}
```

### PostGIS 반경 쿼리 예시 (QueryDSL + JPQL)

```sql
-- 반경 5km 이내 여정 조회 (PostgreSQL)
SELECT * FROM journey_post
WHERE ST_DWithin(
    location::geography,
    ST_MakePoint(:lng, :lat)::geography,
    :radiusMeters
)
ORDER BY ST_Distance(location::geography, ST_MakePoint(:lng, :lat)::geography);
```

---

## 관련 도구 링크

- [DBeaver 다운로드](https://dbeaver.io/download/)
- [Postman 다운로드](https://www.postman.com/downloads/)
- [Google Maps Platform Console](https://console.cloud.google.com/google/maps-apis)
- [Anthropic API 콘솔](https://console.anthropic.com/)
- [AWS S3 콘솔](https://s3.console.aws.amazon.com/)
- [start.spring.io](https://start.spring.io)
