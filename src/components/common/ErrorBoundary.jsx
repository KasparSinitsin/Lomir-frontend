import React from "react";
import { useTranslation } from "react-i18next";
import Alert from "./Alert";

/**
 * The boundary is a class component and cannot hold a hook, so its default
 * fallback is a function component - the same split as
 * `MessageBubbleErrorBoundary`, which takes its one string as a prop.
 *
 * ⚠️ The raw `error.message` is deliberately not shown. It is whatever the JS
 * engine produced ("can't access property ..."), always English, untranslatable
 * and meaningless to a reader. `componentDidCatch` logs it to the console,
 * which is where it belongs.
 */
const DefaultFallback = () => {
  const { t } = useTranslation();
  return <Alert type="error" message={t("errors.renderFailed")} />;
};

class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { error: null, errorInfo: null };
  }

  static getDerivedStateFromError(error) {
    return { error };
  }

  componentDidCatch(error, errorInfo) {
    this.setState({ errorInfo });
    console.error(this.props.logLabel || "Render failed:", {
      error,
      errorInfo,
    });
  }

  render() {
    if (!this.state.error) return this.props.children;

    if (this.props.fallback) {
      return this.props.fallback(this.state.error, this.state.errorInfo);
    }

    return <DefaultFallback />;
  }
}

export default ErrorBoundary;
