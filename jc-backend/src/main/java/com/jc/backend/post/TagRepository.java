package com.jc.backend.post;

import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

public interface TagRepository extends JpaRepository<Tag, Long> {

    List<Tag> findByNormalizedNameIn(Collection<String> normalizedNames);

    @Modifying
    @Query(value = """
            INSERT INTO tag (name, normalized_name)
            VALUES (:name, :normalizedName)
            ON CONFLICT (normalized_name) DO NOTHING
            """, nativeQuery = true)
    void insertIfAbsent(
            @Param("name") String name,
            @Param("normalizedName") String normalizedName);
}
