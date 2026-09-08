package com.jc.backend.crew.chat;

import java.util.List;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.jpa.repository.JpaRepository;

public interface CrewChatMessageRepository extends JpaRepository<CrewChatMessage, Long> {

    @EntityGraph(attributePaths = {"sender"})
    List<CrewChatMessage> findByCrewIdOrderByIdDesc(Long crewId, Pageable pageable);

    @EntityGraph(attributePaths = {"sender"})
    List<CrewChatMessage> findByCrewIdAndIdLessThanOrderByIdDesc(
            Long crewId, Long beforeId, Pageable pageable);
}
