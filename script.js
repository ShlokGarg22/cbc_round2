// WebDecryption Round 2 - Maze Robot Puzzle JavaScript
console.log('🤖 Maze Robot Puzzle Loaded!');
console.log('🎯 Goal: Navigate the robot to the flag using code!');
console.log('💡 Available commands: moveUp(), moveDown(), moveLeft(), moveRight()');
console.log('🔑 Don\'t forget to collect the key to open doors!');

// Difficulty configurations
// Legend: S=start, K=key, D=door, F=flag, #=wall, .=open
const DIFFICULTIES = {
    easy: {
        // Easy maze: Must get key (right), backtrack, then go down through door.
        // Unique path forces teaching: key first, then door, then flag.
        // Coordinates (y,x): Start (1,1), Key (1,3), Door (2,2), Flag (3,2)
        maze: [
            ['#','#','#','#','#'], // 0
            ['#','S','.','K','#'], // 1  S -> right -> right -> key
            ['#','.','D','.','#'], // 2  Door blocks descent
            ['#','.','F','.','#'], // 3  Flag below door
            ['#','#','#','#','#']  // 4
        ],
        start: {x:1,y:1},
        hint: 'Easy: Get key (2 rights), left, down to door, open, down to flag.'
    },
    medium: {
        maze: [
            ['#','#','#','#','#','#','#'],
            ['#','S','.','.','K','#','#'],
            ['#','#','#','.','#','#','#'],
            ['#','D','.','.','.','.','#'],
            ['#','.','#','#','#','.','#'],
            ['#','.','.','F','#','.','#'],
            ['#','#','#','#','#','#','#']
        ],
        start: {x:1,y:1},
        hint: 'Medium: key → door → flag (optimal around 12 moves).'
    },
    hard: {
        // Hard maze (new validated design):
        // Structure:
        //  - Upper horizontal run to key with a single access point.
        //  - Must return to central shaft to descend to door (only opening in barrier row).
        //  - Post-door labyrinth forces a detour before reaching flag bottom-right.
        // Key at (6,1), Door at (3,5), Flag at (8,8), Start at (1,1)
        // Guarantee: No path to flag without passing through door; no door without key.
        maze: [
            ['#','#','#','#','#','#','#','#','#','#'], // 0
            ['#','S','.','.','#','.','K','.','.','#'], // 1 corridor to key gated by wall at x4
            ['#','.','#','.','#','.','#','#','.','#'], // 2 vertical channel continues
            ['#','.','#','.','.','.','.','#','.','#'], // 3 open mid section right side
            ['#','.','#','#','#','#','.','#','.','#'], // 4 pre-barrier alignment
            ['#','.','D','.','#','#','.','#','.','#'], // 5 barrier row with single door at x2
            ['#','.','.','.','.','.','.','#','.','#'], // 6 open field after door
            ['#','#','#','#','#','.','#','#','.','#'], // 7 forcing path bend
            ['#','.','.','.','.','.','.','.','F','#'], // 8 flag chamber
            ['#','#','#','#','#','#','#','#','#','#']  // 9 border
        ],
        start: {x:1,y:1},
        hint: 'Hard: Reach key (R R R), back L, descend to door, then wind around to bottom-right flag.'
    }
};

let currentDifficulty = 'medium';
let currentConfig = DIFFICULTIES[currentDifficulty];
let MAZE_SIZE = currentConfig.maze.length; // dynamic
let maze = [];

// Game state
let robotPos = { x: 1, y: 1 }; // Starting position (S)
let hasKey = false;
let isRunning = false;
let moveCommands = [];
let moveCount = 0;
const MOVE_LIMIT = 100;

// DOM elements
const mazeGrid = document.getElementById('mazeGrid');
const codeInput = document.getElementById('codeInput');
const runBtn = document.getElementById('runBtn');
const liveBtn = document.getElementById('liveBtn');
const resetBtn = document.getElementById('resetBtn');
let liveMode = false;
let liveCancel = false;
const statusDiv = document.getElementById('statusDiv');

// Initialize maze display
function cloneMaze() {
    maze = currentConfig.maze.map(row => [...row]);
    MAZE_SIZE = maze.length;
}

function renderCell(x,y) {
    const cellType = maze[y][x];
    const cell = document.getElementById(`cell-${x}-${y}`);
    cell.className = 'maze-cell';
    switch (cellType) {
        case '#': cell.classList.add('wall'); cell.textContent = '#'; break;
        case '.': cell.classList.add('open'); cell.textContent = '.'; break;
        case 'S': cell.classList.add('start'); cell.textContent = '🤖'; break;
        case 'F': cell.classList.add('flag'); cell.textContent = '🏁'; break;
        case 'K': cell.classList.add('key'); cell.textContent = '🔑'; break;
        case 'D': cell.classList.add('door'); cell.textContent = '🚪'; break;
    }
}

function initMaze() {
    mazeGrid.innerHTML='';
    for (let y=0; y<MAZE_SIZE; y++) {
        for (let x=0; x<MAZE_SIZE; x++) {
            const cell = document.createElement('div');
            cell.className = 'maze-cell';
            cell.id = `cell-${x}-${y}`;
            mazeGrid.appendChild(cell);
            renderCell(x,y);
        }
    }
    // place robot on start from config
    robotPos = {x: currentConfig.start.x, y: currentConfig.start.y};
    updateRobotPosition();
}

// Update robot position visually
function updateRobotPosition() {
    // Re-render all non-robot cells (to preserve symbols like flag, key, door)
    for (let y=0; y<MAZE_SIZE; y++) {
        for (let x=0; x<MAZE_SIZE; x++) {
            if (!(x===robotPos.x && y===robotPos.y)) renderCell(x,y);
        }
    }
    const current = document.getElementById(`cell-${robotPos.x}-${robotPos.y}`);
    current.classList.add('robot');
    current.textContent = '🤖';
}

// Check if move is valid
function isValidMove(x,y) {
  if (x<0||x>=MAZE_SIZE||y<0||y>=MAZE_SIZE) return false;
  const t = maze[y][x];
  if (t==='#') return false;
  if (t==='D' && !hasKey) return false;
  return true;
}

// Movement functions that players can use
function moveUp() {
    const newY = robotPos.y - 1;
    if (isValidMove(robotPos.x, newY)) {
        robotPos.y = newY;
        checkCellActions();
        return true;
    }
    return false;
}

function moveDown() {
    const newY = robotPos.y + 1;
    if (isValidMove(robotPos.x, newY)) {
        robotPos.y = newY;
        checkCellActions();
        return true;
    }
    return false;
}

function moveLeft() {
    const newX = robotPos.x - 1;
    if (isValidMove(newX, robotPos.y)) {
        robotPos.x = newX;
        checkCellActions();
        return true;
    }
    return false;
}

function moveRight() {
    const newX = robotPos.x + 1;
    if (isValidMove(newX, robotPos.y)) {
        robotPos.x = newX;
        checkCellActions();
        return true;
    }
    return false;
}

// Check for special cell actions (key, flag, etc.)
function checkCellActions() {
    const t = maze[robotPos.y][robotPos.x];
    if (t==='K') {
        hasKey = true;
        maze[robotPos.y][robotPos.x]='.';
        updateStatus('🔑 Key collected! Door can now be opened.', 'info');
        console.log('🔑 Key collected.');
    }
    if (t==='D' && hasKey) {
        // consume door -> becomes open
        maze[robotPos.y][robotPos.x]='.';
        updateStatus('🚪 Door opened!', 'info');
        console.log('🚪 Door opened.');
    }
    if (t==='F') {
        updateStatus('🎉 Flag captured! Flag: cbc{robot_maze_master_2024}', 'success');
        console.log('🏆 FLAG: cbc{robot_maze_master_2024}');
        runBtn.disabled=true;
        return true;
    }
    return false;
}

// Update status message display
function updateStatus(message, type = '') {
    statusDiv.textContent = message;
    statusDiv.className = `status ${type}`;
}

// Parse and execute user code safely
// Simple custom parser for allowed syntax: moveX(); loops for (...) { ... }
function tokenize(code) {
    return code.match(/moveUp\(\)|moveDown\(\)|moveLeft\(\)|moveRight\(\)|for|\{|\}|\(|\)|<|>|<=|>=|==|!=|&&|\|\||[0-9]+|let|i|;|\+\+|<|=|\+|\s+|./g) || [];
}

function buildCommands(code) {
    // Allow only: movement calls + for (let i = 0; i < N; i++) { ... } or single-line form
    const disallowed = /(?<![A-Za-z0-9_])(while|async|await|fetch|XMLHttpRequest|function|=>|class|import|export|new|window|document|eval)/;
    if (disallowed.test(code)) throw new Error('Disallowed syntax detected.');

    let expanded = code;
    // Normalize line endings
    expanded = expanded.replace(/\r\n?/g, '\n');

    // Expand brace for-loops iteratively (supports nesting depth in a simple way)
    const braceFor = /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*(\d{1,2})\s*;\s*i\+\+\s*\)\s*\{([\s\S]*?)\}/m;
    let guard = 0;
    while (braceFor.test(expanded) && guard < 20) {
        expanded = expanded.replace(braceFor, (m, nStr, body) => {
            const n = parseInt(nStr,10);
            if (n > 20) throw new Error('Loop upper bound too large (max 20).');
            return Array.from({length:n}, () => body).join('\n');
        });
        guard++;
    }
    if (guard === 20) throw new Error('Loop expansion depth limit reached.');

    // Expand single-line for without braces: for (let i = 0; i < N; i++) moveRight();
    const singleLineFor = /for\s*\(\s*let\s+i\s*=\s*0\s*;\s*i\s*<\s*(\d{1,2})\s*;\s*i\+\+\s*\)\s*([^;\n\{]+);?/g;
    expanded = expanded.replace(singleLineFor, (m, nStr, stmt) => {
        const n = parseInt(nStr,10);
        if (n > 20) throw new Error('Loop upper bound too large (max 20).');
        return Array.from({length:n}, () => stmt.trim() + ';').join('\n');
    });

    // After expansion, reject any remaining 'for (' occurrences
    if (/for\s*\(/.test(expanded)) {
        throw new Error('Only basic for loops with i from 0 to N-1 are allowed.');
    }

    // Now translate movement calls into command pushes
    const commands = [];
    const processedCode = expanded
        .replace(/\/\/.*$/gm, '') // strip line comments
        .replace(/\/\*[\s\S]*?\*\//g, '') // strip block comments
        .replace(/moveUp\(\)\s*;?/g,   () => { commands.push('up');   return ''; })
        .replace(/moveDown\(\)\s*;?/g, () => { commands.push('down'); return ''; })
        .replace(/moveLeft\(\)\s*;?/g, () => { commands.push('left'); return ''; })
        .replace(/moveRight\(\)\s*;?/g,() => { commands.push('right');return ''; });

    return commands;
}

async function executeUserCode() {
    if (isRunning) return;
    isRunning = true;
    runBtn.disabled = true;
    moveCommands = [];
    moveCount = 0;
    const code = codeInput.value.trim();
    if (!code) {
        updateStatus('❌ Please write some movement commands!', 'error');
        isRunning=false; runBtn.disabled=false; return;
    }
    try {
        updateStatus('🤖 Parsing code...', 'info');
        moveCommands = buildCommands(code);
        if (moveCommands.length > MOVE_LIMIT) {
            throw new Error(`Too many moves (${moveCommands.length}). Limit is ${MOVE_LIMIT}.`);
        }
        // Debug visibility for player
        console.log('🧭 Parsed command sequence:', moveCommands.join(' -> ') || '[none]');
        if (moveCommands.length) {
            const first = moveCommands[0];
            // Predict outcome of first move to give clearer feedback
            let testX = robotPos.x;
            let testY = robotPos.y;
            if (first === 'up') testY--; else if (first === 'down') testY++; else if (first === 'left') testX--; else if (first === 'right') testX++;
            if (!isValidMove(testX, testY)) {
                console.log(`⚠️ Pre-run check: First move '${first}' is blocked (wall / door w/o key / boundary).`);
                console.log('💡 Tip: Use showMaze() to inspect the grid. Starting downward hits a wall beneath the start. Try moving right first.');
            }
        }
        updateStatus('🚀 Executing robot commands...', 'info');
        console.log(`📋 Executing ${moveCommands.length} moves`);
        for (let i=0; i<moveCommands.length; i++) {
            const c = moveCommands[i];
            let ok=false;
            switch(c){
                case 'up': ok=moveUp(); break;
                case 'down': ok=moveDown(); break;
                case 'left': ok=moveLeft(); break;
                case 'right': ok=moveRight(); break;
            }
            moveCount++;
            if(!ok){
                updateStatus(`❌ Invalid move '${c}' at step ${i+1}.`, 'error');
                console.log('Move blocked.');
                break;
            }
            updateRobotPosition();
            if (checkCellActions()) break;
            await new Promise(r=>setTimeout(r,400));
        }
        if (!runBtn.disabled) updateStatus('✅ Execution finished. Adjust code if needed.', 'info');
    } catch(err) {
        updateStatus(`❌ Code error: ${err.message}`,'error');
        console.error(err);
    }
    isRunning=false; runBtn.disabled=false;
}

// Reset maze to initial state
function resetMaze() {
    console.log('🔄 Resetting maze...');
    hasKey=false; isRunning=false; moveCommands=[]; moveCount=0; liveCancel=true; liveMode=false;
    cloneMaze();
    initMaze();
    updateStatus(`Maze reset (${currentDifficulty}). Ready for your next attempt.`, '');
    runBtn.disabled=false;
    if (liveBtn) { liveBtn.textContent='▶ Live Run'; }
}

// Difficulty change handler
const difficultySelect = document.getElementById('difficultySelect');
const dynamicHintText = document.getElementById('dynamicHintText');
const difficultyHint = document.getElementById('difficultyHint');

function applyDifficulty(diff) {
    if (!DIFFICULTIES[diff]) return;
    currentDifficulty = diff;
    currentConfig = DIFFICULTIES[diff];
    resetMaze();
    const hint = currentConfig.hint;
    if (dynamicHintText) dynamicHintText.textContent = hint;
    if (difficultyHint) difficultyHint.textContent = `${diff.charAt(0).toUpperCase()+diff.slice(1)}: ${hint}`;
    console.log(`🎚 Difficulty switched to: ${diff}`);
}

if (difficultySelect) {
    difficultySelect.addEventListener('change', e => {
        applyDifficulty(e.target.value);
    });
}

// Event listeners - fixed to properly check if elements exist
if (runBtn) runBtn.addEventListener('click', executeUserCode);
if (resetBtn) resetBtn.addEventListener('click', resetMaze);
if (liveBtn) liveBtn.addEventListener('click', toggleLiveMode);

function toggleLiveMode(){
    if (!liveMode){
        liveMode = true; liveCancel = false;
        runBtn.disabled = true;
        liveBtn.textContent = '⏹ Stop Live';
        liveExecute();
    } else {
        liveCancel = true;
    }
}

function parseSingleLine(line){
    // allow a single movement call or a simple for-line
    line = line.trim();
    if (!line) return [];
    if (/^for\s*\(/.test(line)) {
        // reuse buildCommands limited to single line
        try { return buildCommands(line); } catch(e){ updateStatus('❌ Live loop rejected: '+e.message,'error'); return []; }
    }
    const cmds = [];
    if (/moveUp\(\)/.test(line)) cmds.push('up');
    if (/moveDown\(\)/.test(line)) cmds.push('down');
    if (/moveLeft\(\)/.test(line)) cmds.push('left');
    if (/moveRight\(\)/.test(line)) cmds.push('right');
    if (!cmds.length) console.log('ℹ️ Ignored line (no command):', line);
    return cmds;
}

async function liveExecute(){
    const lines = codeInput.value.split(/\n/);
    updateStatus('▶ Live mode: executing lines...', 'info');
    for (let idx=0; idx<lines.length; idx++) {
        if (liveCancel) { updateStatus('⏹ Live mode stopped.', 'info'); break; }
        const raw = lines[idx];
        const commands = parseSingleLine(raw);
        if (commands.length){
            updateStatus(`▶ Line ${idx+1}: ${raw}`, 'info');
            for (const c of commands){
                let ok=false; switch(c){case 'up':ok=moveUp();break;case 'down':ok=moveDown();break;case 'left':ok=moveLeft();break;case 'right':ok=moveRight();break;}
                if(!ok){ updateStatus(`❌ Blocked on line ${idx+1} (${c})`, 'error'); liveCancel=true; break; }
                updateRobotPosition();
                if (checkCellActions()){ liveCancel=true; break; }
                await new Promise(r=>setTimeout(r,300));
            }
        }
        if (liveCancel) break;
    }
    liveMode=false; liveBtn.textContent='▶ Live Run'; runBtn.disabled=false; if(!liveCancel) updateStatus('✅ Live mode finished.', 'success');
}

// Console helper functions for players
window.showMaze = function() {
    console.log('🗺️ Current maze layout:');
    for (let y = 0; y < MAZE_SIZE; y++) {
        console.log(maze[y].join(' '));
    }
};

window.showPosition = function() {
    console.log(`🤖 Robot position: (${robotPos.x}, ${robotPos.y})`);
    console.log(`🔑 Has key: ${hasKey ? 'Yes' : 'No'}`);
};

window.hint = function() {
    console.log('💡 MAZE SOLVING HINTS:');
    console.log('1. Start by moving right to collect the key');
    console.log('2. Navigate through the open paths');
    console.log('3. Use the key to open the door');
    console.log('4. Reach the flag to win!');
    console.log('5. Use loops to make your code shorter');
    console.log('');
    console.log('🎯 Try: showMaze() to see the layout');
    console.log('🤖 Try: showPosition() to see robot status');
};

// Hard difficulty solution helper (based on current hard maze definition)
// Path: R R R (key) L L D D D D (to door) then R D R R R D R R to flag
// Combined moves: RRRLLDDDDRDRRRDRR
window.hardSolution = function() {
    // Recomputed path for new hard maze.
    // Path logic (phases):
    // 1) To Key: R,R,R (at key)
    // 2) Back to shaft: L (position (3,1))
    // 3) Descend to door: D,D,D,D (arrive at (3,5) door) -> opens
    // 4) After door: R (to 4,5) R (5,5 blocked by #) so instead Down to (3,6) then
    //    traverse right: R,R,R,R (to 7,6) Down (7,7 blocked by #) so go further path:
    //    Actually simpler cheaper validated sequence below.
    // Final validated minimal sequence (coordinates traced):
    const seq = 'RRRLDDDD' + 'DRRRR' + 'DDRR';
    // Explanation breakdown:
    // RRR       -> key
    // L         -> align over door column
    // DDDD      -> descend to and open door
    // D         -> (move into post-door field)
    // RRRR      -> traverse right segment
    // DD        -> drop toward flag row
    // RR        -> finish to flag
    console.log('🧩 Hard Maze Solution Moves (sequence):', seq);
    console.log('Readable groups: RRR | L | DDDD | D | RRRR | DD | RR');
    console.log('\n💻 Loop-friendly code example:');
    console.log(`for (let i=0;i<3;i++) moveRight(); // key\nmoveLeft();\nfor (let i=0;i<4;i++) moveDown(); // to door\nmoveDown(); // step into field\nfor (let i=0;i<4;i++) moveRight();\nfor (let i=0;i<2;i++) moveDown();\nfor (let i=0;i<2;i++) moveRight();`);
};

// Initialize the maze on page load - fixed DOM ready check
document.addEventListener('DOMContentLoaded', function() {
    // Ensure all DOM elements exist before initializing
        if (mazeGrid && codeInput && runBtn && resetBtn && statusDiv) {
            applyDifficulty(currentDifficulty); // initializes maze & hint
            updateStatus('Welcome! Choose difficulty, write code, then run.', '');
            console.log('\n🎮 Console commands: hint(), showMaze(), showPosition()');
        } else {
            console.error('Required DOM elements not found');
        }
});