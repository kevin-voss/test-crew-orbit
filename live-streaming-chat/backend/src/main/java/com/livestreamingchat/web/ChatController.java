package com.livestreamingchat.web;

import com.livestreamingchat.dto.ChatMessageRequest;
import com.livestreamingchat.dto.ChatMessageResponse;
import com.livestreamingchat.service.ChatMessageService;
import java.util.List;
import org.springframework.http.HttpStatus;
import org.springframework.http.MediaType;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.CrossOrigin;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@RestController
@RequestMapping("/api/chat")
@CrossOrigin(origins = "*")
public class ChatController {

  private final ChatMessageService chatMessageService;

  public ChatController(ChatMessageService chatMessageService) {
    this.chatMessageService = chatMessageService;
  }

  @GetMapping("/messages")
  public List<ChatMessageResponse> listMessages() {
    return chatMessageService.listMessages();
  }

  @PostMapping("/messages")
  public ResponseEntity<ChatMessageResponse> postMessage(@RequestBody ChatMessageRequest request) {
    if (request == null || request.content() == null) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content is required");
    }
    String content = request.content().trim();
    if (content.isEmpty()) {
      throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "content is required");
    }
    ChatMessageResponse created = chatMessageService.sendMessage(content);
    return ResponseEntity.status(HttpStatus.CREATED).body(created);
  }

  @GetMapping(value = "/stream", produces = MediaType.TEXT_EVENT_STREAM_VALUE)
  public SseEmitter stream() {
    return chatMessageService.subscribe();
  }
}
