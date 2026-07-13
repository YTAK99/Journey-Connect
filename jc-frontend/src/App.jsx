import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import Header from "./components/Header";
import BackendTestPage from './pages/BackendTestPage';
import Home from './pages/Home.jsx';
// import Login from './pages/Login.jsx';
import FeedPage from './pages/FeedPage.jsx';
import SearchPage from './pages/SearchPage.jsx';

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

function App() {
    return (
        <BrowserRouter>
            {/* 3. Layout이 Routes를 감싸도록 설정 */}
            <Layout>
                <Routes>
                    <Route path="/" element={<Home />} />
                    <Route path="/test" element={<BackendTestPage />} />
                    {/*<Route path="/login" element={<Login />} />*/}
                    <Route path="/feedpage" element={<FeedPage />} />
                    <Route path="/searchpage" element={<SearchPage />} />
                </Routes>
            </Layout>
        </BrowserRouter>
    );
}

export default App;
