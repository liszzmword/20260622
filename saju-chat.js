const API_URL = "/api/saju-chat";

const profileForm = document.getElementById("sajuProfileForm");
const genderInput = document.getElementById("sajuGender");
const birthDateInput = document.getElementById("sajuBirthDate");
const chatMessages = document.getElementById("chatMessages");
const chatForm = document.getElementById("chatForm");
const chatInput = document.getElementById("chatInput");
const recommendBtn = document.getElementById("sajuRecommendBtn");

let chatHistory = [];
let profileLocked = false;
let isLoading = false;

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

function renderNumberBalls(numbers, bonus) {
  const wrap = document.createElement("div");
  wrap.className = "chat-balls";

  numbers.forEach((number) => {
    wrap.appendChild(createBallElement(number));
  });

  const plus = document.createElement("span");
  plus.className = "plus";
  plus.textContent = "+";
  wrap.appendChild(plus);
  wrap.appendChild(createBallElement(bonus));

  return wrap;
}

function appendMessage(role, content, numbers = null) {
  const item = document.createElement("div");
  item.className = `chat-message chat-message-${role}`;

  const label = document.createElement("span");
  label.className = "chat-message-label";
  label.textContent = role === "user" ? "나" : "사주 상담";

  const body = document.createElement("div");
  body.className = "chat-message-body";

  if (typeof content === "string") {
    content.split("\n").forEach((line, index, lines) => {
      if (line.trim() === "") {
        body.appendChild(document.createElement("br"));
        return;
      }
      const p = document.createElement("p");
      p.textContent = line;
      body.appendChild(p);
      if (index < lines.length - 1 && lines[index + 1].trim() !== "") {
        /* paragraphs already block-level */
      }
    });
  }

  if (numbers) {
    body.appendChild(renderNumberBalls(numbers.numbers, numbers.bonus));
  }

  item.appendChild(label);
  item.appendChild(body);
  chatMessages.appendChild(item);
  chatMessages.scrollTop = chatMessages.scrollHeight;

  return body;
}

function appendLoading() {
  const item = document.createElement("div");
  item.className = "chat-message chat-message-assistant chat-loading";
  item.id = "chatLoading";
  item.innerHTML = `
    <span class="chat-message-label">사주 상담</span>
    <div class="chat-message-body">
      <p class="typing-indicator">사주를 분석하고 번호를 추천하는 중<span class="dots">...</span></p>
    </div>
  `;
  chatMessages.appendChild(item);
  chatMessages.scrollTop = chatMessages.scrollHeight;
}

function removeLoading() {
  document.getElementById("chatLoading")?.remove();
}

function setLoading(state) {
  isLoading = state;
  recommendBtn.disabled = state;
  chatInput.disabled = state || !profileLocked;
  chatForm.querySelector("button").disabled = state || !profileLocked;

  if (profileLocked) {
    genderInput.disabled = true;
    birthDateInput.disabled = true;
  }
}

function validateProfile() {
  if (!genderInput.value) {
    alert("성별을 선택해 주세요.");
    return false;
  }

  if (!birthDateInput.value) {
    alert("생년월일을 입력해 주세요.");
    return false;
  }

  const birth = new Date(birthDateInput.value);
  const today = new Date();
  if (birth > today) {
    alert("생년월일은 오늘 이전 날짜여야 합니다.");
    return false;
  }

  return true;
}

function getProfile() {
  return {
    gender: genderInput.value,
    birthDate: birthDateInput.value,
  };
}

function buildInitialMessage() {
  const { gender, birthDate } = getProfile();
  const genderText = gender === "male" ? "남성" : "여성";
  return `나의 정보는 다음과 같습니다.
- 성별: ${genderText}
- 생년월일(양력): ${birthDate}

위 사주에 맞는 로또 6/45 번호(주 번호 6개 + 보너스 1개)를 추천하고, 사주명리학적 근거를 자세히 설명해 주세요.`;
}

async function callSajuChat(message) {
  const response = await fetch(API_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...getProfile(),
      message,
      history: chatHistory,
    }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || "요청에 실패했습니다.");
  }

  return data;
}

async function sendMessage(message, { isInitial = false } = {}) {
  if (isLoading) return;
  if (!validateProfile()) return;

  if (isInitial) {
    chatHistory = [];
    chatMessages.innerHTML = "";
    profileLocked = true;
    genderInput.disabled = true;
    birthDateInput.disabled = true;
    chatInput.disabled = false;
    chatForm.querySelector("button").disabled = false;
  }

  if (!isInitial && message) {
    appendMessage("user", message);
  } else if (isInitial) {
    appendMessage("user", "사주에 맞는 로또 번호를 추천해 주세요.");
  }

  setLoading(true);
  appendLoading();

  try {
    const data = await callSajuChat(isInitial ? "" : message);
    removeLoading();
    appendMessage("assistant", data.reply, data.numbers);

    chatHistory.push({
      role: "user",
      text: isInitial ? buildInitialMessage() : message,
    });
    chatHistory.push({ role: "assistant", text: data.reply });
  } catch (error) {
    removeLoading();
    appendMessage(
      "assistant",
      error.message.includes("Failed to fetch")
        ? "API 서버에 연결할 수 없습니다. Vercel에 배포했는지, GEMINI_API_KEY 환경 변수가 설정되었는지 확인해 주세요."
        : error.message
    );
  } finally {
    setLoading(false);
  }
}

profileForm.addEventListener("submit", (event) => {
  event.preventDefault();
  sendMessage("", { isInitial: true });
});

chatForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const message = chatInput.value.trim();
  if (!message || !profileLocked) return;
  chatInput.value = "";
  sendMessage(message);
});

recommendBtn.addEventListener("click", () => {
  profileForm.requestSubmit();
});

chatInput.disabled = true;
chatForm.querySelector("button").disabled = true;
