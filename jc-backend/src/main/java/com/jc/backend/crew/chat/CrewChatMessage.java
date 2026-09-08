package com.jc.backend.crew.chat;

import com.jc.backend.common.BaseTimeEntity;
import com.jc.backend.crew.Crew;
import com.jc.backend.user.UserAccount;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.FetchType;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;

@Entity
@Table(name = "crew_chat_message")
public class CrewChatMessage extends BaseTimeEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "crew_id", nullable = false)
    private Crew crew;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "sender_id", nullable = false)
    private UserAccount sender;

    @Enumerated(EnumType.STRING)
    @Column(name = "message_type", nullable = false, length = 20)
    private CrewChatMessageType messageType;

    @Column(nullable = false, length = 1000)
    private String content;

    protected CrewChatMessage() {}

    public CrewChatMessage(
            Crew crew,
            UserAccount sender,
            CrewChatMessageType messageType,
            String content) {
        this.crew = crew;
        this.sender = sender;
        this.messageType = messageType;
        this.content = content;
    }

    public Long getId() { return id; }
    public Crew getCrew() { return crew; }
    public UserAccount getSender() { return sender; }
    public CrewChatMessageType getMessageType() { return messageType; }
    public String getContent() { return content; }
}
