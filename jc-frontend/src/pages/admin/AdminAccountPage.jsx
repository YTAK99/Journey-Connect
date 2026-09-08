import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { KeyRound, Mail } from "lucide-react";
import { AdminError, AdminLoading, AdminPageHeader, AdminPanel } from "../../admin/AdminUi";
import { changeAdminEmail, changeAdminPassword, getAdminAccount } from "../../services/adminApi";
import { clearStoredAuth, getApiErrorMessage } from "../../services/apiClient";
import { updateStoredUser } from "../../services/auth";

export default function AdminAccountPage() {
  const navigate = useNavigate();
  const [account, setAccount] = useState(null);
  const [loadError, setLoadError] = useState("");
  const [email, setEmail] = useState("");
  const [emailPending, setEmailPending] = useState(false);
  const [emailNotice, setEmailNotice] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [passwordPending, setPasswordPending] = useState(false);
  const [passwordError, setPasswordError] = useState("");

  const load = async () => {
    setLoadError("");
    try {
      const value = await getAdminAccount();
      setAccount(value);
      setEmail(value.email || "");
    } catch (error) {
      setLoadError(getApiErrorMessage(error, "계정 정보를 불러오지 못했습니다."));
    }
  };

  useEffect(() => {
    const timerId = window.setTimeout(() => void load(), 0);
    return () => window.clearTimeout(timerId);
  }, []);

  const submitEmail = async (event) => {
    event.preventDefault();
    if (emailPending) return;
    setEmailPending(true);
    setEmailNotice("");
    try {
      const updated = await changeAdminEmail(email.trim());
      setAccount(updated);
      setEmail(updated.email);
      updateStoredUser({ email: updated.email });
      setEmailNotice("로그인 이메일이 변경되었습니다. 다음 로그인부터 새 이메일을 사용해 주세요.");
    } catch (error) {
      setEmailNotice(getApiErrorMessage(error, "이메일을 변경하지 못했습니다."));
    } finally {
      setEmailPending(false);
    }
  };

  const submitPassword = async (event) => {
    event.preventDefault();
    setPasswordError("");
    if (newPassword.length < 8 || newPassword.length > 72) {
      setPasswordError("비밀번호는 8자 이상 72자 이하로 입력해 주세요.");
      return;
    }
    if (newPassword !== confirmPassword) {
      setPasswordError("새 비밀번호와 확인 값이 일치하지 않습니다.");
      return;
    }
    if (passwordPending) return;
    setPasswordPending(true);
    try {
      await changeAdminPassword(newPassword);
      clearStoredAuth();
      navigate("/admin/login", { replace: true, state: { passwordChanged: true } });
    } catch (error) {
      setPasswordError(getApiErrorMessage(error, "비밀번호를 변경하지 못했습니다."));
      setPasswordPending(false);
    }
  };

  if (!account && !loadError) return <AdminLoading label="계정 정보를 불러오는 중입니다." />;
  if (!account && loadError) return <AdminError message={loadError} onRetry={load} />;

  return <>
    <AdminPageHeader title="계정 설정" description="관리자 로그인 이메일과 비밀번호를 각각 변경합니다." />
    <div className="grid gap-6 xl:grid-cols-2">
      <AdminPanel>
        <form onSubmit={submitEmail} className="p-6">
          <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-teal-50 p-3 text-teal-700"><Mail size={21} /></span><div><h2 className="font-bold text-slate-950">로그인 이메일 변경</h2><p className="text-sm text-slate-500">현재 이메일: {account.email}</p></div></div>
          <label htmlFor="admin-account-email" className="mb-2 block text-sm font-semibold text-slate-700">새 로그인 이메일</label>
          <input id="admin-account-email" type="email" required maxLength="190" autoComplete="email" value={email} onChange={(event) => { setEmail(event.target.value); setEmailNotice(""); }} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" />
          {emailNotice && <p role="status" className="mt-3 text-sm text-slate-700">{emailNotice}</p>}
          <button type="submit" disabled={emailPending || email.trim().toLowerCase() === account.email.toLowerCase()} className="mt-5 rounded-lg bg-teal-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{emailPending ? "변경 중..." : "이메일 변경"}</button>
        </form>
      </AdminPanel>

      <AdminPanel>
        <form onSubmit={submitPassword} className="p-6">
          <div className="mb-5 flex items-center gap-3"><span className="rounded-xl bg-rose-50 p-3 text-rose-700"><KeyRound size={21} /></span><div><h2 className="font-bold text-slate-950">비밀번호 변경</h2><p className="text-sm text-slate-500">변경하면 모든 로그인 세션이 종료됩니다.</p></div></div>
          <div className="space-y-4"><div><label htmlFor="admin-new-password" className="mb-2 block text-sm font-semibold text-slate-700">새 비밀번호</label><input id="admin-new-password" type="password" required minLength="8" maxLength="72" autoComplete="new-password" value={newPassword} onChange={(event) => { setNewPassword(event.target.value); setPasswordError(""); }} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></div><div><label htmlFor="admin-confirm-password" className="mb-2 block text-sm font-semibold text-slate-700">새 비밀번호 확인</label><input id="admin-confirm-password" type="password" required minLength="8" maxLength="72" autoComplete="new-password" value={confirmPassword} onChange={(event) => { setConfirmPassword(event.target.value); setPasswordError(""); }} className="w-full rounded-lg border border-slate-300 px-3 py-2.5 outline-none focus:border-teal-600 focus:ring-2 focus:ring-teal-100" /></div></div>
          {passwordError && <p role="alert" className="mt-3 text-sm text-rose-700">{passwordError}</p>}
          <button type="submit" disabled={passwordPending || !newPassword || !confirmPassword} className="mt-5 rounded-lg bg-rose-700 px-4 py-2.5 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-50">{passwordPending ? "변경 중..." : "비밀번호 변경 후 로그아웃"}</button>
        </form>
      </AdminPanel>
    </div>
  </>;
}
