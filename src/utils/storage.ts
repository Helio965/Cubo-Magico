import { createJSONStorage, type StateStorage } from 'zustand/middleware';
import { toast } from '../store/toastStore';

let warned = false;

function warn(error: unknown) {
  if (warned) return;
  warned = true;
  const quota = error instanceof DOMException && /quota/i.test(error.name);
  toast(
    quota
      ? 'O armazenamento local está cheio. Novos registros não serão salvos até liberar espaço.'
      : 'Não foi possível acessar o armazenamento local. Suas preferências e estatísticas valerão apenas nesta sessão.',
    'warning',
    7000,
  );
}

/** localStorage protegido: falhas (modo privado, cota cheia) nunca quebram a aplicação. */
const safeLocalStorage: StateStorage = {
  getItem: (name) => {
    try {
      return localStorage.getItem(name);
    } catch (error) {
      warn(error);
      return null;
    }
  },
  setItem: (name, value) => {
    try {
      localStorage.setItem(name, value);
    } catch (error) {
      warn(error);
    }
  },
  removeItem: (name) => {
    try {
      localStorage.removeItem(name);
    } catch (error) {
      warn(error);
    }
  },
};

export const safeJSONStorage = createJSONStorage(() => safeLocalStorage);
