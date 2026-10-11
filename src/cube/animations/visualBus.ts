import type { Move } from '../../engine/moves/notation';
import type { CubeState } from '../../engine/state/cube';

/**
 * Canal entre o estado lógico (fonte da verdade) e o renderizador 3D.
 *
 * O estado lógico é atualizado imediatamente a cada movimento; o
 * renderizador mantém sua própria fila e anima os giros em sequência,
 * um de cada vez. Assim, comandos rápidos nunca corrompem o estado e a
 * velocidade da animação não altera o resultado lógico.
 */
export type VisualCommand =
  | { kind: 'turn'; move: Move; durationScale: number }
  | { kind: 'snap'; state: CubeState };

type Listener = (cmd: VisualCommand) => void;

class VisualBus {
  private listener: Listener | null = null;
  private busy = false;
  private idleWaiters: (() => void)[] = [];
  private busyListeners = new Set<(busy: boolean) => void>();
  private turnListeners = new Set<(move: Move) => void>();

  /** O renderizador se registra aqui. Retorna a função de cancelamento. */
  attach(listener: Listener): () => void {
    this.listener = listener;
    return () => {
      if (this.listener === listener) {
        this.listener = null;
        this.setBusy(false);
      }
    };
  }

  get attached(): boolean {
    return this.listener !== null;
  }

  send(cmd: VisualCommand): void {
    if (this.listener) {
      this.listener(cmd);
    } else if (cmd.kind === 'turn') {
      // Sem renderizador (ex.: WebGL indisponível): o giro é "instantâneo".
      this.emitTurn(cmd.move);
    }
  }

  /** Chamado pelo renderizador quando sua fila passa de vazia a ocupada (e vice-versa). */
  setBusy(busy: boolean): void {
    if (this.busy === busy) return;
    this.busy = busy;
    for (const l of this.busyListeners) l(busy);
    if (!busy) {
      const waiters = this.idleWaiters;
      this.idleWaiters = [];
      for (const w of waiters) w();
    }
  }

  isBusy(): boolean {
    return this.busy;
  }

  /** Resolve quando todas as animações pendentes terminarem. */
  whenIdle(): Promise<void> {
    if (!this.busy) return Promise.resolve();
    return new Promise((resolve) => this.idleWaiters.push(resolve));
  }

  onBusyChange(listener: (busy: boolean) => void): () => void {
    this.busyListeners.add(listener);
    return () => this.busyListeners.delete(listener);
  }

  /** Disparado quando a animação de um giro começa (usado pelo áudio). */
  onTurn(listener: (move: Move) => void): () => void {
    this.turnListeners.add(listener);
    return () => this.turnListeners.delete(listener);
  }

  emitTurn(move: Move): void {
    for (const l of this.turnListeners) l(move);
  }
}

export const visualBus = new VisualBus();
