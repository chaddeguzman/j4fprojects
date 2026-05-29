// ============================================================
// TIC TAC TOE — CDG
// Modes:      vs Player | vs AI (Easy / Medium / Hard)
// Board sizes: 3×3 (win=3) | 4×4 (win=4) | 5×5 (win=4)
// ============================================================

// --- State ---
const state = {
  mode:          null,   // 'pvp' | 'ai'
  boardSize:     3,      // 3 | 4 | 5
  winTarget:     3,      // 3 for 3×3, 4 for 4×4 and 5×5
  difficulty:    null,   // 'easy' | 'medium' | 'hard'
  board:         [],
  currentPlayer: 'X',
  scores:        { X: 0, O: 0, Draw: 0 },
  gameActive:    false,
  aiThinking:    false,
  winningLines:  [],     // pre-computed for current board size
};

// --- DOM References ---
const screens = {
  mode:       document.getElementById('screen-mode'),
  size:       document.getElementById('screen-size'),
  difficulty: document.getElementById('screen-difficulty'),
  game:       document.getElementById('screen-game'),
};

const boardEl       = document.getElementById('board');
const resultOverlay = document.getElementById('result-overlay');
const resultIcon    = document.getElementById('result-icon');
const resultMsg     = document.getElementById('result-msg');
const statusMode    = document.getElementById('status-mode');
const turnX         = document.getElementById('turn-x');
const turnO         = document.getElementById('turn-o');
const scoreX        = document.getElementById('score-x');
const scoreO        = document.getElementById('score-o');
const scoreDraw     = document.getElementById('score-draw');
const winNote       = document.getElementById('win-note');

// ============================================================
// SCREEN NAVIGATION
// ============================================================

function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  const el = screens[name];
  el.classList.remove('hidden');
  // Re-trigger animation
  el.style.animation = 'none';
  el.offsetHeight; // reflow
  el.style.animation = '';
}

// --- Mode Selection ---
document.getElementById('btn-pvp').addEventListener('click', () => {
  state.mode = 'pvp';
  showScreen('size');
});

document.getElementById('btn-ai').addEventListener('click', () => {
  state.mode = 'ai';
  showScreen('size');
});

// --- Board Size Selection ---
document.querySelectorAll('.size-card').forEach(btn => {
  btn.addEventListener('click', () => {
    state.boardSize = parseInt(btn.dataset.size);
    state.winTarget = state.boardSize === 3 ? 3 : 4;

    if (state.mode === 'pvp') {
      initGame();
      showScreen('game');
    } else {
      showScreen('difficulty');
    }
  });
});

// --- Difficulty Selection ---
document.querySelectorAll('.diff-card').forEach(btn => {
  btn.addEventListener('click', () => {
    state.difficulty = btn.dataset.diff;
    initGame();
    showScreen('game');
  });
});

// --- Back Buttons ---
document.getElementById('back-size-to-mode').addEventListener('click', () => showScreen('mode'));
document.getElementById('back-diff-to-size').addEventListener('click', () => showScreen('size'));
document.getElementById('btn-menu').addEventListener('click', () => showScreen('mode'));
document.getElementById('btn-back-menu').addEventListener('click', () => showScreen('mode'));
document.getElementById('btn-rematch').addEventListener('click', () => resetBoard());

// ============================================================
// WINNING LINES GENERATOR
// Generates all valid lines of length `target` on an N×N board
// ============================================================

function generateWinningLines(n, target) {
  const lines = [];

  for (let r = 0; r < n; r++) {
    for (let c = 0; c < n; c++) {

      // Horizontal
      if (c + target <= n) {
        const line = [];
        for (let k = 0; k < target; k++) line.push(r * n + c + k);
        lines.push(line);
      }

      // Vertical
      if (r + target <= n) {
        const line = [];
        for (let k = 0; k < target; k++) line.push((r + k) * n + c);
        lines.push(line);
      }

      // Diagonal ↘
      if (r + target <= n && c + target <= n) {
        const line = [];
        for (let k = 0; k < target; k++) line.push((r + k) * n + (c + k));
        lines.push(line);
      }

      // Diagonal ↙
      if (r + target <= n && c - target + 1 >= 0) {
        const line = [];
        for (let k = 0; k < target; k++) line.push((r + k) * n + (c - k));
        lines.push(line);
      }
    }
  }

  return lines;
}

// ============================================================
// BOARD RENDERING
// ============================================================

function buildBoard() {
  const n = state.boardSize;
  boardEl.innerHTML = '';
  boardEl.style.gridTemplateColumns = `repeat(${n}, 1fr)`;
  boardEl.className = `board size-${n}`;

  for (let i = 0; i < n * n; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.dataset.index = i;
    cell.addEventListener('click', () => handleMove(i));
    boardEl.appendChild(cell);
  }
}

function getCells() {
  return boardEl.querySelectorAll('.cell');
}

// ============================================================
// GAME INIT & RESET
// ============================================================

function initGame() {
  const n = state.boardSize;
  state.winningLines = generateWinningLines(n, state.winTarget);
  state.scores = { X: 0, O: 0, Draw: 0 };
  updateScoreDisplay();

  // Status bar label
  let modeLabel = state.mode === 'pvp'
    ? 'vs Player'
    : `vs AI — ${capitalize(state.difficulty)}`;
  modeLabel += `  ·  ${n}×${n}`;
  statusMode.textContent = modeLabel;

  // Win note
  winNote.textContent = state.winTarget === 3
    ? 'First 3 in a row wins'
    : 'First 4 in a row wins';

  buildBoard();
  resetBoard();
}

function resetBoard() {
  const n = state.boardSize;
  state.board = Array(n * n).fill(null);
  state.currentPlayer = 'X';
  state.gameActive = true;
  state.aiThinking = false;

  getCells().forEach(cell => {
    cell.dataset.mark = '';
    cell.className = 'cell';
  });

  resultOverlay.classList.add('hidden');
  updateTurnIndicator();
}

// ============================================================
// MOVE HANDLING
// ============================================================

function handleMove(idx) {
  if (!state.gameActive) return;
  if (state.board[idx])  return;
  if (state.aiThinking)  return;

  placeMarker(idx, state.currentPlayer);

  const result = checkResult(state.board);
  if (result) { endGame(result); return; }

  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  updateTurnIndicator();

  // AI turn
  if (state.mode === 'ai' && state.currentPlayer === 'O' && state.gameActive) {
    state.aiThinking = true;
    const delay = state.boardSize === 3 ? 350 : 500;
    setTimeout(() => {
      const aiIdx = getAIMove();
      placeMarker(aiIdx, 'O');
      state.aiThinking = false;

      const aiResult = checkResult(state.board);
      if (aiResult) { endGame(aiResult); return; }

      state.currentPlayer = 'X';
      updateTurnIndicator();
    }, delay);
  }
}

function placeMarker(idx, player) {
  state.board[idx] = player;
  const cells = getCells();
  const cell = cells[idx];
  cell.dataset.mark = player;          // ::before reads this via attr(data-mark)
  cell.classList.add(player.toLowerCase(), 'taken');
}

// ============================================================
// WIN / DRAW DETECTION
// ============================================================

function checkResult(board) {
  for (const line of state.winningLines) {
    const first = board[line[0]];
    if (first && line.every(idx => board[idx] === first)) {
      return { winner: first, line };
    }
  }
  if (board.every(cell => cell !== null)) {
    return { winner: null, line: [] }; // draw
  }
  return null;
}

// Lightweight version that returns winner string / 'draw' / null
function checkBoardResult(board) {
  for (const line of state.winningLines) {
    const first = board[line[0]];
    if (first && line.every(idx => board[idx] === first)) return first;
  }
  if (board.every(c => c !== null)) return 'draw';
  return null;
}

// ============================================================
// END GAME
// ============================================================

function endGame(result) {
  state.gameActive = false;
  const cells = getCells();

  if (result.winner) {
    result.line.forEach(idx => cells[idx].classList.add('win'));
    state.scores[result.winner]++;

    resultIcon.textContent = result.winner === 'X' ? '✕' : '○';
    resultIcon.style.color = result.winner === 'X'
      ? 'var(--x-color)'
      : 'var(--o-color)';

    if (state.mode === 'pvp') {
      resultMsg.textContent = `Player ${result.winner} Wins!`;
    } else {
      resultMsg.textContent = result.winner === 'O' ? 'AI Wins!' : 'You Win!';
    }
  } else {
    state.scores.Draw++;
    resultIcon.textContent = '—';
    resultIcon.style.color = 'var(--ink-muted)';
    resultMsg.textContent = "It's a Draw.";
  }

  updateScoreDisplay();
  setTimeout(() => resultOverlay.classList.remove('hidden'), 400);
}

// ============================================================
// UI HELPERS
// ============================================================

function updateTurnIndicator() {
  turnX.className = 'turn-indicator';
  turnO.className = 'turn-indicator';
  if (state.currentPlayer === 'X') turnX.classList.add('active-x');
  else turnO.classList.add('active-o');
}

function updateScoreDisplay() {
  scoreX.textContent    = state.scores.X;
  scoreO.textContent    = state.scores.O;
  scoreDraw.textContent = state.scores.Draw;
}

// ============================================================
// AI LOGIC
// ============================================================

function getAIMove() {
  switch (state.difficulty) {
    case 'easy':   return getEasyMove();
    case 'medium': return getMediumMove();
    case 'hard':   return getHardMove();
    default:       return getEasyMove();
  }
}

// --- Easy: Random ---
function getEasyMove() {
  const empty = getEmptyCells(state.board);
  return empty[Math.floor(Math.random() * empty.length)];
}

// --- Medium: Win → Block → Prefer center area → Random ---
function getMediumMove() {
  // Win immediately
  const win = findImmediateThreat(state.board, 'O');
  if (win !== -1) return win;

  // Block player from winning
  const block = findImmediateThreat(state.board, 'X');
  if (block !== -1) return block;

  // Prefer center-ish cells on larger boards
  const n = state.boardSize;
  const center = Math.floor((n * n) / 2);
  if (!state.board[center]) return center;

  // Take a strategic cell (near existing O's)
  const strategic = getStrategicMove('O');
  if (strategic !== -1) return strategic;

  return getEasyMove();
}

// --- Hard: Minimax with depth limit for larger boards ---
function getHardMove() {
  const n = state.boardSize;

  // Depth limits: 3×3 exhaustive, 4×4 limited, 5×5 more limited
  const depthLimit = n === 3 ? 9 : n === 4 ? 4 : 3;

  // On larger boards, check immediate win/block first for speed
  if (n > 3) {
    const win = findImmediateThreat(state.board, 'O');
    if (win !== -1) return win;

    const block = findImmediateThreat(state.board, 'X');
    if (block !== -1) return block;
  }

  let bestScore = -Infinity;
  let bestMove  = -1;
  const empty = getEmptyCells(state.board);

  // On large boards, prioritize cells near existing marks (reduces branching)
  const candidates = n > 3
    ? prioritizeCells(state.board, empty, n)
    : empty;

  for (const i of candidates) {
    const boardCopy = [...state.board];
    boardCopy[i] = 'O';
    const score = minimax(boardCopy, 0, false, -Infinity, Infinity, depthLimit);
    if (score > bestScore) {
      bestScore = score;
      bestMove  = i;
    }
  }

  return bestMove !== -1 ? bestMove : getEasyMove();
}

function minimax(board, depth, isMaximizing, alpha, beta, maxDepth) {
  const result = checkBoardResult(board);
  if (result !== null) {
    if (result === 'O') return 100 - depth;
    if (result === 'X') return depth - 100;
    return 0;
  }
  if (depth >= maxDepth) return evaluateBoard(board);

  const empty = getEmptyCells(board);

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (const i of empty) {
      board[i] = 'O';
      const score = minimax(board, depth + 1, false, alpha, beta, maxDepth);
      board[i] = null;
      maxScore = Math.max(maxScore, score);
      alpha = Math.max(alpha, score);
      if (beta <= alpha) break;
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (const i of empty) {
      board[i] = 'X';
      const score = minimax(board, depth + 1, true, alpha, beta, maxDepth);
      board[i] = null;
      minScore = Math.min(minScore, score);
      beta = Math.min(beta, score);
      if (beta <= alpha) break;
    }
    return minScore;
  }
}

// Heuristic board evaluation for depth-limited search on large boards
function evaluateBoard(board) {
  let score = 0;
  for (const line of state.winningLines) {
    const vals = line.map(i => board[i]);
    const oCount = vals.filter(v => v === 'O').length;
    const xCount = vals.filter(v => v === 'X').length;
    const empty  = vals.filter(v => v === null).length;

    if (xCount === 0 && oCount > 0) score += oCount * oCount;
    if (oCount === 0 && xCount > 0) score -= xCount * xCount;
  }
  return score;
}

// For medium: find a cell that builds a consecutive run (not immediate win)
function getStrategicMove(player) {
  let bestIdx = -1;
  let bestCount = 0;

  for (const line of state.winningLines) {
    const vals = line.map(i => state.board[i]);
    const pCount = vals.filter(v => v === player).length;
    const eCount = vals.filter(v => v === null).length;

    if (pCount > 0 && eCount > 0 && pCount > bestCount) {
      const emptyIdx = line[vals.indexOf(null)];
      if (!state.board[emptyIdx]) {
        bestIdx = emptyIdx;
        bestCount = pCount;
      }
    }
  }
  return bestIdx;
}

// On larger boards: prioritize cells adjacent to existing marks
function prioritizeCells(board, empty, n) {
  const hasMarks = board.some(c => c !== null);
  if (!hasMarks) {
    // Start near center
    const center = Math.floor((n * n) / 2);
    return [center, ...empty.filter(i => i !== center)];
  }

  const adjacent = new Set();
  for (let i = 0; i < board.length; i++) {
    if (!board[i]) continue;
    const r = Math.floor(i / n), c = i % n;
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (dr === 0 && dc === 0) continue;
        const nr = r + dr, nc = c + dc;
        if (nr >= 0 && nr < n && nc >= 0 && nc < n) {
          const ni = nr * n + nc;
          if (!board[ni]) adjacent.add(ni);
        }
      }
    }
  }

  const adjacentList = [...adjacent];
  const rest = empty.filter(i => !adjacent.has(i));
  return [...adjacentList, ...rest];
}

// Find an immediately winning/blocking cell for a given player
function findImmediateThreat(board, player) {
  for (const line of state.winningLines) {
    const vals    = line.map(i => board[i]);
    const pCount  = vals.filter(v => v === player).length;
    const eCount  = vals.filter(v => v === null).length;

    if (pCount === state.winTarget - 1 && eCount === 1) {
      const emptyIdx = line[vals.indexOf(null)];
      if (!board[emptyIdx]) return emptyIdx;
    }
  }
  return -1;
}

function getEmptyCells(board) {
  return board.reduce((acc, val, idx) => {
    if (!val) acc.push(idx);
    return acc;
  }, []);
}

function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Init ---
showScreen('mode');
