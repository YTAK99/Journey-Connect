import { BrowserRouter, Navigate, Route, Routes, useLocation } from "react-router";
import Header from "./components/Header";
import BackendTestPage from "./pages/BackendTestPage";
import Complete from "./pages/Complete";
import CrewPage from "./pages/CrewPage";
import CrewCreate from "./pages/CrewCreate";
import FeedPage from "./pages/FeedPage";
import FindId from "./pages/FindId";
import FindPassword from "./pages/FindPassword";
import ResetPassword from "./pages/ResetPassword";
import Home from "./pages/Home";
import Login from "./pages/Login";
import MyPage from "./pages/MyPage";
import MyPosts from "./pages/MyPosts";
import PostDetail from "./pages/PostDetail";
import SearchPage from "./pages/SearchPage";
import Signup from "./pages/Signup";
import WritePost from "./pages/WritePost";
import AdminLoginPage from "./pages/AdminLoginPage";
import AdminLayout from "./admin/AdminLayout";
import AdminRouteGuard from "./admin/AdminRouteGuard";
import AdminDashboardPage from "./pages/admin/AdminDashboardPage";
import AdminReportsPage from "./pages/admin/AdminReportsPage";
import AdminReportDetailPage from "./pages/admin/AdminReportDetailPage";
import AdminPostsPage from "./pages/admin/AdminPostsPage";
import AdminPostDetailPage from "./pages/admin/AdminPostDetailPage";
import AdminUsersPage from "./pages/admin/AdminUsersPage";
import AdminUserDetailPage from "./pages/admin/AdminUserDetailPage";
import AdminNotFoundPage from "./pages/admin/AdminNotFoundPage";

function Layout({ children }) {
  const location = useLocation();
  const hideHeaderPaths = ["/", "/login", "/signup", "/find-id", "/find-password", "/test"];
  const isHeaderHidden = hideHeaderPaths.includes(location.pathname) || location.pathname.startsWith("/admin");
  return <>{!isHeaderHidden && <Header />}{children}</>;
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
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/complete" element={<Complete />} />
          <Route path="/feed" element={<FeedPage />} />
          <Route path="/explore" element={<SearchPage />} />
          <Route path="/crew" element={<CrewPage />} />
          <Route path="/crew/create" element={<CrewCreate />} />
          <Route path="/mypage" element={<MyPage />} />
          <Route path="/my-posts" element={<MyPosts />} />
          <Route path="/write" element={<WritePost />} />
          <Route path="/write/:id" element={<WritePost />} />
          <Route path="/post/:id" element={<PostDetail />} />

          <Route path="/admin/login" element={<AdminLoginPage />} />
          <Route path="/admin" element={<AdminRouteGuard><AdminLayout /></AdminRouteGuard>}>
            <Route index element={<AdminDashboardPage />} />
            <Route path="reports" element={<AdminReportsPage />} />
            <Route path="reports/:reportId" element={<AdminReportDetailPage />} />
            <Route path="posts" element={<AdminPostsPage />} />
            <Route path="posts/:postId" element={<AdminPostDetailPage />} />
            <Route path="users" element={<AdminUsersPage />} />
            <Route path="users/:userId" element={<AdminUserDetailPage />} />
            <Route path="*" element={<AdminNotFoundPage />} />
          </Route>

          <Route path="/feedpage" element={<Navigate to="/feed" replace />} />
          <Route path="/searchpage" element={<Navigate to="/explore" replace />} />
          <Route path="/myposts" element={<Navigate to="/my-posts" replace />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Layout>
    </BrowserRouter>
  );
}
