import { useState, useEffect, useRef } from "react";
import {
  Search, MapPin, Heart, MessageCircle, Bookmark, X,
  Sparkles, User, Bell, Send, ChevronDown, LogIn,
  Camera, Globe, Navigation, Utensils, Landmark,
  Coffee, Waves, Mountain, ShoppingBag, Plus,
  ChevronRight, Clock, Eye, CheckSquare, Square,
  Users, Sun, Moon, Languages, Shuffle, Route,
  Settings, MoreHorizontal, RefreshCw, Star, Compass,
  ArrowLeft, Edit, Image as ImageIcon, List, Grid, LogOut
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

// ─── Types ────────────────────────────────────────────────────────────────────
type Page = "landing" | "feed" | "explore" | "crew" | "mypage";
type Lang = "ko" | "en";

interface Region {
  id: string;
  label: { ko: string; en: string };
  country: string;
  icon: React.ElementType;
  timezone: string;
  weather: { temp: number; icon: string; conditionKo: string; conditionEn: string };
}

interface Post {
  id: number;
  author: string;
  avatar: string;
  region: string;
  regionId: string;
  country: string;
  category: string;
  title: string;
  body: string;
  tags: string[];
  image: string;
  likes: number;
  comments: number;
  saved: boolean;
  liked: boolean;
  rating: number;
  createdAt: string;
  aiSummary: string;
}

// ─── Data ─────────────────────────────────────────────────────────────────────
const REGIONS: Region[] = [
  { id: "seoul",    label: { ko: "서울",  en: "Seoul"    }, country: "🇰🇷", icon: Navigation, timezone: "Asia/Seoul",         weather: { temp: 28, icon: "⛅", conditionKo: "구름 조금", conditionEn: "Partly cloudy" } },
  { id: "busan",    label: { ko: "부산",  en: "Busan"    }, country: "🇰🇷", icon: Waves,      timezone: "Asia/Seoul",         weather: { temp: 31, icon: "☀️", conditionKo: "맑음",       conditionEn: "Sunny"         } },
  { id: "jeju",     label: { ko: "제주",  en: "Jeju"     }, country: "🇰🇷", icon: Mountain,   timezone: "Asia/Seoul",         weather: { temp: 27, icon: "🌤", conditionKo: "구름",       conditionEn: "Cloudy"        } },
  { id: "gangneung",label: { ko: "강릉",  en: "Gangneung"}, country: "🇰🇷", icon: Coffee,     timezone: "Asia/Seoul",         weather: { temp: 25, icon: "🌊", conditionKo: "맑음",       conditionEn: "Clear"         } },
  { id: "tokyo",    label: { ko: "도쿄",  en: "Tokyo"    }, country: "🇯🇵", icon: Landmark,   timezone: "Asia/Tokyo",         weather: { temp: 33, icon: "🌞", conditionKo: "맑고 더움", conditionEn: "Hot & sunny"   } },
  { id: "osaka",    label: { ko: "오사카",en: "Osaka"    }, country: "🇯🇵", icon: Utensils,   timezone: "Asia/Tokyo",         weather: { temp: 34, icon: "☀️", conditionKo: "무더움",     conditionEn: "Very hot"      } },
  { id: "paris",    label: { ko: "파리",  en: "Paris"    }, country: "🇫🇷", icon: Star,       timezone: "Europe/Paris",       weather: { temp: 22, icon: "🌥", conditionKo: "흐림",       conditionEn: "Overcast"      } },
  { id: "newyork",  label: { ko: "뉴욕",  en: "New York" }, country: "🇺🇸", icon: ShoppingBag,timezone: "America/New_York",   weather: { temp: 26, icon: "🌤", conditionKo: "맑음",       conditionEn: "Clear"         } },
  { id: "bali",     label: { ko: "발리",  en: "Bali"     }, country: "🇮🇩", icon: Waves,      timezone: "Asia/Makassar",      weather: { temp: 30, icon: "🌺", conditionKo: "열대 날씨", conditionEn: "Tropical"      } },
];

const CATEGORY_COLORS: Record<string, string> = {
  맛집: "bg-orange-50 text-orange-600", 명소: "bg-blue-50 text-blue-600",
  카페: "bg-amber-50 text-amber-700",   숙소: "bg-purple-50 text-purple-600",
  액티비티: "bg-green-50 text-green-600",
};

const POSTS: Post[] = [
  {
    id: 1, author: "미련한 토끼", avatar: "https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop",
    region: "서울", regionId: "seoul", country: "🇰🇷", category: "맛집",
    title: "연남동 골목 숨어있는 돼지국밥 맛집",
    body: "연남동 경의선숲길 걷다가 발견한 30년 전통 돼지국밥집. 뼈를 12시간 우려낸 국물이 진국이고, 점심 피크타임엔 항상 줄 서야 해요. 테이블은 6개뿐이라 빨리 가는 걸 추천!",
    tags: ["돼지국밥", "연남동", "로컬맛집"], image: "https://images.unsplash.com/photo-1569050467447-ce54b3bbc37d?w=800&h=600&fit=crop&auto=format",
    likes: 284, comments: 47, saved: false, liked: false, rating: 9.2, createdAt: "2시간 전",
    aiSummary: "연남동 30년 전통 돼지국밥. 12시간 우린 진한 육수가 핵심. 6테이블 소규모 운영, 조기 방문 권장."
  },
  {
    id: 2, author: "용감한 독수리", avatar: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=80&h=80&fit=crop",
    region: "제주", regionId: "jeju", country: "🇰🇷", category: "명소",
    title: "사람 없는 제주 비경 - 용머리해안 일출",
    body: "새벽 5시에 일어나서 간 보람이 있었어요. 관광객 없는 용머리해안은 완전히 다른 세계. 붉게 물드는 하늘과 주상절리가 만나는 그 순간 진짜 소름돋았습니다.",
    tags: ["제주", "일출", "숨은명소"], image: "https://images.unsplash.com/photo-1590736969596-701f0a18e6f0?w=800&h=600&fit=crop&auto=format",
    likes: 512, comments: 63, saved: true, liked: true, rating: 9.8, createdAt: "5시간 전",
    aiSummary: "용머리해안 새벽 일출. 이른 시간 방문으로 인파 없이 독점 가능. 주상절리+일출 조합이 핵심."
  },
  {
    id: 3, author: "신비로운 여우", avatar: "https://images.unsplash.com/photo-1527980965255-d3b416303d12?w=80&h=80&fit=crop",
    region: "도쿄", regionId: "tokyo", country: "🇯🇵", category: "카페",
    title: "시부야 뒷골목 스페셜티 커피 바",
    body: "에티오피아 게이샤 싱글오리진을 이렇게 저렴하게 마실 수 있다니. 바리스타가 한국어를 조금 해서 더 친근하게 느껴졌어요. 좌석이 4개뿐인 초미니 카페라 오픈런 필수.",
    tags: ["스페셜티커피", "시부야", "감성카페"], image: "https://images.unsplash.com/photo-1559056199-641a0ac8b55e?w=800&h=600&fit=crop&auto=format",
    likes: 196, comments: 28, saved: false, liked: false, rating: 9.5, createdAt: "1일 전",
    aiSummary: "시부야 4석 스페셜티 카페. 에티오피아 게이샤 보유. 한국어 가능 바리스타. 오픈런 필수."
  },
  {
    id: 4, author: "따뜻한 펭귄", avatar: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=80&h=80&fit=crop",
    region: "부산", regionId: "busan", country: "🇰🇷", category: "맛집",
    title: "광안리 새벽 회포장 - 현지인만 아는 그 집",
    body: "새벽 2시에도 문 여는 횟집. 광안대교 뷰에 광어 1킬로 58,000원. 소주 한잔이랑 먹으면 천국이 따로 없어요.",
    tags: ["광안리", "회", "야경"], image: "https://images.unsplash.com/photo-1579871494447-9811cf80d66c?w=800&h=600&fit=crop&auto=format",
    likes: 341, comments: 55, saved: false, liked: false, rating: 9.0, createdAt: "2일 전",
    aiSummary: "광안리 새벽 운영 횟집. 광안대교 뷰 + 가성비 회. 현지인 다수 이용. 직접 방문 권장."
  },
  {
    id: 5, author: "현명한 부엉이", avatar: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=80&h=80&fit=crop",
    region: "파리", regionId: "paris", country: "🇫🇷", category: "명소",
    title: "루브르보다 오르세 - 인파 없이 즐기는 법",
    body: "화요일 오전 9시 오픈과 동시에 들어가면 모네, 르누아르 앞에서 30분씩 혼자 서 있을 수 있어요. 뮤지엄패스 미리 사고 입장권 줄은 스킵.",
    tags: ["파리", "미술관", "유럽여행"], image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=800&h=600&fit=crop&auto=format",
    likes: 428, comments: 71, saved: true, liked: false, rating: 9.3, createdAt: "3일 전",
    aiSummary: "오르세 미술관 혼잡 회피 전략. 화요일 오전 개관 직후 방문. 뮤지엄패스 사전 구매 필수."
  },
  {
    id: 6, author: "장난스러운 원숭이", avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=80&h=80&fit=crop",
    region: "강릉", regionId: "gangneung", country: "🇰🇷", category: "카페",
    title: "경포대 앞 테라스 카페 - 바다가 탁자 앞에",
    body: "테라스에 앉으면 경포호와 바다가 동시에 보여요. 핸드드립 커피 퀄리티도 서울 못지않고, 오너가 바리스타 챔피언십 입상 경력 있대요.",
    tags: ["강릉카페", "오션뷰", "핸드드립"], image: "https://images.unsplash.com/photo-1495474472287-4d71bcdd2085?w=800&h=600&fit=crop&auto=format",
    likes: 267, comments: 39, saved: false, liked: false, rating: 9.6, createdAt: "4일 전",
    aiSummary: "강릉 경포대 인근 테라스 카페. 경포호+동해 조망. 챔피언십 바리스타 운영. 주말 예약 필수."
  },
];

const STORIES = [
  { id: 1, author: "미련한 토끼", region: "서울", image: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=120&h=120&fit=crop" },
  { id: 2, author: "용감한 독수리", region: "제주", image: "https://images.unsplash.com/photo-1590736969596-701f0a18e6f0?w=120&h=120&fit=crop" },
  { id: 3, author: "신비로운 여우", region: "도쿄", image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=120&h=120&fit=crop" },
  { id: 4, author: "따뜻한 펭귄", region: "부산", image: "https://images.unsplash.com/photo-1578637387939-43c525550085?w=120&h=120&fit=crop" },
  { id: 5, author: "현명한 부엉이", region: "파리", image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=120&h=120&fit=crop" },
  { id: 6, author: "나그네 고양이", region: "발리", image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=120&h=120&fit=crop" },
  { id: 7, author: "당찬 수달", region: "오사카", image: "https://images.unsplash.com/photo-1549693578-d683be217e58?w=120&h=120&fit=crop" },
];

const CREWS = [
  { id: 1, title: "7월 서울 성수동 빈티지 투어 같이 해요", titleEn: "July Seoul Seongsu Vintage Tour", region: "서울", country: "🇰🇷", members: 4, maxMembers: 8, date: "2025-07-20", tags: ["성수동", "빈티지"], image: "https://images.unsplash.com/photo-1517154421773-0529f29ea451?w=400&h=200&fit=crop" },
  { id: 2, title: "도쿄 야키토리 골목 투어 하실 분?", titleEn: "Tokyo Yakitori Night Tour", region: "도쿄", country: "🇯🇵", members: 6, maxMembers: 10, date: "2025-07-28", tags: ["도쿄", "야키토리"], image: "https://images.unsplash.com/photo-1540959733332-eab4deabeeaf?w=400&h=200&fit=crop" },
  { id: 3, title: "제주 올레길 1코스 - 외국인 친구와 같이!", titleEn: "Jeju Olle Trail with Foreigners", region: "제주", country: "🇰🇷", members: 3, maxMembers: 6, date: "2025-08-05", tags: ["올레길", "외국인환영"], image: "https://images.unsplash.com/photo-1590736969596-701f0a18e6f0?w=400&h=200&fit=crop" },
  { id: 4, title: "파리 뮤지엄패스 하루 완전정복 크루", titleEn: "Paris Museum Pass Full Day", region: "파리", country: "🇫🇷", members: 5, maxMembers: 8, date: "2025-08-12", tags: ["파리", "미술관"], image: "https://images.unsplash.com/photo-1502602898657-3e91760cbb34?w=400&h=200&fit=crop" },
  { id: 5, title: "부산 해운대 새벽 러닝 크루", titleEn: "Busan Haeundae Dawn Running", region: "부산", country: "🇰🇷", members: 9, maxMembers: 12, date: "매주 토요일", tags: ["러닝", "해운대"], image: "https://images.unsplash.com/photo-1578637387939-43c525550085?w=400&h=200&fit=crop" },
  { id: 6, title: "발리 스쿠버다이빙 입문 같이해요", titleEn: "Bali Scuba Diving for Beginners", region: "발리", country: "🇮🇩", members: 2, maxMembers: 6, date: "2025-08-20", tags: ["발리", "다이빙"], image: "https://images.unsplash.com/photo-1537996194471-e657df975ab4?w=400&h=200&fit=crop" },
];

const RANDOM_NICKNAMES_KO = ["미련한 토끼", "용감한 독수리", "게으른 나무늘보", "빠른 치타", "현명한 부엉이", "장난스러운 원숭이", "우아한 학", "당찬 수달", "신비로운 여우", "따뜻한 펭귄"];
const RANDOM_NICKNAMES_EN = ["Brave Eagle", "Lazy Sloth", "Swift Cheetah", "Wise Owl", "Witty Monkey", "Elegant Crane", "Bold Otter", "Mystic Fox", "Warm Penguin", "Clumsy Rabbit"];

// ─── Helpers ──────────────────────────────────────────────────────────────────
function getLocalTime(timezone: string): string {
  try {
    return new Date().toLocaleTimeString("en-US", { timeZone: timezone, hour: "2-digit", minute: "2-digit", hour12: false });
  } catch {
    return "--:--";
  }
}

// ─── Region Header (Feed & Explore 공통) ──────────────────────────────────────
function RegionHeader({ region, lang, onChangeRegion }: { region: Region; lang: Lang; onChangeRegion: () => void }) {
  const [time, setTime] = useState(getLocalTime(region.timezone));

  useEffect(() => {
    const id = setInterval(() => setTime(getLocalTime(region.timezone)), 30000);
    return () => clearInterval(id);
  }, [region.timezone]);

  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-4xl mx-auto flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-2xl">{region.country}</span>
          <span className="text-lg font-bold text-foreground">{region.label[lang]}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <Clock size={13} className="text-primary" />
          <span className="font-mono">{time}</span>
        </div>
        <div className="flex items-center gap-1 text-sm text-muted-foreground">
          <span>{region.weather.icon}</span>
          <span className="font-semibold text-foreground">{region.weather.temp}°C</span>
          <span>{lang === "ko" ? region.weather.conditionKo : region.weather.conditionEn}</span>
        </div>
        <button
          onClick={onChangeRegion}
          className="ml-auto flex items-center gap-1.5 text-xs font-medium text-primary border border-primary/30 px-3 py-1.5 rounded-full hover:bg-secondary transition-colors"
        >
          <RefreshCw size={11} />
          {lang === "ko" ? "지역 변경" : "Change Region"}
        </button>
      </div>
    </div>
  );
}

// ─── Stories Row ─────────────────────────────────────────────────────────────
function StoriesRow({ lang }: { lang: Lang }) {
  return (
    <div className="bg-card border-b border-border px-6 py-4">
      <div className="max-w-4xl mx-auto">
        <div className="flex gap-4 overflow-x-auto pb-1 scrollbar-hide">
          {/* Add Story */}
          <div className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
            <div className="w-16 h-16 rounded-full bg-secondary border-2 border-dashed border-primary/40 flex items-center justify-center group-hover:border-primary transition-colors">
              <Plus size={20} className="text-primary/50 group-hover:text-primary" />
            </div>
            <span className="text-xs text-muted-foreground whitespace-nowrap">
              {lang === "ko" ? "올리기" : "Post"}
            </span>
          </div>
          {STORIES.map(s => (
            <div key={s.id} className="flex flex-col items-center gap-1.5 flex-shrink-0 cursor-pointer group">
              <div className="w-16 h-16 rounded-full p-0.5 bg-gradient-to-tr from-primary to-accent group-hover:from-accent group-hover:to-primary transition-all">
                <img
                  src={s.image}
                  alt={s.author}
                  className="w-full h-full rounded-full object-cover border-2 border-card"
                />
              </div>
              <span className="text-xs text-muted-foreground whitespace-nowrap max-w-[70px] text-center truncate">
                {s.region}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Feed Card (Instagram style) ─────────────────────────────────────────────
function FeedCard({ post, lang }: { post: Post; lang: Lang }) {
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [saved, setSaved] = useState(post.saved);
  const [showSummary, setShowSummary] = useState(false);
  const [comment, setComment] = useState("");

  return (
    <article className="bg-card border border-border rounded-2xl overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <img src={post.avatar} alt={post.author} className="w-9 h-9 rounded-full object-cover border border-border" />
          <div>
            <div className="text-sm font-semibold text-foreground">{post.author}</div>
            <div className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin size={10} />{post.country} {post.region} · {post.createdAt}
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className={`text-xs px-2 py-0.5 rounded-full ${CATEGORY_COLORS[post.category] || "bg-secondary text-foreground"}`}>
            {post.category}
          </span>
          <button className="text-muted-foreground hover:text-foreground"><MoreHorizontal size={16} /></button>
        </div>
      </div>

      {/* Image */}
      <div className="relative">
        <img src={post.image} alt={post.title} className="w-full aspect-[4/3] object-cover" />
        <div className="absolute bottom-3 right-3 flex items-center gap-1 bg-black/50 backdrop-blur-sm text-white text-xs px-2 py-1 rounded-full">
          <Star size={10} fill="currentColor" className="text-amber-400" />
          {post.rating}/10
        </div>
      </div>

      {/* Actions */}
      <div className="px-4 pt-3 pb-1 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <button
            onClick={() => { setLiked(!liked); setLikeCount(liked ? likeCount - 1 : likeCount + 1); }}
            className={`flex items-center gap-1.5 text-sm transition-colors ${liked ? "text-rose-500" : "text-muted-foreground hover:text-rose-400"}`}
          >
            <Heart size={20} fill={liked ? "currentColor" : "none"} strokeWidth={liked ? 0 : 2} />
          </button>
          <button className="text-muted-foreground hover:text-foreground">
            <MessageCircle size={20} />
          </button>
        </div>
        <button
          onClick={() => setSaved(!saved)}
          className={`transition-colors ${saved ? "text-primary" : "text-muted-foreground hover:text-primary"}`}
        >
          <Bookmark size={20} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      <div className="px-4 pb-2">
        {/* Like count */}
        <p className="text-sm font-semibold text-foreground mb-1">
          {lang === "ko" ? `좋아요 ${likeCount.toLocaleString()}개` : `${likeCount.toLocaleString()} likes`}
        </p>

        {/* Caption */}
        <p className="text-sm text-foreground">
          <span className="font-semibold mr-1">{post.author}</span>
          <span className="font-semibold text-foreground">{post.title}</span>
        </p>
        <p className="text-sm text-muted-foreground mt-0.5 leading-relaxed line-clamp-2">{post.body}</p>

        {/* Tags */}
        <div className="flex flex-wrap gap-1 mt-2">
          {post.tags.map(t => (
            <span key={t} className="text-xs text-primary"># {t}</span>
          ))}
        </div>

        {/* AI Summary */}
        <button
          onClick={() => setShowSummary(!showSummary)}
          className="mt-2 flex items-center gap-1.5 text-xs text-primary/70 hover:text-primary transition-colors"
        >
          <Sparkles size={11} />
          {lang === "ko" ? "AI 요약 보기" : "View AI Summary"}
          <ChevronDown size={11} className={`transition-transform ${showSummary ? "rotate-180" : ""}`} />
        </button>
        {showSummary && (
          <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }}
            className="mt-2 bg-secondary/60 rounded-xl p-3 text-xs text-foreground/80 leading-relaxed border border-primary/10">
            {post.aiSummary}
          </motion.div>
        )}

        {/* Comments count */}
        <button className="mt-2 text-xs text-muted-foreground hover:text-foreground transition-colors">
          {lang === "ko" ? `댓글 ${post.comments}개 모두 보기` : `View all ${post.comments} comments`}
        </button>

        {/* Comment input */}
        <div className="flex items-center gap-2 mt-2 pt-2 border-t border-border">
          <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
            <User size={13} className="text-primary" />
          </div>
          <input
            value={comment}
            onChange={e => setComment(e.target.value)}
            placeholder={lang === "ko" ? "댓글 달기..." : "Add a comment..."}
            className="flex-1 text-sm bg-transparent focus:outline-none text-foreground placeholder:text-muted-foreground"
          />
          {comment && (
            <button onClick={() => setComment("")}
              className="text-xs font-semibold text-primary hover:text-accent">
              {lang === "ko" ? "게시" : "Post"}
            </button>
          )}
        </div>
      </div>
    </article>
  );
}

// ─── Explore Card (3-col blog card) ──────────────────────────────────────────
function ExploreCard({ post, onOpen }: { post: Post; onOpen: (p: Post) => void }) {
  const [saved, setSaved] = useState(post.saved);
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);

  return (
    <motion.article
      whileHover={{ y: -2 }}
      transition={{ duration: 0.18 }}
      onClick={() => onOpen(post)}
      className="bg-card border border-border rounded-2xl overflow-hidden cursor-pointer group hover:shadow-md transition-shadow"
    >
      {/* Thumbnail */}
      <div className="relative h-44 overflow-hidden bg-secondary">
        <img
          src={post.image}
          alt={post.title}
          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-500"
        />
        {/* Region badge */}
        <span className="absolute top-2 left-2 text-xs font-medium bg-black/50 backdrop-blur-sm text-white px-2 py-0.5 rounded-full flex items-center gap-1">
          <span>{post.country}</span>{post.region}
        </span>
        {/* Bookmark */}
        <button
          onClick={e => { e.stopPropagation(); setSaved(!saved); }}
          className={`absolute top-2 right-2 w-7 h-7 rounded-full flex items-center justify-center backdrop-blur-sm transition-colors ${saved ? "bg-primary text-white" : "bg-white/80 hover:bg-white text-foreground"}`}
        >
          <Bookmark size={13} fill={saved ? "currentColor" : "none"} />
        </button>
      </div>

      {/* Divider */}
      <div className="h-px bg-border mx-3" />

      {/* Content */}
      <div className="p-3">
        <h3 className="text-sm font-semibold text-foreground leading-snug mb-2 group-hover:text-primary transition-colors line-clamp-2">
          {post.title}
        </h3>
        <div className="flex flex-wrap gap-1 mb-3">
          {post.tags.slice(0, 2).map(t => (
            <span key={t} className="text-xs text-primary bg-secondary px-2 py-0.5 rounded-full">#{t}</span>
          ))}
        </div>

        {/* Divider */}
        <div className="h-px bg-border mb-2" />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <button
            onClick={e => { e.stopPropagation(); setLiked(!liked); setLikeCount(liked ? likeCount - 1 : likeCount + 1); }}
            className={`flex items-center gap-1 transition-colors ${liked ? "text-rose-500" : "hover:text-rose-400"}`}
          >
            <Heart size={12} fill={liked ? "currentColor" : "none"} />{likeCount}
          </button>
          <span className="flex items-center gap-1">
            <MessageCircle size={12} />{post.comments}
          </span>
          <span className="flex items-center gap-1">
            <Star size={11} fill="currentColor" className="text-amber-400" />{post.rating}
          </span>
        </div>
      </div>
    </motion.article>
  );
}

// ─── Post Detail Modal ────────────────────────────────────────────────────────
function PostDetailModal({ post, onClose, lang }: { post: Post; onClose: () => void; lang: Lang }) {
  const [liked, setLiked] = useState(post.liked);
  const [likeCount, setLikeCount] = useState(post.likes);
  const [saved, setSaved] = useState(post.saved);
  const [comment, setComment] = useState("");

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto py-8"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }}
        onClick={e => e.stopPropagation()}
        className="bg-card w-full max-w-xl rounded-3xl overflow-hidden shadow-2xl">
        <div className="relative h-56">
          <img src={post.image} alt={post.title} className="w-full h-full object-cover" />
          <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
          <button onClick={onClose} className="absolute top-3 right-3 w-8 h-8 bg-white/20 backdrop-blur-sm text-white rounded-full flex items-center justify-center hover:bg-white/40">
            <X size={15} />
          </button>
          <div className="absolute bottom-3 left-4">
            <span className={`text-xs px-2 py-0.5 rounded-full mb-1 inline-block ${CATEGORY_COLORS[post.category] || ""}`}>{post.category}</span>
            <h2 className="text-white text-lg font-semibold">{post.title}</h2>
          </div>
        </div>
        <div className="p-5 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <img src={post.avatar} alt={post.author} className="w-8 h-8 rounded-full object-cover" />
              <div>
                <div className="text-sm font-semibold">{post.author}</div>
                <div className="text-xs text-muted-foreground">{post.country} {post.region} · {post.createdAt}</div>
              </div>
            </div>
            <div className="flex gap-2">
              <button onClick={() => { setLiked(!liked); setLikeCount(liked ? likeCount - 1 : likeCount + 1); }}
                className={`flex items-center gap-1 text-sm px-3 py-1.5 rounded-full border transition-all ${liked ? "bg-rose-50 border-rose-200 text-rose-500" : "border-border hover:text-rose-400"}`}>
                <Heart size={13} fill={liked ? "currentColor" : "none"} />{likeCount}
              </button>
              <button onClick={() => setSaved(!saved)}
                className={`px-3 py-1.5 rounded-full border text-sm transition-all ${saved ? "bg-primary text-white border-primary" : "border-border hover:border-primary hover:text-primary"}`}>
                <Bookmark size={13} fill={saved ? "currentColor" : "none"} />
              </button>
            </div>
          </div>
          <p className="text-sm text-foreground leading-relaxed">{post.body}</p>
          <div className="flex flex-wrap gap-1">
            {post.tags.map(t => <span key={t} className="text-sm text-primary bg-secondary px-3 py-0.5 rounded-full">#{t}</span>)}
          </div>
          <div className="bg-secondary/60 rounded-xl p-3 border border-primary/10">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles size={12} className="text-primary" />
              <span className="text-xs font-semibold text-primary">AI Summary</span>
            </div>
            <p className="text-xs text-foreground/80 leading-relaxed">{post.aiSummary}</p>
          </div>
          <div className="flex items-center gap-2 pt-2 border-t border-border">
            <div className="w-7 h-7 rounded-full bg-secondary flex-shrink-0 flex items-center justify-center">
              <User size={12} className="text-primary" />
            </div>
            <input value={comment} onChange={e => setComment(e.target.value)}
              placeholder={lang === "ko" ? "댓글을 입력하세요..." : "Add a comment..."}
              className="flex-1 bg-input-background rounded-full px-3 py-1.5 text-sm border border-border focus:outline-none focus:border-primary/40" />
            <button className="w-8 h-8 bg-primary text-white rounded-full flex items-center justify-center hover:bg-accent">
              <Send size={13} />
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Login / Signup Modal ─────────────────────────────────────────────────────
function AuthModal({ mode, onClose, onSuccess, lang }: { mode: "login" | "signup"; onClose: () => void; onSuccess: () => void; lang: Lang }) {
  const [tab, setTab] = useState<"login" | "signup">(mode);
  const [nickname, setNickname] = useState(lang === "ko" ? RANDOM_NICKNAMES_KO[0] : RANDOM_NICKNAMES_EN[0]);

  const shuffle = () => {
    const arr = lang === "ko" ? RANDOM_NICKNAMES_KO : RANDOM_NICKNAMES_EN;
    setNickname(arr[Math.floor(Math.random() * arr.length)]);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl">
        <div className="bg-gradient-to-br from-[#1A8090] to-[#0C5C6A] p-7 text-center">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>Journey Connect</h1>
          <p className="text-white/70 text-xs mt-1">{lang === "ko" ? "누군가의 여행이, 당신의 모험이 되다." : "Someone's journey becomes your adventure."}</p>
        </div>
        <div className="p-6">
          <div className="flex bg-secondary rounded-full p-1 mb-5">
            {(["login", "signup"] as const).map(t => (
              <button key={t} onClick={() => setTab(t)}
                className={`flex-1 py-1.5 text-sm font-medium rounded-full transition-all ${tab === t ? "bg-primary text-white" : "text-muted-foreground"}`}>
                {t === "login" ? (lang === "ko" ? "로그인" : "Log in") : (lang === "ko" ? "회원가입" : "Sign up")}
              </button>
            ))}
          </div>

          <div className="space-y-3">
            {tab === "signup" && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{lang === "ko" ? "닉네임" : "Nickname"}</label>
                <div className="flex gap-2">
                  <input value={nickname} onChange={e => setNickname(e.target.value)}
                    className="flex-1 bg-input-background rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:border-primary/40" />
                  <button onClick={shuffle}
                    className="px-3 bg-secondary text-primary rounded-xl border border-primary/20 hover:bg-primary/10 transition-colors flex items-center gap-1 text-xs">
                    <Shuffle size={11} />{lang === "ko" ? "랜덤" : "Random"}
                  </button>
                </div>
              </div>
            )}
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{lang === "ko" ? "이메일" : "Email"}</label>
              <input className="w-full bg-input-background rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:border-primary/40" placeholder="journey@email.com" />
            </div>
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{lang === "ko" ? "비밀번호" : "Password"}</label>
              <input type="password" className="w-full bg-input-background rounded-xl px-3 py-2.5 text-sm border border-border focus:outline-none focus:border-primary/40" placeholder="••••••••" />
            </div>
            <button onClick={onSuccess} className="w-full bg-primary text-white py-2.5 rounded-xl text-sm font-semibold hover:bg-accent transition-colors">
              {tab === "login" ? (lang === "ko" ? "로그인" : "Log in") : (lang === "ko" ? "가입하기" : "Sign up")}
            </button>
          </div>

          <div className="mt-4 pt-4 border-t border-border">
            <p className="text-xs text-center text-muted-foreground mb-3">{lang === "ko" ? "소셜로 계속하기" : "Continue with"}</p>
            <div className="flex gap-2">
              {(lang === "ko" ? ["카카오", "네이버", "구글"] : ["Google", "Apple", "GitHub"]).map(s => (
                <button key={s} className="flex-1 py-2 text-xs rounded-xl border border-border hover:bg-secondary transition-colors">{s}</button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Settings Panel (floating) ────────────────────────────────────────────────
function SettingsPanel({ lang, isDark, onLangToggle, onDarkToggle, onLogout, onClose }: {
  lang: Lang; isDark: boolean; onLangToggle: () => void; onDarkToggle: () => void; onLogout: () => void; onClose: () => void;
}) {
  return (
    <motion.div initial={{ opacity: 0, y: -8, scale: 0.96 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.96 }}
      className="absolute top-12 right-0 z-50 bg-card border border-border rounded-2xl shadow-xl p-4 w-56">
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground flex items-center gap-2"><Languages size={14} className="text-primary" />{lang === "ko" ? "언어" : "Language"}</span>
          <button onClick={onLangToggle}
            className="text-xs font-medium bg-secondary text-primary px-3 py-1 rounded-full border border-primary/20 hover:bg-primary hover:text-white transition-all">
            {lang === "ko" ? "한국어 → EN" : "EN → 한국어"}
          </button>
        </div>
        <div className="flex items-center justify-between">
          <span className="text-sm text-foreground flex items-center gap-2">
            {isDark ? <Moon size={14} className="text-primary" /> : <Sun size={14} className="text-primary" />}
            {lang === "ko" ? "다크 모드" : "Dark mode"}
          </span>
          <button onClick={onDarkToggle}
            className={`w-10 h-5 rounded-full transition-colors relative ${isDark ? "bg-primary" : "bg-border"}`}>
            <span className={`absolute top-0.5 w-4 h-4 bg-white rounded-full shadow transition-all ${isDark ? "left-5" : "left-0.5"}`} />
          </button>
        </div>
        <div className="pt-2 border-t border-border">
          <button onClick={onLogout}
            className="w-full flex items-center gap-2 text-sm text-rose-500 hover:bg-rose-50 px-2 py-1.5 rounded-xl transition-colors">
            <LogOut size={14} />
            {lang === "ko" ? "로그아웃" : "Log out"}
          </button>
        </div>
      </div>
    </motion.div>
  );
}

// ─── App Nav (inner pages) ────────────────────────────────────────────────────
function AppNav({ page, onNav, lang, isDark, onLangToggle, onDarkToggle, onLogout, onProfile, searchQuery, onSearch }: {
  page: Page; onNav: (p: Page) => void; lang: Lang; isDark: boolean;
  onLangToggle: () => void; onDarkToggle: () => void; onLogout: () => void; onProfile: () => void;
  searchQuery: string; onSearch: (q: string) => void;
}) {
  const [settingsOpen, setSettingsOpen] = useState(false);

  const navItems: { id: Page; labelKo: string; labelEn: string }[] = [
    { id: "feed", labelKo: "피드", labelEn: "Feed" },
    { id: "explore", labelKo: "탐색", labelEn: "Explore" },
    { id: "crew", labelKo: "크루", labelEn: "Crew" },
  ];

  return (
    <nav className="sticky top-0 z-40 bg-background/95 backdrop-blur-md border-b border-border">
      <div className="max-w-6xl mx-auto px-6 h-14 flex items-center gap-4">
        {/* Logo */}
        <button onClick={() => onNav("feed")}
          className="text-lg font-bold text-primary flex-shrink-0 tracking-tight"
          style={{ fontFamily: "'DM Serif Display', serif" }}>
          Journey Connect
        </button>

        {/* Nav items */}
        <div className="flex items-center gap-1">
          {navItems.map(item => (
            <button key={item.id} onClick={() => onNav(item.id)}
              className={`px-3 py-1.5 rounded-full text-sm font-medium transition-all ${page === item.id ? "text-primary bg-secondary" : "text-muted-foreground hover:text-foreground hover:bg-secondary/60"}`}>
              {lang === "ko" ? item.labelKo : item.labelEn}
              {item.id === "crew" && <span className="ml-1 text-[10px] bg-rose-50 text-rose-500 px-1 py-0.5 rounded-full">NEW</span>}
            </button>
          ))}
        </div>

        {/* Search */}
        <div className="flex-1 max-w-xs relative hidden sm:block">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input value={searchQuery} onChange={e => onSearch(e.target.value)}
            placeholder={lang === "ko" ? "검색..." : "Search..."}
            className="w-full pl-8 pr-3 py-1.5 bg-input-background rounded-full text-sm border border-border focus:outline-none focus:border-primary/40" />
        </div>

        {/* Right: profile + settings */}
        <div className="flex items-center gap-2 ml-auto">
          <button onClick={onProfile} className="w-8 h-8 rounded-full overflow-hidden border-2 border-primary/20 hover:border-primary transition-colors flex-shrink-0">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=80&h=80&fit=crop" alt="profile" className="w-full h-full object-cover" />
          </button>
          <div className="relative">
            <button onClick={() => setSettingsOpen(!settingsOpen)}
              className="w-8 h-8 rounded-full flex items-center justify-center text-muted-foreground hover:bg-secondary hover:text-foreground transition-colors">
              <Settings size={16} />
            </button>
            <AnimatePresence>
              {settingsOpen && (
                <SettingsPanel lang={lang} isDark={isDark} onLangToggle={onLangToggle} onDarkToggle={onDarkToggle} onLogout={onLogout} onClose={() => setSettingsOpen(false)} />
              )}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </nav>
  );
}

// ─── My Page ──────────────────────────────────────────────────────────────────
function MyPage({ onBack, lang }: { onBack: () => void; lang: Lang }) {
  const tabs = lang === "ko"
    ? ["내가 쓴 글", "좋아요한 곳", "저장한 곳", "크루 활동"]
    : ["My Journeys", "Liked Places", "Saved", "Crew Activity"];
  const [activeTab, setActiveTab] = useState(0);

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <button onClick={onBack} className="flex items-center gap-2 text-muted-foreground hover:text-primary text-sm mb-6 transition-colors">
        <ArrowLeft size={15} />{lang === "ko" ? "돌아가기" : "Back"}
      </button>

      {/* Profile card */}
      <div className="bg-card border border-border rounded-3xl p-6 mb-6">
        <div className="flex items-start gap-4">
          <div className="relative">
            <img src="https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=120&h=120&fit=crop" alt="me"
              className="w-20 h-20 rounded-full object-cover border-3 border-primary/20" />
            <button className="absolute bottom-0 right-0 w-6 h-6 bg-primary text-white rounded-full flex items-center justify-center shadow-sm">
              <Edit size={10} />
            </button>
          </div>
          <div className="flex-1">
            <h2 className="text-lg font-bold text-foreground">미련한 토끼</h2>
            <p className="text-sm text-muted-foreground mb-3">journey@email.com</p>
            <div className="flex gap-4 text-sm">
              {[["12", lang === "ko" ? "게시글" : "Posts"], ["284", lang === "ko" ? "좋아요" : "Likes"], ["47", lang === "ko" ? "댓글" : "Comments"]].map(([n, l]) => (
                <div key={l} className="text-center">
                  <div className="font-bold text-foreground">{n}</div>
                  <div className="text-xs text-muted-foreground">{l}</div>
                </div>
              ))}
            </div>
          </div>
          <button className="text-xs border border-border px-3 py-1.5 rounded-full hover:bg-secondary transition-colors text-muted-foreground">
            {lang === "ko" ? "프로필 편집" : "Edit Profile"}
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 mb-5 bg-secondary rounded-2xl p-1">
        {tabs.map((t, i) => (
          <button key={t} onClick={() => setActiveTab(i)}
            className={`flex-1 py-2 text-xs font-medium rounded-xl transition-all ${activeTab === i ? "bg-card text-primary shadow-sm" : "text-muted-foreground"}`}>
            {t}
          </button>
        ))}
      </div>

      {/* Placeholder content */}
      <div className="grid grid-cols-2 gap-3">
        {POSTS.slice(0, 4).map(p => (
          <div key={p.id} className="bg-card border border-border rounded-2xl overflow-hidden">
            <img src={p.image} alt={p.title} className="w-full h-32 object-cover" />
            <div className="p-3">
              <p className="text-xs font-medium text-foreground line-clamp-2">{p.title}</p>
              <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                <span className="flex items-center gap-0.5"><Heart size={10} />{p.likes}</span>
                <span className="flex items-center gap-0.5"><MessageCircle size={10} />{p.comments}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Landing Page ─────────────────────────────────────────────────────────────
function LandingPage({ lang, onLogin, onSignup }: { lang: Lang; onLogin: () => void; onSignup: () => void }) {
  const [search, setSearch] = useState("");

  return (
    <div className="relative w-full h-screen overflow-hidden">
      {/* Full bleed background */}
      <img
        src="https://images.unsplash.com/photo-1487253031786-9989fcd7bb73?w=1920&h=1080&fit=crop&auto=format"
        alt="Airplane window with blue sky and clouds"
        className="absolute inset-0 w-full h-full object-cover"
      />

      {/* Left gradient overlay — fades from dark to transparent rightward */}
      <div className="absolute inset-0 bg-gradient-to-r from-black/80 via-black/50 to-transparent" />
      <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-transparent" />

      {/* Content — left aligned */}
      <div className="relative z-10 h-full flex flex-col px-10 md:px-16 lg:px-24 py-10 max-w-xl">
        {/* Logo */}
        <div className="flex items-baseline gap-3 mb-auto">
          <h1 className="text-2xl font-bold text-white" style={{ fontFamily: "'DM Serif Display', serif" }}>
            Journey Connect
          </h1>
          <span className="text-white/50 text-sm">|</span>
          <span className="text-white/60 text-sm">JC</span>
        </div>

        {/* Hero copy */}
        <div className="mb-10">
          <motion.p
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-white/60 text-sm uppercase tracking-widest mb-3 font-medium"
          >
            {lang === "ko" ? "여행정보는 Journey Connect에서" : "All your travel info, on Journey Connect"}
          </motion.p>
          <motion.h2
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-3xl md:text-5xl font-bold text-white leading-tight mb-4"
            style={{ fontFamily: "'DM Serif Display', serif" }}
          >
            {lang === "ko" ? <>누군가의 여행이,<br /><em className="not-italic text-[#7ECFDA]">당신의 모험</em>이 되다.</> : <>Someone{"'"}s journey<br />becomes <em className="not-italic text-[#7ECFDA]">your adventure.</em></>}
          </motion.h2>
          <motion.p
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-white/60 text-sm leading-relaxed"
          >
            {lang === "ko" ? "지역별 여행정보를 한눈에 — 진짜 여행자들의 실전 정보" : "Real travel info by region — from travelers who've actually been there"}
          </motion.p>
        </div>

        {/* Search */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="mb-4">
          <div className="relative">
            <Search size={16} className="absolute left-4 top-1/2 -translate-y-1/2 text-white/50" />
            <input
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={lang === "ko" ? "지역을 검색해보세요 (예: 도쿄, 제주)" : "Search a region (e.g. Tokyo, Jeju)"}
              className="w-full pl-11 pr-4 py-3.5 bg-white/10 backdrop-blur-md rounded-2xl text-white placeholder:text-white/40 border border-white/20 focus:outline-none focus:border-white/50 transition-colors text-sm"
              onKeyDown={e => { if (e.key === "Enter") onLogin(); }}
            />
          </div>
          <p className="text-white/40 text-xs mt-2 pl-1">{lang === "ko" ? "검색하려면 먼저 로그인해 주세요." : "Please log in to search."}</p>
        </motion.div>

        {/* Auth buttons */}
        <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="flex gap-3 mb-12">
          <button
            onClick={onLogin}
            className="flex-1 py-3 bg-primary text-white font-semibold rounded-2xl hover:bg-accent transition-colors text-sm shadow-lg"
          >
            {lang === "ko" ? "로그인" : "Log in"}
          </button>
          <button
            onClick={onSignup}
            className="flex-1 py-3 bg-white/15 backdrop-blur-md text-white font-semibold rounded-2xl hover:bg-white/25 transition-colors border border-white/20 text-sm"
          >
            {lang === "ko" ? "회원가입" : "Sign up"}
          </button>
        </motion.div>

        {/* Stats */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
          className="flex gap-6 text-white/50 text-xs">
          {[["🌏", "10", lang === "ko" ? "지역" : "Regions"], ["✍️", "4,820", lang === "ko" ? "게시글" : "Posts"], ["✈️", "9,300", lang === "ko" ? "여행자" : "Travelers"]].map(([icon, n, l]) => (
            <span key={l} className="flex items-center gap-1"><span>{icon}</span><strong className="text-white/80">{n}</strong> {l}</span>
          ))}
        </motion.div>
      </div>

      {/* Language toggle — top right */}
      <button
        className="absolute top-8 right-8 z-20 flex items-center gap-1.5 text-white/60 hover:text-white text-xs border border-white/20 px-3 py-1.5 rounded-full backdrop-blur-sm transition-colors"
      >
        <Languages size={12} />{lang === "ko" ? "EN" : "한국어"}
      </button>
    </div>
  );
}

// ─── Region Picker Modal ──────────────────────────────────────────────────────
function RegionPicker({ lang, onSelect, onClose }: { lang: Lang; onSelect: (r: Region) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const filtered = REGIONS.filter(r => r.label.ko.includes(q) || r.label.en.toLowerCase().includes(q.toLowerCase()));

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4"
      onClick={onClose}>
      <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.95 }}
        onClick={e => e.stopPropagation()}
        className="bg-card w-full max-w-sm rounded-3xl overflow-hidden shadow-2xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold text-foreground">{lang === "ko" ? "지역 선택" : "Select Region"}</h3>
          <button onClick={onClose} className="w-7 h-7 rounded-full hover:bg-secondary flex items-center justify-center"><X size={14} /></button>
        </div>
        <div className="relative mb-4">
          <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
          <input autoFocus value={q} onChange={e => setQ(e.target.value)}
            placeholder={lang === "ko" ? "지역 검색..." : "Search region..."}
            className="w-full pl-8 pr-3 py-2 bg-input-background rounded-xl text-sm border border-border focus:outline-none focus:border-primary/40" />
        </div>
        <div className="space-y-1 max-h-72 overflow-y-auto">
          {filtered.map(r => {
            const Icon = r.icon;
            return (
              <button key={r.id} onClick={() => { onSelect(r); onClose(); }}
                className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-secondary transition-colors text-left">
                <span className="text-xl">{r.country}</span>
                <div>
                  <div className="text-sm font-medium text-foreground">{r.label[lang]}</div>
                  <div className="text-xs text-muted-foreground flex items-center gap-1">
                    {r.weather.icon} {r.weather.temp}°C · {lang === "ko" ? r.weather.conditionKo : r.weather.conditionEn}
                  </div>
                </div>
              </button>
            );
          })}
        </div>
      </motion.div>
    </motion.div>
  );
}

// ─── Main App ─────────────────────────────────────────────────────────────────
export default function App() {
  const [lang, setLang] = useState<Lang>("ko");
  const [isDark, setIsDark] = useState(false);
  const [page, setPage] = useState<Page>("landing");
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const [authMode, setAuthMode] = useState<"login" | "signup" | null>(null);
  const [selectedRegion, setSelectedRegion] = useState<Region>(REGIONS[0]);
  const [regionPickerOpen, setRegionPickerOpen] = useState(false);
  const [selectedPost, setSelectedPost] = useState<Post | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [crewJoined, setCrewJoined] = useState<number[]>([]);

  const handleLogin = () => {
    setIsLoggedIn(true);
    setAuthMode(null);
    if (page === "landing") setPage("feed");
  };

  const handleLogout = () => {
    setIsLoggedIn(false);
    setPage("landing");
  };

  const filteredPosts = POSTS.filter(p => {
    const q = searchQuery.toLowerCase();
    return !q || p.title.includes(q) || p.region.includes(q) || p.tags.some(t => t.includes(q));
  });

  const navPage = (p: Page) => {
    if (!isLoggedIn && p !== "landing") { setAuthMode("login"); return; }
    setPage(p);
  };

  return (
    <div className={isDark ? "dark" : ""}>
      <div className="min-h-screen bg-background" style={{ fontFamily: "'Noto Sans KR', sans-serif" }}>

        {/* ── Landing ── */}
        {page === "landing" && (
          <LandingPage
            lang={lang}
            onLogin={() => setAuthMode("login")}
            onSignup={() => setAuthMode("signup")}
          />
        )}

        {/* ── Inner pages ── */}
        {page !== "landing" && (
          <>
            <AppNav
              page={page} onNav={navPage} lang={lang} isDark={isDark}
              onLangToggle={() => setLang(l => l === "ko" ? "en" : "ko")}
              onDarkToggle={() => setIsDark(d => !d)}
              onLogout={handleLogout}
              onProfile={() => setPage("mypage")}
              searchQuery={searchQuery} onSearch={setSearchQuery}
            />

            {/* My Page */}
            {page === "mypage" && (
              <MyPage onBack={() => setPage("feed")} lang={lang} />
            )}

            {/* Feed */}
            {page === "feed" && (
              <div>
                <RegionHeader region={selectedRegion} lang={lang} onChangeRegion={() => setRegionPickerOpen(true)} />
                <StoriesRow lang={lang} />
                <div className="max-w-2xl mx-auto px-4 py-6 space-y-6">
                  {filteredPosts.map(p => <FeedCard key={p.id} post={p} lang={lang} />)}
                  <div className="text-center py-8 text-muted-foreground text-sm">
                    {lang === "ko" ? "모든 게시물을 불러왔습니다 ✈️" : "You're all caught up ✈️"}
                  </div>
                </div>
              </div>
            )}

            {/* Explore */}
            {page === "explore" && (
              <div>
                <RegionHeader region={selectedRegion} lang={lang} onChangeRegion={() => setRegionPickerOpen(true)} />
                <div className="max-w-5xl mx-auto px-6 py-6">
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                    {filteredPosts.map(p => <ExploreCard key={p.id} post={p} onOpen={setSelectedPost} />)}
                  </div>
                  <div className="text-center py-10 text-muted-foreground text-sm">
                    {lang === "ko" ? "더 많은 여정을 불러오는 중..." : "Loading more journeys..."}
                  </div>
                </div>
              </div>
            )}

            {/* Crew */}
            {page === "crew" && (
              <div className="max-w-5xl mx-auto px-6 py-8">
                <div className="flex items-end justify-between mb-6">
                  <div>
                    <h2 className="text-xl font-bold text-foreground">{lang === "ko" ? "크루 · 소모임" : "Crew · Meetup"}</h2>
                    <p className="text-sm text-muted-foreground mt-0.5">{lang === "ko" ? "같은 여정을 꿈꾸는 사람들과 함께하세요" : "Travel with people who share your journey"}</p>
                  </div>
                  <button className="flex items-center gap-1.5 bg-primary text-white text-sm font-medium px-4 py-2 rounded-full hover:bg-accent transition-colors">
                    <Plus size={14} />{lang === "ko" ? "크루 만들기" : "Create Crew"}
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
                  {CREWS.map(c => {
                    const pct = Math.round((c.members / c.maxMembers) * 100);
                    const joined = crewJoined.includes(c.id);
                    return (
                      <div key={c.id} className="bg-card rounded-2xl border border-border overflow-hidden shadow-sm hover:shadow-md transition-shadow">
                        <div className="relative h-36 overflow-hidden">
                          <img src={c.image} alt={c.title} className="w-full h-full object-cover" />
                          <div className="absolute inset-0 bg-gradient-to-t from-black/50 to-transparent" />
                          <span className="absolute bottom-2 left-3 text-white text-xs font-medium bg-black/40 backdrop-blur-sm px-2 py-0.5 rounded-full">
                            {c.country} {c.region}
                          </span>
                        </div>
                        <div className="p-4">
                          <p className="text-sm font-semibold text-foreground mb-2 line-clamp-2">{lang === "ko" ? c.title : c.titleEn}</p>
                          <div className="flex flex-wrap gap-1 mb-3">
                            {c.tags.map(t => <span key={t} className="text-xs text-primary bg-secondary px-2 py-0.5 rounded-full">#{t}</span>)}
                          </div>
                          <div className="mb-3">
                            <div className="flex justify-between text-xs text-muted-foreground mb-1">
                              <span className="flex items-center gap-1"><Users size={10} />{c.members}/{c.maxMembers} {lang === "ko" ? "명" : "members"}</span>
                              <span>{c.date}</span>
                            </div>
                            <div className="h-1.5 bg-secondary rounded-full overflow-hidden">
                              <div className="h-full bg-primary rounded-full" style={{ width: `${pct}%` }} />
                            </div>
                          </div>
                          <button
                            onClick={() => setCrewJoined(prev => prev.includes(c.id) ? prev.filter(x => x !== c.id) : [...prev, c.id])}
                            className={`w-full py-2 rounded-xl text-sm font-medium transition-all ${joined ? "bg-secondary text-primary border border-primary/20" : "bg-primary text-white hover:bg-accent"}`}>
                            {joined ? (lang === "ko" ? "✓ 참여중" : "✓ Joined") : (lang === "ko" ? "참여하기" : "Join")}
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
          </>
        )}

        {/* ── Modals ── */}
        <AnimatePresence>
          {authMode && (
            <AuthModal
              mode={authMode} lang={lang}
              onClose={() => setAuthMode(null)}
              onSuccess={handleLogin}
            />
          )}
          {regionPickerOpen && (
            <RegionPicker lang={lang} onSelect={setSelectedRegion} onClose={() => setRegionPickerOpen(false)} />
          )}
          {selectedPost && (
            <PostDetailModal post={selectedPost} lang={lang} onClose={() => setSelectedPost(null)} />
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
