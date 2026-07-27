import { useState } from "react";
import { User, Heart, Map, FileText, LogOut, Camera } from "lucide-react";
import { Link, useNavigate } from "react-router-dom";
import { logout } from "../services/auth";
import { getUser } from "../services/auth";

function MyPage() {
  const navigate = useNavigate();

  const handleLogout = async () => {
    const ok = window.confirm("로그아웃 하시겠습니까?");
    if (!ok) return;
    await logout();
    alert("로그아웃 되었습니다.");
    navigate("/login");
  };

  const [editOpen, setEditOpen] = useState(false);
  const loginUser = getUser();

  const [user, setUser] = useState({
    name: loginUser?.nickname || loginUser?.email || "사용자",
    email: loginUser?.email || "",
    image: loginUser?.profileImageUrl || null,
  });

  const [editName, setEditName] = useState(user.name);
  const [editEmail, setEditEmail] = useState(user.email);
  const [currentPw, setCurrentPw] = useState("");
  const [newPw, setNewPw] = useState("");
  const [confirmPw, setConfirmPw] = useState("");

  const handleImage = (e) => {
    const file = e.target.files[0];
    if (file) {
      setUser({ ...user, image: URL.createObjectURL(file) });
    }
  };

  const saveProfile = () => {
    if (newPw !== confirmPw) {
      alert("새 비밀번호가 일치하지 않습니다.");
      return;
    }
    setUser({ ...user, name: editName, email: editEmail });
    alert("프로필이 수정되었습니다.");
    setEditOpen(false);
  };

  return (
      <div className="min-h-screen bg-background text-text">
        <div className="p-8 flex justify-between items-center">
          <h1 className="text-3xl font-bold text-title"> 마이페이지 </h1>
          <button onClick={handleLogout} className="flex items-center gap-2 text-red-500 font-semibold hover:text-red-600 transition">
            <LogOut size={20} /> 로그아웃 </button>
        </div>

        {/* 프로필 */}
        <div className="mx-8 rounded-3xl p-8 shadow bg-card">
          <div className="flex items-center gap-6">
            <div className="w-24 h-24 rounded-full bg-primary overflow-hidden flex items-center justify-center">

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
              <h2 className="text-2xl font-bold text-title">
                {user.name}
              </h2>
              <p className="text-muted">
                {user.email}
              </p>
              <button onClick={() => setEditOpen(true)}
                      className="mt-4 bg-primary text-white font-semibold px-4 py-2 rounded-xl hover:bg-primaryHover" >
                프로필 편집
              </button>
            </div>

          </div>
        </div>

        {/* 메뉴 (설정 칸이 깔끔하게 제외된 영역) */}
        <div className="mx-8 mt-8 flex flex-col gap-5">

          {/* 글 작성 */}
          <Link to="/write">
            <Menu
                icon={<FileText />}
                title="글 작성"
            />
          </Link>

          {/* 내가 작성한 글 */}
          <Link to="/myposts">
            <Menu
                icon={<FileText />}
                title="내가 작성한 글"
            />
          </Link>

          {/* 찜한 여행 */}
          <Menu
              icon={<Heart />}
              title="찜한 여행"
          />

          {/* 내 여행 지도 */}
          <div onClick={() => alert("지도 기능은 준비 중입니다.")}>
            <Menu
                icon={<Map />}
                title="내 여행 지도"
            />
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
                <div className="bg-card w-[450px] rounded-2xl p-8">
                  <h2 className="text-2xl font-bold mb-6 text-title">
                    프로필 편집
                  </h2>

                  <div className="flex flex-col items-center mb-5">
                    <label htmlFor="profileImage" className="w-28 h-28 rounded-full bg-slate-200 overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-80 transition">
                      {user.image ? (
                          <img src={user.image} alt="preview" className="w-full h-full object-cover"/>
                      ) : (
                          <Camera size={40} />
                      )}
                    </label>

                    <input
                        id="profileImage"
                        type="file"
                        accept="image/*"
                        onChange={handleImage}
                        className="hidden"
                    />
                  </div>

                  <label className="font-semibold text-text">
                    닉네임
                  </label>
                  <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="w-full border rounded-lg p-2 mt-2 mb-4 text-text"
                  />

                  <label className="font-semibold text-text">
                    이메일
                  </label>
                  <input
                      value={editEmail}
                      onChange={(e) => setEditEmail(e.target.value)}
                      className="w-full border rounded-lg p-2 mt-2 mb-4 text-text"
                  />

                  <label className="font-semibold text-text">
                    현재 비밀번호
                  </label>
                  <input
                      type="password"
                      value={currentPw}
                      onChange={(e) => setCurrentPw(e.target.value)}
                      className="w-full border rounded-lg p-2 mt-2 mb-4 text-text"
                  />

                  <label className="font-semibold text-text">
                    새 비밀번호
                  </label>
                  <input
                      type="password"
                      value={newPw}
                      onChange={(e) => setNewPw(e.target.value)}
                      className="w-full border rounded-lg p-2 mt-2 mb-4 text-text"
                  />

                  <label className="font-semibold text-text">
                    새 비밀번호 확인
                  </label>
                  <input
                      type="password"
                      value={confirmPw}
                      onChange={(e) => setConfirmPw(e.target.value)}
                      className="w-full border rounded-lg p-2 mt-2 text-text"
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
                        className="px-5 py-2 rounded-lg bg-primary hover:bg-primaryHover text-white font-semibold"
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

function Menu({ icon, title }) {
  return (
      <div className="rounded-2xl p-5 shadow cursor-pointer hover:scale-[1.02] transition flex items-center gap-4 bg-card">
        {icon}
        <span className="font-semibold text-title">
        {title}
      </span>
      </div>
  );
}

export default MyPage;