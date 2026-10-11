import { ui } from '../../store/uiStore';
import { Modal } from '../ui/Modal';

const GROUPS: { title: string; items: [string, string[]][] }[] = [
  {
    title: 'Movimentos',
    items: [
      ['Girar face (horário)', ['R', 'L', 'U', 'D', 'F', 'B']],
      ['Anti-horário', ['Shift', '+ letra']],
      ['Meia volta (180°)', ['letra', 'duas vezes']],
      ['Movimento largo (Rw…)', ['Alt', '+ letra']],
      ['Camada interna (2R, 3R…)', ['2–9', 'depois a letra']],
      ['Fatias (cubos ímpares)', ['M', 'E', 'S']],
      ['Rotação do cubo', ['X', 'Y', 'Z']],
    ],
  },
  {
    title: 'Ações',
    items: [
      ['Cronômetro / inspeção', ['Espaço']],
      ['Novo embaralhamento', ['N']],
      ['Desfazer', ['Ctrl', 'Z']],
      ['Refazer', ['Ctrl', 'Y']],
      ['Reiniciar cubo', ['Shift', 'Backspace']],
      ['Redefinir câmera', ['C']],
      ['Estatísticas', ['T']],
      ['Configurações', [',']],
      ['Reprodutor: anterior / próximo', ['[', ']']],
      ['Reprodutor: tocar / pausar', ['P']],
      ['Fechar diálogos', ['Esc']],
      ['Esta ajuda', ['?']],
    ],
  },
];

export function ShortcutsModal() {
  return (
    <Modal title="Atalhos de teclado" onClose={ui.closeModal} wide>
      <div className="shortcut-grid">
        {GROUPS.map((g) => (
          <div key={g.title}>
            <div className="micro" style={{ margin: '4px 0 6px', color: 'var(--accent-strong)' }}>
              {g.title}
            </div>
            {g.items.map(([label, keys]) => (
              <div className="shortcut" key={label}>
                <span>{label}</span>
                <span>
                  {keys.map((k) => (
                    <kbd key={k}>{k}</kbd>
                  ))}
                </span>
              </div>
            ))}
          </div>
        ))}
      </div>
      <p className="hint" style={{ marginTop: 14 }}>
        Exemplos: <kbd>R</kbd> → R · <kbd>Shift</kbd>+<kbd>R</kbd> → R' · <kbd>R</kbd> <kbd>R</kbd> → R2 ·{' '}
        <kbd>Alt</kbd>+<kbd>R</kbd> → Rw · <kbd>2</kbd> <kbd>R</kbd> → 2R. Atalhos ficam inativos enquanto você digita em
        um campo de texto.
      </p>
    </Modal>
  );
}
