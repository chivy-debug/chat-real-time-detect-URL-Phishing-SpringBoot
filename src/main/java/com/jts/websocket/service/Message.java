package com.jts.websocket.service;

import lombok.*;

@Data
@Builder
public class Message {
	private MsgType type;

	private String content;

	private String sender;
}
