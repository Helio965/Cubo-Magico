import type { LucideIcon } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

interface IconButtonProps extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'children'> {
  icon: LucideIcon;
  label: string;
  shortcut?: string;
  pressed?: boolean;
  primary?: boolean;
  showLabel?: boolean;
  tipPos?: 'top' | 'bottom' | 'left';
}

/** Botão de ícone com rótulo acessível e tooltip (com atalho de teclado). */
export function IconButton({
  icon: Icon,
  label,
  shortcut,
  pressed,
  primary,
  showLabel,
  tipPos = 'top',
  className = '',
  ...rest
}: IconButtonProps) {
  const tip = shortcut ? `${label}\n${shortcut}` : label;
  return (
    <button
      type="button"
      className={`icon-btn ${primary ? 'is-primary' : ''} ${showLabel ? 'with-label' : ''} ${className}`}
      aria-label={label}
      aria-pressed={pressed}
      aria-keyshortcuts={shortcut}
      data-tip={tip}
      data-tip-pos={tipPos === 'top' ? undefined : tipPos}
      {...rest}
    >
      <Icon aria-hidden="true" />
      {showLabel && <span>{label}</span>}
    </button>
  );
}
