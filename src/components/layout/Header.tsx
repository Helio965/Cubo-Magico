import { ChartColumn, Keyboard, Moon, Settings, Sun } from 'lucide-react';
import { SECTIONS } from './sections';
import { useSettings } from '../../features/settings/settingsStore';
import { useResolvedTheme } from '../../hooks/useTheme';
import { ui, useUI } from '../../store/uiStore';
import { IconButton } from '../ui/IconButton';
import { LogoMark } from '../ui/Logo';


export function Header() {
  const section = useUI((s) => s.section);
  const theme = useResolvedTheme();
  const setSetting = useSettings((s) => s.set);
  return (
    <header className="header">
      <a className="brand" href="#" onClick={(e) => e.preventDefault()} aria-label="CubeForge 3D">
        <LogoMark className="brand-mark" />
        <span>
          <span className="brand-name">
            Cube<em>Forge</em> 3D
          </span>
          <span className="brand-tag micro">Simulador de precisão</span>
        </span>
      </a>
      <nav className="nav" aria-label="Seções">
        {SECTIONS.map(({ id, label, icon: Icon }) => (
          <button
            key={id}
            type="button"
            className="nav-item"
            aria-current={section === id ? 'page' : undefined}
            onClick={() => ui.setSection(id)}
          >
            <Icon aria-hidden="true" />
            <span>{label}</span>
          </button>
        ))}
        <button type="button" className="nav-item" onClick={() => ui.openModal('stats')}>
          <ChartColumn aria-hidden="true" />
          <span>Estatísticas</span>
        </button>
      </nav>
      <div className="header-actions">
        <IconButton
          icon={theme === 'dark' ? Sun : Moon}
          label={theme === 'dark' ? 'Tema claro' : 'Tema escuro'}
          tipPos="bottom"
          onClick={() => setSetting('theme', theme === 'dark' ? 'light' : 'dark')}
          data-testid="btn-theme"
        />
        <IconButton
          icon={Keyboard}
          label="Atalhos de teclado"
          shortcut="?"
          tipPos="bottom"
          className="hide-mobile"
          onClick={() => ui.openModal('shortcuts')}
        />
        <IconButton icon={ChartColumn} label="Estatísticas" tipPos="bottom" onClick={() => ui.openModal('stats')} />
        <IconButton
          icon={Settings}
          label="Configurações"
          shortcut=","
          tipPos="bottom"
          onClick={() => ui.openModal('settings')}
          data-testid="btn-settings"
        />
      </div>
    </header>
  );
}
