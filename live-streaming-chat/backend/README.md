# Live Streaming Chat — Backend

Spring Boot service with **H2** (in-memory dev database). JDBC URL and console path are set in `src/main/resources/application.properties`.

Implementation for chat APIs and persistence belongs under `src/main/java/com/livestreamingchat/`.

Build and test (requires JDK 17+ and Maven):

```bash
cd live-streaming-chat/backend
mvn -q verify
```

Do not use `spring-boot:run` in automated validation; compile and tests are sufficient.
