import { Bot, ExternalLink, MapPin, Send, Sparkles, X } from "lucide-react";
import { useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router";
import useTranslation from "../i18n/useTranslation";
import { getApiErrorMessage } from "../services/apiClient";
import { chatWithJourneyAi } from "../services/journeyAiApi";
import useRegionStore from "../store/useRegionStore";

const COPY = {
  ko: {
    title: "Journey AI",
    subtitle: "Journey Connect 여행 기록을 바탕으로 도와드릴게요.",
    welcome: "무엇을 도와드릴까요?",
    currentPost: "현재 여행에 대해 물어보세요",
    placeholder: "여행 질문을 입력하세요",
    send: "보내기",
    thinking: "Journey Connect 기록을 찾고 있어요...",
    error: "Journey AI가 잠시 응답하지 못하고 있습니다. 잠시 후 다시 시도해주세요.",
    related: "관련 Journey Connect 게시물",
    places: "추천 장소 순서",
    grounded: "개의 Journey Connect 게시물을 참고했습니다.",
    prompts: ["서울 하루 코스 추천해줘", "조용한 로컬 여행 찾아줘", "사진 찍기 좋은 여행 추천", "혼자 걷기 좋은 서울 코스"],
    currentPostPrompts: [
      "\uC774 \uAC8C\uC2DC\uBB3C \uC5EC\uD589 \uB3D9\uC120 \uC815\uB9AC\uD574\uC918",
      "\uC774 \uAC8C\uC2DC\uBB3C\uACFC \uBE44\uC2B7\uD55C \uC5EC\uD589 \uCD94\uCC9C\uD574\uC918",
      "\uC774 \uC7A5\uC18C\uB4E4\uC744 \uC5B4\uB5A4 \uC21C\uC11C\uB85C \uAC00\uBA74 \uC88B\uC544?",
      "\uC774 \uC5EC\uD589\uC5D0\uC11C \uB193\uCE58\uBA74 \uC544\uC26C\uC6B4 \uD3EC\uC778\uD2B8 \uC54C\uB824\uC918",
    ],
  },
  en: {
    title: "Journey AI",
    subtitle: "I can help using travel stories from Journey Connect.",
    welcome: "How can I help with your trip?",
    currentPost: "Ask about the trip you're viewing",
    placeholder: "Ask a travel question",
    send: "Send",
    thinking: "Searching Journey Connect travel stories...",
    error: "Journey AI is temporarily unavailable. Please try again shortly.",
    related: "Related Journey Connect posts",
    places: "Suggested place order",
    grounded: " Journey Connect posts were used as context.",
    prompts: ["Plan a one-day trip in Seoul", "Find a quiet local experience", "Recommend a photo-friendly trip", "Find a walking route in Seoul"],
    currentPostPrompts: [
      "Summarize the route in this post",
      "Recommend trips similar to this post",
      "What is the best order for these places?",
      "What should I not miss from this trip?",
    ],
  },
};

const currentPostIdFromPath = (pathname) => {
  const match = pathname.match(/^\/post\/(\d+)$/);
  return match ? Number(match[1]) : null;
};

function JourneyAiPanel() {
  const location = useLocation();
  const navigate = useNavigate();
  const { currentLang } = useTranslation();
  const { selectedRegion } = useRegionStore();
  const copy = COPY[currentLang === "ko" ? "ko" : "en"];
  const currentPostId = currentPostIdFromPath(location.pathname);
  const prompts = currentPostId ? copy.currentPostPrompts : copy.prompts;
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const inputRef = useRef(null);

  const boundedHistory = useMemo(
    () => messages
      .filter((message) => message.role === "user" || message.role === "assistant")
      .map((message) => ({ role: message.role, content: message.content }))
      .slice(-6),
    [messages],
  );

  const submit = async (rawMessage) => {
    const message = String(rawMessage || "").trim();
    if (!message || loading) return;

    const history = boundedHistory;
    setMessages((value) => [...value, { role: "user", content: message }]);
    setInput("");
    setError("");
    setLoading(true);
    try {
      const response = await chatWithJourneyAi({
        message,
        currentPostId,
        region: selectedRegion?.code || null,
        history,
      });
      setMessages((value) => [...value, {
        role: "assistant",
        content: response.answer,
        suggestedPosts: response.suggestedPosts || [],
        places: response.places || [],
        groundedPostCount: response.groundedPostCount || 0,
      }]);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, copy.error));
    } finally {
      setLoading(false);
      requestAnimationFrame(() => inputRef.current?.focus());
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-5 z-[70] inline-flex items-center gap-2 rounded-full bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-3 text-sm font-bold text-white shadow-[0_16px_40px_-12px_rgba(13,148,136,0.75)] transition hover:-translate-y-0.5 hover:shadow-xl sm:right-8"
        aria-label={copy.title}
      >
        <Sparkles size={18} />
        {copy.title}
      </button>

      {open && (
        <div className="fixed inset-0 z-[80] bg-slate-950/20 backdrop-blur-[1px] sm:bg-transparent sm:backdrop-blur-none">
          <section className="absolute inset-y-0 right-0 flex w-full flex-col border-l border-slate-200 bg-white shadow-2xl dark:border-slate-800 dark:bg-slate-950 sm:w-[430px]">
            <header className="border-b border-slate-200 px-5 py-4 dark:border-slate-800">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <div className="flex items-center gap-2 text-lg font-extrabold text-title">
                    <Sparkles size={19} className="text-teal-500" />
                    {copy.title}
                  </div>
                  <p className="mt-1 text-xs leading-5 text-slate-500 dark:text-slate-400">{copy.subtitle}</p>
                </div>
                <button type="button" onClick={() => setOpen(false)} className="rounded-full p-2 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-900" aria-label="Close Journey AI">
                  <X size={20} />
                </button>
              </div>
              {currentPostId && (
                <div className="mt-3 rounded-2xl border border-teal-100 bg-teal-50 px-3 py-2 text-xs font-semibold text-teal-800 dark:border-teal-900/60 dark:bg-teal-950/40 dark:text-teal-200">
                  {copy.currentPost}
                </div>
              )}
            </header>

            <div className="flex-1 space-y-4 overflow-y-auto px-4 py-5">
              {messages.length === 0 && (
                <div className="py-8 text-center">
                  <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-teal-50 text-teal-600 dark:bg-teal-950/50 dark:text-teal-300">
                    <Bot size={24} />
                  </div>
                  <p className="mt-4 font-bold text-title">{copy.welcome}</p>
                  <div className="mt-5 flex flex-wrap justify-center gap-2">
                    {prompts.map((prompt) => (
                      <button key={prompt} type="button" onClick={() => submit(prompt)} className="rounded-full border border-slate-200 bg-white px-3 py-2 text-xs font-semibold text-slate-700 transition hover:border-teal-300 hover:text-teal-700 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-200">
                        {prompt}
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {messages.map((message, index) => (
                <div key={`${message.role}-${index}`} className={message.role === "user" ? "flex justify-end" : "block"}>
                  <div className={message.role === "user"
                    ? "max-w-[84%] rounded-2xl rounded-br-md bg-teal-600 px-4 py-3 text-sm leading-6 text-white"
                    : "rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm leading-6 text-slate-800 dark:bg-slate-900 dark:text-slate-100"}>
                    <p className="whitespace-pre-wrap">{message.content}</p>
                  </div>

                  {message.role === "assistant" && message.groundedPostCount > 0 && (
                    <p className="mt-2 px-1 text-[11px] text-slate-400">
                      {currentLang === "ko" ? `${message.groundedPostCount}${copy.grounded}` : `${message.groundedPostCount}${copy.grounded}`}
                    </p>
                  )}

                  {message.role === "assistant" && message.suggestedPosts?.length > 0 && (
                    <div className="mt-3 space-y-2">
                      <p className="px-1 text-xs font-bold text-slate-500">{copy.related}</p>
                      {message.suggestedPosts.map((post) => (
                        <button key={post.id} type="button" onClick={() => navigate(`/post/${post.id}`)} className="flex w-full gap-3 rounded-2xl border border-slate-200 bg-white p-3 text-left transition hover:border-teal-300 hover:shadow-sm dark:border-slate-800 dark:bg-slate-900">
                          {post.coverImageUrl ? <img src={post.coverImageUrl} alt="" className="h-16 w-16 shrink-0 rounded-xl object-cover" /> : <div className="h-16 w-16 shrink-0 rounded-xl bg-slate-100 dark:bg-slate-800" />}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-bold text-title">{post.title}</p>
                            <p className="mt-1 truncate text-xs text-slate-500">{post.regionName}</p>
                            <p className="mt-1 line-clamp-2 text-xs text-slate-500">{post.reason}</p>
                          </div>
                          <ExternalLink size={15} className="mt-1 shrink-0 text-slate-400" />
                        </button>
                      ))}
                    </div>
                  )}

                  {message.role === "assistant" && message.places?.length > 0 && (
                    <div className="mt-3 rounded-2xl border border-slate-200 bg-white p-3 dark:border-slate-800 dark:bg-slate-900">
                      <p className="mb-2 text-xs font-bold text-slate-500">{copy.places}</p>
                      <ol className="space-y-2">
                        {message.places.map((place) => (
                          <li key={`${place.sourcePostId}-${place.order}-${place.name}`} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-200">
                            <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-teal-50 text-[11px] font-bold text-teal-700 dark:bg-teal-950">{place.order}</span>
                            <MapPin size={15} className="mt-0.5 shrink-0 text-teal-500" />
                            <span>{place.name}</span>
                          </li>
                        ))}
                      </ol>
                    </div>
                  )}
                </div>
              ))}

              {loading && (
                <div className="rounded-2xl rounded-bl-md bg-slate-100 px-4 py-3 text-sm text-slate-500 dark:bg-slate-900 dark:text-slate-400">
                  {copy.thinking}
                </div>
              )}
              {error && <div className="rounded-2xl bg-rose-50 px-4 py-3 text-sm text-rose-700 dark:bg-rose-950/30 dark:text-rose-300">{error}</div>}
            </div>

            <form className="border-t border-slate-200 p-4 dark:border-slate-800" onSubmit={(event) => { event.preventDefault(); submit(input); }}>
              <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-slate-50 p-2 focus-within:border-teal-400 dark:border-slate-800 dark:bg-slate-900">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value.slice(0, 2000))}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      submit(input);
                    }
                  }}
                  placeholder={copy.placeholder}
                  rows={1}
                  className="max-h-28 min-h-10 flex-1 resize-none bg-transparent px-2 py-2 text-sm text-title outline-none placeholder:text-slate-400"
                />
                <button type="submit" disabled={loading || !input.trim()} className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-600 text-white transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-40" aria-label={copy.send}>
                  <Send size={17} />
                </button>
              </div>
            </form>
          </section>
        </div>
      )}
    </>
  );
}

export default JourneyAiPanel;
