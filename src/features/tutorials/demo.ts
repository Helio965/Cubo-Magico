import { formatMoves, invertMoves, parseMoves } from '../../engine/moves/notation';
import type { LessonDemo } from './lessons';

/** Estado inicial de uma demonstração: o informado ou o inverso do algoritmo. */
export function demoSetup(demo: LessonDemo): string {
  return demo.setup ?? formatMoves(invertMoves(parseMoves(demo.alg)));
}
