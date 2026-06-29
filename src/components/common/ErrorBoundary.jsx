import React from "react";

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

    return (
      <div className="rounded-lg border border-error/30 bg-error/10 p-4 text-error">
        <p className="font-medium">Something went wrong.</p>
        <p className="mt-1 text-sm opacity-80">{this.state.error.message}</p>
      </div>
    );
  }
}

export default ErrorBoundary;
