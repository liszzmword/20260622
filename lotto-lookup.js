const LOTTO_API_BASE = "https://smok95.github.io/lotto/results";
const RECENT_DRAW_COUNT = 12;

const roundInput = document.getElementById("roundInput");
const lookupBtn = document.getElementById("lookupBtn");
const latestBtn = document.getElementById("latestBtn");
const prevRoundBtn = document.getElementById("prevRoundBtn");
const nextRoundBtn = document.getElementById("nextRoundBtn");
const lookupResult = document.getElementById("lookupResult");
const recentList = document.getElementById("recentList");

let latestDrawNo = null;
let currentDrawNo = null;
let isLookupLoading = false;

function getBallColorClass(number) {
  if (number <= 10) return "yellow";
  if (number <= 20) return "blue";
  if (number <= 30) return "red";
  if (number <= 40) return "gray";
  return "green";
}

function createBallElement(number) {
  const ball = document.createElement("span");
  ball.className = `ball ${getBallColorClass(number)}`;
  ball.textContent = number;
  return ball;
}

function formatWon(amount) {
  if (amount == null || Number.isNaN(amount)) {
    return "-";
  }

  return `${amount.toLocaleString("ko-KR")}원`;
}

function formatDrawDate(dateString) {
  if (!dateString) {
    return "-";
  }

  const date = new Date(dateString);
  return date.toLocaleDateString("ko-KR", {
    year: "numeric",
    month: "long",
    day: "numeric",
  });
}

function getFirstDivision(data) {
  const first = data.divisions?.[0];

  if (!first || first.prize == null) {
    return { prize: null, winners: 0 };
  }

  return {
    prize: first.prize,
    winners: first.winners ?? 0,
  };
}

async function fetchDraw(roundNo) {
  const response = await fetch(`${LOTTO_API_BASE}/${roundNo}.json`);

  if (!response.ok) {
    throw new Error("not_found");
  }

  return response.json();
}

async function fetchLatestDraw() {
  const response = await fetch(`${LOTTO_API_BASE}/latest.json`);

  if (!response.ok) {
    throw new Error("network");
  }

  return response.json();
}

function setLookupLoading(message) {
  lookupResult.innerHTML = `<p class="lookup-loading">${message}</p>`;
}

function setLookupError(message) {
  lookupResult.innerHTML = `<p class="lookup-error">${message}</p>`;
}

function renderBallsRow(container, numbers, bonus) {
  container.innerHTML = "";

  numbers.forEach((number) => {
    container.appendChild(createBallElement(number));
  });

  const plus = document.createElement("span");
  plus.className = "plus";
  plus.textContent = "+";
  container.appendChild(plus);
  container.appendChild(createBallElement(bonus));
}

function renderLookupCard(data) {
  const first = getFirstDivision(data);
  const prizeText = first.winners > 0 ? formatWon(first.prize) : "1등 당첨자 없음";
  const winnersText = first.winners > 0 ? `${first.winners.toLocaleString("ko-KR")}명` : "-";

  lookupResult.innerHTML = `
    <article class="lookup-card">
      <div class="lookup-card-top">
        <div>
          <h3 class="lookup-round">제 ${data.draw_no}회</h3>
          <p class="lookup-date">${formatDrawDate(data.date)} 추첨</p>
        </div>
      </div>
      <div class="lookup-balls" id="lookupBalls"></div>
      <div class="lookup-prize-grid">
        <div class="prize-box highlight">
          <span class="prize-label">1등 1인당 당첨금</span>
          <span class="prize-value gold">${prizeText}</span>
        </div>
        <div class="prize-box">
          <span class="prize-label">1등 당첨자 수</span>
          <span class="prize-value">${winnersText}</span>
        </div>
        <div class="prize-box">
          <span class="prize-label">총 판매금액</span>
          <span class="prize-value">${formatWon(data.total_sales_amount)}</span>
        </div>
      </div>
    </article>
  `;

  renderBallsRow(document.getElementById("lookupBalls"), data.numbers, data.bonus_no);
}

function renderRecentItem(data) {
  const first = getFirstDivision(data);
  const item = document.createElement("li");
  item.className = "recent-item";
  item.dataset.round = String(data.draw_no);

  if (data.draw_no === currentDrawNo) {
    item.classList.add("active");
  }

  item.innerHTML = `
    <div class="recent-item-top">
      <strong>제 ${data.draw_no}회</strong>
      <span>${formatDrawDate(data.date)}</span>
      <span class="recent-prize">${first.winners > 0 ? formatWon(first.prize) : "1등 없음"}</span>
    </div>
    <div class="recent-balls"></div>
  `;

  renderBallsRow(item.querySelector(".recent-balls"), data.numbers, data.bonus_no);

  item.querySelectorAll(".ball").forEach((ball) => {
    ball.style.width = "36px";
    ball.style.height = "36px";
    ball.style.fontSize = "0.85rem";
  });

  item.addEventListener("click", () => {
    showRound(data.draw_no);
  });

  return item;
}

function updateNavButtons() {
  prevRoundBtn.disabled = currentDrawNo == null || currentDrawNo <= 1 || isLookupLoading;
  nextRoundBtn.disabled =
    currentDrawNo == null || latestDrawNo == null || currentDrawNo >= latestDrawNo || isLookupLoading;
}

function updateRecentActiveState() {
  recentList.querySelectorAll(".recent-item").forEach((item) => {
    item.classList.toggle("active", Number(item.dataset.round) === currentDrawNo);
  });
}

async function showRound(roundNo) {
  if (isLookupLoading) return;

  isLookupLoading = true;
  lookupBtn.disabled = true;
  latestBtn.disabled = true;
  updateNavButtons();
  setLookupLoading(`${roundNo}회 당첨 정보를 불러오는 중...`);

  try {
    const data = await fetchDraw(roundNo);
    currentDrawNo = data.draw_no;
    roundInput.value = String(currentDrawNo);
    renderLookupCard(data);
    updateRecentActiveState();
  } catch (error) {
    if (error.message === "not_found") {
      setLookupError(`${roundNo}회 정보를 찾을 수 없습니다. 1회부터 최신 회차 사이의 번호를 입력해 주세요.`);
    } else {
      setLookupError("당첨 정보를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.");
    }
  } finally {
    isLookupLoading = false;
    lookupBtn.disabled = false;
    latestBtn.disabled = false;
    updateNavButtons();
  }
}

async function loadRecentDraws() {
  recentList.innerHTML = '<li class="lookup-loading">당첨 정보를 불러오는 중...</li>';

  try {
    const latest = await fetchLatestDraw();
    latestDrawNo = latest.draw_no;

    const startRound = Math.max(1, latestDrawNo - RECENT_DRAW_COUNT + 1);
    const drawRequests = [];

    for (let round = startRound; round <= latestDrawNo; round += 1) {
      drawRequests.push(fetchDraw(round));
    }

    const draws = await Promise.all(drawRequests);
    draws.sort((a, b) => b.draw_no - a.draw_no);

    recentList.innerHTML = "";
    draws.forEach((draw) => {
      recentList.appendChild(renderRecentItem(draw));
    });

    currentDrawNo = latest.draw_no;
    roundInput.value = String(currentDrawNo);
    renderLookupCard(latest);
    updateRecentActiveState();
    updateNavButtons();
  } catch {
    recentList.innerHTML = '<li class="lookup-error">최근 당첨 내역을 불러오지 못했습니다.</li>';
    setLookupError("당첨 정보를 불러오지 못했습니다. 인터넷 연결을 확인한 뒤 다시 시도해 주세요.");
    updateNavButtons();
  }
}

function handleLookup() {
  const roundNo = Number(roundInput.value);

  if (!Number.isInteger(roundNo) || roundNo < 1) {
    setLookupError("올바른 회차 번호를 입력해 주세요.");
    return;
  }

  showRound(roundNo);
}

function handleLatest() {
  if (latestDrawNo) {
    showRound(latestDrawNo);
    return;
  }

  loadRecentDraws();
}

function handlePrevRound() {
  if (currentDrawNo == null || currentDrawNo <= 1) return;
  showRound(currentDrawNo - 1);
}

function handleNextRound() {
  if (currentDrawNo == null || latestDrawNo == null || currentDrawNo >= latestDrawNo) return;
  showRound(currentDrawNo + 1);
}

lookupBtn.addEventListener("click", handleLookup);
latestBtn.addEventListener("click", handleLatest);
prevRoundBtn.addEventListener("click", handlePrevRound);
nextRoundBtn.addEventListener("click", handleNextRound);

roundInput.addEventListener("keydown", (event) => {
  if (event.key === "Enter") {
    handleLookup();
  }
});

loadRecentDraws();
