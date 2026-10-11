import { Component, lazy, Suspense, useMemo, type ReactNode } from 'react';
import { TriangleAlert } from 'lucide-react';
import { CubeNet } from '../../components/CubeNet';
import { detectWebGL } from './webgl';

const CubeCanvas = lazy(() => import('./CubeCanvas'));

class RenderBoundary extends Component<{ children: ReactNode }, { error: Error | null }> {
  state = { error: null as Error | null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error('Falha na visualização 3D:', error);
  }

  render() {
    if (this.state.error) {
      return (
        <Fallback
          title="A visualização 3D encontrou um erro."
          reason={this.state.error.message}
          retry={() => this.setState({ error: null })}
        />
      );
    }
    return this.props.children;
  }
}

function Fallback({ title, reason, retry }: { title: string; reason?: string; retry?: () => void }) {
  return (
    <div className="fallback" role="alert">
      <div className="callout is-warning">
        <TriangleAlert aria-hidden="true" />
        <div>
          <strong>{title}</strong>
          {reason && <p>{reason}</p>}
          <p style={{ marginTop: 6 }}>
            O simulador continua funcionando no modo 2D abaixo: use os botões de movimento, o teclado ou digite
            sequências. Para a visualização 3D, ative a aceleração de hardware do navegador ou use uma versão atualizada
            do Chrome, Edge, Firefox ou Safari.
          </p>
        </div>
      </div>
      <CubeNet cell={22} className="glass" />
      {retry && (
        <button type="button" className="btn" onClick={retry}>
          Tentar novamente
        </button>
      )}
    </div>
  );
}

function Loader() {
  return (
    <div className="loader" aria-label="Carregando visualização 3D" role="status">
      <div className="loader-cube" />
    </div>
  );
}

export function CubeViewport() {
  const support = useMemo(() => detectWebGL(), []);
  if (!support.ok) return <Fallback title="WebGL indisponível neste dispositivo." reason={support.reason} />;
  return (
    <RenderBoundary>
      <Suspense fallback={<Loader />}>
        <CubeCanvas />
      </Suspense>
    </RenderBoundary>
  );
}
