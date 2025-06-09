### 회원가입

| 메서드 | 경로                     | 설명                                             |
| ------ | ------------------------ | ------------------------------------------------ |
| `POST` | `/register/student`      | 학생 등록                                        |
| `POST` | `/register/professor`    | 교수 등록                                        |
| `POST` | `/register/admin`        | 관리자 등록                                      |
| `POST` | `/login`                 | 로그인                                           |
| `GET`  | `/users/:userId`         | 유저 정보 조회                                   |
| `GET`  | `/users/:userId/courses` | 수강 또는 담당 과목 조회 (role에 따라 응답 다름) |

### 과목

| 메서드 | 경로                 | 설명                  |
| ------ | -------------------- | --------------------- |
| `POST` | `/courses`           | 새 과목 생성 (교수만) |
| `GET`  | `/courses`           | 전체 과목 리스트      |
| `GET`  | `/courses/:courseId` | 특정 과목 상세        |

### 시간표

| 메서드 | 경로                          | 설명        |
| ------ | ----------------------------- | ----------- |
| `POST` | `/courses/:courseId/schedule` | 시간표 추가 |
| `GET`  | `/courses/:courseId/schedule` | 시간표 조회 |

### 수강신청

| 메서드 | 경로                 | 설명                                        |
| ------ | -------------------- | ------------------------------------------- |
| `POST` | `/enroll`            | 수강 신청 (`body`: `courseId`, `studentId`) |
| `GET`  | `/enroll/:studentId` | 특정 학생의 수강 과목 목록                  |

### 출결

| 메서드 | 경로                               | 설명                                                                      | 권한                                    |
| ------ | ---------------------------------- | ------------------------------------------------------------------------- | --------------------------------------- |
| `POST` | `/attendance`                      | 학생이 출석 제출<br>`body`: `courseId`, `attendance_time`, `signature` 등 | `student`                               |
| `GET`  | `/attendance/unverified/:courseId` | 해당 과목의 미검증 출석 목록 조회                                         | `professor`                             |
| `POST` | `/attendance/verify`               | 출석 로그를 스마트컨트랙트에 기록 및 검증<br>`body`: `logId`              | `professor`                             |
| `GET`  | `/attendance/:courseId`            | 과목 전체 출석 로그 조회                                                  | `student`, `professor`                  |
| `GET`  | `/attendance/:courseId/:studentId` | 특정 학생의 과목별 출석 로그 조회<br>(본인 또는 교수만 가능)              | `student`, `professor`<br>(본인만 가능) |
