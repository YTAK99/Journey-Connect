import { useEffect, useMemo, useRef, useState } from "react";
import { Compass, PenLine, RotateCcw } from "lucide-react";
import { useNavigate, useSearchParams } from "react-router";

import PostCard from "../components/PostCard";
import { getApiErrorMessage } from "../services/apiClient";
import {
    getExplore,
    getExploreDiscovery,
    getFeedItems,
} from "../services/postApi";

import useLangStore from "../store/useLangStore";
import useRegionStore from "../store/useRegionStore";
import { getRegionSearchText } from "../utils/region";


// 탐색 페이지에서 사용하는 한글/영문 문구
const copy = {
    ko: {
        noResults: (query) => `‘${query}’ 검색 결과가 아직 없어요.`,
        invitation: "첫 번째 여행기를 남겨보세요.",
        write: "여행기 작성하기",
        reset: "검색 초기화",
        suggestions: "대신 이런 여행기는 어때요?",
        nearby: (region) => `${region}의 다른 여행기`,
        recent: "최근 올라온 여행기",
        loading: "추천 여행기를 불러오는 중입니다.",
        unavailable: "지금은 추천할 여행기가 없습니다.",
        loadMore: "더 보기",
        loadingMore: "더 불러오는 중...",
    },

    en: {
        noResults: (query) => `There are no results for “${query}” yet.`,
        invitation: "Be the first to share a travel story.",
        write: "Write a story",
        reset: "Clear search",
        suggestions: "How about one of these trips?",
        nearby: (region) => `More stories from ${region}`,
        recent: "Recently published",
        loading: "Loading travel suggestions...",
        unavailable: "There are no travel stories to recommend yet.",
        loadMore: "Load more",
        loadingMore: "Loading more...",
    },
};


// 지역 이름을 비교하기 쉽게 소문자 + 공백/쉼표 제거
const normalizeSearchValue = (value) =>
    String(value || "")
        .toLowerCase()
        .replace(/[\s,]/g, "");


// Explore cursor가 만료되거나 잘못된 경우인지 확인
const isExploreCursorError = (error) =>
    String(error?.response?.data?.code || "").startsWith(
        "EXPLORE_CURSOR_",
    );


// 현재 선택 지역에서 한 단계 넓은 상위 지역명을 구함
// 예: 특정 도시 → 해당 도시가 속한 더 넓은 지역 추천에 사용
const getParentRegionName = (region) => {
    const address = String(region?.country || "").trim();

    if (!address) {
        return "";
    }

    // 현재 지역의 다국어 이름을 주소 문자열에서 제거
    const labels = Object.values(region?.label || {}).filter(Boolean);

    const withoutCity = labels
        .reduce(
            (value, label) => value.replaceAll(String(label), " "),
            address,
        )
        .trim();

    // 쉼표로 나눌 수 있으면 첫 번째 상위 지역 사용
    const commaParts = withoutCity
        .split(",")
        .map((part) => part.trim())
        .filter(Boolean);

    if (commaParts.length > 1) {
        return commaParts[0];
    }

    // 쉼표가 없으면 공백 기준 마지막 지역명을 사용
    const spaceParts = withoutCity
        .split(/\s+/)
        .filter(Boolean);

    return spaceParts.at(-1) || "";
};


export default function SearchPage() {
    // URL의 ?q= 검색어를 읽기 위해 사용
    const [searchParams] = useSearchParams();

    const navigate = useNavigate();

    // 현재 언어
    const { currentLang } = useLangStore();

    // 현재 언어에 맞는 문구 선택
    const t = copy[currentLang] || copy.ko;

    // 전역으로 선택된 지역 + 지역 초기화 함수
    const {
        selectedRegion,
        resetSelectedRegion,
    } = useRegionStore();


    // 현재 탐색 결과
    const [posts, setPosts] = useState([]);

    // 검색 결과가 없을 때 보여줄 대체 추천 게시물
    const [recommendationResult, setRecommendationResult] = useState({
        key: "",
        items: [],
    });

    // 첫 조회 로딩
    const [loading, setLoading] = useState(true);

    // "더 보기" 로딩
    const [loadingMore, setLoadingMore] = useState(false);

    // API 에러 메시지
    const [error, setError] = useState("");

    // 다음 페이지 조회용 cursor
    const [nextCursor, setNextCursor] = useState(null);

    // 다음 페이지가 존재하는지 여부
    const [hasNext, setHasNext] = useState(false);


    // 현재 어떤 검색 요청이 최신 요청인지 구분하기 위한 값
    // 검색어/지역이 빠르게 바뀌었을 때 이전 응답이 화면을 덮는 것을 막음
    const requestKeyRef = useRef("");


    // URL에서 검색어 가져오기
    const rawKeyword = (searchParams.get("q") || "").trim();

    // 실제 검색 비교용 소문자 검색어
    const keyword = rawKeyword.toLowerCase();


    // API에 넘길 지역값
    // code가 있으면 우선 사용하고 없으면 현재 언어의 지역명을 사용
    const regionQuery =
        selectedRegion?.code ||
        selectedRegion?.label?.[currentLang] ||
        selectedRegion?.label?.ko ||
        selectedRegion?.label?.en ||
        "";


    // "검색어 + 지역" 조합으로 현재 요청을 구분
    const requestKey = `${keyword}|${regionQuery}`;


    // 검색어 또는 선택 지역이 바뀌면 탐색 결과를 새로 조회
    useEffect(() => {
        let active = true;

        // 이번 요청을 최신 요청으로 기록
        requestKeyRef.current = requestKey;

        const fetchExplore = async () => {
            // 새 검색이 시작되면 기존 상태 초기화
            setLoading(true);
            setLoadingMore(false);
            setError("");
            setNextCursor(null);
            setHasNext(false);

            try {
                // 검색어가 있으면 검색 API 사용
                // 검색어가 없으면 일반 Explore 추천 API 사용
                const result = keyword
                    ? await getExplore({
                        keyword,
                        region: regionQuery,
                        size: 100,
                    })
                    : await getExploreDiscovery({
                        region: regionQuery,
                        size: 20,
                    });

                // 이미 검색 조건이 바뀌었다면 이전 응답은 무시
                if (
                    !active ||
                    requestKeyRef.current !== requestKey
                ) {
                    return;
                }

                setPosts(getFeedItems(result));

                // 검색어가 없는 Explore 목록에서만 페이지네이션 사용
                if (!keyword) {
                    setNextCursor(result?.nextCursor || null);

                    setHasNext(
                        Boolean(
                            result?.hasNext &&
                            result?.nextCursor,
                        ),
                    );
                }
            } catch (requestError) {
                // 이미 다른 요청으로 넘어갔으면 에러도 무시
                if (
                    !active ||
                    requestKeyRef.current !== requestKey
                ) {
                    return;
                }

                setError(
                    getApiErrorMessage(
                        requestError,
                        "탐색 데이터를 불러오지 못했습니다.",
                    ),
                );

                setPosts([]);
            } finally {
                // 현재 요청일 때만 로딩 종료
                if (
                    active &&
                    requestKeyRef.current === requestKey
                ) {
                    setLoading(false);
                }
            }
        };

        fetchExplore();

        // 검색 조건이 바뀌거나 페이지가 사라지면 이전 요청 무효 처리
        return () => {
            active = false;
        };
    }, [keyword, regionQuery, requestKey]);


    // Explore에서 "더 보기"를 눌렀을 때 다음 페이지 조회
    const loadMoreDiscovery = async () => {
        // 검색 중이거나 더 불러올 데이터가 없으면 실행하지 않음
        if (
            keyword ||
            loadingMore ||
            !hasNext ||
            !nextCursor
        ) {
            return;
        }

        // 더 보기 요청을 시작한 시점의 검색 조건 저장
        const activeRequestKey =
            requestKeyRef.current;

        setLoadingMore(true);
        setError("");

        try {
            const result =
                await getExploreDiscovery({
                    region: regionQuery,
                    cursor: nextCursor,
                    size: 20,
                });

            // 그 사이 검색 조건이 바뀌었다면 결과 무시
            if (
                requestKeyRef.current !== activeRequestKey
            ) {
                return;
            }

            const incoming =
                getFeedItems(result);

            // 기존 게시물 뒤에 새 게시물을 추가
            // 같은 게시물이 다시 들어오면 중복 제거
            setPosts((current) => {
                const seen = new Set(
                    current.map((post) => post.id),
                );

                return [
                    ...current,
                    ...incoming.filter(
                        (post) => !seen.has(post.id),
                    ),
                ];
            });

            setNextCursor(
                result?.nextCursor || null,
            );

            setHasNext(
                Boolean(
                    result?.hasNext &&
                    result?.nextCursor,
                ),
            );
        } catch (requestError) {
            if (
                requestKeyRef.current !== activeRequestKey
            ) {
                return;
            }

            // cursor가 만료되거나 잘못된 경우
            // 첫 페이지부터 다시 조회해서 Explore를 복구
            if (
                isExploreCursorError(
                    requestError,
                )
            ) {
                try {
                    const restarted =
                        await getExploreDiscovery({
                            region: regionQuery,
                            size: 20,
                        });

                    if (
                        requestKeyRef.current !== activeRequestKey
                    ) {
                        return;
                    }

                    setPosts(
                        getFeedItems(restarted),
                    );

                    setNextCursor(
                        restarted?.nextCursor || null,
                    );

                    setHasNext(
                        Boolean(
                            restarted?.hasNext &&
                            restarted?.nextCursor,
                        ),
                    );

                    return;
                } catch (restartError) {
                    if (
                        requestKeyRef.current !== activeRequestKey
                    ) {
                        return;
                    }

                    setNextCursor(null);
                    setHasNext(false);

                    setError(
                        getApiErrorMessage(
                            restartError,
                            "탐색을 다시 시작하지 못했습니다.",
                        ),
                    );

                    return;
                }
            }

            setError(
                getApiErrorMessage(
                    requestError,
                    "추가 탐색 결과를 불러오지 못했습니다.",
                ),
            );
        } finally {
            if (
                requestKeyRef.current === activeRequestKey
            ) {
                setLoadingMore(false);
            }
        }
    };


    // "검색 초기화" 버튼
    //
    // 기존:
    // 그냥 /feed로 이동만 해서 선택 지역이 localStorage에 그대로 남았음
    //
    // 수정:
    // 지역 선택도 기본값으로 초기화한 뒤 /feed로 이동
    const handleResetSearch = () => {
        resetSelectedRegion();

        navigate("/feed", {
            replace: true,
        });
    };


    // 현재는 서버에서 이미 검색/지역 조건을 적용하므로
    // 프론트에서 한 번 더 필터링하지 않고 그대로 사용
    const filteredPosts = posts;


    // 조회는 성공했지만 결과가 0개인 상태
    const showEmptyState =
        !loading &&
        !error &&
        filteredPosts.length === 0;


    // 현재 검색 조건에 맞는 추천 결과인지 확인하기 위한 key
    const recommendationKey =
        `${keyword}|${selectedRegion?.id || ""}`;


    // 현재 검색 조건과 맞는 추천 결과만 화면에 사용
    const recommendations = useMemo(
        () =>
            recommendationResult.key ===
            recommendationKey
                ? recommendationResult.items
                : [],
        [
            recommendationKey,
            recommendationResult,
        ],
    );


    // 아직 현재 검색 조건의 추천 데이터를 받아오지 않은 상태
    const recommendationsLoading =
        showEmptyState &&
        recommendationResult.key !==
        recommendationKey;


    // 검색 결과가 0개라면 대신 보여줄 추천 게시물을 가져옴
    useEffect(() => {
        if (!showEmptyState) {
            return undefined;
        }

        let active = true;

        // 현재 지역에 결과가 없더라도
        // 전체 지역 Explore에서 대체 추천을 가져옴
        getExploreDiscovery({
            size: 12,
        })
            .then((result) => {
                if (!active) {
                    return;
                }

                setRecommendationResult({
                    key: recommendationKey,
                    items: getFeedItems(result),
                });
            })
            .catch(() => {
                if (!active) {
                    return;
                }

                // 추천 조회가 실패해도 페이지 전체를 에러 처리하지는 않음
                setRecommendationResult({
                    key: recommendationKey,
                    items: [],
                });
            });

        return () => {
            active = false;
        };
    }, [
        recommendationKey,
        showEmptyState,
    ]);


    // 현재 선택 지역보다 한 단계 넓은 지역 이름
    // 비슷한 지역의 게시물을 먼저 추천할 때 사용
    const parentRegionName = useMemo(
        () =>
            getParentRegionName(
                selectedRegion,
            ),
        [selectedRegion],
    );


    // 추천 게시물 중 현재 지역과 가까운 상위 권역 게시물을 최대 3개 선택
    const parentPosts = useMemo(() => {
        const normalizedParent =
            normalizeSearchValue(
                parentRegionName,
            );

        if (!normalizedParent) {
            return [];
        }

        return recommendations
            .filter((post) =>
                normalizeSearchValue(
                    getRegionSearchText(post),
                ).includes(normalizedParent),
            )
            .slice(0, 3);
    }, [
        parentRegionName,
        recommendations,
    ]);


    // 위에서 이미 보여준 상위 권역 게시물 ID
    // 최근 글 목록에서 중복으로 다시 나오지 않게 사용
    const parentPostIds = useMemo(
        () =>
            new Set(
                parentPosts.map(
                    (post) => post.id,
                ),
            ),
        [parentPosts],
    );


    // 상위 권역 추천에 사용되지 않은 게시물 중 최대 6개를 최근 글로 표시
    const recentPosts = useMemo(
        () =>
            recommendations
                .filter(
                    (post) =>
                        !parentPostIds.has(
                            post.id,
                        ),
                )
                .slice(0, 6),
        [
            parentPostIds,
            recommendations,
        ],
    );


    // "○○ 검색 결과가 아직 없어요"에 들어갈 이름
    // 검색어가 있으면 검색어, 없으면 현재 선택 지역 사용
    const queryLabel =
        rawKeyword ||
        selectedRegion?.label?.[
            currentLang
            ] ||
        selectedRegion?.label?.ko ||
        "여행지";


    return (
        <main className="min-h-screen bg-sky-50 dark:bg-slate-950">
            <div className="pb-4 pt-20">
                <section className="mx-auto max-w-screen-xl px-4 py-3">

                    {/* 검색어가 있을 때 현재 검색어 표시 */}
                    <div className="mb-4 flex flex-col gap-1">
                        {keyword && (
                            <p className="text-sm text-gray-500 dark:text-slate-400">
                                헤더 검색어:{" "}
                                <span className="font-medium text-teal-700">
                  {searchParams.get("q")}
                </span>
                            </p>
                        )}
                    </div>


                    {/* API 오류 */}
                    {error && (
                        <p className="mb-4 text-sm text-red-500">
                            {error}
                        </p>
                    )}


                    {/* 첫 탐색 결과 로딩 */}
                    {loading && (
                        <p className="py-10 text-center text-gray-500 dark:text-slate-400">
                            탐색 카드를 불러오는 중입니다.
                        </p>
                    )}


                    {/* 정상적으로 탐색 결과가 있는 경우 */}
                    {!loading &&
                        filteredPosts.length > 0 && (
                            <>
                                <div className="grid grid-cols-1 gap-4 border-b border-gray-100 dark:border-slate-800 sm:grid-cols-2 lg:grid-cols-3">
                                    {filteredPosts.map(
                                        (post) => (
                                            <PostCard
                                                key={post.id}
                                                post={post}
                                                setPosts={setPosts}
                                            />
                                        ),
                                    )}
                                </div>


                                {/* 검색이 아닌 일반 Explore일 때만 더 보기 사용 */}
                                {!keyword &&
                                    hasNext && (
                                        <div className="flex justify-center py-6">
                                            <button
                                                type="button"
                                                onClick={
                                                    loadMoreDiscovery
                                                }
                                                disabled={
                                                    loadingMore
                                                }
                                                className="rounded-xl border border-teal-200 bg-white px-5 py-2.5 text-sm font-bold text-teal-700 transition hover:bg-teal-50 disabled:cursor-not-allowed disabled:opacity-60 dark:border-teal-900 dark:bg-slate-900 dark:text-teal-200 dark:hover:bg-slate-800"
                                            >
                                                {loadingMore
                                                    ? t.loadingMore
                                                    : t.loadMore}
                                            </button>
                                        </div>
                                    )}
                            </>
                        )}


                    {/* 검색/지역 조건에 맞는 게시물이 없는 경우 */}
                    {showEmptyState && (
                        <div className="space-y-8">

                            {/* 결과 없음 안내 */}
                            <section className="overflow-hidden rounded-2xl border border-teal-100 bg-white shadow-sm dark:border-teal-900/60 dark:bg-slate-900">
                                <div className="bg-gradient-to-r from-teal-50 via-white to-sky-50 px-6 py-8 text-center dark:from-teal-950/40 dark:via-slate-900 dark:to-sky-950/30 sm:px-10">
                  <span className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-teal-100 text-teal-700 dark:bg-teal-900/60 dark:text-teal-200">
                    <Compass size={23} />
                  </span>

                                    <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                                        {t.noResults(
                                            queryLabel,
                                        )}
                                    </h2>

                                    <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
                                        {t.invitation}
                                    </p>


                                    {/* 새 글 작성 또는 검색 조건 초기화 */}
                                    <div className="mt-6 flex flex-col justify-center gap-2 sm:flex-row">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                navigate(
                                                    "/write",
                                                )
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-xl bg-teal-500 px-5 py-2.5 text-sm font-bold text-white transition hover:bg-teal-600"
                                        >
                                            <PenLine size={16} />
                                            {t.write}
                                        </button>

                                        <button
                                            type="button"
                                            onClick={
                                                handleResetSearch
                                            }
                                            className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-5 py-2.5 text-sm font-semibold text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
                                        >
                                            <RotateCcw size={15} />
                                            {t.reset}
                                        </button>
                                    </div>
                                </div>
                            </section>


                            {/* 결과가 없을 때 대신 보여줄 추천 게시물 */}
                            <section>
                                <div className="mb-5">
                                    <p className="text-xs font-bold uppercase tracking-[0.18em] text-teal-600">
                                        Journey Picks
                                    </p>

                                    <h2 className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">
                                        {t.suggestions}
                                    </h2>
                                </div>


                                {/* 추천 게시물 로딩 */}
                                {recommendationsLoading && (
                                    <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                        {t.loading}
                                    </p>
                                )}


                                {/* 현재 지역과 가까운 상위 권역 게시물 */}
                                {!recommendationsLoading &&
                                    parentPosts.length > 0 && (
                                        <div className="mb-8">
                                            <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
                                                {t.nearby(
                                                    parentRegionName,
                                                )}
                                            </h3>

                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                {parentPosts.map(
                                                    (post) => (
                                                        <PostCard
                                                            key={`parent-${post.id}`}
                                                            post={post}

                                                            // 추천 목록에서 좋아요/삭제 등으로 데이터가 바뀌면
                                                            // recommendationResult 내부 목록만 갱신
                                                            setPosts={(
                                                                updater,
                                                            ) =>
                                                                setRecommendationResult(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        items:
                                                                            typeof updater ===
                                                                            "function"
                                                                                ? updater(
                                                                                    current.items,
                                                                                )
                                                                                : updater,
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}


                                {/* 상위 권역 추천에 포함되지 않은 최근 게시물 */}
                                {!recommendationsLoading &&
                                    recentPosts.length > 0 && (
                                        <div>
                                            <h3 className="mb-3 text-lg font-bold text-slate-900 dark:text-white">
                                                {t.recent}
                                            </h3>

                                            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                                                {recentPosts.map(
                                                    (post) => (
                                                        <PostCard
                                                            key={`recent-${post.id}`}
                                                            post={post}

                                                            // 최근 글 목록도 추천 결과 state 안에서 갱신
                                                            setPosts={(
                                                                updater,
                                                            ) =>
                                                                setRecommendationResult(
                                                                    (
                                                                        current,
                                                                    ) => ({
                                                                        ...current,
                                                                        items:
                                                                            typeof updater ===
                                                                            "function"
                                                                                ? updater(
                                                                                    current.items,
                                                                                )
                                                                                : updater,
                                                                    }),
                                                                )
                                                            }
                                                        />
                                                    ),
                                                )}
                                            </div>
                                        </div>
                                    )}


                                {/* 대체 추천 게시물조차 없는 경우 */}
                                {!recommendationsLoading &&
                                    recommendations.length === 0 && (
                                        <p className="rounded-xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                                            {t.unavailable}
                                        </p>
                                    )}
                            </section>
                        </div>
                    )}
                </section>
            </div>
        </main>
    );
}