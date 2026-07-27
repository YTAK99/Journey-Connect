import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router-dom";
import Header from "./components/Header";
import BackendTestPage from "./pages/BackendTestPage";
import Complete from "./pages/Complete";
import CrewPage from "./pages/CrewPage";
import FeedPage from "./pages/FeedPage";
import FindId from "./pages/FindId";
import FindPassword from "./pages/FindPassword";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MyPage from "./pages/MyPage";
import MyPosts from "./pages/MyPosts";
import PostDetail from "./pages/PostDetail";
import SearchPage from "./pages/SearchPage";
import Signup from "./pages/Signup";
import WritePost from "./pages/WritePost";
import AdminPage from "./pages/AdminPage";

/** 현재 경로에 따라 공통 헤더 노출 여부를 결정하는 최상위 화면 틀입니다. */
function Layout({ children }) {
  const location = useLocation();
  // 자체 전체 화면 레이아웃을 가진 인증·랜딩·관리자 화면에서는 서비스 공통 헤더를 숨깁니다.
  const hideHeaderPaths = ["/", "/login", "/signup", "/find-id", "/find-password", "/test"];
  const isHeaderHidden = hideHeaderPaths.includes(location.pathname) || location.pathname.startsWith("/admin");

  return (
    <>
      {!isHeaderHidden && <Header />}
      {children}
    </>
  );
}

export default function App() {
  // 주소와 페이지 컴포넌트의 대응을 한곳에서 관리합니다. 아래쪽 경로들은 이전 URL 호환용입니다.
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          {/* 서비스 진입 및 계정 관련 공개 화면 */}
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/feed" replace />} />
          <Route path="/test" element={<BackendTestPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/find-id" element={<FindId />} />
          <Route path="/find-password" element={<FindPassword />} />
          <Route path="/complete" element={<Complete />} />

          {/* 로그인 후 사용하는 여행 콘텐츠 화면 */}
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/explore" element={<SearchPage />} />
          <Route path="/crew" element={<CrewPage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/my-posts" element={<MyPosts />} />
          <Route path="/write" element={<WritePost />} />
          <Route path="/write/:id" element={<WritePost />} />
          <Route path="/post/:id" element={<PostDetail />} />

          {/* 공통 Header 대신 자체 사이드바·상단바를 사용하는 관리 콘솔 */}
          <Route path="/admin" element={<AdminPage />} />

          {/* 과거 링크를 새 URL로 연결하고 알 수 없는 주소는 랜딩 화면으로 복구합니다. */}
          <Route path="/feedpage" element={<Navigate to="/feed" replace />} />
          <Route path="/searchpage" element={<Navigate to="/explore" replace />} />
          <Route path="/myposts" element={<Navigate to="/my-posts" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
