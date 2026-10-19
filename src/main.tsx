import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import { AccountsApp } from "./accounts/AccountsApp";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <AccountsApp />
  </StrictMode>,
);
