import { beforeEach, describe, expect, it, vi } from 'vitest';
import { formatMoves, invertMoves, parseMoves } from '../engine/moves/notation';
import { applyMoves, createSolved, isSolved, statesEqual } from '../engine/state/cube';
import { visualBus } from '../cube/animations/visualBus';
import { usePlayer } from '../features/player/playerStore';
import { useSettings } from '../features/settings/settingsStore';
import { useStats } from '../features/statistics/statsStore';
import { useAttempt } from '../features/timer/attemptStore';
import { useCube } from './cubeStore';
import { useUI } from './uiStore';
import * as c from './controller';

let clock = 1000;

beforeEach(() => {
  clock = 1000;
  vi.spyOn(performance, 'now').mockImplementation(() => clock);
  useSettings.getState().resetAll();
  useSettings.setState({ scrambleAnimated: false, scrambleKind: 'random-move', sound: false });
  c.setMode('free');
  c.setSize(3);
  c.resetCube();
  useStats.setState({ records: [], progress: {} });
  useUI.setState({ completion: null });
});

describe('fila de movimentos e estado lógico', () => {
  it('10. comandos rápidos não corrompem o estado (igual à aplicação sequencial)', () => {
    const seq = parseMoves("R U R' U' F2 D L' B2 M E' S x y' z2 R2 U2");
    const received: string[] = [];
    const detach = visualBus.attach((cmd) => {
      if (cmd.kind === 'turn') received.push(formatMoves([cmd.move]));
    });
    try {
      for (const m of seq) c.performMove(m);
    } finally {
      detach();
    }
    expect(statesEqual(useCube.getState().state, applyMoves(createSolved(3), seq))).toBe(true);
    // Todos os giros foram enfileirados para o renderizador, na ordem.
    expect(received.join(' ')).toBe(formatMoves(seq));
  });

  it('5. o estado lógico acompanha cada movimento', () => {
    c.performSequence("R U");
    expect(statesEqual(useCube.getState().state, applyMoves(createSolved(3), 'R U'))).toBe(true);
    expect(useCube.getState().history.map((m) => formatMoves([m]))).toEqual(['R', 'U']);
  });

  it('desfazer e refazer', () => {
    c.performSequence("R U F'");
    c.undo();
    c.undo();
    expect(statesEqual(useCube.getState().state, applyMoves(createSolved(3), 'R'))).toBe(true);
    c.redo();
    expect(statesEqual(useCube.getState().state, applyMoves(createSolved(3), 'R U'))).toBe(true);
    c.performMove(parseMoves('D')[0]);
    expect(useCube.getState().redoStack).toHaveLength(0);
  });

  it('rejeita movimentos incompatíveis com o tamanho', () => {
    c.setSize(4);
    expect(c.performMove(parseMoves('M')[0], 'user', { silentErrors: true })).toBe(false);
    expect(c.performMove(parseMoves('2R')[0], 'user', { silentErrors: true })).toBe(true);
  });

  it('bloqueia movimentos do usuário durante o embaralhamento animado', () => {
    useCube.setState({ lock: 'scramble' });
    expect(c.performMove(parseMoves('R')[0], 'user', { silentErrors: true })).toBe(false);
    useCube.setState({ lock: null });
  });
});

describe('embaralhamento', () => {
  it('6. embaralha, exibe a sequência e prepara a tentativa', async () => {
    const sc = await c.newScramble({ seed: 'teste' });
    expect(sc).not.toBeNull();
    const { state, scramble, solved } = useCube.getState();
    expect(scramble?.text).toBe(sc!.text);
    expect(solved).toBe(false);
    expect(statesEqual(state, applyMoves(createSolved(3), sc!.moves))).toBe(true);
    expect(useAttempt.getState().phase).toBe('ready');
  });

  it('repetir embaralhamento reproduz o mesmo estado', async () => {
    const sc = await c.newScramble();
    c.performSequence('R U');
    await c.repeatScramble();
    expect(statesEqual(useCube.getState().state, applyMoves(createSolved(3), sc!.moves))).toBe(true);
  });

  it('reiniciar volta ao estado resolvido', async () => {
    await c.newScramble();
    c.resetCube();
    expect(useCube.getState().solved).toBe(true);
    expect(useCube.getState().scramble).toBeNull();
  });
});

describe('cronômetro e detecção de conclusão', () => {
  it('7/8. modo cronometrado: inicia no primeiro movimento e para sozinho ao resolver', async () => {
    c.setMode('timed');
    const sc = await c.newScramble({ seed: 'cron' });
    expect(useAttempt.getState().phase).toBe('ready');
    const solution = invertMoves(sc!.moves);
    clock = 2000;
    c.performMove(solution[0]);
    expect(useAttempt.getState().phase).toBe('running');
    clock = 2000 + 12_345;
    for (const m of solution.slice(1)) c.performMove(m);
    expect(useCube.getState().solved).toBe(true);
    const a = useAttempt.getState();
    expect(a.phase).toBe('finished');
    expect(a.finalElapsed).toBe(12_345);
    const records = useStats.getState().records;
    expect(records).toHaveLength(1);
    expect(records[0]).toMatchObject({ timeMs: 12_345, moves: solution.length, mode: 'timed', size: 3, penalty: 'none', assisted: false });
    await Promise.resolve();
    await Promise.resolve();
    expect(useUI.getState().completion?.record?.id).toBe(records[0].id);
  });

  it('o cronômetro não para enquanto o cubo não estiver realmente resolvido', async () => {
    c.setMode('timed');
    await c.newScramble({ seed: 'nao-para' });
    c.performSequence('R U');
    expect(useAttempt.getState().phase).toBe('running');
    expect(useStats.getState().records).toHaveLength(0);
  });

  it('rotações x/y/z não iniciam o cronômetro nem contam como movimentos', async () => {
    c.setMode('timed');
    await c.newScramble();
    c.performSequence('x y z');
    expect(useAttempt.getState().phase).toBe('ready');
    expect(useAttempt.getState().moves).toBe(0);
  });

  it('speedcubing: inspeção acima de 15 s gera +2', async () => {
    c.setMode('speed');
    useSettings.setState({ inspection: true });
    const sc = await c.newScramble({ seed: 'insp' });
    clock = 0;
    c.timerAction(); // inicia a inspeção
    expect(useAttempt.getState().phase).toBe('inspection');
    clock = 16_000;
    const solution = invertMoves(sc!.moves);
    for (const m of solution) c.performMove(m);
    expect(useStats.getState().records[0].penalty).toBe('+2');
  });

  it('modo de início manual bloqueia movimentos até iniciar', async () => {
    c.setMode('timed');
    useSettings.setState({ timerStart: 'manual' });
    await c.newScramble();
    expect(c.performMove(parseMoves('R')[0], 'user', { silentErrors: true })).toBe(false);
    c.timerAction();
    expect(useAttempt.getState().phase).toBe('running');
    expect(c.performMove(parseMoves('R')[0], 'user', { silentErrors: true })).toBe(true);
  });

  it('abandonar uma tentativa competitiva registra DNF', async () => {
    c.setMode('timed');
    await c.newScramble();
    c.performSequence('R');
    c.resetCube();
    const records = useStats.getState().records;
    expect(records).toHaveLength(1);
    expect(records[0].penalty).toBe('DNF');
  });

  it('modo livre: relógio manual pode ser pausado', () => {
    clock = 0;
    c.timerAction();
    expect(useAttempt.getState().phase).toBe('running');
    clock = 1000;
    c.timerAction();
    expect(useAttempt.getState().phase).toBe('paused');
    clock = 5000;
    expect(c.currentElapsed()).toBe(1000);
    c.timerAction();
    clock = 5500;
    expect(c.currentElapsed()).toBe(1500);
  });

  it('treino: o cronômetro pode ser pausado e os movimentos são conferidos', () => {
    c.startTraining('sexy');
    expect(usePlayer.getState().active).toBe(true);
    expect(useCube.getState().solved).toBe(false);
    c.performMove(parseMoves('R')[0]);
    expect(useAttempt.getState().phase).toBe('running');
    expect(usePlayer.getState().index).toBe(1);
    c.timerAction();
    expect(useAttempt.getState().phase).toBe('paused');
    expect(c.performMove(parseMoves('U')[0], 'user', { silentErrors: true })).toBe(false);
    c.timerAction();
    c.performSequence("U R' U'");
    expect(useCube.getState().solved).toBe(true);
    expect(usePlayer.getState().status).toBe('done');
    expect(useStats.getState().records[0].mode).toBe('training');
  });
});

describe('resolução automática', () => {
  it('14. calcula uma solução válida para o estado atual e a reproduz no cubo', async () => {
    await c.newScramble({ seed: 'auto' });
    const ok = await c.requestSolution();
    expect(ok).toBe(true);
    const p = usePlayer.getState();
    expect(p.active).toBe(true);
    expect(p.moves.length).toBeGreaterThan(0);
    while (c.playerStep()) {
      /* executa cada movimento individualmente */
    }
    expect(useCube.getState().solved).toBe(true);
    expect(usePlayer.getState().status).toBe('done');
  });

  it('usar a resolução automática marca a tentativa como assistida', async () => {
    c.setMode('timed');
    await c.newScramble({ seed: 'assist' });
    c.performMove(parseMoves('R')[0]);
    await c.requestSolution();
    while (c.playerStep()) {
      /* */
    }
    const record = useStats.getState().records[0];
    expect(record.assisted).toBe(true);
  });

  it('voltar uma etapa e reiniciar a reprodução', async () => {
    await c.newScramble({ seed: 'back' });
    const start = useCube.getState().state;
    await c.requestSolution();
    c.playerStep();
    c.playerStep();
    c.playerBack();
    expect(usePlayer.getState().index).toBe(1);
    c.playerRestart();
    expect(statesEqual(useCube.getState().state, start)).toBe(true);
    c.playerSeek(usePlayer.getState().moves.length);
    expect(isSolved(useCube.getState().state)).toBe(true);
  });

  it('informa claramente quando o tamanho não possui resolvedor', async () => {
    c.setSize(4);
    await c.newScramble();
    expect(await c.requestSolution()).toBe(false);
    expect(usePlayer.getState().active).toBe(false);
  });

  it('resolução guiada acompanha o usuário e detecta desvios', async () => {
    await c.startGuided();
    const p = usePlayer.getState();
    expect(p.kind).toBe('guided');
    const first = p.moves[0];
    const wrong = parseMoves(first.base === 'U' ? 'R' : 'U')[0];
    c.performMove(wrong);
    expect(usePlayer.getState().status).toBe('deviation');
    c.undo();
    expect(usePlayer.getState().status).toBe('ready');
    for (const m of usePlayer.getState().moves) c.performMove(m);
    expect(useCube.getState().solved).toBe(true);
    expect(usePlayer.getState().status).toBe('done');
  });
});

describe('desafio progressivo', () => {
  it('níveis são determinísticos e desbloqueiam o próximo', async () => {
    await c.startLevel(1);
    const first = useCube.getState().scramble!.text;
    await c.startLevel(1);
    expect(useCube.getState().scramble!.text).toBe(first);
    expect(c.isLevelUnlocked(3, 2)).toBe(false);
    const solution = invertMoves(useCube.getState().scramble!.moves);
    for (const m of solution) c.performMove(m);
    expect(useStats.getState().progress[3][1].stars).toBe(3);
    expect(c.isLevelUnlocked(3, 2)).toBe(true);
  });
});

describe('persistência', () => {
  it('9. o histórico de tentativas é salvo no armazenamento local', async () => {
    c.setMode('timed');
    const sc = await c.newScramble();
    for (const m of invertMoves(sc!.moves)) c.performMove(m);
    const saved = JSON.parse(localStorage.getItem('cubeforge.stats')!);
    expect(saved.state.records).toHaveLength(1);
  });

  it('12. as configurações são persistidas', () => {
    useSettings.getState().set('turnDurationMs', 333);
    useSettings.getState().applyPreset('pastel');
    const saved = JSON.parse(localStorage.getItem('cubeforge.settings')!);
    expect(saved.state.turnDurationMs).toBe(333);
    expect(saved.state.colorPreset).toBe('pastel');
  });
});
