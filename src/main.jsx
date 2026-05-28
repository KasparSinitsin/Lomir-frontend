import React from "react";
import ReactDOM from "react-dom/client";
import { QueryClientProvider } from "@tanstack/react-query";
import App from "./App.jsx";
import "./index.css";
import { queryClient } from "./lib/queryClient";

function RootWrapper() {
  React.useEffect(() => {
    // Keep the app in DaisyUI's light theme until the real dark mode is implemented.
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <QueryClientProvider client={queryClient}>
      <RootWrapper />
    </QueryClientProvider>
  </React.StrictMode>,
);
