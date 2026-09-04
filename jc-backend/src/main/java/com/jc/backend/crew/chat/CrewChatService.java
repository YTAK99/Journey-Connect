package com.jc.backend.crew.chat;

import com.jc.backend.common.DomainException;
import com.jc.backend.crew.Crew;
import com.jc.backend.crew.CrewMemberStatus;
import com.jc.backend.crew.CrewMemberRepository;
import com.jc.backend.crew.CrewRepository;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.net.URI;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
@Transactional(readOnly = true)
public class CrewChatService {

    private final CrewRepository crews;
    private final CrewMemberRepository members;
    private final CrewChatMessageRepository messages;
    private final UserRepository users;

    public CrewChatService(
            CrewRepository crews,
            CrewMemberRepository members,
            CrewChatMessageRepository messages,
            UserRepository users) {
        this.crews = crews;
        this.members = members;
        this.messages = messages;
        this.users = users;
    }

    public CrewChatDtos.History history(Long userId, Long crewId, Long beforeId, int size) {
        requireParticipant(userId, crewId);
        int requestedSize = Math.max(1, Math.min(size, 100));
        List<CrewChatMessage> fetched = beforeId == null
                ? messages.findByCrewIdOrderByIdDesc(crewId, PageRequest.of(0, requestedSize + 1))
                : messages.findByCrewIdAndIdLessThanOrderByIdDesc(
                        crewId, beforeId, PageRequest.of(0, requestedSize + 1));
        boolean hasMore = fetched.size() > requestedSize;
        List<CrewChatMessage> page = new ArrayList<>(
                fetched.subList(0, Math.min(fetched.size(), requestedSize)));
        Long nextBeforeId = hasMore && !page.isEmpty() ? page.get(page.size() - 1).getId() : null;
        Collections.reverse(page);
        return new CrewChatDtos.History(page.stream().map(this::view).toList(), nextBeforeId, hasMore);
    }

    @Transactional
    public CrewChatDtos.MessageView send(Long userId, Long crewId, CrewChatDtos.SendRequest request) {
        Crew crew = requireParticipant(userId, crewId);
        if (!crew.isRecruiting()) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "CREW_CHAT_ENDED",
                    "종료된 크루에는 메시지를 보낼 수 없습니다.");
        }
        UserAccount sender = users.findById(userId).orElseThrow(() -> new DomainException(
                HttpStatus.NOT_FOUND, "USER_NOT_FOUND", "사용자를 찾을 수 없습니다."));
        String content = normalizeContent(request);
        return view(messages.save(new CrewChatMessage(crew, sender, request.type(), content)));
    }

    public Crew requireParticipant(Long userId, Long crewId) {
        Crew crew = crews.findById(crewId).orElseThrow(() -> new DomainException(
                HttpStatus.NOT_FOUND, "CREW_NOT_FOUND", "크루를 찾을 수 없습니다."));
        boolean allowed = members.existsByCrewIdAndUserIdAndStatusIn(
                crewId, userId, List.of(CrewMemberStatus.OWNER, CrewMemberStatus.APPROVED));
        if (!allowed) {
            throw new DomainException(
                    HttpStatus.FORBIDDEN,
                    "CREW_CHAT_ACCESS_DENIED",
                    "승인된 크루 참여자만 채팅방을 이용할 수 있습니다.");
        }
        return crew;
    }

    private String normalizeContent(CrewChatDtos.SendRequest request) {
        String value = request.content().trim();
        if (request.type() == CrewChatMessageType.IMAGE) {
            try {
                URI uri = URI.create(value);
                if (!("http".equalsIgnoreCase(uri.getScheme())
                        || "https".equalsIgnoreCase(uri.getScheme()))) {
                    throw new IllegalArgumentException("unsupported image URL");
                }
            } catch (IllegalArgumentException exception) {
                throw new DomainException(
                        HttpStatus.BAD_REQUEST,
                        "INVALID_CHAT_IMAGE_URL",
                        "올바른 채팅 이미지 주소가 아닙니다.");
            }
        }
        return value;
    }

    private CrewChatDtos.MessageView view(CrewChatMessage message) {
        return new CrewChatDtos.MessageView(
                message.getId(),
                message.getCrew().getId(),
                message.getSender().getId(),
                message.getSender().getNickname(),
                message.getSender().getProfileImageUrl(),
                message.getMessageType(),
                message.getContent(),
                message.getCreatedAt());
    }
}
