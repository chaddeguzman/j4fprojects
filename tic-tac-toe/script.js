// ============================================================
// TIC TAC TOE — CDG
// Modes: vs Player | vs AI (Easy / Medium / Hard)
// ============================================================

// --- State ---
const state = {
  mode: null,       // 'pvp' | 'ai'
  difficulty: null, // 'easy' | 'medium' | 'hard'
  board: Array(9).fill(null),
  currentPlayer: 'X',
  scores: { X: 0, O: 0, Draw: 0 },
  gameActive: false,
  aiThinking: false,
};

const WINNING_LINES = [
  [0, 1, 2], [3, 4, 5], [6, 7, 8], // rows
  [0, 3, 6], [1, 4, 7], [2, 5, 8], // cols
  [0, 4, 8], [2, 4, 6],             // diagonals
];

// --- DOM References ---
const screens = {
  mode:       document.getElementById('screen-mode'),
  difficulty: document.getElementById('screen-difficulty'),
  game:       document.getElementById('screen-game'),
};

const cells       = document.querySelectorAll('.cell');
const boardEl     = document.getElementById('board');
const resultOverlay = document.getElementById('result-overlay');
const resultIcon  = document.getElementById('result-icon');
const resultMsg   = document.getElementById('result-msg');
const statusMode  = document.getElementById('status-mode');
const turnX       = document.getElementById('turn-x');
const turnO       = document.getElementById('turn-o');
const scoreX      = document.getElementById('score-x');
const scoreO      = document.getElementById('score-o');
const scoreDraw   = document.getElementById('score-draw');

// --- Screen Navigation ---
function showScreen(name) {
  Object.values(screens).forEach(s => s.classList.add('hidden'));
  screens[name].classList.remove('hidden');
}

// --- Mode Selection ---
document.getElementById('btn-pvp').addEventListener('click', () => {
  state.mode = 'pvp';
  state.difficulty = null;
  initGame();
  showScreen('game');
});

document.getElementById('btn-ai').addEventListener('click', () => {
  state.mode = 'ai';
  showScreen('difficulty');
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
document.getElementById('back-to-mode').addEventListener('click', () => {
  showScreen('mode');
});

document.getElementById('btn-menu').addEventListener('click', () => {
  showScreen('mode');
});

document.getElementById('btn-back-menu').addEventListener('click', () => {
  showScreen('mode');
});

document.getElementById('btn-rematch').addEventListener('click', () => {
  resetBoard();
});

// --- Init Game ---
function initGame() {
  state.scores = { X: 0, O: 0, Draw: 0 };
  updateScoreDisplay();

  const modeLabel = state.mode === 'pvp'
    ? 'vs Player'
    : `vs AI — ${capitalize(state.difficulty)}`;
  statusMode.textContent = modeLabel;

  resetBoard();
}

function resetBoard() {
  state.board = Array(9).fill(null);
  state.currentPlayer = 'X';
  state.gameActive = true;
  state.aiThinking = false;

  cells.forEach(cell => {
    cell.textContent = '';
    cell.className = 'cell';
  });

  resultOverlay.classList.add('hidden');
  updateTurnIndicator();
}

// --- Cell Click Handler ---
cells.forEach(cell => {
  cell.addEventListener('click', () => {
    const idx = parseInt(cell.dataset.index);
    handleMove(idx);
  });
});

function handleMove(idx) {
  if (!state.gameActive) return;
  if (state.board[idx]) return;
  if (state.aiThinking) return;

  placeMarker(idx, state.currentPlayer);

  const result = checkResult();
  if (result) {
    endGame(result);
    return;
  }

  state.currentPlayer = state.currentPlayer === 'X' ? 'O' : 'X';
  updateTurnIndicator();

  // AI turn
  if (state.mode === 'ai' && state.currentPlayer === 'O' && state.gameActive) {
    state.aiThinking = true;
    setTimeout(() => {
      const aiIdx = getAIMove();
      placeMarker(aiIdx, 'O');
      state.aiThinking = false;

      const aiResult = checkResult();
      if (aiResult) {
        endGame(aiResult);
        return;
      }

      state.currentPlayer = 'X';
      updateTurnIndicator();
    }, 350);
  }
}

// --- Place Marker ---
function placeMarker(idx, player) {
  state.board[idx] = player;
  const cell = cells[idx];
  cell.textContent = player;
  cell.classList.add(player.toLowerCase(), 'taken');
}

// --- Check Result ---
function checkResult() {
  for (const [a, b, c] of WINNING_LINES) {
    if (
      state.board[a] &&
      state.board[a] === state.board[b] &&
      state.board[a] === state.board[c]
    ) {
      return { winner: state.board[a], line: [a, b, c] };
    }
  }
  if (state.board.every(cell => cell !== null)) {
    return { winner: null, line: [] }; // draw
  }
  return null;
}

// --- End Game ---
function endGame(result) {
  state.gameActive = false;

  if (result.winner) {
    result.line.forEach(idx => cells[idx].classList.add('win'));
    state.scores[result.winner]++;

    const isAI = state.mode === 'ai' && result.winner === 'O';
    const isPlayer = state.mode === 'ai' && result.winner === 'X';

    resultIcon.textContent = result.winner === 'X' ? '✕' : '○';
    resultIcon.style.color = result.winner === 'X'
      ? 'var(--x-color)'
      : 'var(--o-color)';

    if (state.mode === 'pvp') {
      resultMsg.textContent = `Player ${result.winner} Wins!`;
    } else {
      resultMsg.textContent = isAI ? 'AI Wins!' : 'You Win!';
    }
  } else {
    state.scores.Draw++;
    resultIcon.textContent = '—';
    resultIcon.style.color = 'var(--ink-muted)';
    resultMsg.textContent = "It's a Draw.";
  }

  updateScoreDisplay();

  setTimeout(() => {
    resultOverlay.classList.remove('hidden');
  }, 400);
}

// --- Update Turn Indicator ---
function updateTurnIndicator() {
  turnX.className = 'turn-indicator';
  turnO.className = 'turn-indicator';

  if (state.currentPlayer === 'X') {
    turnX.classList.add('active-x');
  } else {
    turnO.classList.add('active-o');
  }
}

// --- Update Score Display ---
function updateScoreDisplay() {
  scoreX.textContent   = state.scores.X;
  scoreO.textContent   = state.scores.O;
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

// Easy: Fully random
function getEasyMove() {
  const empty = getEmptyCells(state.board);
  return empty[Math.floor(Math.random() * empty.length)];
}

// Medium: Win if possible, block if possible, else random
function getMediumMove() {
  // Try to win
  const winMove = findThreat(state.board, 'O');
  if (winMove !== -1) return winMove;

  // Try to block
  const blockMove = findThreat(state.board, 'X');
  if (blockMove !== -1) return blockMove;

  // Take center if open
  if (!state.board[4]) return 4;

  // Random
  return getEasyMove();
}

// Hard: Minimax (unbeatable)
function getHardMove() {
  let bestScore = -Infinity;
  let bestMove = -1;

  for (let i = 0; i < 9; i++) {
    if (!state.board[i]) {
      const boardCopy = [...state.board];
      boardCopy[i] = 'O';
      const score = minimax(boardCopy, 0, false, -Infinity, Infinity);
      if (score > bestScore) {
        bestScore = score;
        bestMove = i;
      }
    }
  }
  return bestMove;
}

function minimax(board, depth, isMaximizing, alpha, beta) {
  const result = checkBoardResult(board);
  if (result !== null) {
    if (result === 'O') return 10 - depth;
    if (result === 'X') return depth - 10;
    return 0; // draw
  }

  if (isMaximizing) {
    let maxScore = -Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'O';
        const score = minimax(board, depth + 1, false, alpha, beta);
        board[i] = null;
        maxScore = Math.max(maxScore, score);
        alpha = Math.max(alpha, score);
        if (beta <= alpha) break;
      }
    }
    return maxScore;
  } else {
    let minScore = Infinity;
    for (let i = 0; i < 9; i++) {
      if (!board[i]) {
        board[i] = 'X';
        const score = minimax(board, depth + 1, true, alpha, beta);
        board[i] = null;
        minScore = Math.min(minScore, score);
        beta = Math.min(beta, score);
        if (beta <= alpha) break;
      }
    }
    return minScore;
  }
}

// Returns winner string, 'draw', or null (game ongoing)
function checkBoardResult(board) {
  for (const [a, b, c] of WINNING_LINES) {
    if (board[a] && board[a] === board[b] && board[a] === board[c]) {
      return board[a];
    }
  }
  if (board.every(cell => cell !== null)) return 'draw';
  return null;
}

// Find a winning/blocking move for a given player
function findThreat(board, player) {
  for (const [a, b, c] of WINNING_LINES) {
    const line = [board[a], board[b], board[c]];
    const indices = [a, b, c];
    const playerCount = line.filter(v => v === player).length;
    const emptyCount = line.filter(v => v === null).length;

    if (playerCount === 2 && emptyCount === 1) {
      return indices[line.indexOf(null)];
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

// --- Utility ---
function capitalize(str) {
  if (!str) return '';
  return str.charAt(0).toUpperCase() + str.slice(1);
}

// --- Init ---
showScreen('mode');
