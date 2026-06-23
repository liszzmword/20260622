const API_URL = "/api/lotto-draws";

async function fetchDrawHistory(limit = 100) {
  const response = await fetch(`${API_URL}?limit=${limit}`);

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "추첨 기록을 불러오지 못했습니다.");
  }

  return response.json();
}

async function saveDrawBatch(results) {
  const batchId = crypto.randomUUID();
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batchId, draws: results }),
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "추첨 기록 저장에 실패했습니다.");
  }

  return response.json();
}

async function clearDrawHistory() {
  const response = await fetch(API_URL, { method: "DELETE" });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error || "추첨 기록 삭제에 실패했습니다.");
  }

  return true;
}

function rowToResult(row) {
  return {
    mainNumbers: row.numbers,
    bonus: row.bonus_number,
  };
}

window.LottoStorage = {
  fetchDrawHistory,
  saveDrawBatch,
  clearDrawHistory,
  rowToResult,
};
