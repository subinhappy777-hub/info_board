"""
한국관광공사 국문 관광정보 서비스_GW 축제 정보 수집기 (collect.py)
- 매일 동일한 조건으로 관광정보 수집
- API 실패 시 기존 정상 데이터 보존 (latest.json 보존)
- 날짜별 수집 기록(history.json) 및 이벤트 로그(events.json) 관리
"""

import json
import os
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta

# KST 기준 시간대 (UTC+9)
KST = timezone(timedelta(hours=9))

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DATA_DIR = os.path.join(BASE_DIR, "data")
ENV_PATH = os.path.join(BASE_DIR, ".env")
LATEST_FILE = os.path.join(DATA_DIR, "latest.json")
HISTORY_FILE = os.path.join(DATA_DIR, "history.json")
EVENTS_FILE = os.path.join(DATA_DIR, "events.json")


def load_env(env_path=ENV_PATH):
    """간단한 .env 파일 로더"""
    env_vars = {}
    if os.path.exists(env_path):
        with open(env_path, "r", encoding="utf-8") as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, val = line.split("=", 1)
                    env_vars[key.strip()] = val.strip().strip('"').strip("'")
    return env_vars


def log_event(event_type, message, details=None):
    """events.json에 이벤트 기록"""
    events = []
    if os.path.exists(EVENTS_FILE):
        try:
            with open(EVENTS_FILE, "r", encoding="utf-8") as f:
                events = json.load(f)
        except Exception:
            events = []

    now_kst = datetime.now(KST).isoformat()
    event_entry = {
        "timestamp": now_kst,
        "type": event_type,
        "message": message,
    }
    if details:
        event_entry["details"] = details

    events.append(event_entry)
    with open(EVENTS_FILE, "w", encoding="utf-8") as f:
        json.dump(events, f, ensure_ascii=False, indent=2)


def fetch_festival_data(api_key, event_start_date=None, num_of_rows=50):
    """
    한국관광공사 searchFestival2 API 호출
    """
    if not api_key:
        raise ValueError("API 키(TOUR_API_KEY)가 설정되지 않았습니다. .env 파일을 확인하세요.")

    # 기본 검색 조건: 현재 연도 축제 기준 (동일한 조건 유지를 위해 연초 기준 적용 가능)
    now_kst = datetime.now(KST)
    if not event_start_date:
        # 연초부터 진행되는 축제를 기준으로 고정하여 일관된 데이터 수집 조건 유지
        event_start_date = f"{now_kst.year}0101"

    base_url = "https://apis.data.go.kr/B551011/KorService2/searchFestival2"

    params = {
        "numOfRows": str(num_of_rows),
        "pageNo": "1",
        "MobileOS": "ETC",
        "MobileApp": "InfoBoard",
        "_type": "json",
        "arrange": "A",
        "eventStartDate": event_start_date,
    }

    # serviceKey 처리 (공공데이터포털 키가 이미 URL 인코딩되어 있는지 확인)
    decoded_key = urllib.parse.unquote(api_key)
    params["serviceKey"] = decoded_key

    query_string = urllib.parse.urlencode(params)
    url = f"{base_url}?{query_string}"

    req = urllib.request.Request(
        url,
        headers={
            "User-Agent": "Mozilla/5.0 (compatible; InfoBoardDataCollector/1.0)",
            "Accept": "application/json",
        },
    )

    # 10초 타임아웃
    with urllib.request.urlopen(req, timeout=10) as response:
        status_code = response.getcode()
        if status_code != 200:
            raise RuntimeError(f"HTTP 오류 발생: 상태 코드 {status_code}")

        raw_data = response.read().decode("utf-8")
        try:
            json_data = json.loads(raw_data)
        except json.JSONDecodeError as e:
            raise ValueError(f"JSON 파싱 실패 (응답이 JSON 형식이 아님): {str(e)}")

        return json_data


def validate_and_parse_response(json_data, collected_at_iso):
    """
    API 응답 검증 및 주요 항목 정제
    """
    header = json_data.get("response", {}).get("header", {})
    result_code = header.get("resultCode")
    result_msg = header.get("resultMsg", "")

    if result_code != "0000":
        raise RuntimeError(f"API 응답 오류 [코드: {result_code}]: {result_msg}")

    body = json_data.get("response", {}).get("body", {})
    total_count = body.get("totalCount", 0)
    items_container = body.get("items", {})

    raw_items = []
    if isinstance(items_container, dict):
        raw_items = items_container.get("item", [])
    elif isinstance(items_container, list):
        raw_items = items_container

    if not isinstance(raw_items, list):
        raw_items = [raw_items] if raw_items else []

    cleaned_items = []
    for it in raw_items:
        # 필수 항목 검증
        content_id = str(it.get("contentid") or it.get("contentId") or "")
        title = str(it.get("title") or "").strip()
        event_start_date = str(it.get("eventstartdate") or it.get("eventStartDate") or "")
        event_end_date = str(it.get("eventenddate") or it.get("eventEndDate") or "")

        if not content_id or not title:
            continue

        item_data = {
            "contentId": content_id,
            "title": title,
            "eventStartDate": event_start_date,
            "eventEndDate": event_end_date,
            "addr1": str(it.get("addr1") or "").strip(),
            "addr2": str(it.get("addr2") or "").strip(),
            "firstimage": str(it.get("firstimage") or it.get("firstimage2") or "").strip(),
            "tel": str(it.get("tel") or "").strip(),
            "modifiedtime": str(it.get("modifiedtime") or "").strip(),
            "mapx": str(it.get("mapx") or "").strip(),
            "mapy": str(it.get("mapy") or "").strip(),
            "collectedAt": collected_at_iso,
        }
        cleaned_items.append(item_data)

    return {
        "status": "SUCCESS",
        "collectedAt": collected_at_iso,
        "totalCount": total_count,
        "itemCount": len(cleaned_items),
        "items": cleaned_items,
    }


def save_collection(new_data):
    """
    latest.json 갱신 및 history.json에 날짜별 이력 누적
    (public/data 디렉토리에도 동기화 복사하여 정적 호스팅 지원)
    """
    now_kst = datetime.now(KST)
    today_str = now_kst.strftime("%Y-%m-%d")

    # 1. latest.json 갱신 (정상 수집된 경우에만 안전하게 갱신)
    with open(LATEST_FILE, "w", encoding="utf-8") as f:
        json.dump(new_data, f, ensure_ascii=False, indent=2)

    # 2. history.json에 당일 날짜 기록 누적/갱신
    history = []
    if os.path.exists(HISTORY_FILE):
        try:
            with open(HISTORY_FILE, "r", encoding="utf-8") as f:
                history = json.load(f)
        except Exception:
            history = []

    # 기존 같은 날짜가 있으면 갱신, 없으면 추가
    history_entry = {
        "date": today_str,
        "collectedAt": new_data["collectedAt"],
        "status": "SUCCESS",
        "itemCount": new_data["itemCount"],
        "items": new_data["items"],
    }

    updated = False
    for i, h in enumerate(history):
        if h.get("date") == today_str:
            history[i] = history_entry
            updated = True
            break

    if not updated:
        history.append(history_entry)

    with open(HISTORY_FILE, "w", encoding="utf-8") as f:
        json.dump(history, f, ensure_ascii=False, indent=2)

    # 3. 이벤트 기록
    log_event(
        "COLLECT_SUCCESS",
        f"정상 수집 완료: 총 {new_data['itemCount']}건의 축제 데이터 저장",
        {"date": today_str, "itemCount": new_data["itemCount"]},
    )

    # 4. public/data에도 복사하여 프론트엔드 정적 호스팅 지원
    public_data_dir = os.path.join(BASE_DIR, "public", "data")
    os.makedirs(public_data_dir, exist_ok=True)
    import shutil
    shutil.copy2(LATEST_FILE, os.path.join(public_data_dir, "latest.json"))
    shutil.copy2(HISTORY_FILE, os.path.join(public_data_dir, "history.json"))
    shutil.copy2(EVENTS_FILE, os.path.join(public_data_dir, "events.json"))


def main():
    print("=" * 60)
    print(" 한국관광공사 국문 관광정보 서비스_GW 데이터 수집 시작")
    print("=" * 60)

    env = load_env()
    api_key = env.get("TOUR_API_KEY")

    now_kst = datetime.now(KST)
    collected_at_iso = now_kst.isoformat()

    if not api_key:
        error_msg = "TOUR_API_KEY가 .env 파일에 등록되어 있지 않습니다."
        print(f"[오류] {error_msg}")
        log_event("CONFIG_ERROR", error_msg)
        sys.exit(1)

    try:
        print(f"[{collected_at_iso}] API 요청 전송 중...")
        json_response = fetch_festival_data(api_key)
        parsed_data = validate_and_parse_response(json_response, collected_at_iso)

        save_collection(parsed_data)
        print(f"[성공] 데이터 수집 및 저장 완료! 수집 건수: {parsed_data['itemCount']}건")
        print(f" - 최신 데이터: {LATEST_FILE}")
        print(f" - 수집 이력: {HISTORY_FILE}")
        print(f" - 이벤트 로그: {EVENTS_FILE}")

    except Exception as e:
        error_msg = f"수집 실패: {str(e)}"
        print(f"[실패] {error_msg}")
        # 오류 발생 시 latest.json을 건드리지 않고 events.json에만 기록
        log_event("COLLECT_FAILURE", error_msg, {"error": str(e)})
        print("[보호] 기존 latest.json 데이터가 안전하게 유지되었습니다.")
        sys.exit(1)


if __name__ == "__main__":
    main()
