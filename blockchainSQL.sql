CREATE DATABASE attendance_blockchain CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
drop database attendance_blockchain;
use attendance_blockchain;

-- 사용자 테이블: 학생, 교수, 관리자 정보를 저장
create table users (
    user_id int auto_increment primary key,                    -- 고유 사용자 ID (기본키)
    loginid varchar(50) not null unique,                       -- 로그인 ID (중복 불가)
    hashed_pw varchar(255) not null,                           -- 비밀번호 해시
    name varchar(100) not null,                                -- 사용자 이름
    role enum('student', 'professor', 'admin') not null,       -- 사용자 역할
    wallet_address varchar(255) unique,                        -- 블록체인 지갑 주소 (중복 불가)
    email varchar(100)                                         -- 이메일 (옵션)
);

select * from users;

-- 과목 테이블: 강의 정보 저장
create table courses (
    course_id int auto_increment primary key,                  -- 과목 ID (기본키)
    course_name varchar(255) not null,                         -- 과목 이름
    professor_id int not null,                                 -- 담당 교수의 사용자 ID
    semester varchar(20) not null,                             -- 학기
    foreign key (professor_id) references users(user_id)	   -- user 참조
		on delete cascade  									   -- 교수 삭제 시 과목도 삭제
);

-- 과목 시간표 테이블
create table course_schedule (
    schedule_id int auto_increment primary key,                -- 시간표 ID (기본키)
    course_id int not null,                                    -- 해당 과목 ID
    weekday tinyint not null,                                  -- 요일 (1:월 ~ 7:일)
    start_time time not null,                                  -- 수업 시작 시간
    end_time time not null,                                    -- 수업 종료 시간
    location varchar(100),                                     -- 강의실 위치
    foreign key (course_id) references courses(course_id)      -- 과목 참조
        on delete cascade
);

-- 수강 신청 테이블: 학생이 어떤 과목을 수강 중인지 저장
create table enrollments (
    enrollment_id int auto_increment primary key,              -- 수강 신청 ID (기본키)
    course_id int not null,                                    -- 수강 과목 ID
    student_id int not null,                                   -- 수강 학생 ID
    status enum('enrolled', 'dropped') default 'enrolled',     -- 수강 상태 (등록 or 취소)
    foreign key (course_id) references courses(course_id) 
        on delete cascade,
    foreign key (student_id) references users(user_id) 
        on delete cascade,
    unique (course_id, student_id)                             -- 중복 수강 신청 방지
);

CREATE TABLE attendance_sessions (
  session_id INT AUTO_INCREMENT PRIMARY KEY,
  course_id INT NOT NULL,
  lecture_date DATE NOT NULL,
  started_at DATETIME NOT NULL,
  ended_at DATETIME DEFAULT NULL,
  created_by INT NOT NULL,  -- 교수 user_id
  FOREIGN KEY (course_id) REFERENCES courses(course_id)
);

-- 출결 기록 테이블: 블록체인 트랜잭션과 연동된 출석 로그
create table attendance_logs (
    log_id int auto_increment primary key,                     -- 출결 로그 ID
    student_id int not null,                                   -- 출석한 학생 ID
    wallet_address VARCHAR(255) NOT NULL,                      -- 학생 지갑 주소
    signed_data TEXT NOT NULL,                                 -- 서명한 데이터
    course_id int not null,                                    -- 해당 과목 ID
    session_id int,											   -- 출석 세션 ID
    attendance_time datetime not null,                         -- 출석 시간
    is_time_valid boolean default null,						   -- 지각 여부 확인
    tx_hash varchar(255) null,                                 -- 블록체인 트랜잭션 해시
    is_valid boolean default true,                             -- 출석 유효성 여부
    chain_verified boolean default false,                      -- 블록체인 기록 여부
    verified_at datetime,                                      -- 출석 검증한 시간
    foreign key (student_id) references users(user_id) 
        on delete cascade,
    foreign key (course_id) references courses(course_id) 
        on delete cascade,
	foreign key (session_id) references attendance_sessions(session_id)
		on delete cascade
);  

select * from attendance_sessions;
select * from attendance_logs;
delete from attendance_sessions;
delete from attendance_logs;
drop table attendance_logs;

INSERT INTO courses (course_name, professor_id, semester)
VALUES ('블록체인개론', 1, '2025-1학기');

-- 월요일 오전 9시 강의 (요일: 1, 시간: 09:00~10:15)
INSERT INTO course_schedule (course_id, weekday, start_time, end_time, location)
VALUES (1, 1, '09:00:00', '10:15:00', 'IT관 101호');

INSERT INTO enrollments (course_id, student_id)
VALUES (1, 1);
INSERT INTO enrollments (course_id, student_id)
VALUES (1, 2);

select * from attendance_logs;