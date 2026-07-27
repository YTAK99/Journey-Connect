import { useState } from "react";
import { Bell, Camera, FileText, Heart, LogOut, Map, Moon, Settings, User, X } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { getUser, logout } from "../services/auth";

function MenuItem({ icon, title, dark }) {
  return (
    <div
      className={`flex cursor-pointer items-center gap-4 rounded-lg p-5 shadow-sm transition hover:shadow ${
        dark ? "bg-slate-800" : "bg-card"
      }`}
    >
      {icon}
      <span className="font-semibold text-title">{title}</span>
    </div>
  );
}

function MyPage() {
  // 저장된 로그인 사용자 정보를 프로필 화면에 반영하고 로컬 미리보기·테마 설정을 제공합니다.
  const navigate = useNavigate();
  const loginUser = getUser();
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [alarm, setAlarm] = useState(true);
  const [editOpen, setEditOpen] = useState(false);
  const [user, setUser] = useState({
    name: loginUser?.nickname || loginUser?.email || "사용자",
    email: loginUser?.email || "",
    image: loginUser?.profileImageUrl || null,
  });
  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);

  const handleLogout = async () => {
    if (!window.confirm("로그아웃 하시겠습니까?")) return;
    await logout();
    navigate("/login");
  };

  const handleImage = (event) => {
    const file = event.target.files[0];
    if (!file) return;
    setUser((current) => ({ ...current, image: URL.createObjectURL(file) }));
  };

  const saveProfile = () => {
    setUser((current) => ({ ...current, name: editName, email: editEmail }));
    setEditOpen(false);
  };

  return (
    <main className={`min-h-screen pt-20 ${darkMode ? "bg-slate-900 text-white" : "bg-background text-text"}`}>
      <div className="flex items-center justify-between p-8">
        <h1 className="text-3xl font-bold text-title">마이페이지</h1>
        <button
          type="button"
          onClick={handleLogout}
          className="flex items-center gap-2 font-semibold text-red-500 transition hover:text-red-600"
        >
          <LogOut size={20} />
          로그아웃
        </button>
      </div>

      <section className={`mx-8 rounded-lg p-8 shadow-sm ${darkMode ? "bg-slate-800" : "bg-card"}`}>
        <div className="flex items-center gap-6">
          <div className="flex h-24 w-24 items-center justify-center overflow-hidden rounded-full bg-primary">
            {user.image ? (
              <img src={user.image} alt="profile" className="h-full w-full object-cover" />
            ) : (
              <User size={45} color="white" />
            )}
          </div>
          <div>
            <h2 className="text-2xl font-bold text-title">{user.name}</h2>
            <p className="text-muted">{user.email}</p>
            <button
              type="button"
              onClick={() => setEditOpen(true)}
              className="mt-4 rounded-lg bg-primary px-4 py-2 font-semibold text-white hover:bg-primaryHover"
            >
              프로필 편집
            </button>
          </div>
        </div>
      </section>

      <section className="mx-8 mt-8 flex flex-col gap-5">
        <Link to="/write">
          <MenuItem icon={<FileText />} title="글 작성" dark={darkMode} />
        </Link>
        <Link to="/my-posts">
          <MenuItem icon={<FileText />} title="내가 작성한 글" dark={darkMode} />
        </Link>
        <MenuItem icon={<Heart />} title="찜한 여행" dark={darkMode} />
        <MenuItem icon={<Map />} title="내 여행 지도" dark={darkMode} />
        <div onClick={() => setSettingsOpen(true)}>
          <MenuItem icon={<Settings />} title="설정" dark={darkMode} />
        </div>
      </section>

      {settingsOpen && <div className="fixed inset-0 bg-black/40" onClick={() => setSettingsOpen(false)} />}

      <aside
        className={`fixed right-0 top-0 z-50 h-screen w-96 max-w-full shadow-2xl transition-transform duration-300 ${
          darkMode ? "bg-slate-900 text-white" : "bg-card text-text"
        } ${settingsOpen ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex items-center justify-between border-b p-6">
          <h2 className="text-2xl font-bold">설정</h2>
          <button type="button" onClick={() => setSettingsOpen(false)} aria-label="닫기">
            <X />
          </button>
        </div>

        <div className="space-y-8 p-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Moon />
              다크모드
            </div>
            <input type="checkbox" checked={darkMode} onChange={() => setDarkMode((value) => !value)} />
          </div>

          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <Bell />
              알림
            </div>
            <input type="checkbox" checked={alarm} onChange={() => setAlarm((value) => !value)} />
          </div>
        </div>
      </aside>

      {editOpen && (
        <>
          <div className="fixed inset-0 z-50 bg-black/50" onClick={() => setEditOpen(false)} />
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            <section className="w-[450px] max-w-full rounded-lg bg-card p-8">
              <h2 className="mb-6 text-2xl font-bold text-title">프로필 편집</h2>

              <div className="mb-5 flex flex-col items-center">
                <label
                  htmlFor="profileImage"
                  className="flex h-28 w-28 cursor-pointer items-center justify-center overflow-hidden rounded-full bg-slate-200 transition hover:opacity-80"
                >
                  {user.image ? (
                    <img src={user.image} alt="" className="h-full w-full object-cover" />
                  ) : (
                    <Camera size={40} />
                  )}
                </label>
                <input id="profileImage" type="file" accept="image/*" onChange={handleImage} className="hidden" />
              </div>

              <label className="font-semibold text-text">닉네임</label>
              <input
                value={editName}
                onChange={(event) => setEditName(event.target.value)}
                className="mb-4 mt-2 w-full rounded-lg border p-2 text-text"
              />

              <label className="font-semibold text-text">이메일</label>
              <input
                value={editEmail}
                onChange={(event) => setEditEmail(event.target.value)}
                className="mb-4 mt-2 w-full rounded-lg border p-2 text-text"
              />

              <div className="mt-8 flex justify-end gap-3">
                <button type="button" onClick={() => setEditOpen(false)} className="rounded-lg bg-gray-300 px-5 py-2">
                  취소
                </button>
                <button
                  type="button"
                  onClick={saveProfile}
                  className="rounded-lg bg-primary px-5 py-2 font-semibold text-white hover:bg-primaryHover"
                >
                  저장
                </button>
              </div>
            </section>
          </div>
        </>
      )}
    </main>
  );
}

export default MyPage;
