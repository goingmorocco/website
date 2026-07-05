import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";
import MediaLibrary from "./pages/MediaLibrary";
import CategoryManager from "./pages/CategoryManager";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/edit/:locale/:file" element={<Editor />} />
        <Route path="/new" element={<Editor />} />
        <Route path="/media" element={<MediaLibrary />} />
        <Route path="/categories" element={<CategoryManager />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
