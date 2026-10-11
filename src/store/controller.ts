import { visualBus } from '../cube/animations/visualBus';
import {
  formatMoves,
  invertMove,
  invertMoves,
  isRotationBase,
  NotationError,
  parseMoves,
  validateMove,
  type Move,
} from '../engine/moves/notation';
import { defaultScrambleLength, generateScramble, type Scramble } from '../engine/scramble/scramble';
import { solverSupport } from '../engine/solver';
import { solverClient } from '../engine/solver/client';
import { applyMove, applyMoves, createSolved, isSolved, type CubeState } from '../engine/state/cube';
import { playCompleteSound, playTurnSound } from '../features/audio/audio';
import { LEVELS, levelSeed, levelStars } from '../features/challenges/levels';
import { followMove } from '../features/player/matching';
import { PLAYER_IDLE, usePlayer, type PlayerKind, type PlayerMeta } from '../features/player/playerStore';
import { getSettings, prefersReducedMotion } from '../features/settings/settingsStore';
import { effectiveTime, filterRecords, summarize } from '../features/statistics/stats';
import { useStats } from '../features/statistics/statsStore';
import { algorithmById } from '../features/tutorials/algorithms';
import { elapsedOf, useAttempt } from '../features/timer/attemptStore';
import type { GameMode, SolveRecord } from '../types/game';
import { useCube, type LockReason } from './cubeStore';
import { toast } from './toastStore';
import { useUI, type CompletionInfo } from './uiStore';

export type MoveSource = 'user' | 'undo' | 'redo' | 'player' | 'scramble' | 'system';

const now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now());

/** Modos em que o cronômetro inicia automaticamente no primeiro movimento. */
export function isTimedMode(mode: GameMode): boolean {
  return mode === 'timed' || mode === 'speed' || mode === 'training' || mode === 'fewest' || mode === 'progressive';
}

/** Modos competitivos: tentativas iniciadas que são abandonadas viram DNF. */
export function isCompetitiveMode(mode: GameMode): boolean {
  return mode === 'timed' || mode === 'speed' || mode === 'fewest' || mode === 'progressive';
}

export function usesInspection(mode: GameMode): boolean {
  return mode === 'speed' && getSettings().inspection;
}

function lockMessage(lock: LockReason): string {
  switch (lock) {
    case 'scramble':
      return 'Aguarde o fim do embaralhamento.';
    case 'playback':
      return 'Pause a reprodução para movimentar o cubo.';
    default:
      return 'Aguarde a operação em andamento.';
  }
}

let soundUnsubscribe: (() => void) | null = null;
/** Liga os efeitos sonoros ao início de cada animação de giro. */
export function initAudioBridge(): void {
  soundUnsubscribe?.();
  soundUnsubscribe = visualBus.onTurn(() => playTurnSound());
}

// ---------------------------------------------------------------------------
// Movimentos
// ---------------------------------------------------------------------------

export interface PerformOptions {
  durationScale?: number;
  silentErrors?: boolean;
}

/**
 * Aplica um movimento ao estado lógico (fonte da verdade), atualiza o
 * histórico, o cronômetro, o player e enfileira a animação.
 * Retorna false quando o movimento foi bloqueado.
 */
export function performMove(move: Move, source: MoveSource = 'user', opts: PerformOptions = {}): boolean {
  const cube = useCube.getState();
  const error = validateMove(move, cube.size);
  if (error) {
    if (!opts.silentErrors) toast(error, 'warning');
    return false;
  }
  const userish = source === 'user' || source === 'undo' || source === 'redo';
  if (userish && cube.lock) {
    if (!opts.silentErrors) toast(lockMessage(cube.lock), 'info');
    return false;
  }
  const counted = !isRotationBase(move.base);
  const attempt = useAttempt.getState();
  const settings = getSettings();
  if ((userish || source === 'player') && counted && isTimedMode(cube.mode)) {
    if (attempt.phase === 'ready' && settings.timerStart === 'manual' && source !== 'player') {
      if (!opts.silentErrors) toast('Pressione Espaço ou o botão Iniciar para começar a tentativa.', 'info');
      return false;
    }
    if (attempt.phase === 'paused') {
      if (!opts.silentErrors) toast('O cronômetro está pausado. Retome (Espaço) para continuar.', 'info');
      return false;
    }
  }

  const nextState = applyMove(cube.state, move);
  let { history, redoStack } = cube;
  if (source === 'user' || source === 'player') {
    history = [...history, move];
    if (source === 'user') redoStack = [];
  } else if (source === 'undo') {
    history = history.slice(0, -1);
    redoStack = [...redoStack, invertMove(move)];
  } else if (source === 'redo') {
    history = [...history, move];
    redoStack = redoStack.slice(0, -1);
  }
  const solved = isSolved(nextState);
  useCube.setState({ state: nextState, solved, history, redoStack, moveSerial: cube.moveSerial + 1 });
  visualBus.send({ kind: 'turn', move, durationScale: opts.durationScale ?? 1 });

  if (source === 'scramble' || source === 'system') return true;

  // Cronômetro e contagem de movimentos
  if (counted) {
    const a = useAttempt.getState();
    if (a.phase === 'finished' && cube.mode === 'free') useAttempt.getState().reset();
    if (isTimedMode(cube.mode) && (a.phase === 'ready' || a.phase === 'inspection')) {
      useAttempt.getState().start(now());
    }
    const phase = useAttempt.getState().phase;
    if (phase !== 'finished') useAttempt.getState().countMove(source === 'undo' ? -1 : 1);
  }

  if (source !== 'player') notifyPlayer(move);
  if (solved) handleSolved();
  return true;
}

export function performSequence(input: string | readonly Move[], source: MoveSource = 'user'): boolean {
  let moves: readonly Move[];
  try {
    moves = typeof input === 'string' ? parseMoves(input) : input;
  } catch (e) {
    toast(e instanceof NotationError ? e.message : 'Sequência inválida.', 'warning');
    return false;
  }
  const n = useCube.getState().size;
  for (const m of moves) {
    const error = validateMove(m, n);
    if (error) {
      toast(error, 'warning');
      return false;
    }
  }
  for (const m of moves) if (!performMove(m, source)) return false;
  return true;
}

export function undo(): void {
  const { history } = useCube.getState();
  const last = history[history.length - 1];
  if (!last) {
    toast('Nada para desfazer.', 'info');
    return;
  }
  performMove(invertMove(last), 'undo');
}

export function redo(): void {
  const { redoStack } = useCube.getState();
  const next = redoStack[redoStack.length - 1];
  if (!next) {
    toast('Nada para refazer.', 'info');
    return;
  }
  performMove(next, 'redo');
}

/** Substitui o estado sem animação. */
function snapTo(state: CubeState, extra: Partial<ReturnType<typeof useCube.getState>> = {}): void {
  useCube.setState((s) => ({
    state,
    solved: isSolved(state),
    revision: s.revision + 1,
    moveSerial: s.moveSerial + 1,
    ...extra,
  }));
  visualBus.send({ kind: 'snap', state });
}

// ---------------------------------------------------------------------------
// Tentativas, conclusão e cronômetro
// ---------------------------------------------------------------------------

export function attemptInProgress(): boolean {
  const { phase } = useAttempt.getState();
  return phase === 'running' || phase === 'paused' || phase === 'inspection';
}

/** Abandona a tentativa atual; tentativas competitivas iniciadas viram DNF. */
export function abandonAttempt(): void {
  if (!attemptInProgress()) return;
  const record = useAttempt.getState().abandon(now());
  if (record && isCompetitiveMode(record.mode)) {
    useStats.getState().addRecord(record);
    toast('Tentativa abandonada e registrada como DNF.', 'warning');
  }
}

function handleSolved(): void {
  const cube = useCube.getState();
  const attempt = useAttempt.getState();
  const player = usePlayer.getState();
  if (player.active && (player.kind === 'guided' || player.kind === 'training' || player.kind === 'lesson')) {
    usePlayer.setState({ playing: false, status: 'done', index: player.moves.length, offPath: [], partial: 0 });
    if (cube.lock === 'playback') useCube.setState({ lock: null });
  }

  if (attempt.phase === 'running' || attempt.phase === 'paused') {
    const record = attempt.finish(now());
    const save = record.mode !== 'guided';
    const before = summarize(filterRecords(useStats.getState().records, { size: record.size, mode: record.mode }));
    if (save) useStats.getState().addRecord(record);
    const after = summarize(filterRecords(useStats.getState().records, { size: record.size, mode: record.mode }));
    const time = effectiveTime(record);
    const info: CompletionInfo = {
      record,
      mode: record.mode,
      size: record.size,
      moves: record.moves,
      timeMs: record.timeMs,
      isBest: save && !record.assisted && Number.isFinite(time) && (before.best === null || time < before.best),
      ao5: after.ao5,
      reference: record.reference,
    };
    if (record.mode === 'progressive' && record.level) {
      const level = LEVELS[record.level - 1];
      const stars = record.assisted ? 1 : levelStars(record.moves, level.length);
      useStats.getState().saveLevel(record.size, record.level, { stars, moves: record.moves, timeMs: record.timeMs });
      info.level = { level: record.level, stars, next: record.level < LEVELS.length ? record.level + 1 : null };
    }
    void showCompletion(info);
    return;
  }

  // Resolvido sem cronômetro ativo (exploração, resolução guiada…)
  if (attempt.phase === 'ready' || attempt.phase === 'inspection') {
    const finished = attempt.finish(now());
    void showCompletion({
      record: null,
      mode: finished.mode,
      size: cube.size,
      moves: finished.moves,
      timeMs: null,
      isBest: false,
      ao5: null,
    });
  }
}

async function showCompletion(info: CompletionInfo): Promise<void> {
  await visualBus.whenIdle();
  playCompleteSound();
  useUI.setState({ completion: info });
}

/**
 * Ação do cronômetro (tecla Espaço, botão ou toque duplo), dependente do modo:
 * - Livre: inicia / pausa / retoma o relógio manual;
 * - Cronometrado/Speedcubing: novo embaralhamento → inspeção → início;
 * - Treino: pausa e retoma.
 */
export function timerAction(): void {
  const cube = useCube.getState();
  const a = useAttempt.getState();
  const t = now();
  if (cube.lock === 'scramble') return;
  switch (cube.mode) {
    case 'free':
      if (a.phase === 'running') a.pause(t);
      else if (a.phase === 'paused') a.resume(t);
      else {
        if (a.phase === 'finished') a.reset();
        useAttempt.setState({ mode: 'free', size: cube.size, scramble: cube.scramble });
        useAttempt.getState().start(t);
      }
      return;
    case 'training':
      if (a.phase === 'running') a.pause(t);
      else if (a.phase === 'paused') a.resume(t);
      else if (a.phase === 'ready') a.start(t);
      else if (a.phase === 'finished') nextTrainingRep();
      return;
    case 'guided':
      return;
    default:
      if (a.phase === 'idle' || a.phase === 'finished') {
        if (cube.mode === 'progressive') {
          const lvl = a.level ?? 1;
          void startLevel(a.phase === 'finished' && a.lastResult?.penalty !== 'DNF' ? Math.min(lvl + 1, LEVELS.length) : lvl);
        } else void newScramble();
      } else if (a.phase === 'ready') {
        if (usesInspection(cube.mode)) a.startInspection(t);
        else a.start(t);
      } else if (a.phase === 'inspection') a.start(t);
  }
}

export function pauseTimer(): void {
  useAttempt.getState().pause(now());
}

export function resumeTimer(): void {
  useAttempt.getState().resume(now());
}

/** Zera o cronômetro (apenas fora de tentativas competitivas). */
export function resetTimer(): void {
  const a = useAttempt.getState();
  const cube = useCube.getState();
  if (attemptInProgress() && isCompetitiveMode(cube.mode)) {
    abandonAttempt();
    return;
  }
  useAttempt.setState({
    phase: cube.scramble ? 'ready' : 'idle',
    startedAt: null,
    elapsedBefore: 0,
    finalElapsed: 0,
    inspectionStartedAt: null,
    penalty: 'none',
    moves: a.moves,
  });
}

export function currentElapsed(): number {
  return elapsedOf(useAttempt.getState(), now());
}

// ---------------------------------------------------------------------------
// Embaralhamento, reinício, tamanho e modo
// ---------------------------------------------------------------------------

export interface ScrambleRequest {
  seed?: string;
  length?: number;
  animated?: boolean;
  kind?: 'random-move' | 'random-state';
  level?: number;
}

export function scrambleLengthFor(size: number): number {
  return getSettings().scrambleLengths[size] ?? defaultScrambleLength(size);
}

export async function newScramble(req: ScrambleRequest = {}): Promise<Scramble | null> {
  const cube = useCube.getState();
  if (cube.lock === 'scramble') return null;
  closePlayer();
  abandonAttempt();
  const size = cube.size;
  const settings = getSettings();
  const kind = req.kind ?? (req.level ? 'random-move' : settings.scrambleKind);
  let scramble: Scramble;
  if (kind === 'random-state' && (size === 2 || size === 3) && req.length === undefined) {
    useUI.setState({ busyMessage: 'Gerando embaralhamento por estado aleatório…' });
    try {
      scramble = await solverClient.randomStateScramble(size, req.seed);
    } catch (e) {
      toast(`Falha no embaralhamento por estado aleatório (${(e as Error).message}). Usando movimentos aleatórios.`, 'warning');
      scramble = generateScramble({ size, length: scrambleLengthFor(size), seed: req.seed });
    } finally {
      useUI.setState({ busyMessage: null });
    }
    if (useCube.getState().size !== size) return null;
  } else {
    scramble = generateScramble({ size, length: req.length ?? scrambleLengthFor(size), seed: req.seed });
  }
  const animated = (req.animated ?? settings.scrambleAnimated) && !prefersReducedMotion() && visualBus.attached;
  await applyScramble(scramble, animated, req.level);
  return scramble;
}

export async function repeatScramble(): Promise<void> {
  const last = useCube.getState().lastScramble;
  if (!last) {
    toast('Nenhum embaralhamento anterior para repetir.', 'info');
    return;
  }
  if (last.size !== useCube.getState().size) {
    toast('O último embaralhamento é de outro tamanho de cubo.', 'warning');
    return;
  }
  closePlayer();
  abandonAttempt();
  await applyScramble(last, getSettings().scrambleAnimated && !prefersReducedMotion() && visualBus.attached, useAttempt.getState().level);
}

async function applyScramble(scramble: Scramble, animated: boolean, level?: number): Promise<void> {
  const size = scramble.size;
  const solved = createSolved(size);
  const finalState = applyMoves(solved, scramble.moves);
  const mode = useCube.getState().mode;
  useAttempt.getState().prepare({ mode, size, scramble, level });
  if (animated) {
    snapTo(solved, { history: [], redoStack: [], scramble, lastScramble: scramble, lock: 'scramble' });
    const total = 1600;
    const scale = Math.min(0.55, Math.max(0.12, total / (scramble.moves.length * getSettings().turnDurationMs)));
    for (const m of scramble.moves) performMove(m, 'scramble', { durationScale: scale });
    await visualBus.whenIdle();
    if (useCube.getState().lock === 'scramble') useCube.setState({ lock: null });
  } else {
    snapTo(finalState, { history: [], redoStack: [], scramble, lastScramble: scramble, lock: null });
  }
  if (mode === 'fewest') void computeReference();
}

async function computeReference(): Promise<void> {
  const { state, size } = useCube.getState();
  if (!solverSupport(size).available) {
    useAttempt.getState().setReference(null);
    return;
  }
  try {
    const result = await solverClient.solve(state, { timeLimitMs: 1500 });
    useAttempt.getState().setReference(result.length);
  } catch {
    useAttempt.getState().setReference(null);
  }
}

export function resetCube(): void {
  closePlayer();
  abandonAttempt();
  const { size, mode } = useCube.getState();
  useAttempt.getState().reset();
  useAttempt.setState({ mode, size });
  snapTo(createSolved(size), { history: [], redoStack: [], scramble: null, lock: null });
}

export function setSize(size: number): void {
  const cube = useCube.getState();
  if (size === cube.size) return;
  closePlayer();
  abandonAttempt();
  useAttempt.getState().reset();
  useAttempt.setState({ mode: cube.mode, size });
  useCube.setState({ size });
  snapTo(createSolved(size), { history: [], redoStack: [], scramble: null, lock: null });
  useUI.setState((s) => ({ layerDepth: Math.min(s.layerDepth, Math.max(1, Math.floor(size / 2))), wide: size > 2 && s.wide }));
  ui_resetCamera();
  warmSolver(size);
}

export function setMode(mode: GameMode): void {
  const cube = useCube.getState();
  if (mode === cube.mode) return;
  closePlayer();
  abandonAttempt();
  useCube.setState({ mode });
  useAttempt.getState().reset();
  useAttempt.setState({ mode, size: cube.size });
  if (mode === 'guided' && !solverSupport(cube.size).available) {
    toast(`Resolução guiada disponível apenas para 2×2 e 3×3.`, 'info', 5000);
  }
}

function ui_resetCamera() {
  useUI.setState((s) => ({ cameraResetToken: s.cameraResetToken + 1 }));
}

/** Pré-calcula as tabelas do resolvedor em segundo plano. */
export function warmSolver(size: number): void {
  if (!solverSupport(size).available || solverClient.isReady(size)) {
    if (solverClient.isReady(size)) useUI.setState({ solverStatus: 'ready' });
    else useUI.setState({ solverStatus: 'idle' });
    return;
  }
  useUI.setState({ solverStatus: 'preparing' });
  solverClient
    .prepare(size)
    .then(() => {
      if (useCube.getState().size === size) useUI.setState({ solverStatus: 'ready' });
    })
    .catch(() => useUI.setState({ solverStatus: 'error' }));
}

// ---------------------------------------------------------------------------
// Resolução automática e player de sequências
// ---------------------------------------------------------------------------

export async function requestSolution(kind: PlayerKind = 'solution'): Promise<boolean> {
  const cube = useCube.getState();
  const support = solverSupport(cube.size);
  if (!support.available) {
    toast(support.reason ?? 'Resolução indisponível.', 'info', 6000);
    return false;
  }
  if (cube.solved) {
    toast('O cubo já está resolvido.', 'info');
    return false;
  }
  if (cube.lock) {
    toast(lockMessage(cube.lock), 'info');
    return false;
  }
  if (kind === 'solution') useAttempt.getState().markAssisted();
  const startSerial = cube.moveSerial;
  const startState = cube.state;
  useUI.setState({ solverStatus: 'solving' });
  try {
    const result = await solverClient.solve(startState, { timeLimitMs: 900 });
    useUI.setState({ solverStatus: 'ready' });
    if (useCube.getState().moveSerial !== startSerial) {
      toast('O cubo foi alterado durante o cálculo. Solicite a solução novamente.', 'warning');
      return false;
    }
    loadPlayer({
      kind,
      title: kind === 'guided' ? 'Resolução guiada' : 'Solução automática',
      moves: [...result.moves],
      startState,
      expectUser: kind === 'guided',
      meta: { method: result.method, elapsedMs: result.elapsedMs },
    });
    return true;
  } catch (e) {
    useUI.setState({ solverStatus: 'error' });
    toast(`Não foi possível resolver: ${(e as Error).message}`, 'error', 6000);
    return false;
  }
}

export function loadPlayer(p: {
  kind: PlayerKind;
  title: string;
  moves: Move[];
  startState: CubeState;
  expectUser: boolean;
  meta?: PlayerMeta;
}): void {
  stopPlayback();
  usePlayer.setState({
    ...PLAYER_IDLE,
    active: true,
    kind: p.kind,
    title: p.title,
    moves: p.moves,
    startState: p.startState,
    expectUser: p.expectUser,
    meta: p.meta ?? {},
    status: p.moves.length ? 'ready' : 'done',
  });
}

function notifyPlayer(move: Move): void {
  const p = usePlayer.getState();
  if (!p.active) return;
  const n = useCube.getState().size;
  try {
    const { state, result } = followMove(p.moves, { index: p.index, partial: p.partial, offPath: p.offPath }, move, n);
    const done = state.index >= p.moves.length && state.offPath.length === 0 && state.partial === 0;
    usePlayer.setState({
      ...state,
      status: done ? 'done' : state.offPath.length ? 'deviation' : 'ready',
    });
    if (result === 'deviation' && p.offPath.length === 0 && p.expectUser) {
      toast('Movimento diferente do esperado. Desfaça-o para voltar ao roteiro.', 'warning');
    }
  } catch {
    usePlayer.setState({ status: 'deviation' });
  }
}

let playTimer: ReturnType<typeof setTimeout> | null = null;

function stopPlayback(): void {
  if (playTimer) clearTimeout(playTimer);
  playTimer = null;
  if (usePlayer.getState().playing) usePlayer.setState({ playing: false });
  if (useCube.getState().lock === 'playback') useCube.setState({ lock: null });
}

export function playerStep(): boolean {
  const p = usePlayer.getState();
  if (!p.active || p.index >= p.moves.length) return false;
  if (p.offPath.length || p.partial) {
    toast('Volte ao roteiro (desfaça os movimentos extras) antes de avançar.', 'info');
    return false;
  }
  if (useCube.getState().lock === 'scramble') return false;
  const move = p.moves[p.index];
  if (p.kind === 'solution') useAttempt.getState().markAssisted();
  if (p.kind === 'guided') useAttempt.getState().markAssisted();
  const ok = performMove(move, 'player', { durationScale: 1 / p.speed });
  if (!ok) return false;
  const index = p.index + 1;
  usePlayer.setState({ index, status: index >= p.moves.length ? 'done' : 'ready' });
  return true;
}

export function playerBack(): boolean {
  const p = usePlayer.getState();
  if (!p.active || p.index <= 0 || p.offPath.length || p.partial) return false;
  if (useCube.getState().lock === 'scramble') return false;
  const ok = performMove(invertMove(p.moves[p.index - 1]), 'player', { durationScale: 1 / p.speed });
  if (ok) usePlayer.setState({ index: p.index - 1, status: 'ready' });
  return ok;
}

export function playerPlay(): void {
  const p = usePlayer.getState();
  if (!p.active) return;
  if (p.offPath.length || p.partial) {
    toast('Volte ao roteiro antes de reproduzir.', 'info');
    return;
  }
  if (p.index >= p.moves.length) playerRestart();
  usePlayer.setState({ playing: true });
  useCube.setState({ lock: 'playback' });
  const tick = () => {
    playTimer = null;
    const cur = usePlayer.getState();
    if (!cur.playing) return;
    if (cur.index >= cur.moves.length) {
      stopPlayback();
      return;
    }
    if (!playerStep()) {
      stopPlayback();
      return;
    }
    void visualBus.whenIdle().then(() => {
      if (!usePlayer.getState().playing) return;
      playTimer = setTimeout(tick, Math.max(40, 160 / usePlayer.getState().speed));
    });
  };
  void visualBus.whenIdle().then(tick);
}

export function playerPause(): void {
  stopPlayback();
}

export function playerRestart(): void {
  const p = usePlayer.getState();
  if (!p.active || !p.startState) return;
  stopPlayback();
  snapTo(p.startState);
  usePlayer.setState({ index: 0, partial: 0, offPath: [], status: p.moves.length ? 'ready' : 'done' });
}

export function playerSeek(index: number): void {
  const p = usePlayer.getState();
  if (!p.active || !p.startState) return;
  stopPlayback();
  const i = Math.max(0, Math.min(p.moves.length, index));
  snapTo(applyMoves(p.startState, p.moves.slice(0, i)));
  usePlayer.setState({ index: i, partial: 0, offPath: [], status: i >= p.moves.length ? 'done' : 'ready' });
}

export function setPlayerSpeed(speed: number): void {
  usePlayer.setState({ speed: Math.max(0.25, Math.min(3, speed)) });
}

export function setPlayerExpectUser(expectUser: boolean): void {
  stopPlayback();
  usePlayer.setState({ expectUser });
}

export function closePlayer(): void {
  stopPlayback();
  if (usePlayer.getState().active) usePlayer.setState({ ...PLAYER_IDLE });
  if (useUI.getState().highlight) useUI.setState({ highlight: null });
}

// ---------------------------------------------------------------------------
// Modos de jogo
// ---------------------------------------------------------------------------

/** Resolução guiada: embaralha (se necessário), calcula a solução e orienta o usuário. */
export async function startGuided(): Promise<void> {
  if (!solverSupport(useCube.getState().size).available) {
    toast('Resolução guiada disponível apenas para 2×2 e 3×3.', 'info', 5000);
    return;
  }
  setMode('guided');
  if (useCube.getState().solved) {
    await newScramble();
  } else {
    useAttempt.getState().prepare({
      mode: 'guided',
      size: useCube.getState().size,
      scramble: {
        size: useCube.getState().size,
        moves: [],
        text: 'Estado atual do cubo',
        seed: '',
        kind: 'random-move',
      },
    });
  }
  await requestSolution('guided');
}

/** Treinamento de um algoritmo: prepara o caso e confere a execução. */
export function startTraining(algorithmId: string): void {
  const alg = algorithmById(algorithmId);
  if (!alg) return;
  if (useCube.getState().size !== alg.size) setSize(alg.size);
  setMode('training');
  closePlayer();
  const moves = parseMoves(alg.alg);
  const setup = invertMoves(moves);
  const startState = applyMoves(createSolved(alg.size), setup);
  const scramble: Scramble = { size: alg.size, moves: setup, text: formatMoves(setup), seed: alg.id, kind: 'random-move' };
  useAttempt.getState().prepare({ mode: 'training', size: alg.size, scramble });
  snapTo(startState, { history: [], redoStack: [], scramble, lastScramble: scramble, lock: null });
  loadPlayer({
    kind: 'training',
    title: alg.name,
    moves,
    startState,
    expectUser: true,
    meta: { algorithmId: alg.id },
  });
}

export function nextTrainingRep(): void {
  const id = usePlayer.getState().meta.algorithmId;
  if (id) startTraining(id);
}

/** Desafio progressivo: cada nível tem semente fixa e comprimento crescente. */
export async function startLevel(level: number): Promise<void> {
  const lvl = LEVELS[Math.max(1, Math.min(LEVELS.length, level)) - 1];
  setMode('progressive');
  const size = useCube.getState().size;
  await newScramble({ seed: levelSeed(size, lvl.level), length: lvl.length, level: lvl.level, kind: 'random-move' });
}

export function isLevelUnlocked(size: number, level: number): boolean {
  if (level <= 1) return true;
  const progress = useStats.getState().progress[size];
  return !!progress?.[level - 1];
}

/** Carrega a demonstração de um tutorial no cubo principal. */
export function loadDemo(demo: { size: number; setup?: string; alg: string; title: string; lessonId: string }): void {
  if (attemptInProgress()) abandonAttempt();
  if (useCube.getState().size !== demo.size) setSize(demo.size);
  if (useCube.getState().mode !== 'free') setMode('free');
  const start = applyMoves(createSolved(demo.size), demo.setup ?? '');
  snapTo(start, { history: [], redoStack: [], scramble: null, lock: null });
  useAttempt.getState().reset();
  loadPlayer({
    kind: 'lesson',
    title: demo.title,
    moves: parseMoves(demo.alg),
    startState: start,
    expectUser: false,
    meta: { lessonId: demo.lessonId },
  });
}

/** Penalidade manual da última tentativa (como em competições). */
export function setLastPenalty(record: SolveRecord, penalty: SolveRecord['penalty']): void {
  useStats.getState().setPenalty(record.id, penalty);
  const completion = useUI.getState().completion;
  if (completion?.record?.id === record.id) {
    useUI.setState({ completion: { ...completion, record: { ...record, penalty } } });
  }
}
