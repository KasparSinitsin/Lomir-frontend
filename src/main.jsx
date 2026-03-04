import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import "./index.css";

function RootWrapper() {
  React.useEffect(() => {
    document.documentElement.setAttribute("data-theme", "lomirlite");
  }, []);

  return <App />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <RootWrapper />
  </React.StrictMode>,
);