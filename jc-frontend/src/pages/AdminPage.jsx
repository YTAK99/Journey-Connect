import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import {
  BarChart3,
  BookOpen,
  ChevronLeft,
  ChevronRight,
  Eye,
  Heart,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  Trash2,
  Users,
  X,
} from "lucide-react";
import apiClient, { getApiErrorMessage, unwrapApiResponse } from "../services/apiClient";
import { getUser, isLogin, logout } from "../services/auth";
import { createPost, deletePost, getFeedItems, getPost, updatePost } from "../services/postApi";

// 서버 페이지네이션과 별개로 관리자 표에서 한 번에 보여줄 행 수입니다.
const PAGE_SIZE = 10;
const EMPTY_FORM = { title: "", content: "", regionName: "", coverImageUrl: "" };

// 백엔드 ISO 날짜를 운영 화면에서 읽기 쉬운 한국어 날짜로 변환합니다.
function formatDate(value) {
  if (!value) return "-";
  return new Intl.DateTimeFormat("ko-KR", { dateStyle: "medium" }).format(new Date(value));
}

function AdminPage() {
  // 별도 관리자 API가 아직 없으므로 현재 로그인 사용자의 게시물을 관리 콘솔 형태로 제공합니다.
  // 실제 운영 배포 전에는 백엔드에 관리자 역할 검사와 전체 게시물용 API를 추가해야 합니다.
  const navigate = useNavigate();
  const user = getUser();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [query, setQuery] = useState("");
  const [page, setPage] = useState(1);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(EMPTY_FORM);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState(null);

  // 통계와 표가 같은 원본을 사용하도록 내 게시물을 한 번에 조회해 posts 상태에 보관합니다.
  const loadPosts = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await apiClient.get("/users/me/posts", { params: { size: 100 } });
      setPosts(getFeedItems(unwrapApiResponse(response)));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "게시글을 불러오지 못했습니다."));
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // 관리 화면은 로그인 사용자만 진입시키고, 로그인 후 돌아올 경로도 함께 전달합니다.
    if (!isLogin()) {
      navigate("/login", { replace: true, state: { from: "/admin" } });
      return;
    }
    const loadTimer = window.setTimeout(loadPosts, 0);
    return () => window.clearTimeout(loadTimer);
  }, [loadPosts, navigate]);

  const filteredPosts = useMemo(() => {
    // 서버에서 받은 현재 목록에 검색과 공개 상태 조건을 적용한 뒤 클라이언트 단위로 페이지를 나눕니다.
    const keyword = query.trim().toLowerCase();
    if (!keyword) return posts;
    return posts.filter((post) =>
      [post.title, post.regionName, post.author?.nickname]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(keyword)),
    );
  }, [posts, query]);

  const pageCount = Math.max(1, Math.ceil(filteredPosts.length / PAGE_SIZE));
  // 검색 결과에서 현재 페이지 범위만 잘라 표에 전달합니다.
  const visiblePosts = filteredPosts.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);
  // 상단 요약 카드는 현재 불러온 전체 게시물의 집계값을 사용합니다.
  const totalViews = posts.reduce((sum, post) => sum + (post.viewCount || 0), 0);
  const totalLikes = posts.reduce((sum, post) => sum + (post.likeCount || 0), 0);

  const openCreate = () => {
    // 수정 중이던 id와 입력값을 비워 같은 모달을 생성 모드로 재사용합니다.
    setEditingId(null);
    setForm(EMPTY_FORM);
    setEditorOpen(true);
  };

  const openEdit = async (postId) => {
    // 목록 응답에 없는 본문·이미지까지 채우기 위해 상세 API를 다시 조회합니다.
    setError("");
    try {
      const post = await getPost(postId);
      setEditingId(postId);
      setForm({
        title: post.title || "",
        content: post.content || "",
        regionName: post.regionName || post.region?.displayName || "",
        coverImageUrl: post.coverImageUrl || "",
      });
      setEditorOpen(true);
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "게시글 정보를 불러오지 못했습니다."));
    }
  };

  const closeEditor = () => {
    if (saving) return;
    setEditorOpen(false);
    setEditingId(null);
    setForm(EMPTY_FORM);
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    if (!form.title.trim() || !form.content.trim()) return;

    const imageUrl = form.coverImageUrl.trim();
    // 일반 작성 화면과 동일한 DTO 형태로 맞춰 기존 게시물 API를 그대로 사용합니다.
    const payload = {
      title: form.title.trim(),
      content: form.content.trim(),
      regionCode: null,
      regionName: form.regionName.trim() || null,
      coverImageUrl: imageUrl || null,
      images: imageUrl ? [{ imageUrl, altText: form.title.trim() }] : [],
    };

    setSaving(true);
    setError("");
    try {
      if (editingId) await updatePost(editingId, payload);
      else await createPost(payload);
      setSaving(false);
      closeEditor();
      await loadPosts();
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "게시글 저장에 실패했습니다."));
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (post) => {
    // 복구할 수 없는 작업이므로 확인 후 삭제하고, 성공한 행만 화면 상태에서 즉시 제거합니다.
    if (!window.confirm(`“${post.title}” 게시글을 삭제할까요?\n삭제한 글은 복구할 수 없습니다.`)) return;
    setDeletingId(post.id);
    setError("");
    try {
      await deletePost(post.id);
      setPosts((current) => current.filter((item) => item.id !== post.id));
    } catch (requestError) {
      setError(getApiErrorMessage(requestError, "게시글 삭제에 실패했습니다."));
    } finally {
      setDeletingId(null);
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate("/login", { replace: true });
  };

  const updateForm = (field) => (event) => setForm((current) => ({ ...current, [field]: event.target.value }));

  return (
    <div className="min-h-screen bg-slate-50 text-slate-800">
      {/* 모바일에서는 사이드바 바깥 영역을 눌러 메뉴를 닫을 수 있는 배경을 표시합니다. */}
      {sidebarOpen && <button aria-label="메뉴 닫기" className="fixed inset-0 z-30 bg-slate-950/40 lg:hidden" onClick={() => setSidebarOpen(false)} />}

      {/* 데스크톱 고정 메뉴이자 모바일 슬라이드 메뉴인 관리자 전용 내비게이션입니다. */}
      <aside className={`fixed inset-y-0 left-0 z-40 flex w-64 flex-col bg-[#172033] text-slate-300 shadow-xl transition-transform lg:translate-x-0 ${sidebarOpen ? "translate-x-0" : "-translate-x-full"}`}>
        <div className="flex h-20 items-center gap-3 border-b border-white/10 px-6">
          <div className="grid h-10 w-10 place-items-center rounded-xl bg-teal-500 font-black text-white">JC</div>
          <div><p className="font-bold text-white">Journey Connect</p><p className="text-xs text-slate-400">Content Console</p></div>
          <button className="ml-auto lg:hidden" onClick={() => setSidebarOpen(false)}><X size={20} /></button>
        </div>
        <nav className="flex-1 space-y-2 px-4 py-6">
          <p className="px-3 pb-2 text-xs font-semibold uppercase tracking-widest text-slate-500">Management</p>
          <button className="flex w-full items-center gap-3 rounded-lg bg-teal-500/15 px-3 py-3 text-left font-semibold text-teal-300"><LayoutDashboard size={19} /> 대시보드</button>
          <button className="flex w-full items-center gap-3 rounded-lg px-3 py-3 text-left text-white"><BookOpen size={19} /> 게시글 관리</button>
          <button disabled className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-3 text-left opacity-40"><Users size={19} /> 회원 관리 <span className="ml-auto text-[10px]">준비 중</span></button>
          <button disabled className="flex w-full cursor-not-allowed items-center gap-3 rounded-lg px-3 py-3 text-left opacity-40"><BarChart3 size={19} /> 통계 <span className="ml-auto text-[10px]">준비 중</span></button>
        </nav>
        <div className="border-t border-white/10 p-4">
          <button onClick={() => navigate("/feed")} className="mb-2 w-full rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5">← 서비스로 돌아가기</button>
          <button onClick={handleLogout} className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-left text-sm hover:bg-white/5"><LogOut size={17} /> 로그아웃</button>
        </div>
      </aside>

      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-20 items-center border-b border-slate-200 bg-white/95 px-4 backdrop-blur sm:px-8">
          <button className="mr-3 rounded-lg p-2 hover:bg-slate-100 lg:hidden" onClick={() => setSidebarOpen(true)}><Menu size={22} /></button>
          <div><h1 className="text-lg font-bold text-slate-900">콘텐츠 관리</h1><p className="hidden text-xs text-slate-500 sm:block">게시글을 한 곳에서 작성하고 관리하세요.</p></div>
          <div className="ml-auto flex items-center gap-3">
            <div className="hidden text-right sm:block"><p className="text-sm font-semibold text-slate-800">{user?.nickname || "관리자"}</p><p className="text-xs text-slate-500">{user?.email || "운영 계정"}</p></div>
            <div className="grid h-10 w-10 place-items-center rounded-full bg-teal-100 font-bold text-teal-700">{(user?.nickname || "관").slice(0, 1)}</div>
          </div>
        </header>

        <main className="mx-auto max-w-7xl p-4 sm:p-8">
          {/* 현재 로딩된 게시물로 계산한 운영 현황 요약입니다. */}
          <section className="mb-7 grid gap-4 sm:grid-cols-3">
            {[
              { label: "전체 게시글", value: posts.length, icon: BookOpen, color: "bg-blue-50 text-blue-600" },
              { label: "누적 조회", value: totalViews.toLocaleString(), icon: Eye, color: "bg-amber-50 text-amber-600" },
              { label: "누적 좋아요", value: totalLikes.toLocaleString(), icon: Heart, color: "bg-rose-50 text-rose-600" },
            ].map(({ label, value, icon: Icon, color }) => (
              <div key={label} className="flex items-center rounded-xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className={`grid h-12 w-12 place-items-center rounded-xl ${color}`}><Icon size={23} /></div>
                <div className="ml-4"><p className="text-sm text-slate-500">{label}</p><p className="mt-1 text-2xl font-bold text-slate-900">{value}</p></div>
              </div>
            ))}
          </section>

          {error && <div role="alert" className="mb-5 flex items-center justify-between rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><span>{error}</span><button onClick={() => setError("")}><X size={17} /></button></div>}

          {/* 검색·새로고침·CRUD 작업과 클라이언트 페이지네이션을 제공하는 게시물 관리 표입니다. */}
          <section className="overflow-hidden rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="flex flex-col gap-4 border-b border-slate-200 p-5 sm:flex-row sm:items-center">
              <div><h2 className="text-lg font-bold text-slate-900">게시글 목록</h2><p className="text-sm text-slate-500">내가 작성한 게시글 {filteredPosts.length}개</p></div>
              <div className="flex flex-1 flex-col gap-3 sm:flex-row sm:justify-end">
                <label className="relative block sm:w-72"><span className="sr-only">게시글 검색</span><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input value={query} onChange={(event) => { setQuery(event.target.value); setPage(1); }} placeholder="제목, 지역 검색" className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label>
                <button onClick={loadPosts} aria-label="새로고침" className="rounded-lg border border-slate-300 p-2 text-slate-600 hover:bg-slate-50"><RefreshCw size={19} /></button>
                <button onClick={openCreate} className="inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"><Plus size={18} /> 새 게시글</button>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full min-w-[760px] text-left text-sm">
                <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-5 py-3 font-semibold">게시글</th><th className="px-5 py-3 font-semibold">지역</th><th className="px-5 py-3 text-center font-semibold">조회</th><th className="px-5 py-3 text-center font-semibold">좋아요</th><th className="px-5 py-3 font-semibold">작성일</th><th className="px-5 py-3 text-right font-semibold">관리</th></tr></thead>
                <tbody className="divide-y divide-slate-100">
                  {loading ? (
                    <tr><td colSpan="6" className="px-5 py-16 text-center text-slate-500">게시글을 불러오는 중입니다...</td></tr>
                  ) : visiblePosts.length === 0 ? (
                    <tr><td colSpan="6" className="px-5 py-16 text-center"><BookOpen className="mx-auto mb-3 text-slate-300" size={34} /><p className="font-medium text-slate-600">표시할 게시글이 없습니다.</p><button onClick={openCreate} className="mt-3 text-sm font-semibold text-teal-600">첫 게시글 작성하기</button></td></tr>
                  ) : visiblePosts.map((post) => (
                    <tr key={post.id} className="hover:bg-slate-50/70">
                      <td className="px-5 py-4"><div className="flex items-center gap-3">{post.coverImageUrl ? <img src={post.coverImageUrl} alt="" className="h-11 w-14 rounded-lg object-cover" /> : <div className="grid h-11 w-14 place-items-center rounded-lg bg-slate-100 text-slate-400"><BookOpen size={18} /></div>}<div className="min-w-0"><button onClick={() => navigate(`/post/${post.id}`)} className="max-w-xs truncate text-left font-semibold text-slate-800 hover:text-teal-600">{post.title}</button><p className="text-xs text-slate-400">ID #{post.id}</p></div></div></td>
                      <td className="px-5 py-4 text-slate-600"><span className="inline-flex items-center gap-1"><MapPin size={14} />{post.regionName || "미지정"}</span></td>
                      <td className="px-5 py-4 text-center text-slate-600">{post.viewCount || 0}</td><td className="px-5 py-4 text-center text-slate-600">{post.likeCount || 0}</td><td className="px-5 py-4 text-slate-600">{formatDate(post.createdAt)}</td>
                      <td className="px-5 py-4"><div className="flex justify-end gap-1"><button onClick={() => openEdit(post.id)} title="수정" className="rounded-lg p-2 text-slate-500 hover:bg-blue-50 hover:text-blue-600"><Pencil size={17} /></button><button onClick={() => handleDelete(post)} disabled={deletingId === post.id} title="삭제" className="rounded-lg p-2 text-slate-500 hover:bg-red-50 hover:text-red-600 disabled:opacity-40"><Trash2 size={17} /></button></div></td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <div className="flex items-center justify-between border-t border-slate-200 px-5 py-4 text-sm text-slate-500"><span>{filteredPosts.length === 0 ? 0 : (page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, filteredPosts.length)} / {filteredPosts.length}</span><div className="flex items-center gap-2"><button disabled={page === 1} onClick={() => setPage((current) => current - 1)} className="rounded-md border border-slate-300 p-1.5 disabled:opacity-30"><ChevronLeft size={17} /></button><span className="px-2 font-medium text-slate-700">{page} / {pageCount}</span><button disabled={page === pageCount} onClick={() => setPage((current) => current + 1)} className="rounded-md border border-slate-300 p-1.5 disabled:opacity-30"><ChevronRight size={17} /></button></div></div>
          </section>
        </main>
      </div>

      {/* 생성과 수정을 editingId 유무로 구분해 하나의 편집 모달을 공유합니다. */}
      {editorOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/55 p-4" onMouseDown={(event) => event.target === event.currentTarget && closeEditor()}>
          <form onSubmit={handleSubmit} className="max-h-[92vh] w-full max-w-2xl overflow-y-auto rounded-2xl bg-white shadow-2xl">
            <div className="sticky top-0 flex items-center border-b border-slate-200 bg-white px-6 py-4"><div><h2 className="text-xl font-bold text-slate-900">{editingId ? "게시글 수정" : "새 게시글 작성"}</h2><p className="text-sm text-slate-500">필수 정보를 입력한 뒤 저장하세요.</p></div><button type="button" onClick={closeEditor} className="ml-auto rounded-lg p-2 hover:bg-slate-100"><X size={21} /></button></div>
            <div className="space-y-5 p-6">
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">제목 <b className="text-red-500">*</b></span><input required maxLength="120" value={form.title} onChange={updateForm("title")} placeholder="게시글 제목" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /><span className="mt-1 block text-right text-xs text-slate-400">{form.title.length}/120</span></label>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">지역</span><input maxLength="100" value={form.regionName} onChange={updateForm("regionName")} placeholder="예: 서울, 제주도" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">본문 <b className="text-red-500">*</b></span><textarea required rows="9" value={form.content} onChange={updateForm("content")} placeholder="여행 이야기를 작성하세요." className="w-full resize-y rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label>
              <label className="block"><span className="mb-2 block text-sm font-semibold text-slate-700">대표 이미지 URL</span><input type="url" maxLength="500" value={form.coverImageUrl} onChange={updateForm("coverImageUrl")} placeholder="https://example.com/image.jpg" className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-500 focus:ring-2 focus:ring-teal-100" /></label>
              {form.coverImageUrl && <img src={form.coverImageUrl} alt="대표 이미지 미리보기" className="h-40 w-full rounded-xl bg-slate-100 object-cover" onError={(event) => { event.currentTarget.style.display = "none"; }} />}
            </div>
            <div className="sticky bottom-0 flex justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4"><button type="button" onClick={closeEditor} className="rounded-lg border border-slate-300 px-5 py-2.5 text-sm font-semibold text-slate-700 hover:bg-white">취소</button><button disabled={saving} className="rounded-lg bg-teal-600 px-5 py-2.5 text-sm font-semibold text-white hover:bg-teal-700 disabled:opacity-50">{saving ? "저장 중..." : editingId ? "변경사항 저장" : "게시글 등록"}</button></div>
          </form>
        </div>
      )}
    </div>
  );
}

export default AdminPage;
