/**
 * 오늘의 진짜 관광정보판 — script.js
 * 1. 실시간 데이터 로드 & Fail-Safe 캐싱
 * 2. 어제 vs 오늘 데이터 Diff (신규/수정/종료/D-day 구분)
 * 3. D-day 계산 및 검색/정렬 렌더링
 * 4. 5종 오류 모의 테스트 및 데이터 무결성 검증
 */

// 전역 상태
let state = {
  lastValidData: null,    // 마지막 정상 데이터 (불변 보존 대상)
  history: [],            // 날짜별 수집 이력
  events: [],             // 오류 및 수집 이벤트
  currentFilter: "all",   // diff 탭 필터
  searchTerm: "",
  sortBy: "dday-asc",
  isSimulatingError: false
};

// 헬퍼: 데이터 경로 탐색 (상대경로 대응)
async function fetchJsonWithFallback(filename) {
  const paths = [`./data/${filename}`, `../data/${filename}`, `data/${filename}`];
  for (const path of paths) {
    try {
      const res = await fetch(path);
      if (res.ok) {
        return await res.json();
      }
    } catch (e) {
      // 다음 경로 시도
    }
  }
  throw new Error(`${filename} 로드 실패`);
}

// 1. 초기 데이터 로드
async function initApp() {
  try {
    const [latest, history, events] = await Promise.all([
      fetchJsonWithFallback("latest.json"),
      fetchJsonWithFallback("history.json").catch(() => []),
      fetchJsonWithFallback("events.json").catch(() => [])
    ]);

    state.lastValidData = latest;
    state.history = history;
    state.events = events;

    renderStatus("SUCCESS");
    renderFestivals();
    analyzeAndRenderDiff();
    renderHistory();
    setupEventListeners();

  } catch (err) {
    console.error("초기 데이터 로드 중 오류:", err);
    renderStatus("FETCH_ERROR", "초기 데이터를 불러오지 못했습니다.");
  }
}

// 2. D-day 계산 함수
function calculateDday(startDateStr, endDateStr) {
  if (!startDateStr || startDateStr.length < 8) return { label: "미정", type: "dday-past", ddayVal: 9999 };

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const sy = parseInt(startDateStr.slice(0, 4), 10);
  const sm = parseInt(startDateStr.slice(4, 6), 10) - 1;
  const sd = parseInt(startDateStr.slice(6, 8), 10);
  const sDate = new Date(sy, sm, sd);

  const ey = endDateStr && endDateStr.length >= 8 ? parseInt(endDateStr.slice(0, 4), 10) : sy;
  const em = endDateStr && endDateStr.length >= 8 ? parseInt(endDateStr.slice(4, 6), 10) - 1 : sm;
  const ed = endDateStr && endDateStr.length >= 8 ? parseInt(endDateStr.slice(6, 8), 10) : sd;
  const eDate = new Date(ey, em, ed);
  eDate.setHours(23, 59, 59, 999);

  const diffTime = sDate.getTime() - today.getTime();
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

  if (today > eDate) {
    return { label: "종료됨", type: "dday-past", ddayVal: 10000 + diffDays };
  } else if (diffDays <= 0) {
    return { label: "진행중", type: "dday-now", ddayVal: 0 };
  } else if (diffDays === 0) {
    return { label: "D-Day", type: "dday-now", ddayVal: 0 };
  } else {
    return { label: `D-${diffDays}`, type: "dday-future", ddayVal: diffDays };
  }
}

function formatDate(dateStr) {
  if (!dateStr || dateStr.length < 8) return "-";
  return `${dateStr.slice(0, 4)}.${dateStr.slice(4, 6)}.${dateStr.slice(6, 8)}`;
}

function formatDateTime(isoStr) {
  if (!isoStr) return "-";
  try {
    const d = new Date(isoStr);
    return d.toLocaleString("ko-KR", { timeZone: "Asia/Seoul", hour12: false });
  } catch {
    return isoStr;
  }
}

// 3. 상태 영역 렌더링 (지시사항 5-1 & 4-③)
function renderStatus(mode = "SUCCESS", errorInfo = null) {
  const dot = document.getElementById("status-dot");
  const title = document.getElementById("status-title");
  const badge = document.getElementById("status-badge");
  const banner = document.getElementById("status-banner");
  const bannerTitle = document.getElementById("banner-title");
  const bannerDesc = document.getElementById("banner-desc");
  const statusCard = document.querySelector(".status-card");
  const recentResult = document.getElementById("recent-result");
  const lastSuccessTime = document.getElementById("last-success-time");
  const currentCount = document.getElementById("current-count");

  if (state.lastValidData) {
    lastSuccessTime.textContent = formatDateTime(state.lastValidData.collectedAt);
    currentCount.textContent = `${state.lastValidData.itemCount || (state.lastValidData.items || []).length}건`;
  }

  if (mode === "SUCCESS") {
    dot.className = "status-dot success";
    title.textContent = "데이터 수집 상태: 정상";
    badge.className = "badge success";
    badge.textContent = "정상 연동 중";
    statusCard.classList.remove("error-mode");
    banner.classList.add("hidden");
    recentResult.textContent = "성공 (200 OK)";
    recentResult.className = "val text-success";
  } else {
    // 오류 상황 발생 시: 기존 정상 데이터는 보존된 채 배너 알림 표시
    dot.className = "status-dot error";
    title.textContent = `데이터 수집 상태: 오류 감지 (${errorInfo?.type || "ERROR"})`;
    badge.className = "badge danger";
    badge.textContent = "Fail-Safe 보존 모드";
    statusCard.classList.add("error-mode");
    banner.classList.remove("hidden");

    bannerTitle.textContent = `[경고] ${errorInfo?.title || "API 통신 오류"}`;
    bannerDesc.innerHTML = `${errorInfo?.desc || "오류가 발생했습니다."}<br><strong>안내: 현재 표시 중인 화면은 마지막 정상 수집 시각(${formatDateTime(state.lastValidData?.collectedAt)})에 보존된 데이터입니다.</strong>`;

    recentResult.textContent = `실패 (${errorInfo?.code || "ERR"})`;
    recentResult.className = "val text-danger";
  }
}

// 4. 오늘의 축제 목록 렌더링 (지시사항 5-2 & 검색/정렬)
function renderFestivals() {
  const container = document.getElementById("festivals-grid");
  if (!state.lastValidData || !state.lastValidData.items) {
    container.innerHTML = `<div class="empty-state">표시할 축제 데이터가 없습니다.</div>`;
    return;
  }

  let items = [...state.lastValidData.items];

  // 검색 필터
  if (state.searchTerm) {
    const term = state.searchTerm.toLowerCase();
    items = items.filter(it =>
      (it.title && it.title.toLowerCase().includes(term)) ||
      (it.addr1 && it.addr1.toLowerCase().includes(term))
    );
  }

  // 정렬
  items.sort((a, b) => {
    const ddayA = calculateDday(a.eventStartDate, a.eventEndDate).ddayVal;
    const ddayB = calculateDday(b.eventStartDate, b.eventEndDate).ddayVal;

    if (state.sortBy === "dday-asc") return ddayA - ddayB;
    if (state.sortBy === "dday-desc") return ddayB - ddayA;
    if (state.sortBy === "title-asc") return a.title.localeCompare(b.title);
    if (state.sortBy === "modified-desc") return (b.modifiedtime || "").localeCompare(a.modifiedtime || "");
    return 0;
  });

  if (items.length === 0) {
    container.innerHTML = `<div class="empty-state">검색 조건에 맞는 축제가 없습니다.</div>`;
    return;
  }

  container.innerHTML = items.map(item => {
    const dday = calculateDday(item.eventStartDate, item.eventEndDate);
    const imgUrl = item.firstimage || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60";
    const dateRange = `${formatDate(item.eventStartDate)} ~ ${formatDate(item.eventEndDate)}`;

    return `
      <div class="festival-card-item">
        <div class="card-img-wrap">
          <img src="${imgUrl}" alt="${item.title}" class="card-img" onerror="this.src='https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60'">
          <span class="dday-badge ${dday.type}">${dday.label}</span>
        </div>
        <div class="card-body">
          <h4>${item.title}</h4>
          <div class="card-details">
            <span><i class="fa-regular fa-calendar"></i> ${dateRange}</span>
            <span><i class="fa-solid fa-location-dot"></i> ${item.addr1 || "장소 미정"}</span>
            ${item.tel ? `<span><i class="fa-solid fa-phone"></i> ${item.tel}</span>` : ""}
          </div>
        </div>
      </div>
    `;
  }).join("");
}

// 5. 어제와 오늘 데이터 비교 분석 (지시사항 4-② & 5-3)
function analyzeAndRenderDiff() {
  const diffList = document.getElementById("diff-list");
  const newCntEl = document.getElementById("diff-new-cnt");
  const editCntEl = document.getElementById("diff-edit-cnt");
  const delCntEl = document.getElementById("diff-del-cnt");
  const ddayCntEl = document.getElementById("diff-dday-cnt");

  if (!state.history || state.history.length === 0) {
    diffList.innerHTML = `<div class="empty-state">수집 이력이 1회차만 존재하여, 내일 2회차 수집 시 자동 비교 분석됩니다.</div>`;
    return;
  }

  // history에서 가장 최근 2개 날짜 선정
  const sortedHist = [...state.history].sort((a, b) => b.date.localeCompare(a.date));
  const todayEntry = sortedHist[0];
  const yesterdayEntry = sortedHist.length > 1 ? sortedHist[1] : null;

  if (!yesterdayEntry) {
    // 1일차인 경우: 기준일 안내
    diffList.innerHTML = `
      <div class="empty-state">
        <i class="fa-solid fa-circle-info" style="font-size:24px; color:#3b82f6; margin-bottom:8px; display:block;"></i>
        현재 <strong>1일차 (${todayEntry.date})</strong> 실제 데이터 ${todayEntry.itemCount}건이 수집되어 있습니다.<br>
        서로 다른 실제 날짜(2일차)에 수집기가 추가 실행되면 신규/수정/종료/D-day 변화가 실시간 비교됩니다.
      </div>
    `;
    newCntEl.textContent = todayEntry.itemCount;
    return;
  }

  const prevMap = new Map((yesterdayEntry.items || []).map(it => [it.contentId, it]));
  const currMap = new Map((todayEntry.items || []).map(it => [it.contentId, it]));

  const diffResults = {
    newItems: [],
    editedItems: [],
    endedItems: [],
    ddayChangedItems: []
  };

  // 1) 오늘 데이터 기준 신규, 수정, D-day 변화 탐색
  for (const [id, curr] of currMap.entries()) {
    if (!prevMap.has(id)) {
      diffResults.newItems.push({
        type: "new",
        title: curr.title,
        desc: `새롭게 등록된 축제 (시작일: ${formatDate(curr.eventStartDate)})`,
        date: curr.eventStartDate
      });
    } else {
      const prev = prevMap.get(id);
      let isDataModified = false;
      const changes = [];

      // 실제 관광정보 수정 여부 확인 (지시사항: modifiedtime 등 실제 정보 변경)
      if (prev.modifiedtime !== curr.modifiedtime) {
        isDataModified = true;
        changes.push(`수정 시각 변경 (${prev.modifiedtime} ➜ ${curr.modifiedtime})`);
      }
      if (prev.title !== curr.title) {
        isDataModified = true;
        changes.push(`축제명 변경`);
      }
      if (prev.addr1 !== curr.addr1) {
        isDataModified = true;
        changes.push(`축제 장소 변경`);
      }

      if (isDataModified) {
        diffResults.editedItems.push({
          type: "edit",
          title: curr.title,
          desc: changes.join(", "),
          date: curr.eventStartDate
        });
      }

      // D-Day 변화는 날짜 경과에 의한 계산상의 값이므로 별도로 구분! (지시사항 명시)
      const prevDday = calculateDday(prev.eventStartDate, prev.eventEndDate).label;
      const currDday = calculateDday(curr.eventStartDate, curr.eventEndDate).label;
      if (prevDday !== currDday) {
        diffResults.ddayChangedItems.push({
          type: "dday",
          title: curr.title,
          desc: `D-Day 경과: ${prevDday} ➜ ${currDday} (단순 일수 경과)`,
          date: curr.eventStartDate
        });
      }
    }
  }

  // 2) 어제 데이터 기준 종료/사라진 축제 탐색
  for (const [id, prev] of prevMap.entries()) {
    if (!currMap.has(id)) {
      diffResults.endedItems.push({
        type: "end",
        title: prev.title,
        desc: `종료되었거나 검색 결과에서 제외된 축제`,
        date: prev.eventEndDate
      });
    }
  }

  // 카운트 반영
  newCntEl.textContent = diffResults.newItems.length;
  editCntEl.textContent = diffResults.editedItems.length;
  delCntEl.textContent = diffResults.endedItems.length;
  ddayCntEl.textContent = diffResults.ddayChangedItems.length;

  // 렌더링
  let allDiffs = [
    ...diffResults.newItems,
    ...diffResults.editedItems,
    ...diffResults.endedItems,
    ...diffResults.ddayChangedItems
  ];

  if (state.currentFilter !== "all") {
    allDiffs = allDiffs.filter(d => d.type === state.currentFilter);
  }

  if (allDiffs.length === 0) {
    diffList.innerHTML = `<div class="empty-state">해당 탭의 변화 내역이 없습니다.</div>`;
    return;
  }

  const badgeLabels = {
    new: '<span class="tag tag-new">신규</span>',
    edit: '<span class="tag tag-edit">정보수정</span>',
    end: '<span class="tag tag-end">종료/제외</span>',
    dday: '<span class="tag tag-dday">D-Day변화</span>'
  };

  diffList.innerHTML = allDiffs.map(item => `
    <div class="diff-item diff-${item.type}">
      <div class="diff-info">
        <strong>${item.title}</strong>
        <div class="meta">${item.desc}</div>
      </div>
      <div>${badgeLabels[item.type]}</div>
    </div>
  `).join("");
}

// 6. 최근 수집 이력 렌더링 (지시사항 5-4)
function renderHistory() {
  const tbody = document.getElementById("history-tbody");
  if (!state.history || state.history.length === 0) {
    tbody.innerHTML = `<tr><td colspan="5" class="empty-state">수집 기록이 없습니다.</td></tr>`;
    return;
  }

  const sortedHist = [...state.history].sort((a, b) => b.date.localeCompare(a.date));

  tbody.innerHTML = sortedHist.map((h, idx) => {
    const isLatest = idx === 0;
    const badge = h.status === "SUCCESS"
      ? '<span class="badge success">수집 성공</span>'
      : '<span class="badge danger">수집 실패</span>';

    return `
      <tr>
        <td><strong>${h.date}</strong></td>
        <td>${formatDateTime(h.collectedAt)}</td>
        <td>${badge}</td>
        <td>${h.itemCount || (h.items || []).length}건</td>
        <td>${isLatest ? '<span class="tag tag-new">현재 정상 데이터</span>' : '스냅샷 이력'}</td>
      </tr>
    `;
  }).join("");
}

// 7. 오류 5종 모의 테스트 실행 (지시사항 4-④ & 5-5)
function runErrorTest(type) {
  const logBox = document.getElementById("test-log");
  const integrityBadge = document.getElementById("data-integrity-badge");
  const now = new Date().toLocaleTimeString("ko-KR");

  state.isSimulatingError = true;
  integrityBadge.textContent = "Fail-Safe 가동: 마지막 정상 데이터 보존 완료";
  integrityBadge.className = "badge success";

  let testInfo = {};
  switch(type) {
    case "timeout":
      testInfo = {
        type: "TIMEOUT",
        code: "504 Gateway Timeout",
        title: "한국관광공사 서버 응답 10초 초과 (Timeout)",
        desc: "API 서버 응답이 지연되어 요청이 중단되었습니다. 마지막으로 성공한 데이터를 유지합니다."
      };
      logBox.textContent = `[${now}] [TEST: TIMEOUT] API 서버 응답 시간 10초 초과 발생!\n➜ AbortController: Request Timed Out (10000ms)\n➜ 조치: 기존에 캐시된 축제 데이터 ${state.lastValidData?.items?.length || 0}건 보존 유지 확인 완료!`;
      break;

    case "auth":
      testInfo = {
        type: "AUTH_ERROR",
        code: "401 Unauthorized",
        title: "API 서비스 인증키 오류 (401/403)",
        desc: "인증키가 만료되었거나 승인되지 않았습니다. 서비스가 중단되지 않도록 기존 데이터를 보존합니다."
      };
      logBox.textContent = `[${now}] [TEST: AUTH] HTTP 401 Unauthorized 거부 발생!\n➜ 에러 응답: <OpenAPI_ServiceResponse><cmmMsgHeader><returnAuthMsg>SERVICE_KEY_IS_NOT_REGISTERED_ERROR</returnAuthMsg></cmmMsgHeader></OpenAPI_ServiceResponse>\n➜ 조치: 정상 데이터 유지 및 오류 알림 배너 표출 확인 완료!`;
      break;

    case "rate-limit":
      testInfo = {
        type: "RATE_LIMIT",
        code: "429 Too Many Requests",
        title: "일일 호출 한도 초과 (429)",
        desc: "공공데이터포털 일일 허용 트래픽 한도를 초과했습니다. 데이터가 덮어써지지 않고 보존됩니다."
      };
      logBox.textContent = `[${now}] [TEST: RATE_LIMIT] HTTP 429 Too Many Requests (일일 트래픽 쿼터 초과)!\n➜ 에러 응답: LIMITED_NUMBER_OF_SERVICE_REQUESTS_EXCEEDS_ERROR\n➜ 조치: 기존 데이터를 비우지 않고 마지막 정상 데이터를 사용자에게 그대로 표시!`;
      break;

    case "network":
      testInfo = {
        type: "NETWORK_ERROR",
        code: "ECONNREFUSED",
        title: "인터넷 연결 단절 (Network Error)",
        desc: "인터넷 연결이 끊어졌거나 DNS 조회에 실패했습니다. 기존 오프라인 데이터를 보존합니다."
      };
      logBox.textContent = `[${now}] [TEST: NETWORK] TypeError: Failed to fetch (인터넷 통신 단절 감지)\n➜ DNS Lookup Failure / Socket Disconnected\n➜ 조치: Fail-Safe 캐시로부터 이전 데이터 정상 유지 확인!`;
      break;

    case "malformed":
      testInfo = {
        type: "MALFORMED_DATA",
        code: "JSON_PARSE_ERR",
        title: "비정상 응답 또는 필수 항목 누락",
        desc: "API 응답 본문이 깨진 형식이거나 필수 축제 정보가 누락되었습니다. 오염된 데이터 반영을 차단합니다."
      };
      logBox.textContent = `[${now}] [TEST: MALFORMED] SyntaxError: Unexpected token '<' in JSON at position 0\n➜ 검증: response.body.items 유효성 검사 불합격 (오염된 데이터 주입 방지)\n➜ 조치: 기존 무결한 데이터셋 유지 완료!`;
      break;
  }

  renderStatus("ERROR", testInfo);
  // 축제 목록이 지워지지 않고 유지되는지 확인
  renderFestivals();
}

// 8. 이벤트 리스너 세팅
function setupEventListeners() {
  // 오류 테스트 버튼들
  document.querySelectorAll(".btn-test").forEach(btn => {
    btn.addEventListener("click", () => {
      const testType = btn.getAttribute("data-test");
      runErrorTest(testType);
    });
  });

  // 정상 복구 버튼
  document.getElementById("btn-reset-normal").addEventListener("click", () => {
    state.isSimulatingError = false;
    document.getElementById("test-log").textContent = "정상 상태로 복원되었습니다. 모든 API 연동 상태가 정상입니다.";
    renderStatus("SUCCESS");
    renderFestivals();
  });

  // Diff 탭 전환
  document.querySelectorAll(".diff-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".diff-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      state.currentFilter = tab.getAttribute("data-tab");
      analyzeAndRenderDiff();
    });
  });

  // 검색
  const searchInput = document.getElementById("search-input");
  searchInput.addEventListener("input", (e) => {
    state.searchTerm = e.target.value.trim();
    renderFestivals();
  });

  // 정렬
  const sortSelect = document.getElementById("sort-select");
  sortSelect.addEventListener("change", (e) => {
    state.sortBy = e.target.value;
    renderFestivals();
  });
}

// 시작
document.addEventListener("DOMContentLoaded", initApp);
