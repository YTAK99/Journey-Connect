import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import BackendTestPage from './pages/BackendTestPage';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import FeedPage from './pages/FeedPage.jsx';
import SearchPage from './pages/SearchPage.jsx';
import FindId from "./pages/FindId.jsx";
import MyPage from "./pages/MyPage.jsx";
import WritePost from "./pages/WritePost.jsx";
import MyPosts from "./pages/MyPosts.jsx";
import Signup from "./pages/Signup.jsx";
import FindPassword from "./pages/FindPassword.jsx";
import PostDetail from "./pages/PostDetail.jsx";

function Layout({ children }) {

    const location = useLocation();
    //Header를 보여주지 않은 페이지 경로들 관리
    const hideHeaderPaths = ["/", "/test"];

    // 핵심로직
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
            {/* 3. Layout이 Routes를 감싸도록 설정 */}
            <Layout>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/test" element={<BackendTestPage />} />
                    <Route path="/login" element={<Login />} />
                    <Route path="/feedpage" element={<FeedPage />} />
                    <Route path="/searchpage" element={<SearchPage />} />
                    <Route path="/mypage" element={<MyPage />} />

                    <Route path="/write" element={<WritePost />} />
                    <Route path="/write/:id" element={<WritePost />} />
                    <Route path="/myposts" element={<MyPosts />} />
                    <Route path="/signup" element={<Signup />} />
                    <Route path="/find-id" element={<FindId />} />
                    <Route path="/find-password" element={<FindPassword />} />
                    <Route path="/post/:id" element={<PostDetail />} />
                    <Route path="/post/:id" element={<PostDetail />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}
