import { Link, Navigate, Route, Routes } from "react-router-dom";
import { UserSwitcher } from "./components/UserSwitcher";
import { DocumentListPage } from "./pages/DocumentListPage";
import { EditorPage } from "./pages/EditorPage";

export function App() {
  return (
    <>
      <nav className="app-nav">
        <Link to="/documents" className="app-nav-brand">
          Aajia
        </Link>
        <UserSwitcher />
      </nav>
      <Routes>
        <Route path="/" element={<Navigate to="/documents" replace />} />
        <Route path="/documents" element={<DocumentListPage />} />
        <Route path="/documents/:id" element={<EditorPage />} />
        <Route path="*" element={<Navigate to="/documents" replace />} />
      </Routes>
    </>
  );
}
