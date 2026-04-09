import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

function RootWrapper() {
  React.useEffect(() => {
    // Keep the app in DaisyUI's light theme until the real dark mode is implemented.
    document.documentElement.setAttribute("data-theme", "light");
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootWrapper />
  </React.StrictMode>,
);
