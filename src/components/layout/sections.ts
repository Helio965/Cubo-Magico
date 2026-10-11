import { BookOpen, Box, Swords } from 'lucide-react';
import type { Section } from '../../store/uiStore';

export const SECTIONS: { id: Section; label: string; icon: typeof Box }[] = [
  { id: 'play', label: 'Simulador', icon: Box },
  { id: 'modes', label: 'Desafios', icon: Swords },
  { id: 'learn', label: 'Aprender', icon: BookOpen },
];
