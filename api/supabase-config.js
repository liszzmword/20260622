export default function handler(_req, res) {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const anonKey = process.env.SUPABASE_ANON_KEY;
  const hasServiceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);

  if (!url || !anonKey) {
    return res.status(503).json({
      configured: false,
      error:
        "Supabase 환경 변수가 없습니다. Vercel에 SUPABASE_URL, SUPABASE_ANON_KEY를 추가한 뒤 Redeploy 하세요.",
      missing: [
        !url ? "SUPABASE_URL" : null,
        !anonKey ? "SUPABASE_ANON_KEY" : null,
      ].filter(Boolean),
    });
  }

  return res.status(200).json({
    configured: true,
    url,
    anonKey,
    hasServiceRole,
  });
}
