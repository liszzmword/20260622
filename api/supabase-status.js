export default function handler(_req, res) {
  const url = process.env.SUPABASE_URL?.replace(/\/$/, "");
  const serviceRole = Boolean(process.env.SUPABASE_SERVICE_ROLE_KEY);
  const anonKey = Boolean(process.env.SUPABASE_ANON_KEY);

  if (!url) {
    return res.status(503).json({
      configured: false,
      error: "SUPABASE_URL이 없습니다.",
      missing: ["SUPABASE_URL"],
      keyType: null,
    });
  }

  if (!serviceRole && !anonKey) {
    return res.status(503).json({
      configured: false,
      error:
        "Supabase API 키가 없습니다. SUPABASE_SERVICE_ROLE_KEY(권장) 또는 SUPABASE_ANON_KEY 중 하나를 Vercel에 추가하세요.",
      missing: ["SUPABASE_SERVICE_ROLE_KEY 또는 SUPABASE_ANON_KEY"],
      keyType: null,
    });
  }

  return res.status(200).json({
    configured: true,
    keyType: serviceRole ? "service_role" : "anon",
    message: serviceRole
      ? "서비스 롤 키로 서버 API 저장 (권장)"
      : "anon 키로 저장 (schema.sql RLS·grant 필요)",
  });
}
