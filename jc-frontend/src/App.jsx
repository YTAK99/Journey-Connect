import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import BackendTestPage from "./pages/BackendTestPage";
import MyPage from "./pages/MyPage";
import WritePost from "./pages/WritePost";
import MyPosts from "./pages/MyPosts";
import Signup from "./pages/Signup";


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
      </Routes>
    </BrowserRouter>
  );
}

export default App;