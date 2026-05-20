import { Navigate, Route, Routes } from "react-router-dom";
import { DocumentListPage } from "./pages/DocumentListPage";
import { EditorPage } from "./pages/EditorPage";

export function App() {
  return (
    <Routes>
      <Route path="/" element={<Navigate to="/documents" replace />} />
      <Route path="/documents" element={<DocumentListPage />} />
      <Route path="/documents/:id" element={<EditorPage />} />
      <Route path="*" element={<Navigate to="/documents" replace />} />
    </Routes>
  );
}
