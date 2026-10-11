export type GameMode = 'free' | 'timed' | 'speed' | 'training' | 'guided' | 'fewest' | 'progressive';

export type Penalty = 'none' | '+2' | 'DNF';

export interface SolveRecord {
  readonly id: string;
  readonly date: number;
  readonly size: number;
  readonly mode: GameMode;
  /** Tempo bruto em milissegundos (sem penalidade). */
  readonly timeMs: number;
  readonly penalty: Penalty;
  /** Movimentos de camada executados (rotações x/y/z não contam). */
  readonly moves: number;
  readonly scramble: string;
  readonly seed?: string;
  /** Recursos de assistência (resolução automática, demonstração) foram usados. */
  readonly assisted: boolean;
  readonly inspectionMs?: number;
  readonly level?: number;
  /** Comprimento da solução calculada pelo computador (desafio de movimentos). */
  readonly reference?: number | null;
}

export interface ModeInfo {
  readonly id: GameMode;
  readonly name: string;
  readonly short: string;
  readonly description: string;
  readonly timed: boolean;
}

export const MODES: readonly ModeInfo[] = [
  {
    id: 'free',
    name: 'Exploração livre',
    short: 'Livre',
    description: 'Manipule o cubo sem regras. O cronômetro funciona como um relógio manual que pode ser pausado.',
    timed: false,
  },
  {
    id: 'timed',
    name: 'Desafio cronometrado',
    short: 'Cronometrado',
    description: 'Embaralhe e resolva no menor tempo possível. O tempo começa no primeiro movimento e para sozinho quando o cubo é resolvido.',
    timed: true,
  },
  {
    id: 'speed',
    name: 'Speedcubing',
    short: 'Speedcubing',
    description: 'Modo competitivo com inspeção de 15 s (regras WCA), penalidades +2/DNF e médias Ao5 e Ao12.',
    timed: true,
  },
  {
    id: 'training',
    name: 'Treinamento',
    short: 'Treino',
    description: 'Pratique algoritmos. O sistema prepara o caso e confere cada movimento que você executa.',
    timed: true,
  },
  {
    id: 'guided',
    name: 'Resolução guiada',
    short: 'Guiada',
    description: 'O resolvedor calcula a solução e orienta você movimento a movimento.',
    timed: false,
  },
  {
    id: 'fewest',
    name: 'Desafio de movimentos',
    short: 'Movimentos',
    description: 'Resolva usando a menor quantidade de movimentos possível e compare com a solução do computador.',
    timed: false,
  },
  {
    id: 'progressive',
    name: 'Desafio progressivo',
    short: 'Progressivo',
    description: 'Níveis com embaralhamentos cada vez maiores. Resolva para desbloquear o próximo.',
    timed: false,
  },
];

export const modeInfo = (id: GameMode): ModeInfo => MODES.find((m) => m.id === id)!;

export const SUPPORTED_SIZES = [2, 3, 4, 5, 6, 7] as const;
export type CubeSize = (typeof SUPPORTED_SIZES)[number];
