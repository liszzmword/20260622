const MIN_NUMBER = 1;
const MAX_NUMBER = 45;
const MAIN_COUNT = 6;

const ballsRow = document.getElementById("ballsRow");
const bonusBall = document.getElementById("bonusBall");
const drawBtn = document.getElementById("drawBtn");
const clearBtn = document.getElementById("clearBtn");
const setCountSelect = document.getElementById("setCount");
const historyList = document.getElementById("historyList");
const drawStatus = document.getElementById("drawStatus");
const drawProgress = document.getElementById("drawProgress");
const liveBadge = document.getElementById("liveBadge");
const mainTumbler = document.getElementById("mainTumbler");
const tumblerBalls = document.getElementById("tumblerBalls");
const drawTube = document.getElementById("drawTube");
const tubeBall = document.getElementById("tubeBall");

let isDrawing = false;

function getBallColorClass(number) {
  if (number <= 10) return "yellow";
  if (number <= 20) return "blue";
  if (number <= 30) return "red";
  if (number <= 40) return "gray";
  return "green";
}

function pickUniqueNumbers(count, min, max) {
  const pool = Array.from({ length: max - min + 1 }, (_, index) => min + index);
  const result = [];

  for (let i = 0; i < count; i += 1) {
    const randomIndex = Math.floor(Math.random() * pool.length);
    result.push(pool.splice(randomIndex, 1)[0]);
  }

  return result.sort((a, b) => a - b);
}

function generateLottoSet() {
  const mainNumbers = pickUniqueNumbers(MAIN_COUNT, MIN_NUMBER, MAX_NUMBER);
  const remaining = [];

  for (let number = MIN_NUMBER; number <= MAX_NUMBER; number += 1) {
    if (!mainNumbers.includes(number)) {
      remaining.push(number);
    }
  }

  const bonus = remaining[Math.floor(Math.random() * remaining.length)];

  return { mainNumbers, bonus };
}

function createBallElement(number, options = {}) {
  const ball = document.createElement("span");
  ball.className = "ball";
  ball.textContent = number ?? "?";

  if (number == null) {
    ball.classList.add("empty");
  } else {
    ball.classList.add(getBallColorClass(number));
    if (options.reveal) {
      ball.classList.add("reveal");
    }
  }

  return ball;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function setStudioState({ badge, badgeClass, status, progress = "" }) {
  liveBadge.textContent = badge;
  liveBadge.className = `draw-live-badge ${badgeClass || ""}`.trim();
  drawStatus.textContent = status;
  drawProgress.textContent = progress;
}

function populateTumbler() {
  tumblerBalls.innerHTML = "";

  for (let i = 0; i < 26; i += 1) {
    const number = Math.floor(Math.random() * MAX_NUMBER) + MIN_NUMBER;
    const ball = document.createElement("span");
    ball.className = `tumbler-ball ${getBallColorClass(number)}`;
    ball.textContent = number;
    ball.style.left = `${18 + Math.random() * 64}%`;
    ball.style.top = `${18 + Math.random() * 64}%`;
    ball.style.animationDelay = `${Math.random() * 0.4}s`;
    tumblerBalls.appendChild(ball);
  }
}

function startTumbler() {
  mainTumbler.classList.add("is-spinning");
  drawTube.classList.add("is-active");
}

function stopTumbler() {
  mainTumbler.classList.remove("is-spinning");
}

function resetDisplay() {
  ballsRow.querySelectorAll(".ball-slot").forEach((slot) => {
    slot.classList.remove("is-drawing", "is-revealed");
    const ball = slot.querySelector(".ball");
    ball.className = "ball empty";
    ball.textContent = "?";
  });

  bonusBall.className = "ball empty";
  bonusBall.textContent = "?";
  bonusBall.closest(".ball-slot")?.classList.remove("is-drawing", "is-revealed");

  tubeBall.className = "tube-ball hidden";
  tubeBall.textContent = "";
  drawTube.classList.remove("is-active");
  stopTumbler();
  populateTumbler();

  setStudioState({
    badge: "STANDBY",
    status: "추첨을 시작하려면 아래 버튼을 눌러주세요.",
    progress: "",
  });
}

function applyBallAppearance(ball, number) {
  ball.className = `ball ${getBallColorClass(number)} reveal`;
  ball.textContent = number;
}

async function dropBallThroughTube(number) {
  tubeBall.className = `tube-ball ${getBallColorClass(number)}`;
  tubeBall.textContent = number;

  await sleep(80);
  tubeBall.classList.remove("hidden");
  tubeBall.classList.add("dropping");

  await sleep(900);
  tubeBall.classList.remove("dropping");
  tubeBall.classList.add("hidden");
  tubeBall.textContent = "";
}

async function revealMainBall(slot, number, order) {
  slot.classList.add("is-drawing");
  setStudioState({
    badge: "LIVE",
    badgeClass: "is-live",
    status: `제 ${order}번째 번호를 추첨합니다`,
    progress: `${order} / ${MAIN_COUNT}`,
  });

  startTumbler();
  await sleep(1200);

  stopTumbler();
  await dropBallThroughTube(number);

  const ball = slot.querySelector(".ball");
  applyBallAppearance(ball, number);
  slot.classList.remove("is-drawing");
  slot.classList.add("is-revealed");

  await sleep(500);
}

async function revealBonusBall(number) {
  const bonusSlot = bonusBall.closest(".ball-slot");

  setStudioState({
    badge: "LIVE",
    badgeClass: "is-live",
    status: "보너스 번호를 추첨합니다",
    progress: "BONUS",
  });

  bonusSlot?.classList.add("is-drawing");
  startTumbler();
  await sleep(1400);

  stopTumbler();
  await dropBallThroughTube(number);

  applyBallAppearance(bonusBall, number);
  bonusSlot?.classList.remove("is-drawing");
  bonusSlot?.classList.add("is-revealed");

  await sleep(400);
}

async function animateDraw(result) {
  const slots = [...ballsRow.querySelectorAll(".ball-slot")];

  setStudioState({
    badge: "LIVE",
    badgeClass: "is-live",
    status: "추첨기 가동 · 공 혼합 중",
    progress: "READY",
  });

  startTumbler();
  await sleep(900);

  for (let i = 0; i < result.mainNumbers.length; i += 1) {
    await revealMainBall(slots[i], result.mainNumbers[i], i + 1);
  }

  await revealBonusBall(result.bonus);

  setStudioState({
    badge: "COMPLETE",
    badgeClass: "is-done",
    status: "추첨이 완료되었습니다",
    progress: `${result.mainNumbers.join(" · ")} + ${result.bonus}`,
  });

  drawTube.classList.remove("is-active");
}

function formatTime(date) {
  return date.toLocaleString("ko-KR", {
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

function renderHistoryItem(result, index, timestamp, options = {}) {
  const item = document.createElement("li");
  item.className = "history-item";
  if (options.id) {
    item.dataset.id = options.id;
  }

  const meta = document.createElement("div");
  meta.className = "history-meta";
  meta.innerHTML = `<span>세트 ${index}</span><span>${formatTime(timestamp)}</span>`;

  const balls = document.createElement("div");
  balls.className = "history-balls";

  result.mainNumbers.forEach((number) => {
    balls.appendChild(createBallElement(number));
  });

  const plus = document.createElement("span");
  plus.className = "plus";
  plus.textContent = "+";
  balls.appendChild(plus);
  balls.appendChild(createBallElement(result.bonus));

  item.appendChild(meta);
  item.appendChild(balls);

  return item;
}

function addToHistory(results, savedAt = new Date()) {
  const emptyState = historyList.querySelector(".history-empty");
  const loadingState = historyList.querySelector(".history-loading");

  if (emptyState) {
    emptyState.remove();
  }
  if (loadingState) {
    loadingState.remove();
  }

  const fragment = document.createDocumentFragment();

  results.forEach((result, index) => {
    fragment.appendChild(renderHistoryItem(result, index + 1, savedAt));
  });

  historyList.prepend(fragment);
}

function renderHistoryFromRows(rows) {
  historyList.innerHTML = "";

  if (!rows.length) {
    historyList.innerHTML = '<li class="history-empty">아직 추첨한 번호가 없습니다.</li>';
    return;
  }

  const batches = new Map();
  rows.forEach((row) => {
    if (!batches.has(row.batch_id)) {
      batches.set(row.batch_id, []);
    }
    batches.get(row.batch_id).push(row);
  });

  const sortedBatches = [...batches.values()].sort((a, b) => {
    const timeA = new Date(a[0].created_at).getTime();
    const timeB = new Date(b[0].created_at).getTime();
    return timeB - timeA;
  });

  sortedBatches.forEach((batchRows) => {
    const sortedRows = batchRows.sort((a, b) => a.set_index - b.set_index);
    const timestamp = new Date(sortedRows[0].created_at);

    sortedRows.forEach((row) => {
      historyList.appendChild(
        renderHistoryItem(window.LottoStorage.rowToResult(row), row.set_index, timestamp, {
          id: row.id,
        })
      );
    });
  });
}

function setHistoryStatus(message, type = "info") {
  const statusEl = document.getElementById("historyStatus");
  if (!statusEl) return;
  statusEl.textContent = message;
  statusEl.className = `history-status history-status-${type}`;
}

async function loadHistoryFromSupabase() {
  historyList.innerHTML = '<li class="history-loading">Supabase에서 기록을 불러오는 중...</li>';
  setHistoryStatus("Supabase 연결 중...", "info");

  try {
    const rows = await window.LottoStorage.fetchDrawHistory();
    renderHistoryFromRows(rows);
    setHistoryStatus(`Supabase에 ${rows.length}건 저장됨`, "success");
  } catch (error) {
    historyList.innerHTML = `<li class="history-empty">${error.message}</li>`;
    setHistoryStatus("Supabase 연결 실패", "error");
  }
}

async function saveHistoryToSupabase(results) {
  setHistoryStatus("Supabase에 저장 중...", "info");

  try {
    await window.LottoStorage.saveDrawBatch(results);
    setHistoryStatus("Supabase 저장 완료", "success");
    await loadHistoryFromSupabase();
  } catch (error) {
    setHistoryStatus(error.message, "error");
    addToHistory(results);
  }
}

async function handleDraw() {
  if (isDrawing) return;

  isDrawing = true;
  drawBtn.disabled = true;

  const setCount = Number(setCountSelect.value);
  const results = Array.from({ length: setCount }, () => generateLottoSet());

  resetDisplay();
  await animateDraw(results[0]);
  await saveHistoryToSupabase(results);

  isDrawing = false;
  drawBtn.disabled = false;
}

async function handleClearHistory() {
  if (!confirm("Supabase에 저장된 추첨 기록을 모두 삭제할까요?")) {
    return;
  }

  setHistoryStatus("기록 삭제 중...", "info");

  try {
    await window.LottoStorage.clearDrawHistory();
    historyList.innerHTML = '<li class="history-empty">아직 추첨한 번호가 없습니다.</li>';
    setHistoryStatus("기록 삭제 완료", "success");
  } catch (error) {
    setHistoryStatus(error.message, "error");
  }
}

drawBtn.addEventListener("click", handleDraw);
clearBtn.addEventListener("click", handleClearHistory);

resetDisplay();
loadHistoryFromSupabase();
