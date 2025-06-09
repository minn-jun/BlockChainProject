## 테스트

`settings/.env`에서 개인 환경에 맞춰서 준비 <br>

- https://cloud.google.com/application/web3/faucet/ethereum/sepolia 에 접속하여 자신의 메타마스크 지갑 주소를 입력하여 테스트 이더를 받음. (Sepolia testNet)
- https://infura.io/ 에 가입해서 EndPoints Sepolia를 선택하여 RPC_URL을 받음.
- 메타마스크 지갑 비밀번호 입력

## 동작 흐름

### 1. 사용자 등록 및 로그인

`/auth/register/student`, `/auth/register/professor`로 회원가입 (POST) <br>
`/auth/login` (POST) 후 세션에 `userId`와 `role` 저장

### 2. 교수 - 출석 세션 생성

`/attendance/session/:courseId/start`로 출결 세션 시작 (POST) <br>
`/attendance/session/:courseId/end`로 출결 세션 종료 (POST)

### 3. 학생 - 출석 제출

서명한 출석 정보를 `/attendance/submit/:courseId`로 요청 (POST)

### 4. 교수 - 출석 검증

`/attendance/unverified/:courseId`로 미검증 로그 확인 (GET) <br>
`/attendance/verify/:courseId`로 스마트 컨트랙트와 연동하여 출결 로그 기록 및 유효성 업데이트 (POST)

---

## 프론트에서 백엔드로 전송해야 하는 JSON

### 회원가입

`POST /auth/register/student` 또는 `POST /auth/register/professor`

#### 프론트 요청

```json
{
  "loginid": "student001",
  "password": "pw1234",
  "name": "홍길동",
  "email": "hong@example.com",
  "walletAddress": "0xStudent1Wallet"
}
```

#### 백 응답

```json
{
  "success": true,
  "message": "student 회원가입 완료",
  "userId": 2
}
```

---

### 로그인

`POST /auth/login`

#### 프론트 요청

```json
{
  "loginid": "student001",
  "password": "pw1234"
}
```

#### 백 응답

```json
{
  "success": true,
  "message": "로그인 성공",
  "userId": 2,
  "role": "student"
}
```

---

### 교수 출석 세션 시작

`POST /attendance/session/:courseId/start`

#### 프론트 요청

```http
POST /attendance/session/1/start

body: {}
```

#### 백 응답

```json
{
  "success": true,
  "message": "출석 세션 시작됨"
}
```

---

### 교수 출석 세션 종료

`POST /attendance/session/:courseId/end`

#### 프론트 요청

```http
POST /attendance/session/1/end

body: {}
```

#### 백 응답

```json
{
  "success": true,
  "message": "출석 세션 종료됨"
}
```

---

### 학생 출석 제출

`POST /attendance/submit/:courseId`

#### 프론트 요청

```http
POST /attendance/submit/1
```

```json
{
  "studentId": 2,
  "attendance_time": "2025-06-08T09:05:00Z",
  "wallet_address": "0xStudent1Wallet",
  "signed_data": "0x서명된데이터"
}
```

#### 백 응답

```json
{
  "success": true,
  "logId": 21,
  "isTimeValid": true,
  "message": "출석이 정상적으로 기록되었습니다."
}
```

---

### 교수 - 미검증 출석 로그 조회

`GET /attendance/unverified/:courseId`

#### 백 응답

```json
[
  {
    "log_id": 21,
    "wallet_address": "0xStudent1Wallet",
    "signed_data": "0x...",
    "student_name": "홍길동",
    "attendance_time": "2025-06-08T09:05:00Z",
    "tx_hash": null,
    "is_time_valid": true
  }
]
```

---

### 교수 - 출석 검증

`POST /attendance/verify/:courseId`

#### 프론트 요청

```http
POST /attendance/verify/1

body: {}
```

#### 백 응답

```json
{
  "success": true,
  "verifiedLogs": [
    {
      "logId": 21,
      "txHash": "0xBlockchainTxHash"
    }
  ]
}
```

---

### 해당 과목 전체 로그 조회

`GET /attendance/:courseId`

#### 백 응답

```json
[
  {
    "log_id": 21,
    "student_id": 2,
    "wallet_address": "0xStudent1Wallet",
    "signed_data": "0x...",
    "studentName": "홍길동",
    "attendance_time": "2025-06-08T09:05:00Z",
    "tx_hash": "0xBlockchainTxHash",
    "is_valid": true,
    "is_time_valid": true
  }
]
```

---

### 학생 개인 로그 조회

`GET /attendance/:courseId/:studentId`

#### 백 응답

```json
[
  {
    "log_id": 21,
    "wallet_address": "0xStudent1Wallet",
    "signed_data": "0x...",
    "attendance_time": "2025-06-08T09:05:00Z",
    "tx_hash": "0x...",
    "is_valid": true,
    "is_time_valid": true
  }
]
```
