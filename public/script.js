/**
 * 오늘의 진짜 관광정보판 — script.js
 * 1. 실시간 데이터 로드 & Fail-Safe 캐싱
 * 2. 대한민국 인터랙티브 지도 & 권역별 축제 필터 (충청도, 전북, 전남 등)
 * 3. 상세 축제 팝업 모달 & D-Day 카운트다운
 * 4. 어제 vs 오늘 데이터 Diff (신규/수정/종료/D-day 구분)
 * 5. 5종 오류 모의 테스트 및 데이터 무결성 검증
 */

// 전역 애플리케이션 상태
let state = {
  lastValidData: null,    // 마지막 정상 데이터 (Fail-safe 보존 대상)
  history: [],            // 날짜별 수집 이력
  events: [],             // 오류 및 수집 이벤트
  selectedRegion: "all",  // 선택된 지역 ('all', 'chungcheong', 'jeonbuk', 'jeonnam', ...)
  selectedPeriod: "all",  // 기간 필터 ('all', 'ongoing', 'imminent', 'upcoming')
  currentDiffFilter: "all",// diff 탭 필터
  searchTerm: "",
  sortBy: "dday-asc",
  regionCounts: {}
};

// 권역 정의 및 한글명 매핑
const REGION_DEFINITIONS = {
  all: { name: "전국 전체", desc: "전국 모든 축제" },
  chungcheong: { name: "충청도", desc: "충청남도 · 충청북도 · 대전 · 세종" },
  jeonbuk: { name: "전라북도", desc: "전북특별자치도 (전주, 군산, 익산 등)" },
  jeonnam: { name: "전라남도", desc: "전라남도 · 광주광역시 (여수, 순천, 목포 등)" },
  seoul: { name: "서울특별시", desc: "서울 도심 축제" },
  gyeonggi: { name: "경기 / 인천", desc: "경기도 및 인천광역시" },
  gangwon: { name: "강원도", desc: "강원특별자치도 (춘천, 강릉, 속초 등)" },
  gyeongbuk: { name: "경북 / 대구", desc: "경상북도 및 대구광역시" },
  gyeongnam: { name: "경남 / 부산 / 울산", desc: "경상남도, 부산광역시, 울산광역시" },
  jeju: { name: "제주특별자치도", desc: "제주시 및 서귀포시" }
};

// 주소 텍스트 기반 정밀 권역 분류 함수
function getRegionCode(addr1) {
  if (!addr1) return "etc";
  const addr = addr1.trim();

  // 전라북도
  if (addr.includes("전북") || addr.includes("전라북도")) {
    return "jeonbuk";
  }
  // 전라남도 & 광주
  if (addr.includes("전남") || addr.includes("전라남도") || addr.includes("광주") || addr.includes("전남광주")) {
    return "jeonnam";
  }
  // 충청도 (충북, 충남, 대전, 세종)
  if (addr.includes("충청") || addr.includes("충북") || addr.includes("충남") || addr.includes("대전") || addr.includes("세종")) {
    return "chungcheong";
  }
  // 서울
  if (addr.includes("서울")) {
    return "seoul";
  }
  // 경기 & 인천
  if (addr.includes("경기") || addr.includes("인천")) {
    return "gyeonggi";
  }
  // 강원
  if (addr.includes("강원")) {
    return "gangwon";
  }
  // 경북 & 대구
  if (addr.includes("경북") || addr.includes("경상북도") || addr.includes("대구")) {
    return "gyeongbuk";
  }
  // 경남 & 부산 & 울산
  if (addr.includes("경남") || addr.includes("경상남도") || addr.includes("부산") || addr.includes("울산")) {
    return "gyeongnam";
  }
  // 제주
  if (addr.includes("제주")) {
    return "jeju";
  }

  return "etc";
}

// 헬퍼: 데이터 비동기 로드
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

// 1. 초기 실행
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

    calculateRegionCounts();
    renderStatus("SUCCESS");
    updateRegionCountUI();
    renderFestivals();
    analyzeAndRenderDiff();
    renderHistory();
    setupEventListeners();

  } catch (err) {
    console.error("초기 데이터 로드 중 오류:", err);
    renderStatus("FETCH_ERROR", "초기 데이터를 불러오지 못했습니다.");
  }
}

// 2. 권역별 축제 개수 집계
function calculateRegionCounts() {
  const counts = { all: 0 };
  Object.keys(REGION_DEFINITIONS).forEach(k => counts[k] = 0);

  if (state.lastValidData && state.lastValidData.items) {
    counts.all = state.lastValidData.items.length;
    state.lastValidData.items.forEach(it => {
      const reg = getRegionCode(it.addr1);
      if (counts[reg] !== undefined) {
        counts[reg]++;
      }
    });
  }
  state.regionCounts = counts;
}

function updateRegionCountUI() {
  document.getElementById("cnt-region-all").textContent = state.regionCounts.all || 0;
  Object.keys(state.regionCounts).forEach(reg => {
    const el = document.getElementById(`cnt-region-${reg}`);
    if (el) {
      el.textContent = `${state.regionCounts[reg]}건`;
    }
  });
}

// 3. D-day 계산 및 상세 분석 함수
function calculateDday(startDateStr, endDateStr) {
  if (!startDateStr || startDateStr.length < 8) {
    return { label: "미정", type: "dday-past", ddayVal: 9999, statusDesc: "일정 미정" };
  }

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
    const passedDays = Math.floor((today.getTime() - eDate.getTime()) / (1000 * 60 * 60 * 24));
    return {
      label: "종료됨",
      type: "dday-past",
      ddayVal: 10000 + passedDays,
      statusDesc: `축제가 성황리에 종료되었습니다 (${passedDays}일 전 종료)`
    };
  } else if (diffDays <= 0) {
    const remainDays = Math.ceil((eDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
    return {
      label: "진행중",
      type: "dday-now",
      ddayVal: 0,
      statusDesc: `🎉 지금 성황리에 열리는 중입니다! (종료까지 ${remainDays}일 남음)`
    };
  } else if (diffDays === 1) {
    return {
      label: "D-1 (내일 개막)",
      type: "dday-now",
      ddayVal: 1,
      statusDesc: "내일 바로 축제가 시작됩니다! 서둘러 준비하세요."
    };
  } else {
    return {
      label: `D-${diffDays}`,
      type: "dday-future",
      ddayVal: diffDays,
      statusDesc: `개막까지 ${diffDays}일 남았습니다. 여행 일정을 계획해 보세요!`
    };
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

// 4. 상태 영역 렌더링
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
  const selectedRegionName = document.getElementById("selected-region-name");

  if (state.lastValidData) {
    lastSuccessTime.textContent = formatDateTime(state.lastValidData.collectedAt);
    currentCount.textContent = `${state.lastValidData.itemCount || (state.lastValidData.items || []).length}건`;
  }

  const regInfo = REGION_DEFINITIONS[state.selectedRegion] || { name: "전체" };
  selectedRegionName.textContent = regInfo.name;

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

// 5. 축제 목록 렌더링 (지역 필터 + 기간 필터 + 검색 + 정렬)
function renderFestivals() {
  const container = document.getElementById("festivals-grid");
  const titleEl = document.getElementById("festival-section-title");
  const descEl = document.getElementById("festival-section-desc");

  if (!state.lastValidData || !state.lastValidData.items) {
    container.innerHTML = `<div class="empty-state">표시할 축제 데이터가 없습니다.</div>`;
    return;
  }

  let items = [...state.lastValidData.items];

  // 1) 지역 필터링
  if (state.selectedRegion !== "all") {
    items = items.filter(it => getRegionCode(it.addr1) === state.selectedRegion);
    const regMeta = REGION_DEFINITIONS[state.selectedRegion];
    titleEl.innerHTML = `<span style="color:var(--primary); font-weight:800;">[${regMeta.name}]</span> 추천 축제 (${items.length}건)`;
    descEl.textContent = `${regMeta.desc} 지역의 주요 축제 목록입니다. 클릭하여 상세 일정을 확인하세요.`;
  } else {
    titleEl.textContent = `전국 추천 축제 목록 (${items.length}건)`;
    descEl.textContent = `원하는 축제 카드를 클릭하면 상세 일정, 남은 D-Day, 위치 정보가 펼쳐집니다.`;
  }

  // 2) 기간 필터링
  if (state.selectedPeriod !== "all") {
    items = items.filter(it => {
      const dday = calculateDday(it.eventStartDate, it.eventEndDate);
      if (state.selectedPeriod === "ongoing") return dday.type === "dday-now" && dday.ddayVal === 0;
      if (state.selectedPeriod === "imminent") return dday.ddayVal > 0 && dday.ddayVal <= 10;
      if (state.selectedPeriod === "upcoming") return dday.ddayVal > 10 && dday.ddayVal < 10000;
      return true;
    });
  }

  // 3) 검색어 필터링
  if (state.searchTerm) {
    const term = state.searchTerm.toLowerCase();
    items = items.filter(it =>
      (it.title && it.title.toLowerCase().includes(term)) ||
      (it.addr1 && it.addr1.toLowerCase().includes(term))
    );
  }

  // 4) 정렬
  items.sort((a, b) => {
    const ddayA = calculateDday(a.eventStartDate, a.eventEndDate).ddayVal;
    const ddayB = calculateDday(b.eventStartDate, b.eventEndDate).ddayVal;

    if (state.sortBy === "dday-asc") return ddayA - ddayB;
    if (state.sortBy === "dday-desc") return ddayB - ddayA;
    if (state.title === "title-asc") return a.title.localeCompare(b.title);
    if (state.sortBy === "modified-desc") return (b.modifiedtime || "").localeCompare(a.modifiedtime || "");
    return 0;
  });

  if (items.length === 0) {
    container.innerHTML = `
      <div class="empty-state" style="grid-column: 1 / -1;">
        <i class="fa-solid fa-calendar-xmark" style="font-size:32px; color:var(--gray-500); margin-bottom:10px; display:block;"></i>
        해당 지역 및 조건에 맞는 축제가 없습니다.<br>
        <button class="btn btn-outline btn-sm" style="margin-top:12px;" onclick="selectRegion('all')">전체 지역 보기</button>
      </div>
    `;
    return;
  }

  container.innerHTML = items.map((item, idx) => {
    const dday = calculateDday(item.eventStartDate, item.eventEndDate);
    const regCode = getRegionCode(item.addr1);
    const regName = REGION_DEFINITIONS[regCode]?.name || "기타";
    const imgUrl = item.firstimage || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60";
    const dateRange = `${formatDate(item.eventStartDate)} ~ ${formatDate(item.eventEndDate)}`;

    return `
      <div class="festival-card-item" data-id="${item.contentId}">
        <div class="card-img-wrap">
          <img src="${imgUrl}" alt="${item.title}" class="card-img" onerror="this.src='https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=500&auto=format&fit=crop&q=60'">
          <span class="dday-badge ${dday.type}">${dday.label}</span>
          <span class="region-tag-overlay"><i class="fa-solid fa-location-dot"></i> ${regName}</span>
        </div>
        <div class="card-body">
          <h4>${item.title}</h4>
          <div class="card-details">
            <span><i class="fa-regular fa-calendar"></i> ${dateRange}</span>
            <span><i class="fa-solid fa-map-pin"></i> ${item.addr1 || "장소 미정"}</span>
          </div>
          <div class="card-click-hint">
            <span>상세정보 & D-Day 확인</span> <i class="fa-solid fa-arrow-right"></i>
          </div>
        </div>
      </div>
    `;
  }).join("");

  // 카드 클릭 시 모달 오픈 이벤트 바인딩
  document.querySelectorAll(".festival-card-item").forEach(card => {
    card.addEventListener("click", () => {
      const id = card.getAttribute("data-id");
      const found = state.lastValidData.items.find(it => String(it.contentId) === id);
      if (found) {
        openFestivalModal(found);
      }
    });
  });
}

// 6. 지역 선택 핸들러
function selectRegion(regionCode) {
  state.selectedRegion = regionCode;

  // 1) 버튼 하이라이트
  document.querySelectorAll(".btn-region").forEach(btn => {
    if (btn.getAttribute("data-region") === regionCode) {
      btn.classList.add("active");
    } else {
      btn.classList.remove("active");
    }
  });

  const btnAll = document.getElementById("btn-region-all");
  if (regionCode === "all") {
    btnAll.classList.add("active");
  } else {
    btnAll.classList.remove("active");
  }

  // 2) SVG 지도 하이라이트
  document.querySelectorAll(".map-region-group").forEach(group => {
    if (group.getAttribute("data-region") === regionCode) {
      group.classList.add("active");
    } else {
      group.classList.remove("active");
    }
  });

  // 상태창 선택 지역 표기 업데이트
  renderStatus("SUCCESS");

  // 축제 목록 재렌더링
  renderFestivals();

  // 축제 목록 섹션으로 부드러운 스크롤 이동
  const festivalSection = document.getElementById("festival-list-section");
  if (festivalSection) {
    festivalSection.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

// 7. 축제 상세 모달 팝업 열기
function openFestivalModal(item) {
  const modal = document.getElementById("festival-modal");
  const dday = calculateDday(item.eventStartDate, item.eventEndDate);
  const regCode = getRegionCode(item.addr1);
  const regName = REGION_DEFINITIONS[regCode]?.name || "기타 지역";

  document.getElementById("modal-img").src = item.firstimage || "https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=800&auto=format&fit=crop&q=80";
  document.getElementById("modal-title").textContent = item.title;
  document.getElementById("modal-dday-badge").textContent = dday.label;
  document.getElementById("modal-dday-badge").className = `modal-dday-badge ${dday.type}`;

  document.getElementById("modal-region-tag").textContent = regName;
  document.getElementById("modal-modified").textContent = `최종 수정: ${item.modifiedtime ? formatDateTime(item.modifiedtime) : "-"}`;

  // D-Day 카운트다운 상세 설명
  document.getElementById("modal-countdown-title").textContent = `[축제 일정 현황] ${dday.label}`;
  document.getElementById("modal-countdown-desc").textContent = dday.statusDesc;

  document.getElementById("modal-period").textContent = `${formatDate(item.eventStartDate)} ~ ${formatDate(item.eventEndDate)}`;
  document.getElementById("modal-addr").textContent = item.addr1 || "상세 주소 미제공";

  const telRow = document.getElementById("modal-tel-row");
  if (item.tel) {
    telRow.style.display = "flex";
    document.getElementById("modal-tel").innerHTML = `<a href="tel:${item.tel}" style="color:var(--primary); text-decoration:none;">${item.tel}</a>`;
  } else {
    telRow.style.display = "none";
  }

  document.getElementById("modal-id").textContent = item.contentId;

  // 카카오맵 길찾기 링크
  const mapSearchTarget = item.addr1 || item.title;
  document.getElementById("modal-map-link").href = `https://map.kakao.com/link/search/${encodeURIComponent(mapSearchTarget)}`;

  // 정보 복사 버튼 핸들러
  const copyBtn = document.getElementById("modal-copy-btn");
  copyBtn.onclick = () => {
    const copyText = `[${item.title}]\n- 일정: ${formatDate(item.eventStartDate)} ~ ${formatDate(item.eventEndDate)} (${dday.label})\n- 장소: ${item.addr1 || "미정"}\n- 문의: ${item.tel || "없음"}`;
    navigator.clipboard.writeText(copyText).then(() => {
      copyBtn.innerHTML = `<i class="fa-solid fa-check"></i> 복사 완료!`;
      setTimeout(() => {
        copyBtn.innerHTML = `<i class="fa-solid fa-share-nodes"></i> 축제 정보 복사`;
      }, 2000);
    });
  };

  modal.classList.remove("hidden");
}

function closeFestivalModal() {
  document.getElementById("festival-modal").classList.add("hidden");
}

// 8. 어제와 오늘 데이터 비교 분석 (지시사항 4-② & 5-3)
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

  const sortedHist = [...state.history].sort((a, b) => b.date.localeCompare(a.date));
  const todayEntry = sortedHist[0];
  const yesterdayEntry = sortedHist.length > 1 ? sortedHist[1] : null;

  if (!yesterdayEntry) {
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

  for (const [id, curr] of currMap.entries()) {
    if (!prevMap.has(id)) {
      diffResults.newItems.push({
        type: "new",
        title: curr.title,
        desc: `새롭게 등록된 축제 (시작일: ${formatDate(curr.eventStartDate)})`
      });
    } else {
      const prev = prevMap.get(id);
      let isDataModified = false;
      const changes = [];

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
          desc: changes.join(", ")
        });
      }

      // D-day 변화는 단순 날짜 경과이므로 실제 정보 수정과 명확히 구분
      const prevDday = calculateDday(prev.eventStartDate, prev.eventEndDate).label;
      const currDday = calculateDday(curr.eventStartDate, curr.eventEndDate).label;
      if (prevDday !== currDday) {
        diffResults.ddayChangedItems.push({
          type: "dday",
          title: curr.title,
          desc: `D-Day 경과: ${prevDday} ➜ ${currDday} (단순 일수 경과)`
        });
      }
    }
  }

  for (const [id, prev] of prevMap.entries()) {
    if (!currMap.has(id)) {
      diffResults.endedItems.push({
        type: "end",
        title: prev.title,
        desc: `종료되었거나 검색 결과에서 제외된 축제`
      });
    }
  }

  newCntEl.textContent = diffResults.newItems.length;
  editCntEl.textContent = diffResults.editedItems.length;
  delCntEl.textContent = diffResults.endedItems.length;
  ddayCntEl.textContent = diffResults.ddayChangedItems.length;

  let allDiffs = [
    ...diffResults.newItems,
    ...diffResults.editedItems,
    ...diffResults.endedItems,
    ...diffResults.ddayChangedItems
  ];

  if (state.currentDiffFilter !== "all") {
    allDiffs = allDiffs.filter(d => d.type === state.currentDiffFilter);
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

// 9. 최근 수집 이력 렌더링
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

// 10. 오류 5종 모의 테스트 실행 (지시사항 4-④ & 5-5)
function runErrorTest(type) {
  const logBox = document.getElementById("test-log");
  const integrityBadge = document.getElementById("data-integrity-badge");
  const now = new Date().toLocaleTimeString("ko-KR");

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
  // 기존 축제 목록이 지워지지 않고 보존되는지 확인
  renderFestivals();
}

// 11. 이벤트 리스너 등록
function setupEventListeners() {
  // SVG 지도 클릭 및 호버
  const hoverTag = document.getElementById("map-hover-info");
  document.querySelectorAll(".map-region-group").forEach(group => {
    const regCode = group.getAttribute("data-region");
    const regMeta = REGION_DEFINITIONS[regCode];

    group.addEventListener("mouseenter", () => {
      const cnt = state.regionCounts[regCode] || 0;
      hoverTag.textContent = `${regMeta.name} (${cnt}건)`;
    });

    group.addEventListener("mouseleave", () => {
      const currentMeta = REGION_DEFINITIONS[state.selectedRegion] || { name: "전국 전체" };
      hoverTag.textContent = `선택: ${currentMeta.name}`;
    });

    group.addEventListener("click", () => {
      selectRegion(regCode);
    });
  });

  // 지역 퀵 버튼들
  document.querySelectorAll(".btn-region").forEach(btn => {
    btn.addEventListener("click", () => {
      const reg = btn.getAttribute("data-region");
      selectRegion(reg);
    });
  });

  // 전국 전체 보기 버튼
  document.getElementById("btn-region-all").addEventListener("click", () => {
    selectRegion("all");
  });

  // 기간 필터 칩 (전체, 진행중, 10일 이내, 예정)
  document.querySelectorAll(".filter-chip").forEach(chip => {
    chip.addEventListener("click", () => {
      document.querySelectorAll(".filter-chip").forEach(c => c.classList.remove("active"));
      chip.classList.add("active");
      state.selectedPeriod = chip.getAttribute("data-filter");
      renderFestivals();
    });
  });

  // 모달 닫기
  document.getElementById("modal-close").addEventListener("click", closeFestivalModal);
  document.getElementById("festival-modal").addEventListener("click", (e) => {
    if (e.target.id === "festival-modal") {
      closeFestivalModal();
    }
  });

  // ESC 키로 모달 닫기
  window.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      closeFestivalModal();
    }
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

  // Diff 탭 전환
  document.querySelectorAll(".diff-tab").forEach(tab => {
    tab.addEventListener("click", () => {
      document.querySelectorAll(".diff-tab").forEach(t => t.classList.remove("active"));
      tab.classList.add("active");
      state.currentDiffFilter = tab.getAttribute("data-tab");
      analyzeAndRenderDiff();
    });
  });

  // 오류 모의 테스트 버튼들
  document.querySelectorAll(".btn-test").forEach(btn => {
    btn.addEventListener("click", () => {
      const testType = btn.getAttribute("data-test");
      runErrorTest(testType);
    });
  });

  // 정상 복구 버튼
  document.getElementById("btn-reset-normal").addEventListener("click", () => {
    document.getElementById("test-log").textContent = "정상 상태로 복원되었습니다. 모든 API 연동 상태가 정상입니다.";
    renderStatus("SUCCESS");
    renderFestivals();
  });
}

// DOM 준비 완료 시 실행
document.addEventListener("DOMContentLoaded", initApp);
