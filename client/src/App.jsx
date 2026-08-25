import { BrowserRouter, Routes, Route } from "react-router-dom";
import { Toaster } from "react-hot-toast";
import { AuthProvider } from "./auth/AuthContext";
import Home from "./pages/home";
import Join from "./pages/join";
import NotePage from "./pages/NotePage";
import Login from "./pages/Login";
import Register from "./pages/Register";
import ManageNotesPage from "./pages/ManageNotesPage";

export default function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Toaster
          position="bottom-center"
          toastOptions={{
            duration: 3000,
            style: {
              fontFamily: '"Inter", sans-serif',
              fontSize: "14px",
              borderRadius: "12px",
              padding: "12px 20px",
              background: "#283044",
              color: "#eef0ff",
              boxShadow: "0 10px 30px rgba(19, 27, 46, 0.2)",
            },
            success: {
              iconTheme: {
                primary: "#4648d4",
                secondary: "#fff",
              },
            },
          }}
        />
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/notes" element={<ManageNotesPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/join" element={<Join />} />
          <Route path="/note/:noteId" element={<NotePage />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}