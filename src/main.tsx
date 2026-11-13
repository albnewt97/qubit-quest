import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./ui/App.tsx";
import "./ui/global.css";

const container = document.getElementById("root");
if (container === null) {
  throw new Error("Missing #root element in index.html");
}

createRoot(container).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
