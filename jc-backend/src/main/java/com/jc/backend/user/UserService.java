package com.jc.backend.user;

import com.jc.backend.auth.AuthDtos;
import com.jc.backend.auth.AuthService;
import com.jc.backend.common.DomainException;
import com.jc.backend.common.PageResponse;
import com.jc.backend.post.PostDtos;
import com.jc.backend.post.PostService;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

/** 사용자 프로필과 사용자별 게시물 조회 경계를 담당합니다. */
@Service
@Transactional(readOnly = true)
public class UserService {

    private final UserRepository users;
    private final PostService posts;

    public UserService(UserRepository users, PostService posts) {
        this.users = users;
        this.posts = posts;
    }

    public AuthDtos.UserSummary me(long userId) {
        return AuthService.summary(user(userId));
    }

    @Transactional
    public AuthDtos.UserSummary updateProfile(
            long userId,
            UserDtos.UpdateProfileRequest request) {
        UserAccount user = user(userId);
        String nickname = normalizeNullableNickname(request.nickname());

        if (nickname != null
                && !nickname.equals(user.getNickname())
                && users.existsByNickname(nickname)) {
            throw new DomainException(
                    HttpStatus.CONFLICT,
                    "NICKNAME_ALREADY_USED",
                    "이미 사용 중인 닉네임입니다.");
        }

        user.updateProfile(nickname, request.bio(), request.profileImageUrl());
        return AuthService.summary(user);
    }

    public PageResponse<PostDtos.Summary> publicPosts(long userId, Pageable pageable) {
        return publicPosts(userId, null, pageable);
    }

    public PageResponse<PostDtos.Summary> publicPosts(
            long userId, Long viewerId, Pageable pageable) {
        return posts.publicUserPosts(userId, viewerId, pageable);
    }

    public PageResponse<PostDtos.Summary> myPosts(long userId, Pageable pageable) {
        return posts.myPosts(userId, pageable);
    }

    public PageResponse<PostDtos.Summary> myBookmarks(long userId, Pageable pageable) {
        return posts.myBookmarks(userId, pageable);
    }

    public PageResponse<PostDtos.Summary> myLikes(long userId, Pageable pageable) {
        return posts.myLikes(userId, pageable);
    }

    private UserAccount user(long userId) {
        return users.findById(userId)
                .orElseThrow(() -> new DomainException(
                        HttpStatus.NOT_FOUND,
                        "USER_NOT_FOUND",
                        "사용자를 찾을 수 없습니다."));
    }

    private String normalizeNullableNickname(String nickname) {
        if (nickname == null) {
            return null;
        }
        String normalized = nickname.trim();
        if (normalized.isEmpty()) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_NICKNAME",
                    "닉네임은 공백일 수 없습니다.");
        }
        return normalized;
    }
}
