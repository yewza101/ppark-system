# Instructions

- Following Playwright test failed.
- Explain why, be concise, respect Playwright best practices.
- Provide a snippet of code with the fix, if possible.

# Test info

- Name: admin.spec.ts >> PPark-System Full E2E Tests >> Admin Full Flow: Create Student, Class, Enroll, and Bill
- Location: tests\admin.spec.ts:16:3

# Error details

```
Error: expect(locator).toBeVisible() failed

Locator: locator('text=จัดการนักเรียนในคลาส: Test Class 1783937988427')
Expected: visible
Timeout: 5000ms
Error: element(s) not found

Call log:
  - Expect "toBeVisible" with timeout 5000ms
  - waiting for locator('text=จัดการนักเรียนในคลาส: Test Class 1783937988427')

```

```yaml
- banner:
  - text: PastelTutor 👑 Admin Mode
  - navigation:
    - link "ตารางเรียน":
      - /url: /
    - link "ผู้ปกครอง":
      - /url: /parent
    - link "แผงควบคุมแอดมิน":
      - /url: /admin
    - button "ออกจากระบบ"
- main:
  - button "จัดการนักเรียน"
  - button "จัดการชั้นเรียน"
  - button "ระบบรายเดือน"
  - button "← กลับไปหน้าจัดการชั้นเรียน"
  - 'heading "นักเรียนในคลาส: Test Class 1783937988427" [level=2]'
  - paragraph: เพิ่มหรือลบนักเรียนที่จะเรียนในคลาสนี้ (ระบบจะนำรายชื่อไปสร้างฟอร์มเช็คชื่ออัตโนมัติ)
  - text: รายชื่อนักเรียน (0 คน)
  - list:
    - listitem: ยังไม่มีนักเรียนในคลาสนี้
  - heading "เพิ่มนักเรียนเข้าคลาส" [level=3]
  - text: เลือกนักเรียน
  - combobox:
    - option "-- กรุณาเลือก --" [selected]
    - option "Test Monthly Student 1783937988427"
    - option "Test Monthly Student 1783937923741"
    - option "Test Monthly Student 1783937713123"
    - option "Test Student E2E"
    - option "Test Student"
    - option "น้องเกรท ม.2"
    - option "น้องพีช แม่โจ้ ปี 3"
    - option "พี่มุกส์ ม.1"
    - option "น้องชะแกงค์"
  - text: รูปแบบการชำระ
  - combobox:
    - option "รายเดือน" [selected]
    - option "รายครั้ง"
  - text: ราคา (เฉพาะคลาสนี้)
  - spinbutton: "0"
  - button "เพิ่มเข้าคลาส" [disabled]
```

# Test source

```ts
  1   | import { test, expect } from '@playwright/test';
  2   | 
  3   | test.describe('PPark-System Full E2E Tests', () => {
  4   | 
  5   |   test.beforeEach(async ({ page }) => {
  6   |     await page.goto('/');
  7   |     page.on('dialog', async dialog => {
  8   |       if (dialog.type() === 'prompt') {
  9   |         await dialog.accept('admin123');
  10  |       } else if (dialog.type() === 'confirm') {
  11  |         await dialog.accept();
  12  |       }
  13  |     });
  14  |   });
  15  | 
  16  |   test('Admin Full Flow: Create Student, Class, Enroll, and Bill', async ({ page }) => {
  17  |     const studentName = 'Test Monthly Student ' + Date.now();
  18  |     const className = 'Test Class ' + Date.now();
  19  | 
  20  |     // 1. Login as Admin
  21  |     const logo = page.locator('text=PastelTutor');
  22  |     for (let i = 0; i < 5; i++) {
  23  |       await logo.click();
  24  |     }
  25  |     await expect(page.locator('h2:has-text("จัดการนักเรียน")')).toBeVisible();
  26  | 
  27  |     // 2. Create Student
  28  |     await page.click('button:has-text("+ เพิ่มนักเรียน")');
  29  |     await page.locator('input[type="text"]').first().fill(studentName);
  30  |     // Select monthly
  31  |     await page.locator('select').selectOption('monthly');
  32  |     // Set default amount
  33  |     await page.locator('input[type="number"]').fill('1500');
  34  |     // Set parent password
  35  |     await page.locator('input[placeholder="ตั้งรหัสผ่าน"]').fill('parent123');
  36  |     await page.click('button:has-text("บันทึก")');
  37  |     await expect(page.locator('tr', { hasText: studentName }).first()).toBeVisible();
  38  | 
  39  |     // 3. Create Class
  40  |     await page.click('button:has-text("จัดการชั้นเรียน")');
  41  |     await page.click('button:has-text("+ เพิ่มชั้นเรียน")');
  42  |     await page.locator('input[type="text"]').first().fill(className);
  43  |     await page.click('button:has-text("บันทึก")');
  44  |     await expect(page.locator('tr', { hasText: className }).first()).toBeVisible();
  45  | 
  46  |     // 4. Enroll Student
  47  |     const classRow = page.locator('tr', { hasText: className }).first();
  48  |     await classRow.locator('button[title="จัดการนักเรียนในคลาส"]').click();
> 49  |     await expect(page.locator(`text=จัดการนักเรียนในคลาส: ${className}`)).toBeVisible();
      |                                                                           ^ Error: expect(locator).toBeVisible() failed
  50  |     
  51  |     // Select student
  52  |     await page.locator('select').selectOption({ label: studentName });
  53  |     // Set custom enrollment amount
  54  |     await page.locator('input[type="number"]').fill('2000');
  55  |     await page.click('button:has-text("เพิ่มเข้าคลาส")');
  56  |     await expect(page.locator('li', { hasText: studentName }).first()).toBeVisible();
  57  | 
  58  |     // Close enrollment modal (Click the Back/Close button)
  59  |     await page.click('button:has-text("กลับไปหน้าคลาสเรียน")');
  60  | 
  61  |     // 5. Billing Calculation Check
  62  |     await page.click('button:has-text("ระบบรายเดือน")');
  63  |     // Find student row in billing
  64  |     const billingRow = page.locator('tr', { hasText: studentName }).first();
  65  |     // Verify amount is 2000 (from enrollment) instead of 1500
  66  |     await expect(billingRow.locator('td').nth(1)).toContainText('2000');
  67  |     
  68  |     // Generate Bill
  69  |     await billingRow.locator('button:has-text("สร้างบิลเดือนนี้")').click();
  70  |     
  71  |     // Wait for Generate Bill button to become "รับชำระเงิน"
  72  |     await expect(billingRow.locator('button:has-text("รับชำระเงิน")')).toBeVisible();
  73  | 
  74  |     // Mark as paid
  75  |     await billingRow.locator('button:has-text("รับชำระเงิน")').click();
  76  |     await expect(billingRow.locator('span:has-text("เสร็จสิ้น")')).toBeVisible();
  77  | 
  78  |     // 6. Parent Portal Login Check
  79  |     // Get the student name we created
  80  |     await page.goto('/parent/login');
  81  |     await page.locator('select').selectOption({ label: studentName });
  82  |     await page.fill('input[type="password"]', 'parent123');
  83  |     await page.click('button:has-text("เข้าสู่ระบบ")');
  84  |     await expect(page.locator('h1:has-text("ตารางเรียนของฉัน")')).toBeVisible();
  85  |     await expect(page.locator(`text=${className}`).first()).toBeVisible();
  86  | 
  87  |     // 7. Clean up
  88  |     // Back to admin
  89  |     await page.goto('/');
  90  |     const logo2 = page.locator('text=PastelTutor');
  91  |     for (let i = 0; i < 5; i++) {
  92  |       await logo2.click();
  93  |     }
  94  |     
  95  |     // Delete Class
  96  |     await page.click('button:has-text("จัดการชั้นเรียน")');
  97  |     await classRow.locator('button[title="ลบคลาส"]').click();
  98  |     await expect(classRow).not.toBeVisible();
  99  | 
  100 |     // Delete Student
  101 |     await page.click('button:has-text("จัดการนักเรียน")');
  102 |     const studentRow = page.locator('tr', { hasText: studentName }).first();
  103 |     await studentRow.locator('button[title="ลบ"]').click();
  104 |     await expect(studentRow).not.toBeVisible();
  105 |   });
  106 | });
  107 | 
```