const API_URL = "/api/lotto-draws";

function parseErrorResponse(data, fallback) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.error) return data.error;
  if (data.message) return data.message;
  return fallback;
}

async function apiRequest(path, options = {}) {
  let response;

  try {
    response = await fetch(`${API_URL}${path}`, options);
  } catch {
    throw new Error(
      "API 서버에 연결할 수 없습니다. Vercel에 배포했는지 확인해 주세요. (로컬 index.html 파일만 열면 저장되지 않습니다.)"
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok) {
    throw new Error(parseErrorResponse(data, `요청 실패 (${response.status})`));
  }

  return data;
}

async function checkConnection() {
  const status = await fetch("/api/supabase-status").then((r) => r.json());
  if (!status.configured) {
    throw new Error(
      status.error ||
        "Supabase 미설정: Vercel에 SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY(권장) 또는 SUPABASE_ANON_KEY를 추가하세요."
    );
  }
  await apiRequest("?limit=1");
  return status;
}

async function fetchDrawHistory(limit = 100) {
  return apiRequest(`?limit=${limit}`);
}

async function saveDrawBatch(results) {
  const batchId = crypto.randomUUID();
  return apiRequest("", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ batchId, draws: results }),
  });
}

async function clearDrawHistory() {
  await apiRequest("", { method: "DELETE" });
  return true;
}

function rowToResult(row) {
  return {
    mainNumbers: row.numbers,
    bonus: row.bonus_number,
  };
}

window.LottoStorage = {
  checkConnection,
  fetchDrawHistory,
  saveDrawBatch,
  clearDrawHistory,
  rowToResult,
};
