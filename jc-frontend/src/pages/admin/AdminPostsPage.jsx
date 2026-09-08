import { useCallback, useMemo, useState } from "react";
import { EyeOff, RefreshCw, RotateCcw, Search, Trash2 } from "lucide-react";
import { Link, useLocation } from "react-router";
import { getAdminPosts, hideAdminPost, permanentlyDeleteAdminPost } from "../../services/adminApi";
import { normalizeAdminError } from "../../admin/adminErrors";
import { POST_MODERATION_STATUSES, POST_VISIBILITIES, adminLabel } from "../../admin/adminPolicies";
import { formatAdminDate, truncateText } from "../../admin/adminFormat";
import useAdminListQuery from "../../admin/useAdminListQuery";
import { useAdminContext } from "../../admin/useAdminContext";
import AdminCommandDialog from "../../admin/AdminCommandDialog";
import { AdminEmpty, AdminError, AdminLoading, AdminPageHeader, AdminPagination, AdminPanel, AdminStatusBadge } from "../../admin/AdminUi";

const FILTERS = ["moderationStatus", "visibility", "sort"];

export default function AdminPostsPage() {
  const loader = useCallback((params) => getAdminPosts(params), []);
  const { loading, data, error, page, search, filters, update, reload } = useAdminListQuery(loader, FILTERS);
  const { refreshDashboard } = useAdminContext();
  const [draft, setDraft] = useState(search);
  const [selection, setSelection] = useState({ key: "", ids: new Set() });
  const [command, setCommand] = useState(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const location = useLocation();
  const items = useMemo(() => data?.items || [], [data]);
  const selectionKey = `${page}:${search}:${filters.moderationStatus}:${filters.visibility}:${filters.sort}`;
  const selectedIds = useMemo(
    () => selection.key === selectionKey ? selection.ids : new Set(),
    [selection, selectionKey],
  );
  const selectedItems = useMemo(() => items.filter((item) => selectedIds.has(item.postId)), [items, selectedIds]);
  const allSelected = items.length > 0 && selectedItems.length === items.length;
  const canDeleteSelected = selectedItems.length > 0 && selectedItems.every((item) => item.moderationStatus === "hidden");

  const reset = () => {
    setDraft("");
    update({ search: "", moderationStatus: "", visibility: "", sort: "" });
  };

  const toggleAll = () => setSelection({ key: selectionKey, ids: allSelected ? new Set() : new Set(items.map((item) => item.postId)) });
  const toggleOne = (postId) => setSelection((current) => {
    const currentIds = current.key === selectionKey ? current.ids : new Set();
    const next = new Set(currentIds);
    if (next.has(postId)) next.delete(postId);
    else next.add(postId);
    return { key: selectionKey, ids: next };
  });

  const executeBulkCommand = async (reason) => {
    if (pending || !command || selectedItems.length === 0) return;
    const activeCommand = command;
    const targets = [...selectedItems];
    setPending(true);
    setNotice("");
    const results = await Promise.allSettled(targets.map((item) => activeCommand === "hide"
      ? hideAdminPost(item.postId, reason)
      : permanentlyDeleteAdminPost(item.postId, reason)));
    const failed = results.filter((result) => result.status === "rejected");
    setCommand(null);
    setSelection({ key: selectionKey, ids: new Set() });
    await Promise.all([reload(), refreshDashboard()]);
    if (failed.length === 0) {
      setNotice(`${targets.length}개 게시물을 ${activeCommand === "hide" ? "숨김 처리" : "영구 삭제"}했습니다.`);
    } else {
      const firstError = normalizeAdminError(failed[0].reason);
      setNotice(`${targets.length - failed.length}개 처리 완료, ${failed.length}개 처리 실패: ${firstError.message}`);
    }
    setPending(false);
  };

  return <>
    <AdminPageHeader title="게시물 관리" description="공개·비공개·숨김 게시물을 한곳에서 조회하고 관리합니다." actions={<button type="button" onClick={reload} disabled={loading || pending} className="inline-flex items-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold disabled:opacity-50"><RefreshCw size={16} className={loading ? "animate-spin" : ""} />새로고침</button>} />
    {(notice || location.state?.notice) && <div role="status" className="mb-5 rounded-lg border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">{notice || location.state.notice}</div>}
    <AdminPanel>
      <form onSubmit={(event) => { event.preventDefault(); update({ search: draft.trim().slice(0, 100) }); }} className="grid gap-3 border-b border-slate-200 p-5 lg:grid-cols-[minmax(240px,1fr)_170px_170px_180px_auto_auto]">
        <label className="relative"><span className="sr-only">게시물 검색</span><Search className="absolute left-3 top-2.5 text-slate-400" size={18} /><input maxLength="100" value={draft} onChange={(event) => setDraft(event.target.value)} placeholder="게시물 ID, 제목, 작성자 검색" className="w-full rounded-lg border border-slate-300 py-2 pl-10 pr-3 text-sm" /></label>
        <label><span className="sr-only">관리 상태</span><select value={filters.moderationStatus} onChange={(event) => update({ moderationStatus: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">모든 관리 상태</option>{POST_MODERATION_STATUSES.map((value) => <option key={value} value={value}>{adminLabel(value)}</option>)}</select></label>
        <label><span className="sr-only">공개 범위</span><select value={filters.visibility} onChange={(event) => update({ visibility: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">모든 공개 범위</option>{POST_VISIBILITIES.map((value) => <option key={value} value={value}>{adminLabel(value)}</option>)}</select></label>
        <label><span className="sr-only">정렬</span><select value={filters.sort} onChange={(event) => update({ sort: event.target.value })} className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm"><option value="">최신 작성순</option><option value="updated_desc">최근 수정순</option><option value="created_asc">오래된 작성순</option><option value="title_asc">제목순</option></select></label>
        <button type="submit" className="rounded-lg bg-teal-700 px-4 py-2 text-sm font-semibold text-white">검색</button>
        <button type="button" onClick={reset} className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold"><RotateCcw size={15} />초기화</button>
      </form>

      {selectedItems.length > 0 && <div className="flex flex-wrap items-center gap-3 border-b border-slate-200 bg-teal-50 px-5 py-3">
        <span className="mr-auto text-sm font-semibold text-teal-900">{selectedItems.length}개 선택됨</span>
        <button type="button" disabled={pending} onClick={() => setCommand("hide")} className="inline-flex items-center gap-2 rounded-lg bg-slate-700 px-4 py-2 text-sm font-semibold text-white disabled:opacity-50"><EyeOff size={16} />선택 숨기기</button>
        <button type="button" disabled={pending || !canDeleteSelected} title={canDeleteSelected ? "" : "영구 삭제는 숨김 상태의 게시물만 가능합니다."} onClick={() => setCommand("delete")} className="inline-flex items-center gap-2 rounded-lg bg-rose-700 px-4 py-2 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-40"><Trash2 size={16} />선택 영구 삭제</button>
      </div>}

      {loading ? <AdminLoading /> : error ? <div className="p-5"><AdminError message={error.message} onRetry={reload} /></div> : !items.length ? <div className="p-5"><AdminEmpty title="조건에 맞는 게시물이 없습니다." /></div> : <div className="overflow-x-auto">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th scope="col" className="w-12 px-5 py-3"><input type="checkbox" checked={allSelected} onChange={toggleAll} aria-label="현재 페이지 게시물 전체 선택" className="h-4 w-4 rounded border-slate-300 accent-teal-700" /></th><th scope="col" className="px-5 py-3">게시물</th><th scope="col" className="px-5 py-3">작성자</th><th scope="col" className="px-5 py-3">공개 범위</th><th scope="col" className="px-5 py-3">관리 상태</th><th scope="col" className="px-5 py-3">생성 시각</th><th scope="col" className="px-5 py-3 text-right">상세</th></tr></thead>
          <tbody className="divide-y divide-slate-100">{items.map((item) => <tr key={item.postId} className={selectedIds.has(item.postId) ? "bg-teal-50/60" : ""}>
            <td className="px-5 py-4"><input type="checkbox" checked={selectedIds.has(item.postId)} onChange={() => toggleOne(item.postId)} aria-label={`게시물 #${item.postId} 선택`} className="h-4 w-4 rounded border-slate-300 accent-teal-700" /></td>
            <td className="max-w-md px-5 py-4"><Link to={`/admin/posts/${item.postId}`} className="group block min-w-0 rounded focus:outline-none focus:ring-2 focus:ring-teal-500"><p className="font-semibold text-slate-900 group-hover:text-teal-700 group-hover:underline">{item.title || `게시물 #${item.postId}`}</p><p className="mt-1 max-w-md truncate text-xs text-slate-500">#{item.postId} · {truncateText(item.contentPreview)}</p></Link></td>
            <td className="px-5 py-4">{item.authorDisplayName || `사용자 #${item.authorId}`}</td><td className="px-5 py-4">{adminLabel(item.visibility)}</td><td className="px-5 py-4"><AdminStatusBadge value={item.moderationStatus} /></td><td className="px-5 py-4 text-slate-600">{formatAdminDate(item.createdAt)}</td><td className="px-5 py-4 text-right"><Link to={`/admin/posts/${item.postId}`} className="font-semibold text-teal-700">상세 보기</Link></td>
          </tr>)}</tbody>
        </table>
      </div>}
      {!loading && !error && data && <AdminPagination page={page} totalPages={data.totalPages} totalElements={data.totalElements} onPage={(next) => update({ page: next })} />}
    </AdminPanel>
    <AdminCommandDialog key={command || "closed"} open={Boolean(command)} title={command === "delete" ? "선택 게시물 영구 삭제" : "선택 게시물 숨김"} description={command === "delete" ? `선택한 ${selectedItems.length}개 게시물은 삭제 후 복구할 수 없습니다.` : `선택한 ${selectedItems.length}개 게시물을 숨김 처리합니다.`} confirmLabel={command === "delete" ? "영구 삭제" : "숨기기"} confirmationLabel={command === "delete" ? `확인을 위해 DELETE ${selectedItems.length} 입력` : undefined} expectedConfirmation={command === "delete" ? `DELETE ${selectedItems.length}` : undefined} pending={pending} onClose={() => !pending && setCommand(null)} onConfirm={executeBulkCommand} />
  </>;
}
