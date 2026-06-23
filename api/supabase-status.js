const VERSION = "diag-v4";

export default async function handler(_req, res) {
  const rawUrl = process.env.SUPABASE_URL || "";
  const url = rawUrl.replace(/\/$/, "");
  const serviceRole = process.env.SUPABASE_SERVICE_ROLE_KEY;
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const key = serviceRole || anonKey;
  const keyType = serviceRole ? "service_role" : anonKey ? "anon" : null;

  const result = {
    version: VERSION,
    configured: Boolean(url && key),
    keyType,
    urlStartsWith: url ? url.slice(0, 16) : null,
    urlValidFormat: /^https?:\/\/.+\.supabase\.co$/.test(url),
    dbTest: null,
  };

  if (!url || !key) {
    result.error = "SUPABASE_URL 또는 키가 없습니다.";
    return res.status(200).json(result);
  }

  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    const resp = await fetch(`${url}/rest/v1/lotto_draws?select=id&limit=1`, {
      signal: controller.signal,
      headers: {
        apikey: key,
        Authorization: `Bearer ${key}`,
        Accept: "application/json",
      },
    });

    clearTimeout(timeout);

    const text = await resp.text();
    result.dbTest = {
      httpStatus: resp.status,
      ok: resp.ok,
      body: text.slice(0, 400),
    };
  } catch (err) {
    result.dbTest = {
      httpStatus: null,
      ok: false,
      error: err?.name === "AbortError" ? "timeout(8s)" : err?.message || String(err),
    };
  }

  return res.status(200).json(result);
}
