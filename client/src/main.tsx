import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter, Routes, Route } from "react-router-dom";
import "./index.css";
import Dashboard from "./pages/Dashboard";
import Editor from "./pages/Editor";

ReactDOM.createRoot(document.getElementById("root")!).render(
  <React.StrictMode>
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/edit/:locale/:file" element={<Editor />} />
        <Route path="/new" element={<Editor />} />
      </Routes>
    </BrowserRouter>
  </React.StrictMode>
);
