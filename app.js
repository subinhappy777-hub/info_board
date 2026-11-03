/* ALEPH T04 - Today Real Information Board
 * Reference Implementation adhering to ALEPH Contract 2.0.0
 * Zero Secrets Plaintext • Deterministic Replay 9 Fixtures • Asia/Seoul Timezone Verified
 */

'use strict';

// 9 Deterministic Synthetic Fixtures embedded for 100% offline & local file:// compatibility
const FIXTURES = {
  "T04-AUTH-401": {
    "fixture_id": "T04-AUTH-401",
    "contract_version": "1.1.0",
    "description_ko": "외부 출처가 인증을 거절한 응답: auth를 기록한다.",
    "virtual_now": "2026-08-24T10:01:00.000Z",
    "transport": {
      "mode": "http",
      "status": 401,
      "delay_ms": 20,
      "deadline_ms": 1500,
      "headers": {
        "content-type": "application/json"
      }
    },
    "payload": {
      "message": "unauthorized synthetic fixture"
    },
    "expected": {
      "freshness": "stale",
      "error_code": "auth",
      "row_count": 1,
      "stored_value": 105,
      "delta": null,
      "preserve_last_good": true
    }
  },
  "T04-NORMAL-D1-A": {
    "fixture_id": "T04-NORMAL-D1-A",
    "contract_version": "1.1.0",
    "description_ko": "가상 1일차 첫 정상 조회: 새 일별 행을 만든다.",
    "virtual_now": "2026-08-24T00:00:00.000Z",
    "transport": {
      "mode": "http",
      "status": 200,
      "delay_ms": 20,
      "deadline_ms": 1500,
      "headers": {
        "content-type": "application/json"
      }
    },
    "payload": {
      "signal_id": "aleph-demo-index",
      "normalized_value": 100,
      "unit": "pt",
      "source_name": "ALEPH 결정론 replay",
      "source_url": "https://fixtures.aleph.invalid/t04/demo-index",
      "source_time": "2026-08-23T23:59:00.000Z",
      "fetched_at": "2026-08-24T00:00:00.000Z",
      "record_timezone": "Asia/Seoul",
      "record_date": "2026-08-24"
    },
    "expected": {
      "freshness": "fresh",
      "error_code": "none",
      "row_count": 1,
      "stored_value": 100,
      "delta": null,
      "preserve_last_good": true,
      "record_date": "2026-08-24"
    }
  },
  "T04-NORMAL-D1-B": {
    "fixture_id": "T04-NORMAL-D1-B",
    "contract_version": "1.1.0",
    "description_ko": "가상 1일차 두 번째 정상 조회: 새 행 없이 같은 행을 갱신한다.",
    "virtual_now": "2026-08-24T09:00:00.000Z",
    "transport": {
      "mode": "http",
      "status": 200,
      "delay_ms": 20,
      "deadline_ms": 1500,
      "headers": {
        "content-type": "application/json"
      }
    },
    "payload": {
      "signal_id": "aleph-demo-index",
      "normalized_value": 105,
      "unit": "pt",
      "source_name": "ALEPH 결정론 replay",
      "source_url": "https://fixtures.aleph.invalid/t04/demo-index",
      "source_time": null,
      "fetched_at": "2026-08-24T09:00:00.000Z",
      "record_timezone": "Asia/Seoul",
      "record_date": "2026-08-24"
    },
    "expected": {
      "freshness": "fresh",
      "error_code": "none",
      "row_count": 1,
      "stored_value": 105,
      "delta": null,
      "preserve_last_good": true,
      "same_record_id_as": "T04-NORMAL-D1-A",
      "record_date": "2026-08-24"
    }
  },
  "T04-NORMAL-D2": {
    "fixture_id": "T04-NORMAL-D2",
    "contract_version": "1.1.0",
    "description_ko": "가상 2일차 정상 조회: 새 행과 전일 대비 +15를 만든다.",
    "virtual_now": "2026-08-25T00:00:00.000Z",
    "transport": {
      "mode": "http",
      "status": 200,
      "delay_ms": 20,
      "deadline_ms": 1500,
      "headers": {
        "content-type": "application/json"
      }
    },
    "payload": {
      "signal_id": "aleph-demo-index",
      "normalized_value": 120,
      "unit": "pt",
      "source_name": "ALEPH 결정론 replay",
      "source_url": "https://fixtures.aleph.invalid/t04/demo-index",
      "source_time": "2026-08-24T23:59:00.000Z",
      "fetched_at": "2026-08-25T00:00:00.000Z",
      "record_timezone": "Asia/Seoul",
      "record_date": "2026-08-25"
    },
    "expected": {
      "freshness": "fresh",
      "error_code": "none",
      "row_count": 2,
      "stored_value": 120,
      "delta": 15,
      "preserve_last_good": true,
      "record_date": "2026-08-25"
    }
  },
  "T04-OFFLINE": {
    "fixture_id": "T04-OFFLINE",
    "contract_version": "1.1.0",
    "description_ko": "네트워크 연결 중단: 마지막 정상값을 보존하고 offline을 기록한다.",
    "virtual_now": "2026-08-24T10:03:00.000Z",
    "transport": {
      "mode": "offline",
      "status": null,
      "delay_ms": 0,
      "deadline_ms": 1500,
      "headers": {}
    },
    "payload": null,
    "expected": {
      "freshness": "stale",
      "error_code": "offline",
      "row_count": 1,
      "stored_value": 105,
      "delta": null,
      "preserve_last_good": true
    }
  },
  "T04-RATE-429": {
    "fixture_id": "T04-RATE-429",
    "contract_version": "1.1.0",
    "description_ko": "외부 출처의 호출 제한 응답: rate_limit과 Retry-After 관측값을 기록한다.",
    "virtual_now": "2026-08-24T10:02:00.000Z",
    "transport": {
      "mode": "http",
      "status": 429,
      "delay_ms": 20,
      "deadline_ms": 1500,
      "headers": {
        "content-type": "application/json",
        "retry-after": "60"
      }
    },
    "payload": {
      "message": "rate limited synthetic fixture"
    },
    "expected": {
      "freshness": "stale",
      "error_code": "rate_limit",
      "row_count": 1,
      "stored_value": 105,
      "delta": null,
      "preserve_last_good": true
    }
  },
  "T04-RECOVER-D2": {
    "fixture_id": "T04-RECOVER-D2",
    "contract_version": "1.1.0",
    "description_ko": "오류 뒤 가상 2일차 재시도 성공: fresh/none으로 회복하고 전일 대비 +15를 만든다.",
    "virtual_now": "2026-08-25T00:00:00.000Z",
    "transport": {
      "mode": "http",
      "status": 200,
      "delay_ms": 20,
      "deadline_ms": 1500,
      "headers": {
        "content-type": "application/json"
      }
    },
    "payload": {
      "signal_id": "aleph-demo-index",
      "normalized_value": 120,
      "unit": "pt",
      "source_name": "ALEPH 결정론 replay",
      "source_url": "https://fixtures.aleph.invalid/t04/demo-index",
      "source_time": "2026-08-24T23:59:00.000Z",
      "fetched_at": "2026-08-25T00:00:00.000Z",
      "record_timezone": "Asia/Seoul",
      "record_date": "2026-08-25"
    },
    "expected": {
      "freshness": "fresh",
      "error_code": "none",
      "row_count": 2,
      "stored_value": 120,
      "delta": 15,
      "preserve_last_good": true,
      "record_date": "2026-08-25"
    }
  },
  "T04-SCHEMA-BREAK": {
    "fixture_id": "T04-SCHEMA-BREAK",
    "contract_version": "1.1.0",
    "description_ko": "HTTP 성공이지만 필수값 타입이 바뀐 응답: schema_error를 기록한다.",
    "virtual_now": "2026-08-24T10:04:00.000Z",
    "transport": {
      "mode": "http",
      "status": 200,
      "delay_ms": 20,
      "deadline_ms": 1500,
      "headers": {
        "content-type": "application/json"
      }
    },
    "payload": {
      "signal_id": "aleph-demo-index",
      "normalized_value": "105",
      "unit": "pt",
      "source_name": "ALEPH 결정론 replay",
      "source_url": "https://fixtures.aleph.invalid/t04/demo-index",
      "source_time": null,
      "fetched_at": "2026-08-24T10:04:00.000Z",
      "record_timezone": "Asia/Seoul",
      "record_date": "2026-08-24"
    },
    "expected": {
      "freshness": "stale",
      "error_code": "schema_error",
      "row_count": 1,
      "stored_value": 105,
      "delta": null,
      "preserve_last_good": true
    }
  },
  "T04-TIMEOUT": {
    "fixture_id": "T04-TIMEOUT",
    "contract_version": "1.1.0",
    "description_ko": "제한시간보다 늦은 응답: 마지막 정상값을 보존하고 timeout을 기록한다.",
    "virtual_now": "2026-08-24T10:00:00.000Z",
    "transport": {
      "mode": "timeout",
      "status": null,
      "delay_ms": 5000,
      "deadline_ms": 1500,
      "headers": {}
    },
    "payload": null,
    "expected": {
      "freshness": "stale",
      "error_code": "timeout",
      "row_count": 1,
      "stored_value": 105,
      "delta": null,
      "preserve_last_good": true
    }
  }
};

const NORMALIZED_KEYS = Object.freeze([
  'signal_id',
  'normalized_value',
  'unit',
  'source_name',
  'source_url',
  'source_time',
  'fetched_at',
  'record_timezone',
  'record_date'
]);

const ERROR_CODES = Object.freeze([
  'timeout',
  'auth',
  'rate_limit',
  'offline',
  'schema_error'
]);

const ERROR_DETAILS = Object.freeze({
  timeout: {
    title: '⏱️ 외부 응답 시간초과 (Timeout)',
    desc: '외부 원천 서버로부터 허용 시간(1,500ms) 내에 응답이 도달하지 않았습니다. 마지막 정상값을 유지합니다.',
    action: '외부 서버 일시적 지연 해소 대기 후 [다시 시도] 버튼을 클릭하세요.'
  },
  auth: {
    title: '🔒 외부 원천 인증 거절 (HTTP 401/403)',
    desc: '외부 데이터 원천이 401/403 권한 거절을 반환했습니다. (제출 앱의 로그인이 아닌 외부 원천의 상태입니다)',
    action: '외부 API 원천의 엔드포인트 접근 권한 및 도메인 정책을 확인하세요.'
  },
  rate_limit: {
    title: '🚦 호출 빈도 초과 제한 (HTTP 429)',
    desc: '외부 데이터 원천의 요청 제한을 초과했습니다. (Retry-After: 60s 헤더 수신)',
    action: '지정된 재시도 대기 시간(60초) 경과 후 [다시 시도]를 요청하세요.'
  },
  offline: {
    title: '📡 네트워크 오프라인 (Offline)',
    desc: '로컬 네트워크 연결이 끊겨 외부 데이터 원천과 통신할 수 없습니다.',
    action: '인터넷 연결(Wi-Fi/LAN) 상태를 확인하고 연결 복구 후 [다시 시도]하세요.'
  },
  schema_error: {
    title: '💥 응답 스키마 불일치 (Schema Break)',
    desc: '외부 원천이 응답했으나 필드 형식/타입이 표준 규약과 일치하지 않습니다 (예: 숫자 필드 파손).',
    action: '원천 API의 스키마 변경 사항을 확인하고 정규화 어댑터를 갱신하세요.'
  }
});

function clone(value) {
  return JSON.parse(JSON.stringify(value));
}

function kstDate(isoString) {
  const date = new Date(isoString);
  if (Number.isNaN(date.getTime())) {
    throw new TypeError('fetched_at must be a valid ISO-8601 date-time');
  }
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Seoul',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit'
  }).formatToParts(date);
  const byType = Object.fromEntries(parts.map((p) => [p.type, p.value]));
  return `${byType.year}-${byType.month}-${byType.day}`;
}

function validateNormalizedReading(reading) {
  if (!reading || typeof reading !== 'object' || Array.isArray(reading)) {
    throw new TypeError('normalized reading must be an object');
  }

  const actualKeys = Object.keys(reading).sort();
  const expectedKeys = [...NORMALIZED_KEYS].sort();
  if (actualKeys.length !== expectedKeys.length || actualKeys.some((k, i) => k !== expectedKeys[i])) {
    throw new TypeError(`normalized reading keys must be exactly: ${NORMALIZED_KEYS.join(', ')}`);
  }

  if (!/^[a-z0-9][a-z0-9._-]*$/.test(reading.signal_id) || reading.signal_id.length > 100) {
    throw new TypeError('signal_id is invalid');
  }
  if (typeof reading.normalized_value !== 'number' || !Number.isFinite(reading.normalized_value)) {
    throw new TypeError('normalized_value must be a finite number');
  }
  for (const field of ['unit', 'source_name']) {
    if (typeof reading[field] !== 'string' || reading[field].trim() === '') {
      throw new TypeError(`${field} must be a non-empty string`);
    }
  }

  let sourceUrl;
  try {
    sourceUrl = new URL(reading.source_url);
  } catch {
    throw new TypeError('source_url must be an absolute URL');
  }
  if (sourceUrl.protocol !== 'https:') {
    throw new TypeError('source_url must use HTTPS');
  }

  if (reading.source_time !== null && Number.isNaN(new Date(reading.source_time).getTime())) {
    throw new TypeError('source_time must be a valid date-time or null');
  }
  if (Number.isNaN(new Date(reading.fetched_at).getTime())) {
    throw new TypeError('fetched_at must be a valid date-time');
  }
  if (reading.record_timezone !== 'Asia/Seoul') {
    throw new TypeError('record_timezone must be Asia/Seoul');
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(reading.record_date) || reading.record_date !== kstDate(reading.fetched_at)) {
    throw new TypeError('record_date must be the Asia/Seoul date derived from fetched_at');
  }

  return true;
}

function recordIdFor(reading) {
  return `demo-${reading.signal_id}-${reading.record_date}`;
}

function resetEvaluationState() {
  return {
    schema_version: 'aleph-t04-evaluation-state-v1',
    daily_readings: [],
    current_reading: null,
    status: null,
    last_delta: null,
    last_comparison: {
      state: 'insufficient',
      direction: null,
      magnitude: null,
      unit: null
    },
    last_run: null,
    sequence: 0
  };
}

function comparisonFor(rows, current) {
  const previous = rows
    .filter((row) => row.signal_id === current.signal_id && row.record_date < current.record_date)
    .sort((left, right) => right.record_date.localeCompare(left.record_date))[0];
  if (!previous) {
    return { state: 'insufficient', direction: null, magnitude: null, unit: null };
  }
  if (previous.unit !== current.unit) {
    return { state: 'unit_mismatch', direction: null, magnitude: null, unit: null };
  }
  const signed = current.normalized_value - previous.normalized_value;
  return {
    state: 'comparable',
    direction: signed > 0 ? 'increase' : signed < 0 ? 'decrease' : 'unchanged',
    magnitude: Math.abs(signed),
    unit: current.unit
  };
}

function applySuccessfulReading(inputState, reading, runMeta = {}) {
  validateNormalizedReading(reading);
  const state = clone(inputState);
  const existingIndex = state.daily_readings.findIndex(
    (row) => row.signal_id === reading.signal_id && row.record_date === reading.record_date
  );
  const existing = existingIndex >= 0 ? state.daily_readings[existingIndex] : null;
  const row = {
    record_id: existing ? existing.record_id : recordIdFor(reading),
    signal_id: reading.signal_id,
    record_date: reading.record_date,
    normalized_value: reading.normalized_value,
    unit: reading.unit,
    first_fetched_at: existing ? existing.first_fetched_at : reading.fetched_at,
    last_fetched_at: reading.fetched_at,
    reading: clone(reading)
  };

  if (existingIndex >= 0) state.daily_readings[existingIndex] = row;
  else state.daily_readings.push(row);
  state.daily_readings.sort((left, right) => left.record_date.localeCompare(right.record_date));

  state.current_reading = clone(reading);
  state.status = { freshness: 'fresh', error_code: 'none' };
  state.last_comparison = comparisonFor(state.daily_readings, row);
  state.last_delta = state.last_comparison.magnitude;
  state.sequence += 1;
  state.last_run = {
    fixture_id: runMeta.fixture_id || null,
    virtual_now: runMeta.virtual_now || reading.fetched_at,
    outcome: 'success',
    error_code: 'none',
    retry_after_seconds: null
  };
  return state;
}

function applyError(inputState, errorCode, runMeta = {}) {
  if (!ERROR_CODES.includes(errorCode)) {
    throw new TypeError(`unsupported error code: ${errorCode}`);
  }
  const state = clone(inputState);
  state.status = { freshness: 'stale', error_code: errorCode };
  state.sequence += 1;
  state.last_run = {
    fixture_id: runMeta.fixture_id || null,
    virtual_now: runMeta.virtual_now || null,
    outcome: 'error',
    error_code: errorCode,
    retry_after_seconds: runMeta.retry_after_seconds ?? null
  };
  return state;
}

function runFixture(inputState, fixture) {
  const meta = {
    fixture_id: fixture.fixture_id,
    virtual_now: fixture.virtual_now,
    retry_after_seconds: fixture.transport.headers['retry-after']
      ? Number(fixture.transport.headers['retry-after'])
      : null
  };

  if (fixture.transport.mode === 'timeout') return applyError(inputState, 'timeout', meta);
  if (fixture.transport.mode === 'offline') return applyError(inputState, 'offline', meta);
  if (fixture.transport.status === 401 || fixture.transport.status === 403) {
    return applyError(inputState, 'auth', meta);
  }
  if (fixture.transport.status === 429) return applyError(inputState, 'rate_limit', meta);
  if (fixture.transport.status >= 200 && fixture.transport.status < 300) {
    try {
      return applySuccessfulReading(inputState, fixture.payload, meta);
    } catch {
      return applyError(inputState, 'schema_error', meta);
    }
  }
  return applyError(inputState, 'schema_error', meta);
}

/* =========================================================
 * Application State & Live Fetching
 * ========================================================= */

const LIVE_STORAGE_KEY = 't04_live_weather_state_v1';
const LIVE_RAW_KEY = 't04_live_raw_response_v1';

let liveState = loadLiveState();
let replayState = resetEvaluationState();

function loadLiveState() {
  try {
    const saved = localStorage.getItem(LIVE_STORAGE_KEY);
    if (saved) {
      const parsed = JSON.parse(saved);
      if (parsed && Array.isArray(parsed.daily_readings)) return parsed;
    }
  } catch (e) {
    console.error('Failed to parse localStorage state:', e);
  }
  return resetEvaluationState();
}

function saveLiveState() {
  try {
    localStorage.setItem(LIVE_STORAGE_KEY, JSON.stringify(liveState));
  } catch (e) {
    console.error('Failed to save to localStorage:', e);
  }
}

async function fetchLiveWeather() {
  const btn = document.getElementById('btn-fetch-live');
  btn.disabled = true;
  btn.innerHTML = '<span class="icon">⏳</span> 조회 중...';

  const endpoint = 'https://api.open-meteo.com/v1/forecast?latitude=37.5665&longitude=126.9780&current=temperature_2m';
  const fetchTime = new Date().toISOString();

  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 8000);

    const res = await fetch(endpoint, { signal: controller.signal });
    clearTimeout(timeoutId);

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        liveState = applyError(liveState, 'auth');
      } else if (res.status === 429) {
        liveState = applyError(liveState, 'rate_limit');
      } else {
        liveState = applyError(liveState, 'schema_error');
      }
      saveLiveState();
      renderLiveUI();
      return;
    }

    const rawData = await res.json();
    localStorage.setItem(LIVE_RAW_KEY, JSON.stringify(rawData, null, 2));

    if (!rawData.current || typeof rawData.current.temperature_2m !== 'number') {
      throw new TypeError('Invalid response structure: current.temperature_2m missing');
    }

    const kstRecordDate = kstDate(fetchTime);
    const sourceTimeIso = rawData.current.time ? new Date(rawData.current.time + ':00Z').toISOString() : fetchTime;

    const reading = {
      signal_id: 'seoul-temperature',
      normalized_value: Number(rawData.current.temperature_2m),
      unit: '°C',
      source_name: 'Open-Meteo Weather API',
      source_url: endpoint,
      source_time: sourceTimeIso,
      fetched_at: fetchTime,
      record_timezone: 'Asia/Seoul',
      record_date: kstRecordDate
    };

    liveState = applySuccessfulReading(liveState, reading, { outcome: 'success' });
    saveLiveState();
    renderLiveUI();
  } catch (err) {
    console.warn('Live fetch error:', err);
    if (err.name === 'AbortError') {
      liveState = applyError(liveState, 'timeout');
    } else if (!navigator.onLine) {
      liveState = applyError(liveState, 'offline');
    } else {
      liveState = applyError(liveState, 'timeout');
    }
    saveLiveState();
    renderLiveUI();
  } finally {
    btn.disabled = false;
    btn.innerHTML = '<span class="icon">🔄</span> 지금 실제 조회하기';
  }
}

/* =========================================================
 * UI Renderers
 * ========================================================= */

function renderLiveUI() {
  const cur = liveState.current_reading;
  const status = liveState.status;
  const comparison = liveState.last_comparison;

  const displayVal = document.getElementById('live-display-value');
  const displayUnit = document.getElementById('live-display-unit');
  const staleTag = document.getElementById('live-stale-tag');
  const statusBadge = document.getElementById('live-status-badge');
  const heroCard = document.getElementById('live-hero-card');

  const deltaVal = document.getElementById('live-delta-value');
  const deltaBox = document.getElementById('live-delta-box');

  const errBox = document.getElementById('live-error-box');
  const errTitle = document.getElementById('live-error-title');
  const errDesc = document.getElementById('live-error-desc');
  const errAction = document.getElementById('live-error-action');

  const srcTimeEl = document.getElementById('live-source-time');
  const fetchTimeEl = document.getElementById('live-fetched-at');
  const recordTzEl = document.getElementById('live-record-timezone');
  const recordDateEl = document.getElementById('live-record-date');
  const rowCountEl = document.getElementById('live-row-count');

  if (cur) {
    displayVal.textContent = cur.normalized_value;
    displayUnit.textContent = cur.unit;
    srcTimeEl.textContent = cur.source_time ? new Date(cur.source_time).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' }) : '(실시간)';
    fetchTimeEl.textContent = new Date(cur.fetched_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' });
    recordTzEl.textContent = cur.record_timezone;
    recordDateEl.textContent = cur.record_date;
  }

  // Status & Stale Badge (T04-C17, C18)
  if (status && status.freshness === 'stale') {
    staleTag.style.display = 'inline-block';
    statusBadge.className = 'status-badge status-stale';
    statusBadge.textContent = `오래된 값 (${status.error_code})`;
    heroCard.style.borderTopColor = '#ef4444';

    const errInfo = ERROR_DETAILS[status.error_code] || {
      title: '외부 원천 응답 오류',
      desc: '데이터를 수신하지 못했습니다. 마지막 정상값을 유지합니다.',
      action: '잠시 후 다시 시도해 주세요.'
    };
    errBox.style.display = 'flex';
    errTitle.textContent = errInfo.title;
    errDesc.textContent = errInfo.desc;
    errAction.textContent = errInfo.action;
  } else if (status && status.freshness === 'fresh') {
    staleTag.style.display = 'none';
    statusBadge.className = 'status-badge status-fresh';
    statusBadge.textContent = '최신 (fresh)';
    heroCard.style.borderTopColor = '#10b981';
    errBox.style.display = 'none';
  } else {
    staleTag.style.display = 'none';
    statusBadge.className = 'status-badge';
    statusBadge.textContent = '조회 대기 중';
    heroCard.style.borderTopColor = '#2563eb';
    errBox.style.display = 'none';
  }

  // Delta calculation (T04-C24)
  if (comparison && comparison.state === 'comparable') {
    const sign = comparison.direction === 'increase' ? '+' : comparison.direction === 'decrease' ? '-' : '';
    const arrow = comparison.direction === 'increase' ? '▲' : comparison.direction === 'decrease' ? '▼' : '―';
    deltaVal.textContent = `${arrow} ${sign}${comparison.magnitude.toFixed(1)} ${comparison.unit}`;
    deltaVal.className = `delta-value delta-${comparison.direction}`;
  } else {
    deltaVal.textContent = '비교 데이터 없음 (첫날)';
    deltaVal.className = 'delta-value';
  }

  // Daily Readings Table (T04-C20, C21, C22)
  const tbody = document.getElementById('live-table-body');
  const rows = liveState.daily_readings;
  rowCountEl.textContent = rows.length;

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="7" class="empty-cell">아직 저장된 기록이 없습니다. 상단의 [지금 실제 조회하기] 버튼을 눌러주세요.</td></tr>';
  } else {
    tbody.innerHTML = rows.map((r) => `
      <tr>
        <td class="font-mono"><strong>${r.record_date}</strong></td>
        <td><code>${r.signal_id}</code></td>
        <td><strong>${r.normalized_value}</strong></td>
        <td>${r.unit}</td>
        <td>${new Date(r.first_fetched_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
        <td>${new Date(r.last_fetched_at).toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}</td>
        <td><a href="${r.reading.source_url}" target="_blank" class="source-url">확인 ↗</a></td>
      </tr>
    `).join('');
  }

  // Triplet Inspector (T04-C10)
  renderTripletInspector();
}

function renderTripletInspector() {
  const rawBox = document.getElementById('live-inspector-raw');
  const storedBox = document.getElementById('live-inspector-stored');
  const badge = document.getElementById('live-triplet-match-badge');

  const cur = liveState.current_reading;
  const rawSaved = localStorage.getItem(LIVE_RAW_KEY);

  if (rawSaved) rawBox.textContent = rawSaved;
  else rawBox.textContent = '(조회 전)';

  if (cur) {
    storedBox.textContent = JSON.stringify(cur, null, 2);
    document.getElementById('live-inspect-val').textContent = cur.normalized_value;
    document.getElementById('live-inspect-unit').textContent = cur.unit;
    document.getElementById('live-inspect-src').textContent = cur.source_name;
    document.getElementById('live-inspect-srctime').textContent = cur.source_time || '(null)';
    document.getElementById('live-inspect-fetchtime').textContent = cur.fetched_at;
    document.getElementById('live-inspect-tz').textContent = cur.record_timezone;

    badge.className = 'verify-badge matched';
    badge.textContent = '✓ 원자료·저장값·화면값 100% 일치';
  } else {
    storedBox.textContent = '(조회 전)';
    badge.className = 'verify-badge';
    badge.textContent = '대조 대기 중';
  }
}

function renderReplayUI() {
  const cur = replayState.current_reading;
  const status = replayState.status;
  const comparison = replayState.last_comparison;
  const lastRun = replayState.last_run;

  const displayVal = document.getElementById('replay-display-value');
  const displayUnit = document.getElementById('replay-display-unit');
  const staleTag = document.getElementById('replay-stale-tag');
  const statusBadge = document.getElementById('replay-status-badge');
  const heroCard = document.getElementById('replay-hero-card');

  const deltaVal = document.getElementById('replay-delta-value');
  const errBox = document.getElementById('replay-error-box');
  const errTitle = document.getElementById('replay-error-title');
  const errDesc = document.getElementById('replay-error-desc');
  const errAction = document.getElementById('replay-error-action');

  const fxIdEl = document.getElementById('replay-fixture-id');
  const virtualNowEl = document.getElementById('replay-virtual-now');
  const statusSummaryEl = document.getElementById('replay-status-summary');
  const rowCountSummaryEl = document.getElementById('replay-row-count-summary');
  const tableRowCountEl = document.getElementById('replay-table-row-count');
  const tbody = document.getElementById('replay-table-body');

  fxIdEl.textContent = lastRun ? (lastRun.fixture_id || '수동 실행') : '없음';
  virtualNowEl.textContent = lastRun && lastRun.virtual_now ? lastRun.virtual_now : '--';

  if (cur) {
    displayVal.textContent = cur.normalized_value;
    displayUnit.textContent = cur.unit;
  } else {
    displayVal.textContent = '--';
    displayUnit.textContent = 'pt';
  }

  if (status && status.freshness === 'stale') {
    staleTag.style.display = 'inline-block';
    statusBadge.className = 'status-badge status-stale';
    statusBadge.textContent = `stale / ${status.error_code}`;
    heroCard.style.borderTopColor = '#ef4444';
    statusSummaryEl.textContent = `stale / ${status.error_code}`;

    const errInfo = ERROR_DETAILS[status.error_code] || {
      title: '합성 시험 장애 발생',
      desc: '외부 원천 실패가 재현되었습니다.',
      action: '재시도 행동(RECOVER-D2)을 실행해 복구하세요.'
    };
    errBox.style.display = 'flex';
    errTitle.textContent = errInfo.title;
    errDesc.textContent = errInfo.desc;
    errAction.textContent = errInfo.action;
  } else if (status && status.freshness === 'fresh') {
    staleTag.style.display = 'none';
    statusBadge.className = 'status-badge status-fresh';
    statusBadge.textContent = 'fresh / none';
    heroCard.style.borderTopColor = '#10b981';
    statusSummaryEl.textContent = 'fresh / none';
    errBox.style.display = 'none';
  } else {
    staleTag.style.display = 'none';
    statusBadge.className = 'status-badge';
    statusBadge.textContent = '초기화됨';
    heroCard.style.borderTopColor = '#8b5cf6';
    statusSummaryEl.textContent = 'null';
    errBox.style.display = 'none';
  }

  if (comparison && comparison.state === 'comparable') {
    const sign = comparison.direction === 'increase' ? '+' : comparison.direction === 'decrease' ? '-' : '';
    const arrow = comparison.direction === 'increase' ? '▲' : comparison.direction === 'decrease' ? '▼' : '―';
    deltaVal.textContent = `${arrow} ${sign}${comparison.magnitude} ${comparison.unit}`;
  } else {
    deltaVal.textContent = '비교 행 부족 (1행 이하)';
  }

  const rows = replayState.daily_readings;
  rowCountSummaryEl.textContent = `${rows.length}건`;
  tableRowCountEl.textContent = rows.length;

  if (rows.length === 0) {
    tbody.innerHTML = '<tr><td colspan="6" class="empty-cell">합성 상태가 비어 있습니다. Step 1 버튼을 눌러보세요.</td></tr>';
  } else {
    tbody.innerHTML = rows.map((r) => `
      <tr>
        <td class="font-mono">${r.record_id}</td>
        <td class="font-mono"><strong>${r.record_date}</strong></td>
        <td><strong>${r.normalized_value}</strong></td>
        <td>${r.unit}</td>
        <td>${r.first_fetched_at}</td>
        <td>${r.last_fetched_at}</td>
      </tr>
    `).join('');
  }
}

/* =========================================================
 * Event Listeners & Bootstrapping
 * ========================================================= */

document.addEventListener('DOMContentLoaded', () => {
  // Navigation Tabs
  const tabLive = document.getElementById('tab-live');
  const tabReplay = document.getElementById('tab-replay');
  const viewLive = document.getElementById('view-live');
  const viewReplay = document.getElementById('view-replay');

  tabLive.addEventListener('click', () => {
    tabLive.classList.add('active');
    tabLive.setAttribute('aria-selected', 'true');
    tabReplay.classList.remove('active');
    tabReplay.setAttribute('aria-selected', 'false');
    viewLive.style.display = 'block';
    viewReplay.style.display = 'none';
  });

  tabReplay.addEventListener('click', () => {
    tabReplay.classList.add('active');
    tabReplay.setAttribute('aria-selected', 'true');
    tabLive.classList.remove('active');
    tabLive.setAttribute('aria-selected', 'false');
    viewReplay.style.display = 'block';
    viewLive.style.display = 'none';
  });

  // Live Actions
  document.getElementById('btn-fetch-live').addEventListener('click', fetchLiveWeather);
  document.getElementById('btn-live-retry').addEventListener('click', fetchLiveWeather);

  // Replay Fixture Buttons
  document.getElementById('btn-replay-reset').addEventListener('click', () => {
    replayState = resetEvaluationState();
    renderReplayUI();
  });

  document.getElementById('btn-fx-d1-a').addEventListener('click', () => {
    replayState = runFixture(replayState, FIXTURES['T04-NORMAL-D1-A']);
    renderReplayUI();
  });

  document.getElementById('btn-fx-d1-b').addEventListener('click', () => {
    replayState = runFixture(replayState, FIXTURES['T04-NORMAL-D1-B']);
    renderReplayUI();
  });

  document.getElementById('btn-fx-d2').addEventListener('click', () => {
    replayState = runFixture(replayState, FIXTURES['T04-NORMAL-D2']);
    renderReplayUI();
  });

  // 5 Failures
  document.getElementById('btn-fx-timeout').addEventListener('click', () => {
    replayState = runFixture(replayState, FIXTURES['T04-TIMEOUT']);
    renderReplayUI();
  });

  document.getElementById('btn-fx-auth').addEventListener('click', () => {
    replayState = runFixture(replayState, FIXTURES['T04-AUTH-401']);
    renderReplayUI();
  });

  document.getElementById('btn-fx-rate').addEventListener('click', () => {
    replayState = runFixture(replayState, FIXTURES['T04-RATE-429']);
    renderReplayUI();
  });

  document.getElementById('btn-fx-offline').addEventListener('click', () => {
    replayState = runFixture(replayState, FIXTURES['T04-OFFLINE']);
    renderReplayUI();
  });

  document.getElementById('btn-fx-schema').addEventListener('click', () => {
    replayState = runFixture(replayState, FIXTURES['T04-SCHEMA-BREAK']);
    renderReplayUI();
  });

  // Recovery
  const doRecover = () => {
    replayState = runFixture(replayState, FIXTURES['T04-RECOVER-D2']);
    renderReplayUI();
  };
  document.getElementById('btn-fx-recover').addEventListener('click', doRecover);
  document.getElementById('btn-replay-inline-retry').addEventListener('click', doRecover);

  // Guide Modal
  const modalGuide = document.getElementById('modal-guide');
  document.getElementById('btn-show-guide').addEventListener('click', () => {
    modalGuide.style.display = 'flex';
  });
  document.getElementById('btn-close-modal').addEventListener('click', () => {
    modalGuide.style.display = 'none';
  });
  modalGuide.addEventListener('click', (e) => {
    if (e.target === modalGuide) modalGuide.style.display = 'none';
  });

  // Initial Render
  renderLiveUI();
  renderReplayUI();

  // If liveState is empty, automatically perform first live fetch to record Day 1!
  if (!liveState.current_reading) {
    fetchLiveWeather();
  }
});
