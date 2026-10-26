import React from "react";
import { Button, Result } from "antd";

export class EditorErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError() {
    return { hasError: true };
  }

  componentDidCatch(error, info) {
    console.error("Editor crashed:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <Result
          status="warning"
          title="O editor encontrou um problema inesperado"
          subTitle="As alterações não guardadas podem ter sido perdidas. Recarregue a página para continuar a editar."
          extra={
            <Button type="primary" onClick={() => window.location.reload()}>
              Recarregar
            </Button>
          }
        />
      );
    }

    return this.props.children;
  }
}
