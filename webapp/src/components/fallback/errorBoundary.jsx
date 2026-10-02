import { Component } from "react";

import FallbackScreen from "./fallbackScreen";
import { fallbackTexts } from "./fallbackTexts";

// Evita o ecrã branco quando um componente rebenta ao renderizar
export default class ErrorBoundary extends Component {
  state = { hasError: false };

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error(error, info);
  }

  render() {
    if (!this.state.hasError) return this.props.children;
    const texts = fallbackTexts();
    return <FallbackScreen title={texts.error[0]} text={texts.error[1]} actionLabel={texts.reload} onAction={() => window.location.reload()} />;
  }
}
