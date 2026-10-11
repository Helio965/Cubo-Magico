import { expect, test, type Page } from '@playwright/test';

/** Preferências que aceleram os testes em WebGL por software. */
const FAST_SETTINGS = {
  state: { quality: 'low', showIntro: false, scrambleAnimated: false, turnDurationMs: 50, sound: false },
  version: 1,
};

interface CubeforgeHook {
  state: () => { size: number; solved: boolean; history: string; scramble: string | null; lock: string | null };
  attempt: () => { phase: string; moves: number; penalty: string; assisted: boolean };
  player: () => { active: boolean; index: number; length: number; status: string };
  records: () => number;
  camera: () => number[] | undefined;
  project: (p: [number, number, number]) => [number, number] | null;
  whenIdle: () => Promise<void>;
  displayMatchesLogical: () => boolean;
}

declare global {
  interface Window {
    __cubeforge: CubeforgeHook;
  }
}

const errors: string[] = [];

async function open(page: Page, settings: object = FAST_SETTINGS) {
  errors.length = 0;
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('console', (m) => {
    if (m.type() === 'error') errors.push(`console: ${m.text()}`);
  });
  await page.addInitScript((s) => {
    if (!sessionStorage.getItem('cf-init')) {
      localStorage.clear();
      localStorage.setItem('cubeforge.settings', JSON.stringify(s));
      sessionStorage.setItem('cf-init', '1');
    }
  }, settings);
  await page.goto('/?e2e');
  await expect(page.getByTestId('cube-canvas').locator('canvas')).toBeVisible();
  // Aguarda o renderizador 3D registrar a câmera.
  await expect.poll(() => page.evaluate(() => window.__cubeforge.camera() ?? null)).not.toBeNull();
}

/** Executa `fn` no navegador recebendo o gancho de testes `window.__cubeforge`. */
const hook = <T>(page: Page, fn: (h: CubeforgeHook) => T | Promise<T>): Promise<T> =>
  page.evaluate(`(${fn.toString()})(window.__cubeforge)`) as Promise<T>;

async function idle(page: Page) {
  await page.evaluate(() => window.__cubeforge.whenIdle());
}

/** Converte uma sequência como "R U' F2" em teclas do simulador. */
async function typeMoves(page: Page, text: string) {
  for (const token of text.split(' ').filter(Boolean)) {
    const face = token[0];
    const key = `Key${face.toUpperCase()}`;
    if (token.endsWith('2')) {
      await page.keyboard.press(key);
      await page.keyboard.press(key);
    } else if (token.endsWith("'")) {
      await page.keyboard.press(`Shift+${key}`);
    } else {
      await page.keyboard.press(key);
    }
  }
}

function inverse(text: string): string {
  return text
    .split(' ')
    .reverse()
    .map((m) => (m.endsWith('2') ? m : m.endsWith("'") ? m.slice(0, -1) : `${m}'`))
    .join(' ');
}

test.describe('CubeForge 3D', () => {
  test('1–2. inicia sem erros e exibe o cubo 3D', async ({ page }) => {
    await open(page);
    await expect(page.getByRole('heading', { name: 'Tipo de cubo' })).toBeVisible();
    await expect(page.getByTestId('timer')).toBeVisible();
    expect(await page.evaluate(() => window.__cubeforge.displayMatchesLogical())).toBe(true);
    expect(await page.evaluate(() => window.__cubeforge.state().solved)).toBe(true);
    expect(errors).toEqual([]);
  });

  test('3. a câmera pode ser movimentada e redefinida', async ({ page }) => {
    await open(page);
    const before = await hook(page, (h) => h.camera()!);
    const stage = await page.locator('#stage').boundingBox();
    const x = stage!.x + stage!.width * 0.12;
    const y = stage!.y + stage!.height * 0.55;
    await page.mouse.move(x, y);
    await page.mouse.down();
    for (let i = 1; i <= 10; i++) await page.mouse.move(x + i * 18, y + i * 4);
    await page.mouse.up();
    await page.waitForTimeout(400);
    const after = await hook(page, (h) => h.camera()!);
    expect(after).not.toEqual(before);
    // Nenhum giro de camada aconteceu.
    expect(await hook(page, (h) => h.state().history)).toBe('');
    await page.getByTestId('btn-camera').click();
    await expect
      .poll(async () => {
        const c = await hook(page, (h) => h.camera()!);
        return Math.hypot(c[0] - before[0], c[1] - before[1], c[2] - before[2]);
      })
      .toBeLessThan(0.05);
  });

  test('4–5. arrastar sobre uma face gira apenas aquela camada e atualiza o estado lógico', async ({ page }) => {
    await open(page);
    const camera = await hook(page, (h) => h.camera()!);
    // Adesivo frontal superior direito; arrastar "para cima" deve gerar R.
    const s = 1.035;
    const from = await page.evaluate(([v]) => window.__cubeforge.project(v), [[s, s, 1.56]] as [[number, number, number]]);
    const to = await page.evaluate(([v]) => window.__cubeforge.project(v), [[s, s + 1.4, 1.56]] as [[number, number, number]]);
    await page.mouse.move(from![0], from![1]);
    await page.mouse.down();
    for (let i = 1; i <= 12; i++) {
      await page.mouse.move(from![0] + ((to![0] - from![0]) * i) / 12, from![1] + ((to![1] - from![1]) * i) / 12);
    }
    await page.mouse.up();
    await idle(page);
    expect(await hook(page, (h) => h.state().history)).toBe('R');
    expect(await hook(page, (h) => h.camera()!)).toEqual(camera);
    expect(await page.evaluate(() => window.__cubeforge.displayMatchesLogical())).toBe(true);
    await expect(page.getByTestId('metric-moves')).toHaveText('1');
  });

  test('10. controles de teclado, desfazer e consistência com comandos rápidos', async ({ page }) => {
    await open(page);
    await page.locator('#stage').click({ position: { x: 20, y: 300 } });
    await typeMoves(page, "R U' F");
    await idle(page);
    expect(await hook(page, (h) => h.state().history)).toBe("R U' F");
    await page.keyboard.press('Control+KeyZ');
    await idle(page);
    expect(await hook(page, (h) => h.state().history)).toBe("R U'");
    // Sequência muito rápida: o estado exibido acompanha o lógico ao final.
    for (let i = 0; i < 30; i++) await page.keyboard.press(['KeyR', 'KeyU', 'KeyF', 'KeyL', 'KeyD', 'KeyB'][i % 6]);
    await idle(page);
    expect(await page.evaluate(() => window.__cubeforge.displayMatchesLogical())).toBe(true);
    expect(errors).toEqual([]);
  });

  test('6–9. desafio cronometrado: embaralha, cronometra, detecta a conclusão e registra o histórico', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Desafios' }).first().click();
    await page.getByTestId('mode-card-timed').click();
    await page.getByTestId('new-challenge').click();
    await expect.poll(() => hook(page, (h) => h.attempt().phase)).toBe('ready');
    const scramble = (await hook(page, (h) => h.state().scramble))!;
    expect(scramble.split(' ').length).toBe(25);
    await page.locator('#stage').click({ position: { x: 20, y: 300 } });
    const solution = inverse(scramble).split(' ');
    await typeMoves(page, solution[0]);
    await expect.poll(() => hook(page, (h) => h.attempt().phase)).toBe('running');
    await page.waitForTimeout(600);
    await typeMoves(page, solution.slice(1).join(' '));
    await expect(page.getByTestId('completion')).toBeVisible();
    await expect(page.getByText('PARABÉNS!')).toBeVisible();
    const time = await page.getByTestId('completion-time').textContent();
    expect(time).toMatch(/^\d{2}:\d{2}\.\d{2}$/);
    expect(await hook(page, (h) => h.records())).toBe(1);
    // Histórico persistido no armazenamento local.
    await page.getByRole('button', { name: 'Fechar' }).last().click();
    await page.reload();
    await expect.poll(() => page.evaluate(() => window.__cubeforge?.records())).toBe(1);
  });

  test('14. resolução automática calcula, reproduz e confirma a solução', async ({ page }) => {
    await open(page);
    await page.getByTestId('scramble-button').click();
    await expect.poll(() => hook(page, (h) => h.state().solved)).toBe(false);
    await page.getByTestId('solve-button').click();
    await expect(page.getByTestId('player')).toBeVisible({ timeout: 30_000 });
    const length = await hook(page, (h) => h.player().length);
    expect(length).toBeGreaterThan(0);
    expect(length).toBeLessThanOrEqual(24);
    await page.getByTestId('player-step').click();
    await expect.poll(() => hook(page, (h) => h.player().index)).toBe(1);
    await page.getByTestId('player-back').click();
    await expect.poll(() => hook(page, (h) => h.player().index)).toBe(0);
    await page.getByTestId('player-play').click();
    await expect.poll(() => hook(page, (h) => h.state().solved), { timeout: 60_000 }).toBe(true);
    await expect(page.getByTestId('completion')).toBeVisible();
    expect(errors).toEqual([]);
  });

  test('9. 4×4: camadas internas próprias e aviso de resolvedor indisponível', async ({ page }) => {
    await open(page);
    await page.getByTestId('size-4').click();
    await expect(page.getByTestId('size-chip')).toContainText('4×4×4');
    await page.locator('#stage').click({ position: { x: 20, y: 300 } });
    await page.keyboard.press('Digit2');
    await page.keyboard.press('KeyR');
    await page.keyboard.press('KeyM'); // fatia M não existe no 4×4
    await idle(page);
    expect(await hook(page, (h) => h.state().history)).toBe('2R');
    await expect(page.getByTestId('solver-unavailable')).toBeVisible();
    await expect(page.getByTestId('btn-solve')).toBeDisabled();
  });

  test('12. as configurações são persistidas', async ({ page }) => {
    await open(page);
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'dark');
    await page.getByTestId('btn-theme').click();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
    await page.reload();
    await expect(page.locator('html')).toHaveAttribute('data-theme', 'light');
  });

  test('13. @mobile layout em tela pequena mantém o cubo visível', async ({ page }) => {
    await open(page);
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth - window.innerWidth);
    expect(overflow).toBeLessThanOrEqual(0);
    const stage = await page.locator('#stage').boundingBox();
    expect(stage!.height).toBeGreaterThan(300);
    await expect(page.getByTestId('timer')).toBeVisible();
    await expect(page.getByTestId('btn-scramble')).toBeVisible();
    // Abrir o painel não esconde o cubo.
    await page.getByRole('tab', { name: 'Simulador' }).click();
    const stageOpen = await page.locator('#stage').boundingBox();
    expect(stageOpen!.height).toBeGreaterThan(200);
    expect(errors).toEqual([]);
  });

  test('11. @mobile deslizar o dedo sobre uma face gira a camada', async ({ page }) => {
    await open(page);
    const s = 1.035;
    const from = await page.evaluate(([v]) => window.__cubeforge.project(v), [[s, s, 1.56]] as [[number, number, number]]);
    const to = await page.evaluate(([v]) => window.__cubeforge.project(v), [[s, s + 1.4, 1.56]] as [[number, number, number]]);
    const client = await page.context().newCDPSession(page);
    const touch = (type: 'touchStart' | 'touchMove' | 'touchEnd', x: number, y: number) =>
      client.send('Input.dispatchTouchEvent', {
        type,
        touchPoints: type === 'touchEnd' ? [] : [{ x, y, id: 1, radiusX: 2, radiusY: 2, force: 1 }],
      });
    await touch('touchStart', from![0], from![1]);
    for (let i = 1; i <= 12; i++) {
      await touch('touchMove', from![0] + ((to![0] - from![0]) * i) / 12, from![1] + ((to![1] - from![1]) * i) / 12);
    }
    await touch('touchEnd', to![0], to![1]);
    await idle(page);
    expect(await hook(page, (h) => h.state().history)).toBe('R');
    expect(await page.evaluate(() => window.__cubeforge.displayMatchesLogical())).toBe(true);
  });

  test('aprender: demonstração interativa no cubo', async ({ page }) => {
    await open(page);
    await page.getByRole('button', { name: 'Aprender' }).first().click();
    await page.getByTestId('lesson-sequences').click();
    await page.getByTestId('demo-watch').first().click();
    await expect(page.getByTestId('player')).toBeVisible();
    await expect.poll(() => hook(page, (h) => h.player().status), { timeout: 30_000 }).toBe('done');
    expect(await hook(page, (h) => h.state().history)).toBe("R U R' U'");
  });
});
