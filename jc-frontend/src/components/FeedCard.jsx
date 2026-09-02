import { useEffect, useState } from "react";
import { Bookmark, Heart, MessageCircle, MoreHorizontal, Plus, Sparkles } from "lucide-react";
import { useNavigate } from "react-router";

import { getApiErrorMessage } from "../services/apiClient";
import { bookmarkPost, getExplore, getFeed, getFeedItems, getPost, getPostAnalysis, likePost, unbookmarkPost, unlikePost } from "../services/postApi";

import { richTextToPlainText } from "../utils/richText";
import { getLocalizedRegionName, matchesSelectedRegion } from "../utils/region";
import { parseApiDate } from "../utils/dateTime";

import useLangStore from "../store/useLangStore";
import TagChips from "./TagChips";

import CommentSection from "./CommentSection.jsx";
// import PostRouteMap from "./PostRouteMap.jsx";


// 게시물/프로필 이미지가 없을 때 보여줄 기본 이미지
// const fallbackImage = "/ex_1.jpg";
const fallbackAvatar = "/user_1.jpg";


// 작성 시간을 "3분 전", "2일 전" 같은 형태로 바꿔주는 함수
const getRelativeDate = (createdAt) => {
    if (!createdAt) {
        return "방금 전";
    }

    const date = parseApiDate(createdAt);

    // 날짜 형식이 이상하면 원본 날짜 앞부분만 표시
    if (Number.isNaN(date.getTime())) {
        return String(createdAt).slice(0, 10);
    }

    const diffMs = Date.now() - date.getTime();

    const minutes = Math.max(
        1,
        Math.floor(diffMs / 60000),
    );

    if (minutes < 60) {
        return `${minutes}분 전`;
    }

    const hours = Math.floor(minutes / 60);

    if (hours < 24) {
        return `${hours}시간 전`;
    }

    const days = Math.floor(hours / 24);

    if (days < 30) {
        return `${days}일 전`;
    }

    const months = Math.floor(days / 30);

    if (months < 12) {
        return `${months}개월 전`;
    }

    return `${Math.floor(months / 12)}년 전`;
};


// 피드에 게시물 하나를 보여주는 컴포넌트
function FeedItem({ post }) {
    const navigate = useNavigate();
    const { currentLang } = useLangStore();

    // 기존 post 데이터를 유지하면서 상세 데이터를 덮어쓰도록 설정
    const [detailedPost, setDetailedPost] = useState(post);

    useEffect(() => {
        let active = true;

        getPost(post.id)
            .then((detailData) => {
                if (active && detailData) {
                    setDetailedPost((prev) => ({
                        ...prev,
                        ...detailData,
                        images: detailData.images?.length
                            ? detailData.images
                            : (prev.images || detailData.imageUrls),
                    }));
                }
            })
            .catch((err) => {
                console.error("피드 아이템 상세 장소 로드 실패:", err);
            });

        return () => {
            active = false;
        };
    }, [post.id]);
        getPost(post.id)
            .then((detailData) => {
                if (active && detailData) {
                    setDetailedPost((prev) => ({
                        ...prev,
                        ...detailData,
                        images: detailData.images?.length ? detailData.images : (prev.images || detailData.imageUrls),
                    }));
                }
            })
            .catch((err) => {
                console.error("피드 아이템 상세 장소 로드 실패:", err);
            });

        return () => {
            active = false;
        };
    }, [post.id]);

    // 댓글 영역 열기/닫기 상태
    const [isCommentOpen, setIsCommentOpen] = useState(false);


    // 좋아요 / 북마크 상태
    const [liked, setLiked] =
        useState(Boolean(detailedPost.liked));

    const [
        bookmarked,
        setBookmarked,
    ] = useState(
        Boolean(detailedPost.bookmarked),
    );

    const [
        likeCount,
        setLikeCount,
    ] = useState(
        detailedPost.likeCount ?? 0,
    );


    // AI 요약 관련 상태
    const [
        showSummary,
        setShowSummary,
    ] = useState(false);

    const [analysis, setAnalysis] =
        useState(null);

    const [
        analysisLoading,
        setAnalysisLoading,
    ] = useState(false);

    const [
        analysisError,
        setAnalysisError,
    ] = useState("");


    // 현재 언어에 맞는 게시물 지역명
    const location =
        getLocalizedRegionName(
            detailedPost,
            currentLang,
        );


    // AI 분석이 완료된 경우 요약 내용 꺼내기
    const summary =
        analysis?.status === "succeeded"
            ? analysis.result?.summary?.trim() || ""
            : "";


    // AI 분석 상태에 따라 사용자에게 보여줄 문구 결정
    const summaryMessage =
        analysisLoading
            ? currentLang === "ko"
                ? "AI 요약을 불러오는 중입니다."
                : "Loading AI summary."
            : analysisError
                ? analysisError
                : summary
                    ? summary
                    : analysis?.status === "queued" ||
                    analysis?.status === "running"
                        ? currentLang === "ko"
                            ? "AI 요약을 준비 중입니다."
                            : "AI summary is being prepared."
                        : analysis?.status === "failed" ||
                        analysis?.status === "quarantined"
                            ? currentLang === "ko"
                                ? "AI 요약을 현재 제공할 수 없습니다."
                                : "AI summary is currently unavailable."
                            : currentLang === "ko"
                                ? "AI 요약이 아직 생성되지 않았습니다."
                                : "AI summary has not been generated yet.";


    // 좋아요 버튼
    const toggleLike = async (event) => {
        event.stopPropagation();

        const nextLiked = !liked;

        setLiked(nextLiked);

        setLikeCount((count) =>
            Math.max(
                0,
                count + (nextLiked ? 1 : -1),
            ),
        );

        try {
            if (nextLiked) {
                await likePost(detailedPost.id);
            } else {
                await unlikePost(detailedPost.id);
            }
        } catch (error) {
            setLiked(!nextLiked);

            setLikeCount((count) =>
                Math.max(
                    0,
                    count + (nextLiked ? -1 : 1),
                ),
            );

            alert(
                getApiErrorMessage(
                    error,
                    "좋아요 처리에 실패했습니다.",
                ),
            );
        }
    };


    // 북마크 버튼
    const toggleBookmark = async (event) => {
        event.stopPropagation();

        const nextBookmarked =
            !bookmarked;

        setBookmarked(
            nextBookmarked,
        );

        try {
            if (nextBookmarked) {
                await bookmarkPost(detailedPost.id);
            } else {
                await unbookmarkPost(
                    detailedPost.id,
                );
            }
        } catch (error) {
            setBookmarked(
                !nextBookmarked,
            );

            alert(
                getApiErrorMessage(
                    error,
                    "북마크 처리에 실패했습니다.",
                ),
            );
        }
    };


    // AI 요약 열기/닫기
    const toggleSummary = async () => {
        const nextOpen =
            !showSummary;

        setShowSummary(nextOpen);

        if (
            !nextOpen ||
            analysisLoading ||
            analysis?.status === "succeeded"
        ) {
            return;
        }

        setAnalysisLoading(true);
        setAnalysisError("");

        try {
            setAnalysis(
                await getPostAnalysis(
                    detailedPost.id,
                ),
            );
        } catch (error) {
            setAnalysisError(
                getApiErrorMessage(
                    error,
                    currentLang === "ko"
                        ? "AI 요약을 불러오지 못했습니다."
                        : "Could not load AI summary.",
                ),
            );
        } finally {
            setAnalysisLoading(false);
        }
    };


    return (
        <article className="mx-auto w-full max-w-3xl overflow-hidden rounded-lg border border-gray-100 bg-white shadow-md dark:border-slate-800 dark:bg-slate-900">

            {/* 작성자 / 지역 / 작성 시간 */}
            <div className="px-6 pb-3 pt-7">
                <div className="flex items-center justify-between gap-3">
                    <div className="flex items-center gap-3">
                        <img
                            src={
                                detailedPost.author?.profileImageUrl ||
                                fallbackAvatar
                            }
                            alt=""
                            className="h-10 w-10 rounded-full object-cover"
                        />

                        <div>
                            <h3 className="text-base font-semibold leading-5 text-gray-900 dark:text-slate-100">
                                {detailedPost.author?.nickname ||
                                    "여행자"}
                            </h3>

                            <p className="text-sm leading-5 text-gray-500 dark:text-slate-400">
                                {location} ·{" "}
                                {getRelativeDate(
                                    detailedPost.createdAt,
                                )}
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="text-gray-500 hover:text-gray-900 dark:text-slate-400 dark:hover:text-slate-100"
                        aria-label="더보기"
                    >
                        <MoreHorizontal size={20} />
                    </button>
                </div>
            </div>


            {/* 게시물 이미지 안전 추출 및 표시 영역 */}
            <div className="px-6 pt-5">
                {(() => {
                    // 서버 데이터 구조에 따라 이미지 배열을 안전하게 추출 (문자열인 경우 객체 처리 방지 및 URL 추출)
                    const rawImages =
                        detailedPost.images ||
                        detailedPost.imageUrls ||
                        (detailedPost.coverImageUrl ? [detailedPost.coverImageUrl] : []) ||
                        (detailedPost.image ? [detailedPost.image] : []);

                    const images = (Array.isArray(rawImages) ? rawImages : [rawImages])
                        .map(item => typeof item === 'string' ? item : item?.url || item?.imageUrl)
                        .filter(Boolean);

                    if (images.length === 0) {
                        return null;
                    }

                    return (
                        <div className="grid grid-cols-4 gap-2">
                            {images
                                .slice(0, 4)
                                .map((imgUrl, index) => {
                                    const isLast =
                                        index === 3;

                                    const remainingCount =
                                        images.length - 4;

                                    return (
                                        <div
                                            key={index}
                                            className="relative h-40 w-full cursor-pointer overflow-hidden rounded-lg"
                                            onClick={() =>
                                                navigate(
                                                    `/post/${detailedPost.id}`,
                                                )
                                            }
                                        >
                                            <img
                                                src={imgUrl}
                                                alt={`${detailedPost.title || "게시물 사진"} - ${index + 1}`}
                                                className="h-full w-full object-cover transition hover:scale-105"
                                            />

                                            {/* 사진이 4장보다 많으면 남은 개수 표시 */}
                                            {isLast &&
                                                remainingCount > 0 && (
                                                    <div className="absolute inset-0 flex items-center justify-center bg-black/50">
                                                        <span className="text-lg font-bold text-white">
                                                          +{remainingCount}
                                                        </span>
                                                    </div>
                                                )}
                                        </div>
                                    );
                                })}
                        </div>
                    );
                })()}
            </div>

            {/*/!* 여행 루트 이미지 (좌우 여백 px-5 적용) *!/*/}
            {/*<div className="mt-0 px-7">*/}
            {/*    <PostRouteMap*/}
            {/*        places={detailedPost.places}*/}
            {/*        lang="ko"*/}
            {/*    />*/}
            {/*</div>*/}


            {/* 좋아요 / 댓글 / 북마크 버튼 */}
            <div className="flex items-center justify-between px-6 pt-4">
                <div className="flex items-center gap-4">
                    <button
                        type="button"
                        onClick={toggleLike}
                        className={`flex items-center gap-1 text-gray-700 transition-colors hover:text-red-500 dark:text-slate-300 ${
                            liked
                                ? "text-red-500"
                                : ""
                        }`}
                    >
                        <Heart
                            size={24}
                            fill={
                                liked
                                    ? "currentColor"
                                    : "none"
                            }
                            strokeWidth={2.0}
                        />
                    </button>


                    {/* 댓글 버튼 */}
                    <button
                        type="button"
                        onClick={() =>
                            setIsCommentOpen(
                                !isCommentOpen,
                            )
                        }
                        className="flex items-center gap-1 text-gray-700 transition-colors hover:text-blue-500 dark:text-slate-300"
                    >
                        <MessageCircle
                            size={24}
                            strokeWidth={2.0}
                        />
                    </button>
                </div>

                <button
                    type="button"
                    onClick={toggleBookmark}
                    className={`text-gray-700 transition-colors hover:text-yellow-500 dark:text-slate-300 ${
                        bookmarked
                            ? "text-yellow-500"
                            : ""
                    }`}
                    aria-label="북마크"
                >
                    <Bookmark
                        size={24}
                        fill={
                            bookmarked
                                ? "currentColor"
                                : "none"
                        }
                        strokeWidth={2.0}
                    />
                </button>
            </div>


            {/* 좋아요 개수 / 태그 */}
            <div className="px-5 pt-2">
                <p className="text-sm font-semibold text-gray-900 dark:text-slate-100">
                    좋아요 {likeCount}개
                </p>

                <TagChips
                    tags={detailedPost.tags || []}
                    className="mt-2"
                />
            </div>


            {/* 제목 / 본문 미리보기 / AI 요약 */}
            <div className="p-10">
                <h4 className="text-lg font-bold leading-6 text-gray-900 dark:text-slate-100">
                    {detailedPost.title}
                </h4>

                <p className="mt-3 line-clamp-3 text-sm leading-6 text-gray-600 dark:text-slate-300">
                    {richTextToPlainText(
                            detailedPost.content,
                        ) ||
                        "내용 미리보기가 없습니다."}
                </p>

                <div className="mt-5 rounded-lg border border-teal-100 bg-teal-50 p-3 dark:border-teal-900/60 dark:bg-teal-950/30">
                    <button
                        type="button"
                        onClick={toggleSummary}
                        className="flex w-full items-center gap-2 text-left"
                    >
                        <Sparkles
                            size={14}
                            className="text-teal-600"
                        />

                        <span className="text-xs font-semibold text-teal-700">
                          AI Summary
                        </span>

                        <span className="ml-auto text-xs text-gray-500 dark:text-slate-400">
                          {showSummary
                              ? currentLang === "ko"
                                  ? "접기"
                                  : "Hide"
                              : currentLang === "ko"
                                  ? "보기"
                                  : "View"}
                        </span>
                    </button>

                    {showSummary && (
                        <p className="mt-2 text-xs leading-5 text-gray-700 dark:text-slate-300">
                            {summaryMessage}
                        </p>
                    )}
                </div>
            </div>


            {/* 댓글 영역 */}
            {isCommentOpen && (
                <div className="px-5 pb-5">
                    <CommentSection />
                </div>
            )}

        </article>
    );
}


// 피드 전체를 불러오는 상위 컴포넌트
export default function FeedCard({
                                     selectedRegion,
                                     keyword = "",
                                 }) {
    const navigate = useNavigate();

    const { currentLang } =
        useLangStore();


    const trimmedKeyword =
        keyword.trim();


    const [
        feedResult,
        setFeedResult,
    ] = useState({
        resultKey: null,
        posts: [],
        error: "",
    });


    useEffect(() => {
        let active = true;

        const request =
            trimmedKeyword
                ? getExplore({
                    keyword:
                    trimmedKeyword,
                    size: 100,
                })
                : getFeed({
                    size: 100,
                });


        request
            .then((feed) => {
                if (!active) {
                    return;
                }

                setFeedResult({
                    resultKey:
                    trimmedKeyword,
                    posts:
                        getFeedItems(feed),
                    error: "",
                });
            })
            .catch((requestError) => {
                if (!active) {
                    return;
                }

                setFeedResult({
                    resultKey:
                    trimmedKeyword,
                    posts: [],
                    error:
                        getApiErrorMessage(
                            requestError,
                            "피드를 불러오지 못했습니다.",
                        ),
                });
            });


        return () => {
            active = false;
        };
    }, [trimmedKeyword]);


    const loading =
        feedResult.resultKey !==
        trimmedKeyword;


    const posts =
        loading
            ? []
            : feedResult.posts;

    const error =
        loading
            ? ""
            : feedResult.error;


    const regionName =
        selectedRegion?.label?.[
            currentLang
            ] ||
        selectedRegion?.label?.en ||
        selectedRegion?.label?.ko;


    const normalizedKeyword =
        trimmedKeyword.toLowerCase();


    const visiblePosts =
        posts.filter((post) => {
            const name =
                post.regionName ||
                post.region?.name ||
                "";


            if (
                !matchesSelectedRegion(
                    post,
                    selectedRegion,
                )
            ) {
                return false;
            }


            if (!normalizedKeyword) {
                return true;
            }


            const searchable =
                `${
                    post.title || ""
                } ${richTextToPlainText(
                    post.content || "",
                )} ${name} ${
                    post.category || ""
                } ${(post.tags || []).join(
                    " ",
                )} ${
                    post.author?.nickname || ""
                }`.toLowerCase();


            return searchable.includes(
                normalizedKeyword,
            );
        });


    if (loading) {
        return (
            <div className="py-10 text-center text-gray-500 dark:text-slate-400">
                피드를 불러오는 중입니다.
            </div>
        );
    }


    if (error) {
        return (
            <div className="py-10 text-center text-red-500">
                {error}
            </div>
        );
    }


    if (posts.length === 0) {
        return (
            <div className="mx-auto max-w-lg rounded-lg border border-gray-100 bg-white py-12 text-center shadow-md dark:border-slate-800 dark:bg-slate-900">
                <p className="mb-4 text-gray-500 dark:text-slate-400">
                    아직 등록된 글이 없습니다.
                </p>

                <button
                    type="button"
                    onClick={() =>
                        navigate("/write")
                    }
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-5 py-3 text-white hover:bg-primaryHover"
                >
                    <Plus size={18} />
                    글쓰기
                </button>
            </div>
        );
    }


    if (visiblePosts.length === 0) {
        return (
            <div className="mx-auto max-w-lg rounded-lg border border-gray-100 bg-white py-12 text-center shadow-md dark:border-slate-800 dark:bg-slate-900">
                <p className="text-gray-500 dark:text-slate-400">
                    {normalizedKeyword
                        ? "검색어가 포함된 게시물이 없습니다."
                        : `${
                            regionName ||
                            "선택한 지역"
                        }의 게시물이 없습니다.`}
                </p>
            </div>
        );
    }


    return (
        <div className="space-y-6">
            {visiblePosts.map(
                (post) => (
                    <FeedItem
                        key={post.id}
                        post={post}
                    />
                ),
            )}

            <div className="py-8 text-center text-sm text-gray-500 dark:text-slate-400">
                모든 게시물을 불러왔습니다.
            </div>
        </div>
    );
}