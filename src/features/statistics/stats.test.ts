import { describe, expect, it } from 'vitest';
import type { SolveRecord } from '../../types/game';
import { averageOf, bestAverageOf, effectiveTime, summarize, trimCount } from './stats';
import { combinePenalties, inspectionPenalty, inspectionWarning } from '../timer/inspection';

const INF = Number.POSITIVE_INFINITY;

function rec(timeMs: number, extra: Partial<SolveRecord> = {}): SolveRecord {
  return {
    id: Math.random().toString(36),
    date: Date.now() + Math.random(),
    size: 3,
    mode: 'timed',
    timeMs,
    penalty: 'none',
    moves: 50,
    scramble: '',
    assisted: false,
    ...extra,
  };
}

describe('médias de speedcubing', () => {
  it('descarta 1 resultado em cada extremo para Ao5 e Ao12', () => {
    expect(trimCount(5)).toBe(1);
    expect(trimCount(12)).toBe(1);
    expect(trimCount(50)).toBe(3);
    expect(trimCount(100)).toBe(5);
  });

  it('Ao5 descarta melhor e pior', () => {
    expect(averageOf([10, 12, 14, 16, 100], 5)).toBe(14);
  });

  it('Ao5 com um DNF trata o DNF como o pior resultado', () => {
    expect(averageOf([10, 12, 14, 16, INF], 5)).toBe(14);
  });

  it('Ao5 com dois DNFs é DNF', () => {
    expect(averageOf([10, 12, 14, INF, INF], 5)).toBe(INF);
  });

  it('Ao12 descarta um melhor e um pior e calcula a média dos 10 restantes', () => {
    const times = [5, 10, 10, 10, 10, 10, 10, 10, 10, 10, 10, 99];
    expect(averageOf(times, 12)).toBe(10);
    expect(averageOf([...times.slice(0, 11), INF], 12)).toBe(10);
    expect(averageOf([...times.slice(0, 10), INF, INF], 12)).toBe(INF);
  });

  it('usa apenas as N tentativas mais recentes e retorna null quando faltam tentativas', () => {
    expect(averageOf([1, 2, 3, 4], 5)).toBeNull();
    expect(averageOf([1000, 10, 12, 14, 16, 18], 5)).toBe(14);
  });

  it('calcula a melhor média entre janelas consecutivas', () => {
    expect(bestAverageOf([30, 30, 30, 30, 30, 10, 10, 10, 10], 5)).toBeCloseTo(10);
  });

  it('aplica +2 e DNF ao tempo efetivo', () => {
    expect(effectiveTime({ timeMs: 10_000, penalty: '+2' })).toBe(12_000);
    expect(effectiveTime({ timeMs: 10_000, penalty: 'DNF' })).toBe(INF);
  });

  it('o resumo ignora tentativas assistidas em recordes e médias', () => {
    const records = [rec(20_000), rec(18_000), rec(5_000, { assisted: true }), rec(22_000, { penalty: '+2' })];
    const s = summarize(records);
    expect(s.attempts).toBe(4);
    expect(s.assisted).toBe(1);
    expect(s.best).toBe(18_000);
    expect(s.mean).toBe((20_000 + 18_000 + 24_000) / 3);
  });
});

describe('inspeção WCA', () => {
  it('aplica +2 após 15 s e DNF após 17 s', () => {
    expect(inspectionPenalty(14_999)).toBe('none');
    expect(inspectionPenalty(15_000)).toBe('none');
    expect(inspectionPenalty(15_001)).toBe('+2');
    expect(inspectionPenalty(17_000)).toBe('+2');
    expect(inspectionPenalty(17_001)).toBe('DNF');
  });

  it('emite avisos aos 8 s e 12 s', () => {
    expect(inspectionWarning(7_999)).toBe('none');
    expect(inspectionWarning(8_000)).toBe('8s');
    expect(inspectionWarning(12_500)).toBe('12s');
    expect(inspectionWarning(15_500)).toBe('over');
  });

  it('combina penalidades', () => {
    expect(combinePenalties('none', '+2')).toBe('+2');
    expect(combinePenalties('+2', 'DNF')).toBe('DNF');
  });
});

describe('escala do gráfico', async () => {
  const { niceStep, tickLabel } = await import('./chartScale');
  it('gera passos redondos', () => {
    expect(niceStep(2000, 4)).toBe(500);
    expect(niceStep(40_000, 4)).toBe(10_000);
  });
  it('formata rótulos sem duplicar valores', () => {
    const labels = [0, 500, 1000, 1500, 2000].map((t) => tickLabel(t, 500));
    expect(new Set(labels).size).toBe(labels.length);
    expect(tickLabel(90_000, 10_000)).toBe('1:30');
    expect(tickLabel(12_000, 2000)).toBe('12s');
  });
});
