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

function Layout({ children }) {
  const location = useLocation();
  const hideHeaderPaths = ["/", "/login", "/signup", "/find-id", "/find-password", "/test"];
  const isHeaderHidden = hideHeaderPaths.includes(location.pathname);

  return (
    <>
      {!isHeaderHidden && <Header />}
      {children}
    </>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/home" element={<Navigate to="/feed" replace />} />
          <Route path="/test" element={<BackendTestPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/signup" element={<Signup />} />
          <Route path="/find-id" element={<FindId />} />
          <Route path="/find-password" element={<FindPassword />} />
          <Route path="/complete" element={<Complete />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/explore" element={<SearchPage />} />
          <Route path="/crew" element={<CrewPage />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/my-posts" element={<MyPosts />} />
          <Route path="/write" element={<WritePost />} />
          <Route path="/write/:id" element={<WritePost />} />
          <Route path="/post/:id" element={<PostDetail />} />

          <Route path="/feedpage" element={<Navigate to="/feed" replace />} />
          <Route path="/searchpage" element={<Navigate to="/explore" replace />} />
          <Route path="/myposts" element={<Navigate to="/my-posts" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
