package com.livestreamingchat.service;

import com.livestreamingchat.dto.ChatMessageResponse;
import com.livestreamingchat.model.ChatMessage;
import com.livestreamingchat.repository.ChatMessageRepository;
import java.io.IOException;
import java.util.List;
import java.util.concurrent.CopyOnWriteArrayList;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.transaction.support.TransactionSynchronization;
import org.springframework.transaction.support.TransactionSynchronizationManager;
import org.springframework.web.servlet.mvc.method.annotation.SseEmitter;

@Service
public class ChatMessageService {

  private final ChatMessageRepository repository;
  private final CopyOnWriteArrayList<SseEmitter> emitters = new CopyOnWriteArrayList<>();

  public ChatMessageService(ChatMessageRepository repository) {
    this.repository = repository;
  }

  public List<ChatMessageResponse> listMessages() {
    return repository.findAllByOrderByCreatedAtAsc().stream().map(this::toResponse).toList();
  }

  @Transactional
  public ChatMessageResponse sendMessage(String content) {
    ChatMessage entity = new ChatMessage();
    entity.setContent(content);
    ChatMessage saved = repository.save(entity);
    ChatMessageResponse response = toResponse(saved);
    TransactionSynchronizationManager.registerSynchronization(
        new TransactionSynchronization() {
          @Override
          public void afterCommit() {
            broadcast(response);
          }
        });
    return response;
  }

  public SseEmitter subscribe() {
    SseEmitter emitter = new SseEmitter(Long.MAX_VALUE);
    emitters.add(emitter);
    Runnable remove = () -> emitters.remove(emitter);
    emitter.onCompletion(remove);
    emitter.onTimeout(remove);
    emitter.onError(e -> remove.run());
    return emitter;
  }

  private void broadcast(ChatMessageResponse message) {
    for (SseEmitter emitter : emitters) {
      try {
        emitter.send(SseEmitter.event().data(message, MediaType.APPLICATION_JSON));
      } catch (IOException e) {
        emitter.completeWithError(e);
        emitters.remove(emitter);
      }
    }
  }

  private ChatMessageResponse toResponse(ChatMessage entity) {
    return new ChatMessageResponse(entity.getId(), entity.getContent(), entity.getCreatedAt());
  }
}
