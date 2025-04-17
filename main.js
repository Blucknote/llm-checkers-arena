let boardCount = 0;
let availableModels = []; // Will be filled after fetching from OpenRouter

document.addEventListener("DOMContentLoaded", async () => {
    // Leaderboard modal logic
    const leaderboardBtn = document.getElementById("leaderboard-btn");
    const leaderboardModal = document.getElementById("leaderboard-modal");
    const closeLeaderboard = document.getElementById("close-leaderboard");
    leaderboardBtn.onclick = () => leaderboardModal.classList.remove("hidden");
    closeLeaderboard.onclick = () => leaderboardModal.classList.add("hidden");
    leaderboardModal.onclick = (e) => {
        if (e.target === leaderboardModal) leaderboardModal.classList.add("hidden");
    };

    // API key modal logic
    const apiKeyModal = document.getElementById("api-key-modal");
    const closeApiKey = document.getElementById("close-api-key");
    const apiKeyInput = document.getElementById("api-key-input");
    const saveApiKeyBtn = document.getElementById("save-api-key-btn");

    function showApiKeyModal() {
        apiKeyInput.value = getApiKey() || "";
        apiKeyModal.classList.remove("hidden");
        apiKeyInput.focus();
    }
    function hideApiKeyModal() {
        apiKeyModal.classList.add("hidden");
    }
    closeApiKey.onclick = hideApiKeyModal;
    apiKeyModal.onclick = (e) => {
        if (e.target === apiKeyModal) hideApiKeyModal();
    };
    saveApiKeyBtn.onclick = async () => {
        const key = apiKeyInput.value.trim();
        if (key) {
            localStorage.setItem("openrouter_api_key", key);
            hideApiKeyModal();
            await fetchAndShowModels();
            refreshAllModelSelectors();
        }
    };

    // Add "API Key" button to header
    const headerActions = document.querySelector(".header-actions");
    const apiKeyBtn = document.createElement("button");
    apiKeyBtn.textContent = "API Key";
    apiKeyBtn.onclick = showApiKeyModal;
    headerActions.appendChild(apiKeyBtn);

    // Theme toggle button
    const themeToggleBtn = document.createElement("button");
    themeToggleBtn.id = "theme-toggle-btn";
    themeToggleBtn.onclick = () => toggleTheme(themeToggleBtn);
    headerActions.appendChild(themeToggleBtn);

    // Initialize theme after button is created
    initTheme(themeToggleBtn);

    // Refresh Models button logic
    const refreshModelsBtn = document.getElementById("refresh-models-btn");
    refreshModelsBtn.onclick = async () => {
        await fetchAndShowModels();
        refreshAllModelSelectors();
    };

    // Show API key modal if not set
    if (!getApiKey()) {
        showApiKeyModal();
    }

    // Fetch models from OpenRouter (with status)
    await fetchAndShowModels();

    // Add board logic
    const addBoardBtn = document.getElementById("add-board-btn");
    addBoardBtn.onclick = () => addBoard();

    // Add first board by default
    addBoard();

    // Load leaderboard
    renderLeaderboard();
});

// Theme utility functions
function setTheme(theme) {
    document.body.classList.toggle('dark', theme === 'dark');
}

// Gets the actual theme ('light' or 'dark') based on stored preference and system setting
function getCurrentTheme() {
    const storedTheme = localStorage.getItem('theme') || 'system'; // Default to system
    if (storedTheme === 'system') {
        return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return storedTheme; // 'light' or 'dark'
}

function updateToggleIcon(toggleBtn) {
    const storedTheme = localStorage.getItem('theme') || 'system';
    if (storedTheme === 'light') {
        toggleBtn.textContent = '🌞'; // Sun for light mode
    } else if (storedTheme === 'dark') {
        toggleBtn.textContent = '🌜'; // Moon for dark mode
    } else {
        toggleBtn.textContent = '🖥️'; // Computer for system mode
    }
}

function initTheme(toggleBtn) {
    const storedTheme = localStorage.getItem('theme') || 'system'; // Default to system
    const currentActualTheme = getCurrentTheme();
    setTheme(currentActualTheme); // Apply the initial theme based on stored/system preference

    // Listen for system changes ONLY if the preference is 'system'
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
        const currentStoredTheme = localStorage.getItem('theme') || 'system';
        if (currentStoredTheme === 'system') {
            setTheme(e.matches ? 'dark' : 'light');
            // No need to update icon here, it stays '🖥️'
        }
    });

    updateToggleIcon(toggleBtn); // Set the initial icon
}

function toggleTheme(toggleBtn) {
    const storedTheme = localStorage.getItem('theme') || 'system';
    let newTheme;

    // Cycle: light -> dark -> system -> light
    if (storedTheme === 'light') {
        newTheme = 'dark';
    } else if (storedTheme === 'dark') {
        newTheme = 'system';
    } else { // storedTheme === 'system'
        newTheme = 'light';
    }

    localStorage.setItem('theme', newTheme);

    // Apply the theme based on the new setting
    const currentActualTheme = getCurrentTheme(); // Recalculate based on new setting
    setTheme(currentActualTheme);

    updateToggleIcon(toggleBtn); // Update icon to reflect the new setting
}

// Helper to set status message
function setModelsStatus(msg, color = "#555") {
    const status = document.getElementById("models-status");
    if (status) {
        status.textContent = msg;
        status.style.color = color;
    }
}

// Fetch models and show status
async function fetchAndShowModels() {
    setModelsStatus("Loading models...", "#888");
    const refreshBtn = document.getElementById("refresh-models-btn");
    if (refreshBtn) refreshBtn.disabled = true;
    try {
        await fetchAndSetModels();
        if (availableModels.length && availableModels[0].id !== "") {
            setModelsStatus(`Models loaded (${availableModels.length})`, "#228822");
        } else {
            setModelsStatus("No models available", "#b8860b");
        }
    } catch (e) {
        setModelsStatus("Failed to load models", "#b22222");
    } finally {
        if (refreshBtn) refreshBtn.disabled = false;
    }
}

// Helper to get API key
function getApiKey() {
    return localStorage.getItem("openrouter_api_key") || "";
}

// Fetch models from OpenRouter and store in availableModels
async function fetchAndSetModels() {
    const apiKey = getApiKey();
    if (!apiKey) {
        availableModels = [];
        return;
    }
    try {
        const res = await fetch("https://openrouter.ai/api/v1/models", {
            headers: {
                "Authorization": `Bearer ${apiKey}`
            }
        });
        if (!res.ok) {
            throw new Error("Failed to fetch models: " + res.status);
        }
        const data = await res.json();
        // OpenRouter returns { data: [ { id, name, ... }, ... ] }
        availableModels = (data.data || []).map(m => ({
            id: m.id,
            name: m.name || m.id
        }));
        if (availableModels.length === 0) {
            // fallback: show a message
            availableModels = [{ id: "", name: "No models available" }];
        }
    } catch (e) {
        console.error("Error fetching models:", e);
        availableModels = [{ id: "", name: "Failed to load models" }];
    }
}

// Refresh all model selectors on the page (for when models are re-fetched)
function refreshAllModelSelectors() {
    document.querySelectorAll(".model-selectors").forEach(container => {
        const selects = container.querySelectorAll(".model-selector-wrapper");
        selects.forEach(sel => sel.remove());
        // The ids are encoded in the container's child select ids
        const topId = container.dataset.topId;
        const bottomId = container.dataset.bottomId;
        createModelSelector(container, topId, "Black Model (Top)");
        createModelSelector(container, bottomId, "Red Model (Bottom)");
    });
}

function addBoard() {
    boardCount++;
    const boardsContainer = document.getElementById("boards-container");
    const wrapper = document.createElement("div");
    wrapper.className = "board-wrapper";
    wrapper.id = `board-wrapper-${boardCount}`;

    // Model selectors
    const selectors = document.createElement("div");
    selectors.className = "model-selectors";
    selectors.dataset.topId = `model-top-${boardCount}`;
    selectors.dataset.bottomId = `model-bottom-${boardCount}`;
    // Custom model selectors with search and color labels
    createModelSelector(selectors, `model-top-${boardCount}`, "Black Model (Top)");
    createModelSelector(selectors, `model-bottom-${boardCount}`, "Red Model (Bottom)");

    // Board placeholder
    const boardDiv = document.createElement("div");
    boardDiv.className = "";
    boardDiv.id = `checkers-board-${boardCount}`;

    // Move log
    const moveLogDiv = document.createElement("div");
    moveLogDiv.className = "move-log";
    moveLogDiv.id = `move-log-${boardCount}`;
    moveLogDiv.innerHTML = "<strong>Move Log:</strong><br><em>No moves yet.</em>";

    // Status bar
    const statusBar = document.createElement("div");
    statusBar.className = "status-bar";
    statusBar.id = `status-bar-${boardCount}`;
    statusBar.textContent = "Waiting to start...";

    // Controls (start, reset)
    const controls = document.createElement("div");
    controls.className = "board-controls";
    const startBtn = document.createElement("button");
    startBtn.textContent = "Start";
    startBtn.onclick = () => startGame(boardCount, boardDiv, statusBar, selectors);
    controls.appendChild(startBtn);

    // Assemble
    wrapper.appendChild(selectors);

    // If no models are available, show a visible warning
    if (
        !availableModels.length ||
        (availableModels.length === 1 && (availableModels[0].id === "" || availableModels[0].name.startsWith("No models") || availableModels[0].name.startsWith("Failed")))
    ) {
        const warn = document.createElement("div");
        warn.textContent = "No models available. Please check your OpenRouter API key.";
        warn.style.color = "#b22222";
        warn.style.background = "#fffbe6";
        warn.style.border = "2px solid #b22222";
        warn.style.padding = "0.5rem";
        warn.style.margin = "0.5rem 0";
        warn.style.fontWeight = "bold";
        warn.style.textAlign = "center";
        wrapper.appendChild(warn);
    }

    wrapper.appendChild(boardDiv);
    wrapper.appendChild(moveLogDiv);
    wrapper.appendChild(controls);
    wrapper.appendChild(statusBar);
    boardsContainer.appendChild(wrapper);

    // Render initial board state
    const initialState = getInitialBoardState();
    renderBoard(boardDiv, initialState);
    wrapper.dataset.state = JSON.stringify(initialState);
}

function createModelSelector(container, selectId, colorLabel) {
    // Wrapper for search + dropdown
    const wrapper = document.createElement("div");
    wrapper.className = "model-selector-wrapper";
    wrapper.style.display = "flex";
    wrapper.style.flexDirection = "column";
    wrapper.style.flex = "1 1 0";
    wrapper.style.minWidth = "0";

    // Color label (e.g., Red Model / Black Model)
    const colorDiv = document.createElement("div");
    colorDiv.textContent = colorLabel;
    colorDiv.style.fontWeight = "bold";
    colorDiv.style.fontSize = "1.01em";
    colorDiv.style.marginBottom = "0.14rem";
    colorDiv.style.letterSpacing = "0.01em";
    colorDiv.classList.add(colorLabel.toLowerCase().includes("red") ? "model-label-red" : "model-label-black");
    wrapper.appendChild(colorDiv);

    // Search input
    const label = document.createElement("label");
    label.textContent = "Search models:";
    label.style.fontSize = "0.97em";
    label.style.marginBottom = "0.15rem";
    label.style.color = "#444";
    label.setAttribute("for", selectId + "-search");

    const search = document.createElement("input");
    search.type = "text";
    search.className = "model-search";
    search.id = selectId + "-search";
    search.placeholder = "Search models...";
    search.autocomplete = "off";

    const select = document.createElement("select");
    select.className = "model-select";
    select.id = selectId;
    select.style.marginBottom = "0";

    // Helper to render options based on search
    function renderOptions(filter = "") {
        select.innerHTML = "";
        let models = availableModels;
        if (filter) {
            const f = filter.toLowerCase();
            models = models.filter(m => m.name.toLowerCase().includes(f) || m.id.toLowerCase().includes(f));
        }
        if (models.length === 0) {
            const opt = document.createElement("option");
            opt.value = "";
            opt.textContent = "No models found";
            select.appendChild(opt);
        } else {
            models.forEach(model => {
                const opt = document.createElement("option");
                opt.value = model.id;
                opt.textContent = model.name;
                select.appendChild(opt);
            });
        }
    }

    renderOptions();

    search.addEventListener("input", () => {
        renderOptions(search.value);
    });

    wrapper.appendChild(label);
    wrapper.appendChild(search);
    wrapper.appendChild(select);
    container.appendChild(wrapper);
}

function getInitialBoardState() {
    // 8x8 board, 0=empty, 1=red, 2=black, 3=red king, 4=black king
    // Red at bottom (rows 5-7), black at top (rows 0-2)
    const board = [];
    for (let row = 0; row < 8; row++) {
        for (let col = 0; col < 8; col++) {
            if ((row + col) % 2 === 1) {
                if (row < 3) board.push(2); // black
                else if (row > 4) board.push(1); // red
                else board.push(0);
            } else {
                board.push(0);
            }
        }
    }
    return { board, turn: 1, moveHistory: [] }; // 1=red, 2=black
}

function renderBoard(boardDiv, state) {
    // Clear previous content
    boardDiv.innerHTML = "";

    // Create the legend container inside boardDiv
    const legendContainer = document.createElement("div");
    legendContainer.className = "board-with-legend";

    // Column legends (A-H)
    const colLegendRow = document.createElement("div");
    colLegendRow.className = "col-legend-row";
    // Empty corner for alignment
    const legendCorner = document.createElement("div");
    legendCorner.className = "legend-corner";
    colLegendRow.appendChild(legendCorner);
    const colLabels = "ABCDEFGH";
    for (let c = 0; c < 8; c++) {
        const colLegend = document.createElement("div");
        colLegend.className = "col-legend";
        colLegend.textContent = colLabels[c];
        colLegendRow.appendChild(colLegend);
    }
    legendContainer.appendChild(colLegendRow);

    // Board rows with row legends
    for (let r = 0; r < 8; r++) {
        const boardRow = document.createElement("div");
        boardRow.className = "board-row";
        // Row legend (8 at top, 1 at bottom)
        const rowLegend = document.createElement("div");
        rowLegend.className = "row-legend";
        rowLegend.textContent = 8 - r;
        boardRow.appendChild(rowLegend);

        // Board squares for this row
        const rowBoard = document.createElement("div");
        rowBoard.className = "checkers-board-row";
        for (let c = 0; c < 8; c++) {
            const i = r * 8 + c;
            const square = document.createElement("div");
            square.className = "square " + ((r + c) % 2 === 0 ? "light" : "dark");
            // Only render pieces on dark squares
            if ((r + c) % 2 === 1) {
                const piece = state.board[i];
                if (piece === 1 || piece === 3) {
                    const el = document.createElement("div");
                    el.className = "piece" + (piece === 3 ? " king" : "");
                    el.style.background = "#e53e3e";
                    square.appendChild(el);
                } else if (piece === 2 || piece === 4) {
                    const el = document.createElement("div");
                    el.className = "piece black" + (piece === 4 ? " king" : "");
                    square.appendChild(el);
                }
            }
            rowBoard.appendChild(square);
        }
        boardRow.appendChild(rowBoard);
        legendContainer.appendChild(boardRow);
    }

    // Append the legendContainer to the boardDiv
    boardDiv.appendChild(legendContainer);
}

function startGame(boardId, boardDiv, statusBar, selectors) {
    // Reset to initial state
    let state = getInitialBoardState();
    renderBoard(boardDiv, state);
    statusBar.textContent = "Red's turn (bottom)";
    const wrapper = document.getElementById(`board-wrapper-${boardId}`);
    wrapper.dataset.state = JSON.stringify(state);

    // Move log
    const moveLogDiv = document.getElementById(`move-log-${boardId}`);
    function renderMoveLog() {
        if (!moveLogDiv) return;
        if (!state.moveHistory.length) {
            moveLogDiv.innerHTML = "<strong>Move Log:</strong><br><em>No moves yet.</em>";
        } else {
            moveLogDiv.innerHTML = "<strong>Move Log:</strong><br>" +
                state.moveHistory.map((m, i) => {
                    let msg = `${i + 1}. <span class="move-log-${m.color.toLowerCase()}">${m.color} (<span class="move-log-${m.color.toLowerCase()}">${m.modelName || ""}</span>):</span> ${m.move}`;
                    if (m.mistake) {
                        msg += ' <span style="color:#b22222;font-weight:bold;">[Mistake: missed capture]</span>';
                    }
                    if (m.llmWasWarned) {
                        msg += ' <span style="color:#1e90ff;font-weight:bold;">[LLM was notified about previous mistake]</span>';
                    }
                    return msg;
                }).join("<br>");
        }
    }
    renderMoveLog();

    // Disable Start, add Reset
    const controls = wrapper.querySelector(".board-controls");
    controls.querySelectorAll("button").forEach(btn => btn.disabled = true);
    let resetBtn = controls.querySelector(".reset-btn");
    if (!resetBtn) {
        resetBtn = document.createElement("button");
        resetBtn.textContent = "Reset";
        resetBtn.className = "reset-btn";
        resetBtn.onclick = () => {
            // Reset board and controls
            state = getInitialBoardState();
            renderBoard(boardDiv, state);
            statusBar.textContent = "Red's turn (bottom)";
            wrapper.dataset.state = JSON.stringify(state);
            controls.querySelectorAll("button").forEach(btn => btn.disabled = false);
            renderMoveLog();
        };
        controls.appendChild(resetBtn);
    } else {
        resetBtn.disabled = false;
    }

    // Get selected models
    // Now using custom selectors
    const modelRed = selectors.querySelector(`#model-bottom-${boardId}`).value;
    const modelBlack = selectors.querySelector(`#model-top-${boardId}`).value;

    // Start LLM-vs-LLM loop
    let running = true;
    async function moveLoop() {
        // Track if previous move for each color was a mistake
        let mistakeRedLastTurn = false;
        let mistakeBlackLastTurn = false;
        while (running) {
            // Check for win/draw
            if (isGameOver(state)) {
                statusBar.textContent = getGameOverText(state);
                renderMoveLog();
                break;
            }
            // Which model's turn?
            const model = state.turn === 1 ? modelRed : modelBlack;
            const color = state.turn === 1 ? "Red" : "Black";
            statusBar.textContent = `${color}'s turn (${state.turn === 1 ? "bottom" : "top"})...`;

            // Check for available captures before move
            const captureAvailable = hasAvailableCapture(state, state.turn);

            // Get move from LLM with retry logic
            let move = null;
            let valid = false;
            let attempts = 0;
            let mistake = false;
            // Pass mistakeLastTurn to LLM
            const mistakeLastTurn = state.turn === 1 ? mistakeRedLastTurn : mistakeBlackLastTurn;
            while (attempts < 3 && !valid) {
                move = await getLLMMove(model, state, color, mistakeLastTurn);
                if (!move) {
                    attempts++;
                    continue;
                }
                // Check if move is a capture
                let isCapture = false;
                const m = move.match(/^([a-h][1-8])-([a-h][1-8])$/i);
                if (m) {
                    const from = m[1], to = m[2];
                    const fromIdx = algebraicToIndex(from);
                    const toIdx = algebraicToIndex(to);
                    if (fromIdx !== null && toIdx !== null) {
                        const fromRow = Math.floor(fromIdx / 8);
                        const fromCol = fromIdx % 8;
                        const toRow = Math.floor(toIdx / 8);
                        const toCol = toIdx % 8;
                        if (Math.abs(toCol - fromCol) === 2 && Math.abs(toRow - fromRow) === 2) {
                            isCapture = true;
                        }
                    }
                }
                // If a capture is available but move is not a capture, mark as mistake
                if (captureAvailable && !isCapture) {
                    mistake = true;
                }
                valid = applyMove(state, move, state.turn);
                if (!valid) {
                    attempts++;
                }
            }
            if (!move) {
                statusBar.textContent = `No move from ${color} (${model}) after ${attempts} attempts`;
                renderMoveLog();
                break;
            }
            if (!valid) {
                statusBar.textContent = `Invalid move from ${color}: ${move} (after ${attempts} attempts)`;
                renderMoveLog();
                break;
            }
            // Notify if mistake
            if (mistake) {
                statusBar.textContent = `${color} missed a mandatory capture!`;
            }
            // Update UI
            renderBoard(boardDiv, state);
            wrapper.dataset.state = JSON.stringify(state);
            // Next turn
            state.moveHistory.push({
                move,
                color,
                modelName: model,
                mistake,
                llmWasWarned: mistakeLastTurn // true if LLM was warned in prompt for this move
            });
            // Console log whether LLM was warned about previous mistake
            if (mistakeLastTurn) {
                console.log(
                    `[LLM NOTIFIED] ${color} (${model}) was notified about a previous mistake (missed mandatory capture) before making move: ${move}`
                );
            } else {
                console.log(
                    `[LLM NOTIFIED] ${color} (${model}) was NOT notified about a previous mistake before making move: ${move}`
                );
            }
            // Update mistake tracker for next turn
            if (state.turn === 1) {
                mistakeRedLastTurn = mistake;
            } else {
                mistakeBlackLastTurn = mistake;
            }
            state.turn = 3 - state.turn;
            renderMoveLog();
            await sleep(700); // Small delay for UI
        }
    }
    moveLoop();

    // Reset disables loop
    resetBtn.onclick = () => {
        running = false;
        state = getInitialBoardState();
        renderBoard(boardDiv, state);
        statusBar.textContent = "Red's turn (bottom)";
        wrapper.dataset.state = JSON.stringify(state);
        controls.querySelectorAll("button").forEach(btn => btn.disabled = false);
        renderMoveLog();
    };
}

// Check if the current player has any available capture moves
function hasAvailableCapture(state, turn) {
    // 1=red, 2=black, 3=red king, 4=black king
    const directions = [
        [-1, -1], [-1, 1], [1, -1], [1, 1]
    ];
    for (let i = 0; i < 64; i++) {
        const piece = state.board[i];
        if (
            (turn === 1 && (piece === 1 || piece === 3)) ||
            (turn === 2 && (piece === 2 || piece === 4))
        ) {
            const row = Math.floor(i / 8);
            const col = i % 8;
            for (const [dr, dc] of directions) {
                if (piece === 1 && dr !== -1) continue;
                if (piece === 2 && dr !== 1) continue;
                // Normal pieces (one jump)
                if (piece === 1 || piece === 2) {
                    const midRow = row + dr;
                    const midCol = col + dc;
                    const toRow = row + 2 * dr;
                    const toCol = col + 2 * dc;
                    if (
                        midRow >= 0 && midRow < 8 && midCol >= 0 && midCol < 8 &&
                        toRow >= 0 && toRow < 8 && toCol >= 0 && toCol < 8
                    ) {
                        const midIdx = midRow * 8 + midCol;
                        const toIdx = toRow * 8 + toCol;
                        const midPiece = state.board[midIdx];
                        const toPiece = state.board[toIdx];
                        if (
                            toPiece === 0 &&
                            (
                                (turn === 1 && (midPiece === 2 || midPiece === 4)) ||
                                (turn === 2 && (midPiece === 1 || midPiece === 3))
                            )
                        ) {
                            return true;
                        }
                    }
                } else {
                    // King logic: scan along the diagonal
                    let r = row + dr;
                    let c = col + dc;
                    let foundOpponent = false;
                    while (r >= 0 && r < 8 && c >= 0 && c < 8) {
                        const idx = r * 8 + c;
                        const sq = state.board[idx];
                        if (!foundOpponent) {
                            if (
                                (turn === 1 && (sq === 2 || sq === 4)) ||
                                (turn === 2 && (sq === 1 || sq === 3))
                            ) {
                                foundOpponent = true;
                            } else if (sq !== 0) {
                                break;
                            }
                        } else {
                            if (sq === 0) {
                                return true;
                            } else {
                                break;
                            }
                        }
                        r += dr;
                        c += dc;
                    }
                }
            }
        }
    }
    return false;
}

// Apply a move in chess notation (e.g., e3-d4) for the given turn (1=red, 2=black)
function applyMove(state, move, turn) {
    // Parse move: e3-d4
    const m = move.match(/^([a-h][1-8])-([a-h][1-8])$/i);
    if (!m) return false;
    const [from, to] = [m[1], m[2]];
    const fromIdx = algebraicToIndex(from);
    const toIdx = algebraicToIndex(to);

    // Debug: log move and indices
    console.log(`applyMove: move=${move}, from=${from} (${fromIdx}), to=${to} (${toIdx}), piece at fromIdx=${state.board[fromIdx]}, piece at toIdx=${state.board[toIdx]}, turn=${turn}`);

    if (fromIdx === null || toIdx === null) return false;

    // Check piece ownership
    const piece = state.board[fromIdx];
    if (turn === 1 && piece !== 1 && piece !== 3) return false;
    if (turn === 2 && piece !== 2 && piece !== 4) return false;

    const dir = turn === 1 ? -1 : 1;
    const fromRow = Math.floor(fromIdx / 8);
    const fromCol = fromIdx % 8;
    const toRow = Math.floor(toIdx / 8);
    const toCol = toIdx % 8;
    if (state.board[toIdx] !== 0) return false;

    // Simple move (one diagonal step)
    if ((piece === 1 || piece === 2) && Math.abs(toCol - fromCol) === 1 && toRow - fromRow === dir) {
        // Move piece
        state.board[toIdx] = piece;
        state.board[fromIdx] = 0;
        // King promotion
        if (turn === 1 && toRow === 0 && piece === 1) state.board[toIdx] = 3;
        if (turn === 2 && toRow === 7 && piece === 2) state.board[toIdx] = 4;
        return true;
    }
    // Jump move (two diagonal steps)
    if ((piece === 1 || piece === 2) && Math.abs(toCol - fromCol) === 2 && toRow - fromRow === 2 * dir) {
        const jumpedRow = fromRow + dir;
        const jumpedCol = fromCol + (toCol - fromCol) / 2;
        const jumpedIdx = jumpedRow * 8 + jumpedCol;
        const jumpedPiece = state.board[jumpedIdx];
        // Check that jumped piece is opponent's
        if (
            (turn === 1 && (jumpedPiece === 2 || jumpedPiece === 4)) ||
            (turn === 2 && (jumpedPiece === 1 || jumpedPiece === 3))
        ) {
            // Remove jumped piece
            state.board[jumpedIdx] = 0;
            // Move piece
            state.board[toIdx] = piece;
            state.board[fromIdx] = 0;
            // King promotion
            if (turn === 1 && toRow === 0 && piece === 1) state.board[toIdx] = 3;
            if (turn === 2 && toRow === 7 && piece === 2) state.board[toIdx] = 4;
            return true;
        }
    }
    // King move/capture (multi-square)
    if (piece === 3 || piece === 4) {
        const dr = Math.sign(toRow - fromRow);
        const dc = Math.sign(toCol - fromCol);
        if (Math.abs(toRow - fromRow) === Math.abs(toCol - fromCol)) {
            let r = fromRow + dr;
            let c = fromCol + dc;
            let foundOpponent = false;
            let opponentIdx = null;
            while (r !== toRow || c !== toCol) {
                const idx = r * 8 + c;
                const sq = state.board[idx];
                if (!foundOpponent) {
                    if (
                        (turn === 1 && (sq === 2 || sq === 4)) ||
                        (turn === 2 && (sq === 1 || sq === 3))
                    ) {
                        foundOpponent = true;
                        opponentIdx = idx;
                    } else if (sq !== 0) {
                        break;
                    }
                } else {
                    if (sq === 0 && (r === toRow && c === toCol)) {
                        // Valid king capture
                        state.board[opponentIdx] = 0;
                        state.board[toIdx] = piece;
                        state.board[fromIdx] = 0;
                        return true;
                    } else if (sq !== 0) {
                        break;
                    }
                }
                r += dr;
                c += dc;
            }
        }
        // Simple king move (no capture)
        if (Math.abs(toRow - fromRow) === Math.abs(toCol - fromCol)) {
            let r = fromRow + dr;
            let c = fromCol + dc;
            let blocked = false;
            while (r !== toRow || c !== toCol) {
                const idx = r * 8 + c;
                if (state.board[idx] !== 0) {
                    blocked = true;
                    break;
                }
                r += dr;
                c += dc;
            }
            if (!blocked) {
                state.board[toIdx] = piece;
                state.board[fromIdx] = 0;
                return true;
            }
        }
    }
    return false;
}

// Utility: sleep
function sleep(ms) {
    return new Promise(res => setTimeout(res, ms));
}

// Simple game over: win if opponent has no pieces
function isGameOver(state) {
    const red = state.board.filter(x => x === 1 || x === 3).length;
    const black = state.board.filter(x => x === 2 || x === 4).length;
    return red === 0 || black === 0;
}
function getGameOverText(state) {
    const red = state.board.filter(x => x === 1 || x === 3).length;
    const black = state.board.filter(x => x === 2 || x === 4).length;
    if (red === 0 && black === 0) return "Draw!";
    if (red === 0) return "Black wins!";
    if (black === 0) return "Red wins!";
    return "Game over!";
}

// Convert algebraic notation (e.g., e3) to board index (0-63)
function algebraicToIndex(square) {
    if (!/^[a-h][1-8]$/i.test(square)) return null;
    const file = square[0].toLowerCase().charCodeAt(0) - 97; // a=0
    const rank = 8 - parseInt(square[1]);
    return rank * 8 + file;
}

/**
 * Get LLM move from OpenRouter
 * @param {string} model
 * @param {object} state
 * @param {string} color
 * @param {boolean} mistakeLastTurn - Whether the previous move by this LLM was a mistake
 */
async function getLLMMove(model, state, color, mistakeLastTurn = false) {
    const apiKey = getApiKey();
    if (!apiKey) {
        alert("OpenRouter API key required.");
        return null;
    }
    // Prepare prompt
    const prompt = buildCheckersPrompt(state, color, mistakeLastTurn);
    console.log("Prompt sent to LLM:\n", prompt);
    try {
        const res = await fetch("https://openrouter.ai/api/v1/chat/completions", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${apiKey}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                model,
                messages: [
                    {
                        role: "system",
                        content: `We are playing checkers. Here are the rules:
- The game is English draughts (American checkers) on an 8x8 board.
- Red pieces start at the bottom (rows 6-8), black at the top (rows 1-3).
- Regular pieces move diagonally forward to adjacent empty squares.
- Moves must be to empty squares only; you cannot move to a square that is already occupied.
- Captures are mandatory: if a piece can jump over an opponent's piece to an empty square, it must do so. Multiple jumps are allowed in a single turn.
- When a piece reaches the far row, it becomes a king and can move and capture both forward and backward.
- The game ends when a player has no legal moves or no pieces left.
- Use chess notation for moves (e.g., e3-d4).
Play to win and make the best possible move. Only output the move, nothing else.`
                    },
                    {
                        role: "user",
                        content: prompt
                    }
                ],
                // max_tokens: 16,
                temperature: 0.2
            })
        });
        if (!res.ok) {
            throw new Error("LLM API error: " + res.status);
        }
        const data = await res.json();
        let text = data.choices?.[0]?.message?.content?.trim() || "";

        // Try to parse as JSON if it looks like JSON
        if (
            (text.startsWith("{") && text.endsWith("}")) ||
            (text.startsWith("[") && text.endsWith("]"))
        ) {
            try {
                const parsed = JSON.parse(text);
                if (parsed && typeof parsed.content === "string") {
                    text = parsed.content;
                }
            } catch (e) {
                // ignore JSON parse errors
            }
        }

        // If it's a quoted string, strip quotes
        if (
            (text.startsWith('"') && text.endsWith('"')) ||
            (text.startsWith("'") && text.endsWith("'"))
        ) {
            text = text.slice(1, -1);
        }

        text = text.trim();

        // Extract move in format like e3-d4
        const match = text.match(/[a-h][1-8]-[a-h][1-8]/i);
        if (match) {
            return match[0];
        }
        return null;
    } catch (e) {
        console.error("LLM error:", e);
        return null;
    }
}

/**
 * Build prompt for LLM.
 * @param {object} state - The current game state.
 * @param {string} color - "Red" or "Black".
 * @param {boolean} mistakeLastTurn - Whether the previous move by this LLM was a mistake.
 */
function buildCheckersPrompt(state, color, mistakeLastTurn = false) {
    // Monospace ASCII board with grid and legend
    const symbols = {
        0: " . ", // empty
        1: " r ", // red
        2: " b ", // black
        3: " R ", // red king
        4: " B "  // black king
    };
    let ascii = "    A  B  C  D  E  F  G  H\n";
    ascii += "  +------------------------+\n";
    for (let r = 0; r < 8; r++) {
        ascii += (8 - r) + " |";
        for (let c = 0; c < 8; c++) {
            const i = r * 8 + c;
            ascii += symbols[state.board[i]];
        }
        ascii += "| " + (8 - r) + "\n";
    }
    ascii += "  +------------------------+\n";
    ascii += "    A  B  C  D  E  F  G  H\n";
    ascii += "\nLegend: r = red, b = black, R = red king, B = black king, . = empty\n";
    let feedback = "";
    if (mistakeLastTurn) {
        feedback = "\nIMPORTANT: Your previous move was a mistake. You missed a mandatory capture. In checkers, if a capture is available, you must take it. Please follow the rules strictly.";
    }
    return `You are playing a game of checkers. Try to win.
Current board:
${ascii}
You are ${color}.${feedback}
What is your next move? Respond with a single move in chess notation (e.g., e3-d4).`;
}

function renderLeaderboard() {
    const leaderboardContent = document.getElementById("leaderboard-content");
    leaderboardContent.innerHTML = "<em>Leaderboard coming soon...</em>";
}
