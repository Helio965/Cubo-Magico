import type { PieceKind } from '../../engine/state/layout';

export type LessonBlock =
  | { p: string }
  | { ul: string[] }
  | { ol: string[] }
  | { tip: string };

export interface LessonDemo {
  title: string;
  size: number;
  /** Algoritmo demonstrado. */
  alg: string;
  /** Estado inicial (aplicado ao cubo resolvido). Padrão: inverso do algoritmo. */
  setup?: string;
  caption?: string;
}

export interface Lesson {
  id: string;
  group: string;
  title: string;
  blocks: LessonBlock[];
  highlights?: { label: string; kinds: PieceKind[] }[];
  demos?: LessonDemo[];
}

/**
 * Conteúdo do modo educativo. Formatação inline: **negrito** e `código`.
 * As faces são descritas por posição (cima, frente…), pois as cores podem ser
 * personalizadas. No esquema padrão: branco em cima, verde na frente.
 */
export const LESSONS: Lesson[] = [
  // ---------------------------------------------------------------- Introdução
  {
    id: 'what',
    group: 'Introdução',
    title: 'O que é o Cubo Mágico',
    blocks: [
      { p: 'O Cubo Mágico foi criado em 1974 pelo arquiteto húngaro **Ernő Rubik**. O 3×3×3 clássico possui seis faces, cada uma com nove adesivos, e um mecanismo interno que permite girar qualquer camada sem que as peças se soltem.' },
      { p: 'Embaralhado, ele pode assumir **43.252.003.274.489.856.000** combinações — mais de 43 quintilhões. Mesmo assim, está provado que **qualquer estado pode ser resolvido em no máximo 20 movimentos** (o chamado "número de Deus", demonstrado em 2010).' },
      { p: 'Resolver não exige memorizar todas as combinações: basta entender como as peças se movem e aprender algumas sequências curtas, chamadas **algoritmos**.' },
      { tip: 'Neste simulador, arraste sobre uma face para girar a camada, arraste fora do cubo para girar a câmera e use o painel de movimentos ou o teclado (R, U, F…) quando preferir.' },
    ],
  },
  {
    id: 'pieces',
    group: 'Introdução',
    title: 'Peças, faces e cores',
    blocks: [
      { p: 'Embora pareça formado por 27 cubinhos, o 3×3 tem três tipos de peças visíveis:' },
      {
        ul: [
          '**Centros** (6): têm um único adesivo e nunca mudam de posição relativa. O centro define a cor da face.',
          '**Arestas** (12): têm dois adesivos e ficam entre dois centros.',
          '**Cantos** (8): têm três adesivos e ficam nos vértices.',
        ],
      },
      { p: 'Uma aresta nunca vira canto e vice-versa. Por isso, resolver o cubo é colocar cada aresta e cada canto no lugar certo e na orientação certa.' },
      { p: 'No esquema clássico, as cores opostas são **branco × amarelo**, **verde × azul** e **vermelho × laranja**.' },
      { tip: 'Use os botões abaixo para destacar cada tipo de peça no cubo 3D.' },
    ],
    highlights: [
      { label: 'Centros', kinds: ['center'] },
      { label: 'Arestas', kinds: ['edge'] },
      { label: 'Cantos', kinds: ['corner'] },
    ],
  },
  {
    id: 'layers',
    group: 'Introdução',
    title: 'Camadas',
    blocks: [
      { p: 'Cada giro move uma **camada**: um bloco de 3×3 peças que gira 90° em torno de um eixo. As camadas externas correspondem às faces; as internas, às fatias do meio.' },
      { p: 'Em cubos maiores, como o 4×4, existem várias camadas internas por eixo — e não há uma fatia exatamente central. Por isso cada tamanho tem regras próprias de movimentação.' },
      { tip: 'Observe a demonstração: a camada da direita gira e todas as peças dela acompanham o movimento, enquanto o restante permanece no lugar.' },
    ],
    demos: [{ title: 'Uma camada girando', size: 3, setup: '', alg: 'R R R R', caption: 'Quatro giros de 90° devolvem a camada à posição inicial.' }],
  },
  // ---------------------------------------------------------------- Movimentação
  {
    id: 'notation',
    group: 'Movimentação',
    title: 'Notação tradicional',
    blocks: [
      { p: 'Cada face recebe uma letra (do inglês):' },
      {
        ul: [
          '`R` (right) — direita',
          '`L` (left) — esquerda',
          '`U` (up) — cima',
          '`D` (down) — baixo',
          '`F` (front) — frente',
          '`B` (back) — trás',
        ],
      },
      { p: 'A letra sozinha significa girar a face **90° no sentido horário**, como se você estivesse olhando diretamente para ela.' },
      { tip: 'Atenção às faces de baixo, esquerda e trás: o sentido horário é sempre do ponto de vista de quem olha para aquela face.' },
    ],
    demos: [
      { title: 'R — direita, horário', size: 3, setup: '', alg: 'R' },
      { title: 'U — cima, horário', size: 3, setup: '', alg: 'U' },
      { title: 'As seis faces', size: 3, setup: '', alg: 'R L U D F B' },
    ],
  },
  {
    id: 'prime',
    group: 'Movimentação',
    title: 'Anti-horário e movimentos duplos',
    blocks: [
      { p: 'Um apóstrofo indica o sentido **anti-horário**: `R\'` desfaz `R`. O número 2 indica **meia volta** (180°): `R2` equivale a `R R`.' },
      { ul: ['`R` — 90° horário', "`R'` — 90° anti-horário (lê-se \"R linha\")", '`R2` — 180°'] },
      { p: 'Todo movimento tem um inverso. Para desfazer uma sequência inteira, inverta cada movimento e leia de trás para frente: o inverso de `R U F` é `F\' U\' R\'`.' },
    ],
    demos: [
      { title: "R, R' e R2", size: 3, setup: '', alg: "R R' R2 R2" },
      { title: 'Sequência e inversa', size: 3, setup: '', alg: "R U F F' U' R'" },
    ],
  },
  {
    id: 'slices',
    group: 'Movimentação',
    title: 'Fatias, movimentos largos e rotações',
    blocks: [
      { ul: [
        '`M` — fatia do meio entre R e L (segue o sentido de L)',
        '`E` — fatia do meio entre U e D (segue o sentido de D)',
        '`S` — fatia do meio entre F e B (segue o sentido de F)',
        '`Rw` ou `r` — gira duas camadas a partir da direita (movimento largo)',
        '`2R` — gira apenas a segunda camada (cubos 4×4 ou maiores)',
        '`x`, `y`, `z` — giram o cubo inteiro (como R, U e F, respectivamente)',
      ] },
      { p: 'Rotações não alteram a resolução — apenas a forma como você segura o cubo. Por isso o simulador não as conta como movimentos.' },
    ],
    demos: [
      { title: 'Fatias M, E e S', size: 3, setup: '', alg: "M M' E E' S S'" },
      { title: 'Movimento largo Rw', size: 3, setup: '', alg: "Rw Rw'" },
      { title: 'Rotações x, y e z', size: 3, setup: '', alg: "x x' y y' z z'" },
    ],
  },
  {
    id: 'sequences',
    group: 'Movimentação',
    title: 'Sequências e gatilhos',
    blocks: [
      { p: 'Algoritmos são construídos com sequências curtas chamadas **gatilhos**. O mais famoso é `R U R\' U\'`, apelidado de "sexy move".' },
      { p: 'Curiosidade: repetir esse gatilho **seis vezes** devolve o cubo ao estado original. Toda sequência, repetida o suficiente, sempre volta ao início — o cubo é um grupo matemático finito.' },
      { tip: 'Use "Executar eu mesmo" no reprodutor para praticar: o sistema confere cada movimento e indica o próximo.' },
    ],
    demos: [
      { title: 'Gatilho R U R\' U\'', size: 3, setup: '', alg: "R U R' U'" },
      { title: 'Seis repetições = identidade', size: 3, setup: '', alg: "R U R' U' R U R' U' R U R' U' R U R' U' R U R' U' R U R' U'" },
    ],
  },
  // ---------------------------------------------------------------- Método iniciante
  {
    id: 'beginner',
    group: 'Método iniciante (3×3)',
    title: 'Visão geral do método',
    blocks: [
      { p: 'O método de camadas resolve o cubo de baixo para cima, em sete etapas:' },
      { ol: [
        'Cruz na primeira face',
        'Cantos da primeira camada',
        'Arestas da segunda camada',
        'Cruz na última face',
        'Permutação das arestas da última camada',
        'Posicionamento dos cantos da última camada',
        'Orientação dos cantos da última camada',
      ] },
      { p: 'Nas demonstrações, a **primeira camada fica embaixo** e a **última camada em cima**. No esquema padrão a face branca está em cima; muitos tutoriais começam com a branca embaixo — use `x2` para virar o cubo.' },
    ],
  },
  {
    id: 'cross',
    group: 'Método iniciante (3×3)',
    title: 'Etapa 1 — A cruz',
    blocks: [
      { p: 'Forme uma cruz na face de baixo, com cada aresta também combinando com o centro lateral. Esta etapa é **intuitiva**: leve cada aresta para cima da sua posição e gire a face lateral duas vezes.' },
      { tip: 'Se a aresta estiver na camada de cima e alinhada com o centro da sua cor, um giro de 180° (como `F2`) a coloca no lugar.' },
    ],
    demos: [{ title: 'Inserindo uma aresta da cruz', size: 3, alg: 'U F2', caption: 'A aresta é alinhada com seu centro e descida com F2.' }],
  },
  {
    id: 'first-corners',
    group: 'Método iniciante (3×3)',
    title: 'Etapa 2 — Cantos da primeira camada',
    blocks: [
      { p: 'Posicione o canto na camada de cima, logo acima do lugar onde deve entrar (frente-direita). Repita `R U R\' U\'` até ele encaixar corretamente — no máximo cinco repetições.' },
      { tip: 'A repetição pode bagunçar momentaneamente a primeira camada, mas ela se recompõe quando o canto chega à orientação certa.' },
    ],
    demos: [{ title: 'Inserindo um canto', size: 3, alg: "R U R' U' R U R' U' R U R' U'" }],
  },
  {
    id: 'second-layer',
    group: 'Método iniciante (3×3)',
    title: 'Etapa 3 — Segunda camada',
    blocks: [
      { p: 'Encontre uma aresta na camada de cima que não tenha a cor da última face. Alinhe-a com o centro da sua cor e use um dos algoritmos:' },
      { ul: [
        "Para a direita: `U R U' R' U' F' U F`",
        "Para a esquerda: `U' L' U L U F U' F'`",
      ] },
    ],
    demos: [
      { title: 'Aresta para a direita', size: 3, alg: "U R U' R' U' F' U F" },
      { title: 'Aresta para a esquerda', size: 3, alg: "U' L' U L U F U' F'" },
    ],
  },
  {
    id: 'last-cross',
    group: 'Método iniciante (3×3)',
    title: 'Etapa 4 — Cruz na última face',
    blocks: [
      { p: 'Olhe para a face de cima. Você verá um ponto, um "L" ou uma linha. Aplique `F R U R\' U\' F\'`:' },
      { ul: [
        'Linha: segure-a na horizontal e aplique uma vez.',
        '"L": segure-o no canto superior esquerdo e aplique duas vezes (ou use `f R U R\' U\' f\'`).',
        'Ponto: aplique uma vez para obter o "L" e continue.',
      ] },
    ],
    demos: [{ title: 'Da linha para a cruz', size: 3, alg: "F R U R' U' F'" }],
  },
  {
    id: 'last-edges',
    group: 'Método iniciante (3×3)',
    title: 'Etapa 5 — Permutar as arestas',
    blocks: [
      { p: 'Gire a camada de cima até que pelo menos duas arestas combinem com os centros laterais. As restantes são trocadas com o ciclo de três arestas:' },
      { ul: ["`R U' R U R U R U' R' U' R2` (Ua)", "`R2 U R U R' U' R' U' R' U R'` (Ub)"] },
    ],
    demos: [{ title: 'Ciclo de arestas (Ua)', size: 3, alg: "R U' R U R U R U' R' U' R2" }],
  },
  {
    id: 'last-corners-place',
    group: 'Método iniciante (3×3)',
    title: 'Etapa 6 — Posicionar os cantos',
    blocks: [
      { p: 'Procure um canto que já esteja no lugar certo (mesmo que torcido) e segure-o na frente-direita. Aplique `U R U\' L\' U R\' U\' L` até que todos os cantos estejam nas posições certas.' },
    ],
    demos: [{ title: 'Ciclo de três cantos', size: 3, alg: "U R U' L' U R' U' L" }],
  },
  {
    id: 'last-corners-orient',
    group: 'Método iniciante (3×3)',
    title: 'Etapa 7 — Orientar os cantos',
    blocks: [
      { p: 'Segure o cubo com a última face em cima. Para o canto da frente-direita, repita `R\' D\' R D` até que ele mostre a cor da última face em cima (2 ou 4 vezes). Depois gire **apenas a face de cima** (`U`) para trazer o próximo canto e repita.' },
      { tip: 'As primeiras camadas parecem se desfazer no processo — é normal. Elas voltam ao lugar quando o último canto é orientado.' },
    ],
    demos: [
      {
        title: 'Dois cantos torcidos',
        size: 3,
        alg: "R' D' R D R' D' R D U R' D' R D R' D' R D R' D' R D R' D' R D U'",
        caption: 'Duas repetições no primeiro canto, U, quatro no segundo e U\' para alinhar.',
      },
    ],
  },
  // ---------------------------------------------------------------- CFOP
  {
    id: 'cfop',
    group: 'CFOP (avançado)',
    title: 'Visão geral do CFOP',
    blocks: [
      { p: 'O CFOP (Fridrich) é o método mais usado por speedcubers. Ele tem quatro etapas:' },
      { ol: [
        '**Cross** — cruz, planejada durante a inspeção',
        '**F2L** — os quatro pares canto-aresta das duas primeiras camadas, inseridos juntos',
        '**OLL** — orienta toda a última camada de uma vez (57 casos)',
        '**PLL** — permuta a última camada de uma vez (21 casos)',
      ] },
      { p: 'Resolvedores avançados terminam em menos de 10 segundos usando cerca de 55 a 60 movimentos.' },
    ],
    demos: [
      { title: 'OLL: Sune', size: 3, alg: "R U R' U R U2 R'" },
      { title: 'PLL: T-perm', size: 3, alg: "R U R' U' R' F R2 U' R' U' R U R' F'" },
    ],
  },
  {
    id: 'f2l',
    group: 'CFOP (avançado)',
    title: 'F2L intuitivo',
    blocks: [
      { p: 'No F2L você junta um canto e sua aresta na camada de cima e insere o par em um único movimento. Os casos básicos usam gatilhos curtos:' },
      { ul: ["`U R U' R'` — par pronto, inserido pela direita", "`U' F' U F` — par pronto, inserido pela frente", "`R U R'` — canto e aresta já unidos sobre o slot"] },
    ],
    demos: [
      { title: 'Inserção pela direita', size: 3, alg: "U R U' R'" },
      { title: 'Par sobre o slot', size: 3, alg: "R U R'" },
    ],
  },
  // ---------------------------------------------------------------- Outros tamanhos
  {
    id: 'two',
    group: 'Outros tamanhos',
    title: 'O 2×2×2',
    blocks: [
      { p: 'O 2×2 tem apenas cantos (8 peças) e 3.674.160 estados. Sem centros, a cor de cada face é definida pelas próprias peças.' },
      { p: 'Ele pode ser resolvido com as etapas de cantos do método iniciante: primeira camada (etapa 2) e depois posicionar e orientar os cantos da última camada (etapas 6 e 7).' },
      { tip: 'O resolvedor do simulador encontra sempre a solução ótima do 2×2 — nunca mais que 11 movimentos.' },
    ],
    demos: [{ title: 'Sune no 2×2', size: 2, alg: "R U R' U R U2 R'" }],
  },
  {
    id: 'four',
    group: 'Outros tamanhos',
    title: 'O 4×4×4 e a paridade',
    blocks: [
      { p: 'O 4×4 não tem centros fixos nem arestas únicas. O método de **redução** transforma-o em um 3×3: resolva os blocos 2×2 de centro, emparelhe as arestas duplas e resolva como um 3×3.' },
      { p: 'No final podem surgir **paridades**: situações impossíveis em um 3×3, como uma única aresta invertida (paridade de OLL) ou duas arestas trocadas (paridade de PLL). Elas exigem algoritmos com camadas internas.' },
      { tip: 'A resolução automática do 4×4 ainda não está disponível no simulador; embaralhamento, movimentação e detecção de conclusão funcionam normalmente.' },
    ],
    demos: [
      { title: 'Paridade de PLL', size: 4, alg: '2R2 U2 2R2 Uw2 2R2 Uw2' },
      { title: 'Paridade de OLL', size: 4, alg: "Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'" },
    ],
  },
];

export const LESSON_GROUPS = Array.from(new Set(LESSONS.map((l) => l.group)));
