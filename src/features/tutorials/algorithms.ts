export interface Algorithm {
  id: string;
  name: string;
  group: 'Básicos' | 'Método iniciante' | 'OLL' | 'PLL' | '2×2' | 'Paridade 4×4';
  size: number;
  alg: string;
  description: string;
}

/**
 * Biblioteca de algoritmos usada no modo Treinamento e nos tutoriais.
 * Cada PLL/OLL é verificado nos testes automatizados (preserva as camadas
 * inferiores).
 */
export const ALGORITHMS: readonly Algorithm[] = [
  { id: 'sexy', name: 'Sexy move', group: 'Básicos', size: 3, alg: "R U R' U'", description: 'O gatilho mais usado: aparece em quase todos os métodos.' },
  { id: 'sledge', name: 'Sledgehammer', group: 'Básicos', size: 3, alg: "R' F R F'", description: 'Gatilho complementar, comum em OLL e F2L.' },
  { id: 'insert-r', name: 'Inserção à direita', group: 'Básicos', size: 3, alg: "U R U' R'", description: 'Leva uma peça do topo para o slot frontal direito.' },
  { id: 'insert-l', name: 'Inserção à esquerda', group: 'Básicos', size: 3, alg: "U' L' U L", description: 'Espelho da inserção à direita.' },
  { id: 'edge-right', name: '2ª camada — aresta à direita', group: 'Método iniciante', size: 3, alg: "U R U' R' U' F' U F", description: 'Insere a aresta do topo na posição frontal direita da segunda camada.' },
  { id: 'edge-left', name: '2ª camada — aresta à esquerda', group: 'Método iniciante', size: 3, alg: "U' L' U L U F U' F'", description: 'Insere a aresta do topo na posição frontal esquerda da segunda camada.' },
  { id: 'yellow-cross', name: 'Cruz da última face', group: 'Método iniciante', size: 3, alg: "F R U R' U' F'", description: 'Forma a cruz na face superior (repita conforme o caso: ponto, L ou linha).' },
  { id: 'sune', name: 'Sune', group: 'OLL', size: 3, alg: "R U R' U R U2 R'", description: 'Orienta três cantos da última camada.' },
  { id: 'antisune', name: 'Anti-Sune', group: 'OLL', size: 3, alg: "R U2 R' U' R U' R'", description: 'Inverso espelhado do Sune.' },
  { id: 'oll-44', name: 'OLL 44', group: 'OLL', size: 3, alg: "f R U R' U' f'", description: 'Usa movimento largo (f = Fw).' },
  { id: 'corner-perm', name: 'Permutação de cantos', group: 'Método iniciante', size: 3, alg: "U R U' L' U R' U' L", description: 'Cicla três cantos da última camada mantendo o canto frontal direito.' },
  { id: 'ua', name: 'Ua-perm', group: 'PLL', size: 3, alg: "R U' R U R U R U' R' U' R2", description: 'Cicla três arestas no sentido anti-horário.' },
  { id: 'ub', name: 'Ub-perm', group: 'PLL', size: 3, alg: "R2 U R U R' U' R' U' R' U R'", description: 'Cicla três arestas no sentido horário.' },
  { id: 'h-perm', name: 'H-perm', group: 'PLL', size: 3, alg: "M2 U M2 U2 M2 U M2", description: 'Troca arestas opostas aos pares.' },
  { id: 't-perm', name: 'T-perm', group: 'PLL', size: 3, alg: "R U R' U' R' F R2 U' R' U' R U R' F'", description: 'Troca dois cantos adjacentes e duas arestas.' },
  { id: 'y-perm', name: 'Y-perm', group: 'PLL', size: 3, alg: "F R U' R' U' R U R' F' R U R' U' R' F R F'", description: 'Troca dois cantos diagonais e duas arestas.' },
  { id: 'jb-perm', name: 'Jb-perm', group: 'PLL', size: 3, alg: "R U R' F' R U R' U' R' F R2 U' R'", description: 'Troca dois cantos e duas arestas adjacentes.' },
  { id: 'two-sune', name: 'Sune no 2×2', group: '2×2', size: 2, alg: "R U R' U R U2 R'", description: 'O mesmo Sune orienta cantos no 2×2.' },
  { id: 'two-y', name: 'Troca diagonal (2×2)', group: '2×2', size: 2, alg: "R U' R' U' F2 U' R U R' U F2", description: 'Troca dois cantos diagonais da camada superior.' },
  { id: 'pll-parity', name: 'Paridade de PLL', group: 'Paridade 4×4', size: 4, alg: "2R2 U2 2R2 Uw2 2R2 Uw2", description: 'Troca as arestas frontal e traseira da face superior (caso exclusivo de cubos pares).' },
  { id: 'oll-parity', name: 'Paridade de OLL', group: 'Paridade 4×4', size: 4, alg: "Rw U2 x Rw U2 Rw U2 Rw' U2 Lw U2 Rw' U2 Rw U2 Rw' U2 Rw'", description: 'Inverte uma única aresta dupla — impossível em um 3×3.' },
];

export const algorithmById = (id: string) => ALGORITHMS.find((a) => a.id === id);
