FROM eclipse-temurin:21-jdk-alpine AS builder

WORKDIR /workspace

COPY jc-backend ./jc-backend
COPY jc-recommendation-core ./jc-recommendation-core

WORKDIR /workspace/jc-backend

RUN cp src/main/resources/application.yml.sample \
       src/main/resources/application.yml

RUN chmod +x gradlew \
    && ./gradlew clean bootJar --no-daemon -x test


FROM eclipse-temurin:21-jre-alpine

WORKDIR /app

COPY --from=builder \
    /workspace/jc-backend/build/libs/jc-backend-0.0.1-SNAPSHOT.jar \
    /app/app.jar

RUN mkdir -p /app/uploads/images

EXPOSE 8080

ENTRYPOINT ["java", "-jar", "/app/app.jar"]