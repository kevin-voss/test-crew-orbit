package com.livestreamingchat.dto;

import java.time.Instant;

public record ChatMessageResponse(Long id, String content, Instant createdAt) {}
