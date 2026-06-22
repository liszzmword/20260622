const MODEL = "gemini-2.5-flash";
const GEMINI_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent`;

const SYSTEM_PROMPT = `당신은 한국 사주명리학에 정통한 로또 번호 상담 챗봇입니다.

역할:
- 사용자의 성별과 생년월일(양력)을 바탕으로 사주팔자(년·월·일·시 주의 가능 범위)를 해석합니다.
- 로또 6/45 규칙에 맞게 1~45 사이 중복 없는 주 번호 6개와 보너스 번호 1개를 추천합니다.
- 각 번호 또는 번호 조합이 왜 사주에 맞는지 오행(木火土金水), 십성, 용신·희신, 일간, 대운·세운 등의 관점에서 구체적으로 설명합니다.

규칙:
- 반드시 한국어로 답변합니다.
- 당첨을 보장하거나 확정적으로 예언하지 않습니다. 참고용·오락용임을 밝힙니다.
- 생시를 모르면 시주 없이 년·월·일주 중심으로 분석한다고 안내합니다.
- 추천 번호는 반드시 1~45 범위, 주 번호 6개는 서로 달라야 합니다.

응답 형식:
1) 사주 요약 (2~4문장)
2) 추천 번호와 사주 기반 상세 설명 (번호별 또는 테마별)
3) 마지막에 아래 JSON 한 블록만 별도로 출력 (다른 텍스트와 섞지 말 것):

\`\`\`json
{"numbers":[n1,n2,n3,n4,n5,n6],"bonus":n7}
\`\`\``;

function genderLabel(gender) {
  if (gender === "male") return "남성";
  if (gender === "female") return "여성";
  return "미상";
}

function buildInitialMessage(gender, birthDate) {
  return `나의 정보는 다음과 같습니다.
- 성별: ${genderLabel(gender)}
- 생년월일(양력): ${birthDate}

위 사주에 맞는 로또 6/45 번호(주 번호 6개 + 보너스 1개)를 추천하고, 사주명리학적 근거를 자세히 설명해 주세요.`;
}

function toGeminiContents(history, userMessage) {
  const contents = history.map((item) => ({
    role: item.role === "assistant" ? "model" : "user",
    parts: [{ text: item.text }],
  }));

  contents.push({
    role: "user",
    parts: [{ text: userMessage }],
  });

  return contents;
}

function extractNumbers(text) {
  const jsonMatch = text.match(/```json\s*([\s\S]*?)\s*```/i);
  if (jsonMatch) {
    try {
      const parsed = JSON.parse(jsonMatch[1]);
      const numbers = (parsed.numbers || [])
        .map(Number)
        .filter((n) => Number.isInteger(n) && n >= 1 && n <= 45);
      const unique = [...new Set(numbers)];

      if (unique.length === 6) {
        let bonus = Number(parsed.bonus);
        if (!Number.isInteger(bonus) || bonus < 1 || bonus > 45 || unique.includes(bonus)) {
          const pool = Array.from({ length: 45 }, (_, i) => i + 1).filter((n) => !unique.includes(n));
          bonus = pool[Math.floor(Math.random() * pool.length)];
        }
        return { numbers: unique.sort((a, b) => a - b), bonus };
      }
    } catch {
      /* fall through */
    }
  }

  return null;
}

export default async function handler(req, res) {
  if (req.method === "OPTIONS") {
    res.setHeader("Access-Control-Allow-Methods", "POST, OPTIONS");
    res.setHeader("Access-Control-Allow-Headers", "Content-Type");
    return res.status(204).end();
  }

  if (req.method !== "POST") {
    return res.status(405).json({ error: "Method not allowed" });
  }

  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    return res.status(500).json({
      error: "GEMINI_API_KEY가 설정되지 않았습니다. Vercel 환경 변수에 키를 추가해 주세요.",
    });
  }

  const { gender, birthDate, message, history = [] } = req.body || {};

  if (!gender || !birthDate) {
    return res.status(400).json({ error: "성별과 생년월일을 입력해 주세요." });
  }

  const userMessage = message?.trim() || buildInitialMessage(gender, birthDate);

  try {
    const response = await fetch(`${GEMINI_URL}?key=${apiKey}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        systemInstruction: {
          parts: [{ text: SYSTEM_PROMPT }],
        },
        contents: toGeminiContents(history, userMessage),
        generationConfig: {
          temperature: 0.85,
          maxOutputTokens: 4096,
        },
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      const detail = data?.error?.message || "Gemini API 요청에 실패했습니다.";
      return res.status(response.status).json({ error: detail });
    }

    const reply =
      data.candidates?.[0]?.content?.parts
        ?.map((part) => part.text)
        .join("")
        .trim() || "";

    if (!reply) {
      return res.status(502).json({ error: "AI 응답을 받지 못했습니다." });
    }

    const numbers = extractNumbers(reply);
    const displayText = reply.replace(/```json[\s\S]*?```/gi, "").trim();

    return res.status(200).json({
      reply: displayText,
      numbers,
    });
  } catch (error) {
    return res.status(500).json({
      error: error.message || "서버 오류가 발생했습니다.",
    });
  }
}
