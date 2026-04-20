# 아카라 히스토리 데이터 API 개발 가이드  
(한국 지역 전용 · 자동 페이징 · 한국어 시간 · CSV/JSON 다운로드)

## 1. 사전 준비 (한 번만 하면 됨)

1. **Node.js 설치**  
   → https://nodejs.org  
   → LTS 버전 다운로드 → 계속 “다음”만 누르면 끝!

2. 설치 확인 (윈도우 키 + R → cmd 입력 → 엔터)
   ```bash
   node -v
   npm -v
버전이 나오면 성공!

## 2. APPID 등 앱 키 입력
aqara 개발자 사이트(https://developer.aqara.com/) 통해 확인된 APPID 등 정보를 복사해서 .env 로 붙여넣기
![개발자 사이트](./public/개발자%20사이트.png)
```
REACT_APP_APPID=XXXXXXXXXXXXXXXXX
REACT_APP_APPKEY=XXXXXXXXXXXXXXXXX
REACT_APP_KEYID=XXXXXXXXXXXXXXXXX
    ...
```

## 3. 설치 및 실행
현재 프로젝트의 루트 디렉터리
```
# 1. 의존성 설치 (처음 한 번만)
npm install

# 2. 프로그램 실행
npm start
```

## 4. 사이트 사용법
1. 앱 실행 후 'Aqara 계정 로그인' 클릭

![개발자 사이트](./public/로그인.png)

2. 팝업창에 계정 정보 입력 후 로그인

![개발자 사이트](./public/로그인%20팝업.png)

3. 로그인 성공 후 Subject ID 등 정보 모두 입력 후 '첫 페이지 데이터 조회 중' 클릭

![개발자 사이트](./public/조회%20화면.png)

4. 데이터 300건 이상일 경우 '전페 데이터 획득' 클릭

![개발자 사이트](./public/더보기.png)

5. 전체 데이터 조회 완료 후 데이터 다운로드 클릭

![개발자 사이트](./public/다운로드.png)


