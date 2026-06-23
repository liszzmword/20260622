function getSupabaseConfig() {
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !key) {
    return null;
  }

  return { url, key };
}

async function supabaseRequest(path, options = {}) {
  const config = getSupabaseConfig();

  if (!config) {
    throw new Error(
      "Supabase가 설정되지 않았습니다. Vercel 환경 변수 SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY를 추가해 주세요."
    );
  }

  const response = await fetch(`${config.url}/rest/v1/${path}`, {
    ...options,
    headers: {
      apikey: config.key,
      Authorization: `Bearer ${config.key}`,
      "Content-Type": "application/json",
      ...options.headers,
    },
  });

  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  if (!response.ok) {
    const message = data?.message || data?.error || "Supabase 요청에 실패했습니다.";
    throw new Error(message);
  }

  return data;
}

function validateDraw(draw) {
  const numbers = (draw.mainNumbers || [])
    .map(Number)
    .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45);
  const unique = [...new Set(numbers)];
  const bonus = Number(draw.bonus);

  if (unique.length !== 6) {
    throw new Error("주 번호는 1~45 사이 중복 없는 6개여야 합니다.");
  }

  if (!Number.isInteger(bonus) || bonus < 1 || bonus > 45 || unique.includes(bonus)) {
    throw new Error("보너스 번호가 올바르지 않습니다.");
  }

  return {
    numbers: unique.sort((a, b) => a - b),
    bonus_number: bonus,
  };
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "GET, POST, DELETE, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  try {
    if (req.method === "GET") {
      const limit = Math.min(Number(req.query.limit) || 100, 200);
      const rows = await supabaseRequest(
        `lotto_draws?select=*&order=created_at.desc&limit=${limit}`,
        { method: "GET", headers: { Accept: "application/json" } }
      );

      return res.status(200).json(rows);
    }

    if (req.method === "POST") {
      const { batchId, draws } = req.body || {};

      if (!Array.isArray(draws) || draws.length === 0) {
        return res.status(400).json({ error: "저장할 추첨 결과가 없습니다." });
      }

      const safeBatchId =
        typeof batchId === "string" && batchId.length > 0
          ? batchId
          : crypto.randomUUID();

      const rows = draws.map((draw, index) => {
        const validated = validateDraw(draw);
        return {
          batch_id: safeBatchId,
          set_index: index + 1,
          numbers: validated.numbers,
          bonus_number: validated.bonus_number,
        };
      });

      const saved = await supabaseRequest("lotto_draws", {
        method: "POST",
        headers: { Prefer: "return=representation" },
        body: JSON.stringify(rows),
      });

      return res.status(201).json(saved);
    }

    if (req.method === "DELETE") {
      await supabaseRequest("lotto_draws?id=neq.00000000-0000-0000-0000-000000000000", {
        method: "DELETE",
        headers: { Prefer: "return=minimal" },
      });

      return res.status(200).json({ ok: true });
    }

    return res.status(405).json({ error: "Method not allowed" });
  } catch (error) {
    return res.status(500).json({ error: error.message || "서버 오류가 발생했습니다." });
  }
}
