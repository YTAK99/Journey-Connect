import { BrowserRouter, Routes, Route } from "react-router-dom";
import FindId from "./pages/FindId";
import FindPassword from "./pages/FindPassword";
import Home from "./pages/Home";
import Login from "./pages/Login";
import BackendTestPage from "./pages/BackendTestPage";
import MyPage from "./pages/MyPage";
import WritePost from "./pages/WritePost";
import MyPosts from "./pages/MyPosts";
import Signup from "./pages/Signup";
import PostDetail from "./pages/PostDetail";


function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/home" element={<Home />} />
        <Route path="/test" element={<BackendTestPage />} />
        <Route path="/mypage" element={<MyPage />} />
        <Route path="/write" element={<WritePost />} />
        <Route path="/write/:id" element={<WritePost />} />
        <Route path="/myposts" element={<MyPosts />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/find-id" element={<FindId />} />
        <Route path="/find-password" element={<FindPassword />} />
        <Route
  path="/post/:id"
  element={<PostDetail />}
/>
      </Routes>
    </BrowserRouter>
  );
}

export default App;