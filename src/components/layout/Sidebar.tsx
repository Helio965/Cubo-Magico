import { ChevronDown, ChevronUp } from 'lucide-react';
import { ModesPanel } from '../../features/challenges/ModesPanel';
import { SolverPanel } from '../../features/solver/SolverPanel';
import { LearnPanel } from '../../features/tutorials/LearnPanel';
import { useUI, ui } from '../../store/uiStore';
import { MovePad, NotationInput } from '../controls/MovePad';
import { ScramblePanel } from '../controls/ScramblePanel';
import { SizeSelector } from '../controls/SizeSelector';
import { Panel } from '../ui/controls';
import { SECTIONS } from './sections';
import { SideResizer } from './SideResizer';

function PlaySection() {
  return (
    <>
      <Panel index="01" title="Tipo de cubo" id="panel-size">
        <SizeSelector />
      </Panel>
      <Panel index="02" title="Embaralhamento" id="panel-scramble">
        <ScramblePanel />
      </Panel>
      <Panel index="03" title="Movimentação" id="panel-moves">
        <MovePad />
        <NotationInput />
        <p className="hint">
          Arraste sobre uma face do cubo para girar a camada. Teclado: letras para girar, Shift para o sentido
          anti-horário (pressione <kbd>?</kbd> para todos os atalhos).
        </p>
      </Panel>
      <Panel index="04" title="Resolução automática" id="panel-solver">
        <SolverPanel />
      </Panel>
    </>
  );
}

export function Sidebar() {
  const section = useUI((s) => s.section);
  const open = useUI((s) => s.sheetOpen);
  return (
    <aside className="side" data-open={open} aria-label="Painel de controle">
      <div className="side-tabs" role="tablist" aria-label="Seções">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            role="tab"
            className="nav-item"
            aria-selected={section === id}
            aria-current={section === id ? 'page' : undefined}
            onClick={() => (section === id && open ? useUI.setState({ sheetOpen: false }) : ui.setSection(id))}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
        <button
          type="button"
          className="icon-btn side-handle"
          aria-label={open ? 'Recolher painel' : 'Expandir painel'}
          aria-expanded={open}
          onClick={() => useUI.setState({ sheetOpen: !open })}
        >
          {open ? <ChevronDown aria-hidden="true" /> : <ChevronUp aria-hidden="true" />}
        </button>
      </div>
      <div className="side-body scroll-y" id="side-body">
        {section === 'play' && <PlaySection />}
        {section === 'modes' && <ModesPanel />}
        {section === 'learn' && <LearnPanel />}
      </div>
      <SideResizer />
    </aside>
  );
}
