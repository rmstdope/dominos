import { StrictMode, type ComponentType } from "react";
import { createRoot } from "react-dom/client";
import "./index.css";
import App from "./App";

const root = createRoot(document.getElementById("root")!);
const render = (Root: ComponentType) =>
  root.render(
    <StrictMode>
      <Root />
    </StrictMode>,
  );

// The app with accounts needs the API, which the one.com site does not have, so it is only built
// on request. Vite replaces the flag at build time and drops the branch it does not take.
if (import.meta.env.VITE_ACCOUNTS === "true") {
  void import("./accounts/AccountsApp").then(({ AccountsApp }) => render(AccountsApp));
} else {
  render(App);
}
