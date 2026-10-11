/**
 * Registro de sondas somente leitura usadas pelos testes de ponta a ponta
 * (ex.: posição atual da câmera). Não tem efeito no funcionamento normal.
 */
const probes = new Map<string, () => unknown>();

export function registerProbe(name: string, fn: () => unknown): () => void {
  probes.set(name, fn);
  return () => {
    if (probes.get(name) === fn) probes.delete(name);
  };
}

export function readProbe(name: string): unknown {
  return probes.get(name)?.();
}
