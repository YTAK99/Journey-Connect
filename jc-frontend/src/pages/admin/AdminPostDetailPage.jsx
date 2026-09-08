import { useCallback, useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { getAdminPost, hideAdminPost, permanentlyDeleteAdminPost, restoreAdminPost } from "../../services/adminApi";
import { normalizeAdminError } from "../../admin/adminErrors";
import { adminLabel } from "../../admin/adminPolicies";
import { formatAdminDate } from "../../admin/adminFormat";
import { useAdminContext } from "../../admin/useAdminContext";
import AdminCommandDialog from "../../admin/AdminCommandDialog";
import { AdminError, AdminLoading, AdminPageHeader, AdminPanel, AdminStatusBadge } from "../../admin/AdminUi";

export default function AdminPostDetailPage() {
  const { postId } = useParams();
  const navigate = useNavigate();
  const { refreshDashboard } = useAdminContext();
  const [state, setState] = useState({ loading: true, item: null, error: null });
  const [command, setCommand] = useState(null);
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState("");
  const load = useCallback(async () => { setState((current) => ({ ...current, loading: true, error: null })); try { setState({ loading: false, item: await getAdminPost(postId), error: null }); } catch (error) { setState({ loading: false, item: null, error: normalizeAdminError(error) }); } }, [postId]);
  useEffect(() => {
    const timerId = window.setTimeout(() => {
      void load();
    }, 0);

    return () => window.clearTimeout(timerId);
  }, [load]);
  const execute = async (reason) => { if (pending || !command) return; setPending(true); setNotice(""); try { if (command === "delete") { await permanentlyDeleteAdminPost(postId, reason); await refreshDashboard(); navigate("/admin/posts", { replace: true, state: { notice: `게시물 #${postId}이(가) 영구 삭제되었습니다.` } }); return; } const result = command === "hide" ? await hideAdminPost(postId, reason) : await restoreAdminPost(postId, reason); setNotice(result.changed ? "게시물 상태가 갱신되었습니다." : "이미 요청한 상태여서 추가 변경 없이 완료되었습니다."); setCommand(null); await Promise.all([load(), refreshDashboard()]); } catch (error) { setNotice(normalizeAdminError(error).message); } finally { setPending(false); } };
  if (state.loading) return <AdminLoading />;
  if (state.error) return <AdminError message={state.error.message} onRetry={load} />;
  const item = state.item;
  return <>
    <AdminPageHeader title={item.title || `게시물 #${item.postId}`} description={`게시물 #${item.postId}의 공개 상태와 내용을 확인합니다.`} actions={<Link to="/admin/posts" className="rounded-lg border border-slate-300 bg-white px-4 py-2 text-sm font-semibold">목록으로</Link>} />
    {notice && <div role="status" className="mb-5 rounded-lg border border-slate-200 bg-white px-4 py-3 text-sm">{notice}</div>}
    <AdminPanel><dl className="grid gap-x-8 gap-y-5 p-6 sm:grid-cols-2"><div><dt className="text-xs font-semibold text-slate-500">작성자</dt><dd className="mt-1">{item.authorDisplayName || item.authorUsername || `사용자 #${item.authorId}`} <span className="text-xs text-slate-400">(#{item.authorId})</span></dd></div><div><dt className="text-xs font-semibold text-slate-500">관리 상태</dt><dd className="mt-2"><AdminStatusBadge value={item.moderationStatus} /></dd></div><div><dt className="text-xs font-semibold text-slate-500">공개 범위</dt><dd className="mt-1">{adminLabel(item.visibility)}</dd></div><div><dt className="text-xs font-semibold text-slate-500">콘텐츠 상태</dt><dd className="mt-1">{adminLabel(item.contentStatus)}</dd></div><div className="sm:col-span-2"><dt className="text-xs font-semibold text-slate-500">전체 본문</dt><dd className="mt-2 max-h-[36rem] overflow-y-auto whitespace-pre-wrap break-words rounded-lg bg-slate-50 p-4 text-sm leading-6">{item.contentPreview || "표시할 본문이 없습니다."}</dd></div><div><dt className="text-xs font-semibold text-slate-500">생성 시각</dt><dd className="mt-1">{formatAdminDate(item.createdAt)}</dd></div><div><dt className="text-xs font-semibold text-slate-500">수정 시각</dt><dd className="mt-1">{formatAdminDate(item.updatedAt)}</dd></div><div><dt className="text-xs font-semibold text-slate-500">숨김 시각</dt><dd className="mt-1">{formatAdminDate(item.hiddenAt)}</dd></div></dl><div className="flex flex-wrap justify-end gap-3 border-t border-slate-200 bg-slate-50 px-6 py-4">{item.moderationStatus === "hidden" ? <><button type="button" onClick={() => setCommand("restore")} className="rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white">게시물 복원</button><button type="button" onClick={() => setCommand("delete")} className="rounded-lg border border-rose-300 bg-white px-4 py-2.5 text-sm font-semibold text-rose-700">영구 삭제</button></> : <button type="button" onClick={() => setCommand("hide")} className="rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white">게시물 숨김</button>}</div></AdminPanel>
    <AdminCommandDialog key={command || "closed"} open={Boolean(command)} title={command === "hide" ? "게시물 숨김" : command === "delete" ? "게시물 영구 삭제" : "게시물 복원"} description={command === "delete" ? "삭제 후에는 복구할 수 없습니다. 사유와 게시물 ID를 정확히 입력해 주세요." : "게시물 상태 변경 사유를 입력해 주세요."} confirmLabel={command === "hide" ? "숨기기" : command === "delete" ? "영구 삭제" : "복원하기"} confirmationLabel={command === "delete" ? `확인을 위해 게시물 ID ${postId} 입력` : undefined} expectedConfirmation={command === "delete" ? postId : undefined} pending={pending} onClose={() => !pending && setCommand(null)} onConfirm={execute} />
  </>;
}
