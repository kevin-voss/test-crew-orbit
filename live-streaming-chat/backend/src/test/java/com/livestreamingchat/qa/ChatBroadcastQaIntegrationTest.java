package com.livestreamingchat.qa;

import static org.assertj.core.api.Assertions.assertThat;
import static org.junit.jupiter.api.Assertions.assertTrue;

import com.fasterxml.jackson.core.JsonProcessingException;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import java.io.BufferedReader;
import java.io.IOException;
import java.io.InputStreamReader;
import java.nio.charset.StandardCharsets;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;
import java.util.concurrent.ConcurrentLinkedQueue;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;
import java.util.concurrent.atomic.AtomicReference;
import java.util.stream.Collectors;
import java.util.stream.IntStream;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.web.client.TestRestTemplate;
import org.springframework.boot.test.web.server.LocalServerPort;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.HttpMethod;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.client.RestTemplate;
import com.livestreamingchat.repository.ChatMessageRepository;

/**
 * Adversarial / non-happy-path coverage for chat broadcast. Does not replace
 * {@link com.livestreamingchat.LiveStreamingChatApplicationTests} (context load only).
 */
@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.RANDOM_PORT)
class ChatBroadcastQaIntegrationTest {

  @LocalServerPort private int port;

  @Autowired private ObjectMapper objectMapper;

  @Autowired private ChatMessageRepository chatMessageRepository;

  private TestRestTemplate testRestTemplate;
  private RestTemplate rawRestTemplate;
  private String baseUrl;

  @BeforeEach
  void setUp() {
    chatMessageRepository.deleteAllInBatch();
    testRestTemplate = new TestRestTemplate();
    rawRestTemplate = testRestTemplate.getRestTemplate();
    baseUrl = "http://127.0.0.1:" + port;
  }

  @Test
  void postMessage_nullContent_returns400() {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> res =
        testRestTemplate.postForEntity(
            baseUrl + "/api/chat/messages",
            new HttpEntity<>("{\"content\":null}", headers),
            String.class);

    assertThat(res.getStatusCode().value()).isEqualTo(400);
  }

  @Test
  void postMessage_whitespaceOnly_returns400() {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    HttpEntity<String> entity = new HttpEntity<>("{\"content\":\"   \\t  \\n \"}", headers);
    ResponseEntity<String> res =
        testRestTemplate.postForEntity(baseUrl + "/api/chat/messages", entity, String.class);

    assertThat(res.getStatusCode().value()).isEqualTo(400);
  }

  @Test
  void postMessage_malformedJson_not201() {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> res =
        testRestTemplate.exchange(
            baseUrl + "/api/chat/messages",
            HttpMethod.POST,
            new HttpEntity<>("{\"content\":broken}", headers),
            String.class);

    assertThat(res.getStatusCode().value()).isNotEqualTo(201);
  }

  @Test
  void stream_endpoint_postMethod_isRejected() {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> res =
        testRestTemplate.exchange(
            baseUrl + "/api/chat/stream",
            HttpMethod.POST,
            new HttpEntity<>("{}", headers),
            String.class);

    assertThat(res.getStatusCode().value()).isNotEqualTo(200);
  }

  @Test
  void postMessage_emptyJsonObject_handlesGracefully_not201() throws Exception {
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> res =
        testRestTemplate.exchange(
            baseUrl + "/api/chat/messages",
            HttpMethod.POST,
            new HttpEntity<>("{}", headers),
            String.class);

    // Record may deserialize to request with content == null → 400, or Spring may reject
    assertThat(res.getStatusCode().value()).isNotEqualTo(201);
  }

  @Test
  void postMessage_contentAtColumnLimit_succeeds() throws Exception {
    String payload = "{\"content\":\"" + "x".repeat(4000).replace("\\", "\\\\").replace("\"", "\\\"")
        + "\"}";
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> res =
        testRestTemplate.exchange(
            baseUrl + "/api/chat/messages",
            HttpMethod.POST,
            new HttpEntity<>(payload, headers),
            String.class);

    assertThat(res.getStatusCode().value()).isEqualTo(201);
    JsonNode body = objectMapper.readTree(res.getBody());
    assertThat(body.path("content").asText()).hasSize(4000);
  }

  @Test
  void postMessage_contentExceedsColumnLimit_behaviourIsRecorded() throws Exception {
    String longText = "x".repeat(4001);
    String payload =
        objectMapper.writeValueAsString(java.util.Map.of("content", longText));
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> res =
        testRestTemplate.exchange(
            baseUrl + "/api/chat/messages",
            HttpMethod.POST,
            new HttpEntity<>(payload, headers),
            String.class);

    // Oracle: must not silently succeed with truncated content without detection
    int code = res.getStatusCode().value();
    if (code == 201) {
      JsonNode body = objectMapper.readTree(res.getBody());
      assertThat(body.path("content").asText()).hasSizeGreaterThanOrEqualTo(4001);
    }
  }

  @Test
  void concurrent_posts_allVisibleInHistory() throws Exception {
    int threads = 16;
    int perThread = 25;
    ExecutorService pool = Executors.newFixedThreadPool(threads);
    List<Future<?>> futures = new ArrayList<>();
    for (int t = 0; t < threads; t++) {
      final int tid = t;
      futures.add(
          pool.submit(
              () -> {
                try {
                  for (int i = 0; i < perThread; i++) {
                    String body =
                        objectMapper.writeValueAsString(
                            java.util.Map.of(
                                "content", "t" + tid + "-i" + i + "-" + UUID.randomUUID()));
                    HttpHeaders headers = new HttpHeaders();
                    headers.setContentType(MediaType.APPLICATION_JSON);
                    ResponseEntity<String> res =
                        testRestTemplate.exchange(
                            baseUrl + "/api/chat/messages",
                            HttpMethod.POST,
                            new HttpEntity<>(body, headers),
                            String.class);
                    assertThat(res.getStatusCode().value()).isEqualTo(201);
                  }
                } catch (JsonProcessingException e) {
                  throw new IllegalStateException(e);
                }
              }));
    }
    for (Future<?> f : futures) {
      f.get(120, TimeUnit.SECONDS);
    }
    pool.shutdown();
    pool.awaitTermination(30, TimeUnit.SECONDS);

    ResponseEntity<String> list =
        testRestTemplate.getForEntity(baseUrl + "/api/chat/messages", String.class);
    assertThat(list.getStatusCode().value()).isEqualTo(200);
    JsonNode arr = objectMapper.readTree(list.getBody());
    assertThat(arr.size()).isEqualTo(threads * perThread);
  }

  @Test
  void sse_subscriberReceivesPayloadMatchingRestHistory() throws Exception {
    ExecutorService executor = Executors.newCachedThreadPool();
    ConcurrentLinkedQueue<String> events = new ConcurrentLinkedQueue<>();
    CountDownLatch gotData = new CountDownLatch(1);
    AtomicReference<String> parseError = new AtomicReference<>();

    Future<?> sse =
        executor.submit(
            () -> {
              try {
                rawRestTemplate.execute(
                    baseUrl + "/api/chat/stream",
                    HttpMethod.GET,
                    null,
                    resp -> {
                      try {
                        BufferedReader reader =
                            new BufferedReader(
                                new InputStreamReader(resp.getBody(), StandardCharsets.UTF_8));
                        StringBuilder data = new StringBuilder();
                        boolean inDataBlock = false;
                        String line;
                        while ((line = reader.readLine()) != null) {
                          if (line.startsWith("data:")) {
                            inDataBlock = true;
                            data.append(line.substring("data:".length()).trim());
                          } else if (line.isEmpty() && inDataBlock) {
                            events.offer(data.toString());
                            gotData.countDown();
                            break;
                          } else if (line.isEmpty()) {
                            data.setLength(0);
                            inDataBlock = false;
                          }
                        }
                      } catch (IOException e) {
                        parseError.set(e.getMessage());
                      }
                      return null;
                    });
              } catch (Exception e) {
                parseError.set(e.getMessage());
              }
            });

    Thread.sleep(50);

    String marker = "qa-sse-" + UUID.randomUUID();
    HttpHeaders postHeaders = new HttpHeaders();
    postHeaders.setContentType(MediaType.APPLICATION_JSON);
    ResponseEntity<String> created =
        testRestTemplate.exchange(
            baseUrl + "/api/chat/messages",
            HttpMethod.POST,
            new HttpEntity<>(
                objectMapper.writeValueAsString(java.util.Map.of("content", marker)), postHeaders),
            String.class);

    assertThat(created.getStatusCode().value()).isEqualTo(201);
    long expectedId = objectMapper.readTree(created.getBody()).path("id").asLong();

    assertTrue(gotData.await(25, TimeUnit.SECONDS), "SSE should deliver an event for the posted message");
    executor.shutdownNow();
    sse.cancel(true);

    assertThat(parseError.get()).isNull();
    String raw = events.poll();
    assertThat(raw).isNotNull();
    JsonNode sseJson = objectMapper.readTree(raw);
    assertThat(sseJson.path("id").asLong()).isEqualTo(expectedId);
    assertThat(sseJson.path("content").asText()).isEqualTo(marker);

    ResponseEntity<String> history =
        testRestTemplate.getForEntity(baseUrl + "/api/chat/messages", String.class);
    JsonNode arr = objectMapper.readTree(history.getBody());
    boolean found =
        java.util.stream.StreamSupport.stream(arr.spliterator(), false)
            .anyMatch(
                n ->
                    n.path("id").asLong() == expectedId
                        && marker.equals(n.path("content").asText()));
    assertThat(found).isTrue();
  }

  @Test
  void sse_quickSubscribeThenPost_stableDeliveryUnderLoad() throws Exception {
    ExecutorService executor = Executors.newCachedThreadPool();
    ConcurrentLinkedQueue<String> events = new ConcurrentLinkedQueue<>();
    CountDownLatch gotData = new CountDownLatch(1);
    AtomicReference<String> parseError = new AtomicReference<>();

    Future<?> sse =
        executor.submit(
            () -> {
              try {
                rawRestTemplate.execute(
                    baseUrl + "/api/chat/stream",
                    HttpMethod.GET,
                    null,
                    resp -> {
                      try {
                        BufferedReader reader =
                            new BufferedReader(
                                new InputStreamReader(resp.getBody(), StandardCharsets.UTF_8));
                        StringBuilder data = new StringBuilder();
                        boolean inDataBlock = false;
                        String line;
                        while ((line = reader.readLine()) != null) {
                          if (line.startsWith("data:")) {
                            inDataBlock = true;
                            data.append(line.substring("data:".length()).trim());
                          } else if (line.isEmpty() && inDataBlock) {
                            events.offer(data.toString());
                            gotData.countDown();
                            break;
                          } else if (line.isEmpty()) {
                            data.setLength(0);
                            inDataBlock = false;
                          }
                        }
                      } catch (IOException e) {
                        parseError.set(e.getMessage());
                      }
                      return null;
                    });
              } catch (Exception e) {
                parseError.set(e.getMessage());
              }
            });

    Thread.sleep(50);

    List<Future<?>> spam =
        IntStream.range(0, 8)
            .mapToObj(
                i ->
                    executor.submit(
                        () -> {
                          try {
                            postRandom(i);
                          } catch (Exception e) {
                            throw new IllegalStateException(e);
                          }
                        }))
            .collect(Collectors.toList());

    boolean received = gotData.await(20, TimeUnit.SECONDS);
    executor.shutdownNow();
    sse.cancel(true);
    for (Future<?> f : spam) {
      try {
        f.get(1, TimeUnit.SECONDS);
      } catch (Exception ignored) {
        // cancelled / interrupted under shutdownNow
      }
    }

    assertThat(parseError.get()).isNull();
    assertTrue(received, "SSE should yield at least one event while concurrent POSTs run");
    assertThat(events.poll()).contains("\"content\":");
  }

  private void postRandom(int seed) throws Exception {
    String body =
        objectMapper.writeValueAsString(java.util.Map.of("content", "spam-" + seed + "-" + UUID.randomUUID()));
    HttpHeaders headers = new HttpHeaders();
    headers.setContentType(MediaType.APPLICATION_JSON);
    testRestTemplate.exchange(
        baseUrl + "/api/chat/messages",
        HttpMethod.POST,
        new HttpEntity<>(body, headers),
        String.class);
  }
}

