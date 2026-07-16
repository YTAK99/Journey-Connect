import { BrowserRouter, Routes, Route } from "react-router-dom";
import Home from "./pages/Home";
import Login from "./pages/Login";
import BackendTestPage from "./pages/BackendTestPage";

function App() {
    return (
        <BrowserRouter>
  <Routes>
    <Route path="/" element={<Login />} />
    <Route path="/home" element={<Home />} />
    <Route path="/test" element={<BackendTestPage />} />
</Routes>
        </BrowserRouter>
    );
}

export default App;