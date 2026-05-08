package com.livestreamingchat.repository;

import com.livestreamingchat.model.ChatMessage;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;

public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

  List<ChatMessage> findAllByOrderByCreatedAtAsc();
}
