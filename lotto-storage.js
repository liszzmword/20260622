let cachedConfig = null;

function parseErrorResponse(data, fallback) {
  if (!data) return fallback;
  if (typeof data === "string") return data;
  if (data.error) return data.error;
  if (data.message) {
    return data.details ? `${data.message} (${data.details})` : data.message;
  }
  return fallback;
}

async function getSupabaseConfig(force = false) {
  if (cachedConfig && !force) {
    return cachedConfig;
  }

  let response;

  try {
    response = await fetch("/api/supabase-config");
  } catch {
    throw new Error(
      "API 서버에 연결할 수 없습니다. Vercel에 배포했는지 확인해 주세요. (로컬 index.html 파일만 열면 저장되지 않습니다.)"
    );
  }

  const data = await response.json().catch(() => ({}));

  if (!response.ok || !data.configured) {
    throw new Error(
      data.error ||
        "Supabase 설정이 필요합니다. Vercel → Settings → Environment Variables에 SUPABASE_URL, SUPABASE_ANON_KEY를 추가하세요."
    );
  }

  cachedConfig = data;
  return cachedConfig;
}

async function supabaseRequest(path, options = {}) {
  const { url, anonKey } = await getSupabaseConfig();

  const response = await fetch(`${url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: anonKey,
      Authorization: `Bearer ${anonKey}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const text = await response.text();
  let data = null;

  if (text) {
    try {
      data = JSON.parse(text);
    } catch {
      data = { message: text };
    }
  }

  if (!response.ok) {
    throw new Error(parseErrorResponse(data, `Supabase 요청 실패 (${response.status})`));
  }

  return data;
}

function buildRows(results, batchId) {
  return results.map((draw, index) => ({
    batch_id: batchId,
    set_index: index + 1,
    numbers: [...draw.mainNumbers].sort((a, b) => a - b),
    bonus_number: draw.bonus,
  }));
}

async function checkConnection() {
  await getSupabaseConfig();
  await supabaseRequest("lotto_draws?select=id&limit=1", {
    method: "GET",
    headers: { Accept: "application/json" },
  });
  return true;
}

async function fetchDrawHistory(limit = 100) {
  return supabaseRequest(`lotto_draws?select=*&order=created_at.desc&limit=${limit}`, {
    method: "GET",
    headers: { Accept: "application/json" },
  });
}

async function saveDrawBatch(results) {
  const batchId = crypto.randomUUID();
  const rows = buildRows(results, batchId);

  return supabaseRequest("lotto_draws", {
    method: "POST",
    headers: { Prefer: "return=representation" },
    body: JSON.stringify(rows),
  });
}

async function clearDrawHistory() {
  await supabaseRequest("lotto_draws?id=not.is.null", {
    method: "DELETE",
    headers: { Prefer: "return=minimal" },
  });
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
  resetConfigCache: () => {
    cachedConfig = null;
  },
};
