export interface WebGLSupport {
  ok: boolean;
  reason?: string;
}

/** Verifica se o navegador consegue criar um contexto WebGL. */
export function detectWebGL(): WebGLSupport {
  if (typeof document === 'undefined') return { ok: false, reason: 'Ambiente sem DOM.' };
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl2') ?? canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl');
    if (!gl) {
      return {
        ok: false,
        reason: 'Seu navegador ou dispositivo não disponibilizou WebGL, necessário para a visualização 3D.',
      };
    }
    return { ok: true };
  } catch (error) {
    return { ok: false, reason: `Falha ao inicializar o WebGL: ${(error as Error).message}` };
  }
}
