import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

// 로그인 후 진입하는 홈 화면이다.
function Home() {
  const navigate = useNavigate();

  useEffect(() => {
    const user = JSON.parse(localStorage.getItem("loginUser"));

    if (!user) {
      alert("로그인 후 이용해주세요.");
      navigate("/login");
    }
  }, [navigate]);

  return (
    <div className="min-h-screen bg-slate-100">
      <main className="p-10">
        <h1 className="text-3xl font-bold">
          JC에 오신 것을 환영합니다
        </h1>
      </main>
    </div>
  );
}

export default Home;