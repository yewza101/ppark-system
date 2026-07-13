# Prompt สำหรับสร้างแอประบบจัดการตารางเรียน เช็คชื่อ และเก็บเงินนักเรียน

คัดลอกทั้งหมดนี้ไปวางใน Claude Code (หรือ IDE agent อื่น ๆ) เพื่อเริ่มสร้างโปรเจกต์

---

## 1. ภาพรวมโปรเจกต์

สร้างเว็บแอปพลิเคชันสำหรับติวเตอร์/สอนพิเศษ ที่ใช้จัดการ:
1. ตารางสอน (แสดงผลสวยงาม ธีมพาสเทล)
2. เช็คชื่อนักเรียนเข้าเรียนแต่ละคาบ
3. คิดเงินนักเรียน 2 แบบ คือ รายเดือน และ รายครั้ง
4. ระบบแอดมิน (ซ่อนอยู่หลังโลโก้) สำหรับจัดการข้อมูลทั้งหมด
5. ระบบผู้ปกครอง สำหรับดูยอดค้างชำระ ประวัติ และส่งฟีดแบคถึงครู

ภาษา UI: ภาษาไทยทั้งหมด

---

## 2. Tech Stack

- **Frontend:** React + Vite + Tailwind CSS → deploy บน **Vercel**
- **Backend API:** Node.js + Express → deploy บน **Render**
- **Database:** Supabase (PostgreSQL) — ใช้ผ่าน Supabase client หรือผ่าน backend API (เลือก backend เป็นตัวคุยกับ Supabase โดยตรง ฝั่ง frontend ไม่เก็บ service key)
- **Auth:**
  - แอดมิน: กดโลโก้ 5 ครั้งติดกัน (ภายใน 3 วินาที) → เปิด modal ใส่รหัสผ่านแอดมิน (เก็บ hash ไว้ในฐานข้อมูลหรือ env variable)
  - ผู้ปกครอง: เลือกชื่อนักเรียนจาก dropdown + ใส่รหัสผ่านเฉพาะของนักเรียนคนนั้น (เก็บใน ตาราง students แบบ hashed)
- **State/Data fetching:** React Query (TanStack Query) แนะนำให้ใช้ เพื่อจัดการ cache และ refetch

---

## 3. Database Schema (Supabase / PostgreSQL)

```sql
-- ตารางนักเรียน
create table students (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  billing_type text not null check (billing_type in ('monthly', 'per_session')), -- ค่าเริ่มต้น ใช้ตอนสร้าง enrollment ใหม่
  default_amount numeric(10,2) not null default 0,
  parent_password_hash text, -- รหัสผ่านสำหรับผู้ปกครอง
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ตารางชั้นเรียน/ห้องเรียน (เป็น "แม่แบบ" ตารางประจำสัปดาห์)
create table classes (
  id uuid primary key default gen_random_uuid(),
  name text not null,               -- ชื่อห้อง/วิชา
  day_of_week int not null check (day_of_week between 0 and 6), -- 0=อาทิตย์ ... 6=เสาร์
  start_time time not null,
  end_time time not null,
  location text not null check (location in ('online', 'onsite')),
  color text not null default '#FDE2E4', -- สีพาสเทล เก็บเป็น hex
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ตารางลงทะเบียนนักเรียนเข้าชั้นเรียน (many-to-many + billing override ต่อคน/ต่อคลาส)
create table class_enrollments (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  billing_type text not null check (billing_type in ('monthly', 'per_session')), -- override ได้ต่างจาก default ของนักเรียน
  amount numeric(10,2) not null,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  unique (class_id, student_id)
);

-- ตารางคาบเรียนที่เกิดขึ้นจริงแต่ละวัน (เกิดจาก classes ตามวันจริง)
create table class_sessions (
  id uuid primary key default gen_random_uuid(),
  class_id uuid not null references classes(id) on delete cascade,
  session_date date not null,
  is_completed boolean not null default false,
  created_at timestamptz not null default now(),
  unique (class_id, session_date)
);

-- ตารางเช็คชื่อ + การคิดเงินรายครั้ง
create table attendance (
  id uuid primary key default gen_random_uuid(),
  session_id uuid not null references class_sessions(id) on delete cascade,
  student_id uuid not null references students(id) on delete cascade,
  present boolean not null default false,
  charged boolean not null default false,   -- true เมื่อคิดเงินรายครั้งไปแล้วสำหรับคาบนี้
  amount_charged numeric(10,2) default 0,
  created_at timestamptz not null default now(),
  unique (session_id, student_id)
);

-- ตารางบิลรายเดือน
create table monthly_bills (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  class_id uuid references classes(id) on delete set null,
  billing_month date not null, -- เก็บเป็นวันที่ 1 ของเดือนนั้น เช่น 2026-07-01
  amount numeric(10,2) not null,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (student_id, class_id, billing_month)
);

-- ตารางชำระเงินรายครั้ง (ผูกกับ attendance ที่ charged = true) — ใช้ track ว่าจ่ายแล้วหรือยัง
create table session_payments (
  id uuid primary key default gen_random_uuid(),
  attendance_id uuid not null references attendance(id) on delete cascade,
  is_paid boolean not null default false,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  unique (attendance_id)
);

-- ตารางฟีดแบคจากผู้ปกครองถึงครู
create table feedback (
  id uuid primary key default gen_random_uuid(),
  student_id uuid not null references students(id) on delete cascade,
  message text not null,
  created_at timestamptz not null default now()
);
```

> หมายเหตุ: เปิด Row Level Security (RLS) ใน Supabase แต่ให้ backend (Render) ใช้ service role key เรียก Supabase เอง ฝั่ง frontend ไม่เชื่อมต่อ Supabase โดยตรง เพื่อไม่ให้ต้อง expose key ใด ๆ ให้ browser

---

## 4. Backend API (Express) — Endpoints ที่ต้องมี

### Public (ไม่ต้อง auth)
- `GET /api/schedule` — คืนตารางสอนทั้งหมด (สำหรับหน้าแรก)
- `GET /api/students/names` — คืนรายชื่อนักเรียนทั้งหมด (สำหรับ dropdown เลือกชื่อในหน้าผู้ปกครอง — คืนแค่ id + name ไม่คืนข้อมูลการเงิน)

### Parent auth
- `POST /api/parent/login` — body: `{ student_id, password }` → คืน token/session สั้น ๆ (JWT อายุสั้น)
- `GET /api/parent/summary` (ต้องมี token) — คืนยอดค้างชำระ, จำนวนครั้งที่เรียนไปแล้ว, ประวัติจ่าย/ค้างจ่าย
- `POST /api/parent/feedback` (ต้องมี token) — ส่งฟีดแบคถึงครู

### Admin auth
- `POST /api/admin/login` — body: `{ password }` → คืน admin token (JWT)
- ทุก endpoint ด้านล่างต้องแนบ admin token

### Admin — จัดการนักเรียน
- `GET /api/admin/students`
- `POST /api/admin/students` — เพิ่มนักเรียน (ชื่อ, billing_type, default_amount, parent_password)
- `PATCH /api/admin/students/:id` — แก้ไขชื่อ/จำนวนเงิน/รหัสผ่าน/สถานะ
- `DELETE /api/admin/students/:id`

### Admin — จัดการชั้นเรียน
- `GET /api/admin/classes`
- `POST /api/admin/classes` — เพิ่มชั้นเรียน (ชื่อ, วัน, เวลา, สถานที่, สี)
- `PATCH /api/admin/classes/:id`
- `DELETE /api/admin/classes/:id`
- `POST /api/admin/classes/:id/enroll` — เพิ่มนักเรียนเข้าชั้นเรียน (student_id, billing_type, amount)
- `PATCH /api/admin/enrollments/:id` — แก้ไข billing_type/amount ของนักเรียนในชั้นนั้น
- `DELETE /api/admin/enrollments/:id` — ดึงนักเรียนออกจากชั้นเรียน

### Attendance / เช็คชื่อ
- `GET /api/sessions/:class_id/:date` — ดึง (หรือสร้างถ้ายังไม่มี) session ของวันนั้น พร้อมรายชื่อนักเรียนและสถานะเช็คชื่อ
- `POST /api/sessions/:session_id/attendance` — body: รายการ `{ student_id, present }[]` — บันทึกการเช็คชื่อ
  - Logic: ถ้า enrollment ของนักเรียนคนนั้นเป็น `per_session` และ `present = true` และยังไม่เคย charged สำหรับ session นี้ → สร้าง/อัปเดต attendance.charged = true, amount_charged = enrollment.amount และสร้าง row ใน session_payments (is_paid = false)
  - ถ้าเป็น `monthly` → บันทึกแค่ present/absent ไม่สร้างรายการเงิน

### ระบบรายเดือน
- `GET /api/admin/monthly-billing?from=YYYY-MM&to=YYYY-MM` — คืนสรุปนักเรียนรายเดือนในช่วงเดือนที่เลือก: ยอดที่คิดแล้ว, ยอดที่ยังไม่คิด, สถานะจ่าย/ค้างจ่าย
- `POST /api/admin/monthly-billing` — สร้าง/อัปเดตบิลของเดือนนั้น (amount, is_paid)
- `PATCH /api/admin/monthly-billing/:id/mark-paid`

### Session payments (รายครั้ง)
- `PATCH /api/admin/session-payments/:id/mark-paid`

---

## 5. หน้าจอ (Pages) และ UX ที่ต้องสร้าง

### 5.1 หน้าหลัก (Home) — ตารางสอน
- แสดงตารางเวลาแนวตั้ง/แนวนอน ตั้งแต่ **06:00 – 23:00**
- แต่ละ block แสดง: ชื่อห้อง/วิชา, เวลาเริ่ม-จบ, สถานที่ (ไอคอนออนไลน์/ที่เรียนพิเศษ), สีพื้นหลังตามที่แอดมินตั้งไว้ (พาสเทล)
- ธีมสีรวมของแอปเป็นโทนพาสเทล (เช่น พื้นหลังขาวครีม, การ์ดสีพาสเทลหลายเฉด, ตัวอักษรสีเข้มอ่านง่าย)
- คลิกที่ block ตารางสอน → ไปหน้าเช็คชื่อของคาบนั้น (ของ "วันนี้" เป็นค่าเริ่มต้น เผื่อ backdate ได้ด้วย date picker)
- โลโก้แอปอยู่มุมบนซ้าย/กลาง — กดติดกัน 5 ครั้งภายใน 3 วินาที → เปิด modal ใส่รหัสแอดมิน
- มีปุ่ม "ผู้ปกครอง" แยกต่างหาก มองเห็นได้ปกติ (ไม่ต้องซ่อน)

### 5.2 หน้าเช็คชื่อ (Attendance)
- แสดงรายชื่อนักเรียนทั้งหมดในคลาสนั้น พร้อม checkbox/toggle มา-ไม่มา
- ปุ่ม "บันทึก"
- ถ้านักเรียนคนไหนเป็นแบบรายครั้งและถูกติ๊กว่ามา → ระบบเพิ่มยอดเงินให้อัตโนมัติ (แสดง toast แจ้งว่า "เพิ่มยอด XXX บาท ให้ [ชื่อ] แล้ว")
- ถ้าเป็นรายเดือน → ติ๊กมา/ไม่มาเฉย ๆ ไม่มีการคิดเงิน

### 5.3 หน้าแอดมิน (Admin Dashboard) — เข้าได้หลังใส่รหัสถูก
แบ่งเป็น tab/section:
- **จัดการนักเรียน**: ตารางรายชื่อ, เพิ่ม/แก้ไข/ลบ, ตั้งรายเดือน-รายครั้งและจำนวนเงิน, ตั้ง/เปลี่ยนรหัสผ่านผู้ปกครอง
- **จัดการชั้นเรียน**: เพิ่ม/แก้ไข/ลบชั้นเรียน (วัน, เวลา, สถานที่, สี), ดึงนักเรียนเข้า/ออกจากชั้นเรียน, ตั้ง billing_type/amount เฉพาะของนักเรียนคนนั้นในคลาสนั้น (override ได้)
- **ระบบรายเดือน**: เลือกช่วงเดือนที่ต้องการแสดง (from-to), แสดงตารางนักเรียนรายเดือน พร้อมยอดคิดแล้ว/ยังไม่คิด/จ่ายแล้ว/ค้างจ่าย, ปุ่ม mark ว่าจ่ายแล้ว
- ทุกจุดในระบบแอดมินแก้ไขได้หมด (ชื่อนักเรียน, จำนวนเงิน, รายชื่อในคลาส ฯลฯ)

### 5.4 หน้าผู้ปกครอง (Parent Portal)
- กดปุ่ม "ผู้ปกครอง" จากหน้าแรก
- เลือกชื่อนักเรียนจาก dropdown + กรอกรหัสผ่าน
- หลัง login เห็น:
  - สถานะปัจจุบัน: ค้างชำระอยู่หรือไม่ (และยอดรวมที่ค้าง)
  - จำนวนครั้งที่เรียนไปแล้ว (นับจาก attendance ที่ present = true)
  - ประวัติ: รายการจ่ายแล้ว/ยังไม่จ่าย แยกเป็นรายครั้ง/รายเดือน พร้อมวันที่และจำนวนเงิน
  - ฟอร์มพิมพ์ฟีดแบคถึงครู (textarea + ปุ่มส่ง)

---

## 6. Business Logic สำคัญที่ต้องระวัง

1. **การสร้าง session รายวันจาก classes**: เมื่อมีคนเปิดหน้าเช็คชื่อของคลาสในวันที่ยังไม่มี session ให้ backend auto-create แถวใน `class_sessions` สำหรับวันนั้น (ตรวจ day_of_week ให้ตรงกับวันที่จริงก่อน หรือ allow ทุกวันแล้วแต่การใช้งานจริง)
2. **Billing type อยู่ที่ระดับ enrollment ไม่ใช่ student อย่างเดียว**: นักเรียนคนเดียวอาจเรียนหลายคลาส บางคลาสรายเดือน บางคลาสรายครั้งได้ — ใช้ `class_enrollments.billing_type/amount` เป็นค่าจริงที่ใช้คำนวณ ส่วน `students.billing_type/default_amount` เป็นแค่ค่า default ตอนเพิ่มนักเรียนใหม่
3. **กันคิดเงินซ้ำ**: ก่อนสร้าง attendance.charged ให้เช็คว่า session+student นั้นเคย charged แล้วหรือยัง (unique constraint ช่วยได้ระดับ DB แต่ backend ต้อง handle upsert ให้ถูก)
4. **เดือนที่แสดงในระบบรายเดือน**: ต้องเลือกช่วง from-to ได้ (เช่น ก.ค. 2569 – ก.ย. 2569) แล้ว query `monthly_bills` ในช่วงนั้น
5. **รหัสผ่านผู้ปกครอง**: เก็บแบบ hash (bcrypt) ห้ามเก็บ plain text
6. **Time zone**: ใช้ Asia/Bangkok ตลอดทั้งระบบ (ทั้งการคำนวณวันที่ของ session และการแสดงเวลา)

---

## 7. Design Guidelines

- ธีมสีพาสเทลทั้งแอป เช่น ชมพูอ่อน, ฟ้าอ่อน, เหลืองอ่อน, เขียวมิ้นต์, ม่วงลาเวนเดอร์ — ให้แอดมินเลือกสีของแต่ละคลาสได้จาก color picker (เก็บเป็น hex)
- ฟอนต์ไทยอ่านง่าย (เช่น Noto Sans Thai หรือ Prompt จาก Google Fonts)
- Mobile-first: ต้องใช้งานสะดวกบนมือถือ เพราะแอดมิน/ผู้ปกครองน่าจะเปิดผ่านมือถือเป็นหลัก
- Responsive ตารางสอน: บนมือถือให้แสดงเป็น list แนวตั้งของวันนั้น ๆ พร้อมสลับดูวันอื่นได้ (ไม่ต้องยัดตารางเต็มสัปดาห์ในจอเล็ก)

---

## 8. Deployment

- **Supabase**: สร้างโปรเจกต์ใหม่ รัน SQL schema ด้านบน, เก็บ connection string/service role key ไว้ใน environment variables ของ backend เท่านั้น
- **Backend (Render)**:
  - Web Service ประเภท Node
  - ตั้ง env vars: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `ADMIN_PASSWORD_HASH`, `JWT_SECRET`
  - เปิด CORS ให้เฉพาะ domain ของ frontend บน Vercel
- **Frontend (Vercel)**:
  - ตั้ง env var `VITE_API_BASE_URL` ชี้ไปที่ backend บน Render
  - Build command: `vite build`, output: `dist`

---

## 9. ลำดับการพัฒนาแนะนำ (สำหรับ agent)

1. Setup โปรเจกต์ (frontend + backend), ต่อ Supabase, รัน schema
2. Backend: auth (admin + parent) และ CRUD นักเรียน/ชั้นเรียน/enrollment ก่อน
3. Backend: attendance + billing logic (รายครั้ง + รายเดือน)
4. Frontend: หน้าแรก (ตารางสอน) + หน้าเช็คชื่อ
5. Frontend: หน้าแอดมิน (ครบทุก CRUD)
6. Frontend: หน้าผู้ปกครอง
7. ทดสอบ flow ทั้งหมดแบบ end-to-end แล้วค่อย deploy จริง
