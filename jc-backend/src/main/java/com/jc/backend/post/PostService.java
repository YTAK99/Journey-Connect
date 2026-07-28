package com.jc.backend.post;

import com.jc.backend.common.CursorCodec;
import com.jc.backend.common.CursorPageResponse;
import com.jc.backend.common.DomainException;
import com.jc.backend.common.PageResponse;
import com.jc.backend.region.Region;
import com.jc.backend.region.RegionDtos;
import com.jc.backend.region.RegionService;
import com.jc.backend.user.UserAccount;
import com.jc.backend.user.UserRepository;
import java.util.Collections;
import java.time.LocalDate;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Pageable;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Propagation;
import org.springframework.transaction.annotation.Transactional;

/**
 * 피드, 탐색, 게시물 상세, 댓글, 좋아요/북마크의 트랜잭션 경계를 담당합니다.
 *
 * <p>공개 게시물은 누구나 조회할 수 있지만, 비공개 게시물은 작성자만 열람할 수 있습니다.
 * 권한이 없는 비공개 게시물은 존재 여부를 노출하지 않도록 404로 처리합니다.
 */
@Service
@Transactional(readOnly = true) // 서비스 기본은 조회 전용이며 생성·수정 메서드가 개별적으로 덮어씁니다.
public class PostService {

    private final JourneyPostRepository posts;
    private final PostLikeRepository likes;
    private final BookmarkRepository bookmarks;
    private final CommentRepository comments;
    private final UserRepository users;
    private final PostInteractionWriter interactionWriter;
    private final RegionService regionService;
    private final CursorCodec cursorCodec;
    private final RichTextSanitizer richTextSanitizer;
    private final TagService tagService;

    public PostService(
            JourneyPostRepository posts,
            PostLikeRepository likes,
            BookmarkRepository bookmarks,
            CommentRepository comments,
            UserRepository users,
            PostInteractionWriter interactionWriter,
            RegionService regionService,
            CursorCodec cursorCodec,
            RichTextSanitizer richTextSanitizer,
            TagService tagService) {
        this.posts = posts;
        this.likes = likes;
        this.bookmarks = bookmarks;
        this.comments = comments;
        this.users = users;
        this.interactionWriter = interactionWriter;
        this.regionService = regionService;
        this.cursorCodec = cursorCodec;
        this.richTextSanitizer = richTextSanitizer;
        this.tagService = tagService;
    }

    /** 신규 피드 API: 전체 개수 쿼리 없이 size + 1 방식으로 다음 페이지 여부를 계산합니다. */
    public CursorPageResponse<PostDtos.Summary> feed(String cursor, int size) {
        int safeSize = Math.min(Math.max(size, 1), 100);
        CursorCodec.CursorPosition position = cursorCodec.decode(cursor);

        PageRequest request = PageRequest.of(0, safeSize + 1);
        List<JourneyPost> fetched = position.createdAt() == null
                ? posts.findByPublishedTrueOrderByCreatedAtDescIdDesc(request).getContent()
                : posts.findFeedAfter(position.createdAt(), position.id(), request);
        boolean hasNext = fetched.size() > safeSize;
        List<JourneyPost> pageItems = hasNext
                ? fetched.subList(0, safeSize)
                : fetched;
        List<PostDtos.Summary> summaries = summaries(pageItems);

        String nextCursor = null;
        if (hasNext && !pageItems.isEmpty()) {
            JourneyPost last = pageItems.get(pageItems.size() - 1);
            nextCursor = cursorCodec.encode(last.getCreatedAt(), last.getId());
        }
        return CursorPageResponse.of(summaries, nextCursor, hasNext);
    }

    /** 기존 페이지 번호 기반 호출을 사용하는 내부 화면·테스트용 호환 API입니다. */
    public PageResponse<PostDtos.Summary> feed(Pageable pageable) {
        return summaries(posts.findByPublishedTrueOrderByCreatedAtDescIdDesc(pageable));
    }

    public PageResponse<PostDtos.Summary> explore(
            String keyword,
            String region,
            Pageable pageable) {
        String normalizedKeyword = blankToEmpty(keyword);
        String normalizedRegion = blankToEmpty(region);
        return summaries(posts.explore(
                normalizedKeyword,
                normalizedRegion,
                regionService.countryCodeForSearch(normalizedKeyword),
                regionService.countryCodeForSearch(normalizedRegion),
                pageable));
    }

    /**
     * 상세 조회 시 공개/비공개 권한을 확인하고, 조회수는 상세 요청이 들어온 경우에만 증가시킵니다.
     */
    @Transactional
    public PostDtos.Detail detail(Long postId, Long viewerId) {
        JourneyPost post = readablePost(postId, viewerId);
        post.increaseView();
        return detailView(post, viewerId);
    }

    @Transactional
    public PostDtos.Detail create(Long userId, PostDtos.CreateRequest request) {
        Region region = regionService.require(request.regionCode(), request.regionName(), request.regionPlaceId());
        JourneyPost post = new JourneyPost(
                user(userId),
                region,
                request.title().trim(),
                richTextSanitizer.sanitizeRequired(request.content()));
        validateTravelDates(request.travelStartDate(), request.travelEndDate());
        post.updateTravelDates(request.travelStartDate(), request.travelEndDate());
        post.replaceTags(tagService.resolve(request.tags()));
        post.replaceImages(imageData(request.images(), request.coverImageUrl()));
        return detailView(posts.save(post), userId);
    }

    @Transactional
    public PostDtos.Detail update(
            Long userId,
            Long postId,
            PostDtos.UpdateRequest request) {
        JourneyPost post = ownedPost(userId, postId);
        Region region = hasText(request.regionCode()) || hasText(request.regionName()) || hasText(request.regionPlaceId())
                ? regionService.require(request.regionCode(), request.regionName(), request.regionPlaceId())
                : null;
        String sanitizedContent = request.content() == null
                ? null
                : richTextSanitizer.sanitizeRequired(request.content());
        post.update(request.title(), sanitizedContent, region, request.published());
        validateTravelDates(request.travelStartDate(), request.travelEndDate());
        post.updateTravelDates(request.travelStartDate(), request.travelEndDate());
        if (request.tags() != null) {
            post.replaceTags(tagService.resolve(request.tags()));
        }

        // images가 전달되면 전체 교체합니다. 빈 배열은 이미지 전체 삭제를 의미합니다.
        if (request.images() != null) {
            post.replaceImages(imageData(request.images(), null));
        } else if (request.coverImageUrl() != null) {
            post.replaceImages(imageData(null, request.coverImageUrl()));
        }
        return detailView(post, userId);
    }

    @Transactional
    public void delete(Long userId, Long postId) {
        posts.delete(ownedPost(userId, postId));
    }

    /**
     * 좋아요는 멱등 연산으로 동작해야 하므로, 중복 요청이 와도 예외 대신 정상 처리로 이어지도록 합니다.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void like(Long userId, Long postId) {
        // 중복 삽입 충돌만 독립 트랜잭션에서 처리하도록 바깥 트랜잭션을 만들지 않습니다.
        publishedPost(postId);
        user(userId);
        try {
            interactionWriter.addLike(postId, userId);
        } catch (DataIntegrityViolationException exception) {
            if (!likes.existsByPostIdAndUserId(postId, userId)) {
                throw exception;
            }
        }
    }

    @Transactional
    public void unlike(Long userId, Long postId) {
        likes.deleteByPostIdAndUserId(postId, userId);
    }

    /**
     * 북마크도 좋아요와 동일한 멱등성 규칙을 유지해 중복 저장을 방지합니다.
     */
    @Transactional(propagation = Propagation.NOT_SUPPORTED)
    public void bookmark(Long userId, Long postId) {
        // 좋아요와 같은 멱등 처리 전략을 사용해 이미 존재하는 북마크도 성공으로 간주합니다.
        publishedPost(postId);
        user(userId);
        try {
            interactionWriter.addBookmark(postId, userId);
        } catch (DataIntegrityViolationException exception) {
            if (!bookmarks.existsByPostIdAndUserId(postId, userId)) {
                throw exception;
            }
        }
    }

    @Transactional
    public void unbookmark(Long userId, Long postId) {
        bookmarks.deleteByPostIdAndUserId(postId, userId);
    }

    public PageResponse<PostDtos.CommentView> comments(
            Long postId,
            Long viewerId,
            Pageable pageable) {
        readablePost(postId, viewerId);
        return PageResponse.from(
                comments.findByPostIdOrderByCreatedAtAsc(postId, pageable)
                        .map(this::commentView));
    }

    @Transactional
    public PostDtos.CommentView addComment(Long userId, Long postId, String content) {
        JourneyPost post = publishedPost(postId);
        Comment comment = comments.save(new Comment(post, user(userId), content.trim()));
        return commentView(comment);
    }

    @Transactional
    public void deleteComment(Long userId, Long commentId) {
        Comment comment = comments.findById(commentId)
                .orElseThrow(() -> notFound("COMMENT_NOT_FOUND", "댓글"));
        if (!comment.getAuthor().getId().equals(userId)) {
            throw new DomainException(
                    HttpStatus.FORBIDDEN,
                    "COMMENT_FORBIDDEN",
                    "본인 댓글만 삭제할 수 있습니다.");
        }
        comments.delete(comment);
    }

    public PageResponse<PostDtos.Summary> publicUserPosts(Long userId, Pageable pageable) {
        return summaries(
                posts.findByAuthorIdAndPublishedTrueOrderByCreatedAtDescIdDesc(userId, pageable));
    }

    public PageResponse<PostDtos.Summary> myPosts(Long userId, Pageable pageable) {
        return summaries(posts.findByAuthorIdOrderByCreatedAtDescIdDesc(userId, pageable));
    }

    public PageResponse<PostDtos.Summary> myBookmarks(Long userId, Pageable pageable) {
        Page<JourneyPost> bookmarkedPosts =
                bookmarks.findVisibleByUserId(userId, pageable).map(Bookmark::getPost);
        return summaries(bookmarkedPosts);
    }

    private JourneyPost readablePost(Long postId, Long viewerId) {
        JourneyPost post = findPost(postId);
        if (post.isPublished()) {
            return post;
        }
        if (viewerId != null && post.getAuthor().getId().equals(viewerId)) {
            return post;
        }
        throw notFound("POST_NOT_FOUND", "게시물");
    }

    private JourneyPost publishedPost(Long postId) {
        JourneyPost post = findPost(postId);
        if (!post.isPublished()) {
            throw notFound("POST_NOT_FOUND", "게시물");
        }
        return post;
    }

    private JourneyPost ownedPost(Long userId, Long postId) {
        JourneyPost post = findPost(postId);
        if (!post.getAuthor().getId().equals(userId)) {
            throw new DomainException(
                    HttpStatus.FORBIDDEN,
                    "POST_FORBIDDEN",
                    "본인 게시물만 변경할 수 있습니다.");
        }
        return post;
    }

    private JourneyPost findPost(Long postId) {
        return posts.findWithDetailById(postId)
                .orElseThrow(() -> notFound("POST_NOT_FOUND", "게시물"));
    }

    private UserAccount user(Long userId) {
        return users.findById(userId)
                .orElseThrow(() -> notFound("USER_NOT_FOUND", "사용자"));
    }

    private DomainException notFound(String code, String target) {
        return new DomainException(
                HttpStatus.NOT_FOUND,
                code,
                target + "을(를) 찾을 수 없습니다.");
    }

    private PageResponse<PostDtos.Summary> summaries(Page<JourneyPost> page) {
        List<PostDtos.Summary> items = summaries(page.getContent());
        return new PageResponse<>(
                items,
                page.getNumber(),
                page.getSize(),
                page.getTotalElements(),
                page.getTotalPages(),
                page.isLast());
    }

    private List<PostDtos.Summary> summaries(List<JourneyPost> postsPage) {
        List<Long> postIds = postsPage.stream().map(JourneyPost::getId).toList();
        if (postIds.isEmpty()) {
            return List.of();
        }
        Map<Long, Long> likeCounts = countMap(likes.countByPostIds(postIds));
        Map<Long, Long> bookmarkCounts = countMap(bookmarks.countByPostIds(postIds));
        return postsPage.stream()
                .map(post -> summary(post, likeCounts, bookmarkCounts))
                .toList();
    }

    private Map<Long, Long> countMap(List<PostCountProjection> counts) {
        if (counts.isEmpty()) {
            return Collections.emptyMap();
        }
        return counts.stream().collect(Collectors.toUnmodifiableMap(
                PostCountProjection::getPostId,
                PostCountProjection::getTotal,
                (existing, ignored) -> existing));
    }

    private PostDtos.Summary summary(
            JourneyPost post,
            Map<Long, Long> likeCounts,
            Map<Long, Long> bookmarkCounts) {
        return new PostDtos.Summary(
                post.getId(),
                post.getTitle(),
                post.getRegion().getCode(),
                post.getRegion().getGooglePlaceId(),
                post.getRegionName(),
                regionService.localizedNames(post.getRegion()),
                regionService.searchText(post.getRegion()),
                post.getCoverImageUrl(),
                tagNames(post),
                post.getViewCount(),
                likeCounts.getOrDefault(post.getId(), 0L),
                bookmarkCounts.getOrDefault(post.getId(), 0L),
                author(post.getAuthor()),
                post.getCreatedAt());
    }

    private PostDtos.Detail detailView(JourneyPost post, Long viewerId) {
        boolean liked = viewerId != null
                && likes.existsByPostIdAndUserId(post.getId(), viewerId);
        boolean bookmarked = viewerId != null
                && bookmarks.existsByPostIdAndUserId(post.getId(), viewerId);

        return new PostDtos.Detail(
                post.getId(),
                post.getTitle(),
                post.getContent(),
                regionView(post.getRegion()),
                post.getRegionName(),
                post.getCoverImageUrl(),
                post.getImages().stream().map(this::imageView).toList(),
                post.getTravelStartDate(),
                post.getTravelEndDate(),
                tagNames(post),
                post.getViewCount(),
                likes.countByPostId(post.getId()),
                bookmarks.countByPostId(post.getId()),
                liked,
                bookmarked,
                author(post.getAuthor()),
                post.getCreatedAt(),
                post.getUpdatedAt());
    }

    private PostDtos.ImageView imageView(PostImage image) {
        return new PostDtos.ImageView(
                image.getId(),
                image.getImageUrl(),
                image.getSortOrder(),
                image.getAltText());
    }

    private RegionDtos.View regionView(Region region) {
        return regionService.view(region);
    }

    private PostDtos.CommentView commentView(Comment comment) {
        return new PostDtos.CommentView(
                comment.getId(),
                comment.getContent(),
                author(comment.getAuthor()),
                comment.getCreatedAt());
    }

    private PostDtos.Author author(UserAccount user) {
        return new PostDtos.Author(
                user.getId(),
                user.getNickname(),
                user.getProfileImageUrl());
    }

    private List<JourneyPost.PostImageData> imageData(
            List<PostDtos.ImageRequest> images,
            String legacyCoverImageUrl) {
        if (images != null) {
            return images.stream()
                    .map(image -> new JourneyPost.PostImageData(
                            image.imageUrl().trim(),
                            blankToNull(image.altText())))
                    .toList();
        }
        if (hasText(legacyCoverImageUrl)) {
            return List.of(new JourneyPost.PostImageData(legacyCoverImageUrl.trim(), null));
        }
        return List.of();
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String blankToNull(String value) {
        return value == null || value.isBlank() ? null : value.trim();
    }

    private String blankToEmpty(String value) {
        return value == null || value.isBlank() ? "" : value.trim();
    }

    private List<String> tagNames(JourneyPost post) {
        return post.getTags().stream().map(Tag::getName).toList();
    }

    private void validateTravelDates(LocalDate startDate, LocalDate endDate) {
        if (startDate != null && endDate != null && endDate.isBefore(startDate)) {
            throw new DomainException(
                    HttpStatus.BAD_REQUEST,
                    "INVALID_TRAVEL_DATES",
                    "종료 날짜는 시작 날짜보다 빠를 수 없습니다.");
        }
    }
}
