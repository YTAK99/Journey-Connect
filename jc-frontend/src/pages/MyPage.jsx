import { useState } from "react";
import {
  User,
  Heart,
  Map,
  FileText,
  Settings,
  Globe,
  Moon,
  Bell,
  LogOut,
  X,
  Camera,
} from "lucide-react";
import { Link, useNavigate } from "react-router-dom";

function MyPage() {
    const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [alarm, setAlarm] = useState(true);
  const [language, setLanguage] = useState("한국어");

  const [editOpen, setEditOpen] = useState(false);

  const [user, setUser] = useState({
    name: "홍길동",
    email: "travel@email.com",
    image: null,
  });

  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);

  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const handleImage = (e) => {
    const file = e.target.files[0];
  
    if (file) {
      setUser({
        ...user,
        image: URL.createObjectURL(file),
      });
    }
  };
  
  const saveProfile = () => {
    if (newPw !== confirmPw) {
      alert("새 비밀번호가 일치하지 않습니다.");
      return;
    }
  
    setUser({
      ...user,
      name: editName,
      email: editEmail,
    });
  
    alert("프로필이 수정되었습니다.");
    setEditOpen(false);
  };


  return (
    <div
      className={`min-h-screen ${
        darkMode
          ? "bg-slate-900 text-white"
          : "bg-slate-100 text-slate-900"
      }`}
    >
<div className="p-8 flex justify-between items-center">

<h1 className="text-3xl font-bold">
  마이페이지
</h1>


<button
  onClick={() => {
    alert("로그아웃 되었습니다.");
    navigate("/");
  }}
  className="text-red-500 font-semibold"
>
  로그아웃
</button>

</div>

      {/* 프로필 */}
      <div
        className={`mx-8 rounded-3xl p-8 shadow ${
          darkMode ? "bg-slate-800" : "bg-white"
        }`}
      >
        <div className="flex items-center gap-6">

          <div className="w-24 h-24 rounded-full bg-cyan-400 overflow-hidden flex items-center justify-center">

            {user.image ? (
              <img
                src={user.image}
                alt="profile"
                className="w-full h-full object-cover"
              />
            ) : (
              <User size={45} color="white" />
            )}

          </div>

          <div>

            <h2 className="text-2xl font-bold">
              {user.name}
            </h2>

            <p className="text-slate-500">
              {user.email}
            </p>

            <button
              onClick={() => setEditOpen(true)}
              className="mt-4 bg-cyan-500 text-white px-4 py-2 rounded-xl hover:bg-cyan-600"
            >
              프로필 편집
            </button>

          </div>

        </div>
      </div>

      {/* 메뉴 */}
      <div className="mx-8 mt-8 flex flex-col gap-5">

{/* 글 작성 */}
<Link to="/write">

  <Menu
    icon={<FileText />}
    title="글 작성"
    dark={darkMode}
  />

</Link>


{/* 내가 작성한 글 */}
<Link to="/myposts">

  <Menu
    icon={<FileText />}
    title="내가 작성한 글"
    dark={darkMode}
  />

</Link>


{/* 찜한 여행 */}
<Menu
  icon={<Heart />}
  title="찜한 여행"
  dark={darkMode}
/>


{/* 설정 */}
<div
  onClick={() => setOpen(true)}
  className={`rounded-2xl p-5 shadow cursor-pointer hover:scale-[1.02] transition flex items-center gap-4 ${
    darkMode ? "bg-slate-800" : "bg-white"
  }`}
>

  <Settings />

  <span className="font-semibold">
    설정
  </span>

</div>


</div>

      {/* 배경 */}
            {open && (
        <div
          className="fixed inset-0 bg-black/40"
          onClick={() => setOpen(false)}
        />
      )}

      {/* 설정 사이드바 */}
      <div
        className={`fixed top-0 right-0 h-screen w-96 shadow-2xl transition-transform duration-300 z-50 ${
          darkMode
            ? "bg-slate-900 text-white"
            : "bg-white text-slate-900"
        } ${open ? "translate-x-0" : "translate-x-full"}`}
      >
        <div className="flex justify-between items-center p-6 border-b">
          <h2 className="text-2xl font-bold">설정</h2>

          <button onClick={() => setOpen(false)}>
            <X />
          </button>
        </div>

        <div className="p-6 space-y-8">

          <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <Globe />
              언어
            </div>

            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="border rounded-lg px-3 py-2 text-black"
            >
              <option>한국어</option>
              <option>English</option>
              <option>日本語</option>
              <option>中文</option>
            </select>
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <Moon />
              다크모드
            </div>

            <input
              type="checkbox"
              checked={darkMode}
              onChange={() => setDarkMode(!darkMode)}
            />
          </div>

          <div className="flex justify-between items-center">
            <div className="flex gap-3 items-center">
              <Bell />
              알림
            </div>

            <input
              type="checkbox"
              checked={alarm}
              onChange={() => setAlarm(!alarm)}
            />
          </div>

          <hr />

        </div>
      </div>

      {/* 프로필 편집 모달 */}
      {editOpen && (
        <>
          <div
            className="fixed inset-0 bg-black/50 z-50"
            onClick={() => setEditOpen(false)}
          />

          <div className="fixed inset-0 flex justify-center items-center z-50">

            <div className="bg-white w-[450px] rounded-2xl p-8">

              <h2 className="text-2xl font-bold mb-6 text-black">
                프로필 편집
              </h2>

              <div className="flex flex-col items-center mb-5">

                <div className="w-28 h-28 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center">

                  {user.image ? (
                    <img
                      src={user.image}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <Camera size={40} />
                  )}

                </div>

                <input
                  type="file"
                  accept="image/*"
                  onChange={handleImage}
                  className="mt-3"
                />

              </div>

              <label className="font-semibold text-black">
                닉네임
              </label>

              <input
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                className="w-full border rounded-lg p-2 mt-2 mb-4 text-black"
              />

              <label className="font-semibold text-black">
                이메일
              </label>

              <input
                value={editEmail}
                onChange={(e) => setEditEmail(e.target.value)}
                className="w-full border rounded-lg p-2 mt-2 mb-4 text-black"
              />

              <label className="font-semibold text-black">
                현재 비밀번호
              </label>

              <input
                type="password"
                value={currentPw}
                onChange={(e) => setCurrentPw(e.target.value)}
                className="w-full border rounded-lg p-2 mt-2 mb-4 text-black"
              />

              <label className="font-semibold text-black">
                새 비밀번호
              </label>

              <input
                type="password"
                value={newPw}
                onChange={(e) => setNewPw(e.target.value)}
                className="w-full border rounded-lg p-2 mt-2 mb-4 text-black"
              />

              <label className="font-semibold text-black">
                새 비밀번호 확인
              </label>

              <input
                type="password"
                value={confirmPw}
                onChange={(e) => setConfirmPw(e.target.value)}
                className="w-full border rounded-lg p-2 mt-2 text-black"
              />

              <div className="flex justify-end gap-3 mt-8">

                <button
                  onClick={() => setEditOpen(false)}
                  className="px-5 py-2 rounded-lg bg-gray-300"
                >
                  취소
                </button>

                <button
                  onClick={saveProfile}
                  className="px-5 py-2 rounded-lg bg-cyan-500 text-white"
                >
                  저장
                </button>

              </div>

            </div>

          </div>
        </>
      )}

    </div>
  );
}

function Menu({ icon, title, dark }) {
  return (
    <div
      className={`rounded-2xl p-5 shadow cursor-pointer hover:scale-[1.02] transition flex items-center gap-4 ${
        dark ? "bg-slate-800" : "bg-white"
      }`}
    >
      {icon}
      <span className="font-semibold">{title}</span>
    </div>
  );
}

export default MyPage;