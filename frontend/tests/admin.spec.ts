import { test, expect } from '@playwright/test';

test.describe('PPark-System Full E2E Tests', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/');
    page.on('dialog', async dialog => {
      if (dialog.type() === 'prompt') {
        await dialog.accept('admin123');
      } else if (dialog.type() === 'confirm') {
        await dialog.accept();
      }
    });
  });

  test('Admin Full Flow: Create Student, Class, Enroll, and Bill', async ({ page }) => {
    const studentName = 'Test Monthly Student ' + Date.now();
    const className = 'Test Class ' + Date.now();

    // 1. Login as Admin
    const logo = page.locator('text=PastelTutor');
    for (let i = 0; i < 5; i++) {
      await logo.click();
    }
    await expect(page.locator('h2:has-text("จัดการนักเรียน")')).toBeVisible();

    // 2. Create Student
    await page.click('button:has-text("+ เพิ่มนักเรียน")');
    await page.locator('input[type="text"]').first().fill(studentName);
    // Select monthly
    await page.locator('select').selectOption('monthly');
    // Set default amount
    await page.locator('input[type="number"]').fill('1500');
    // Set parent password
    await page.locator('input[placeholder="ตั้งรหัสผ่าน"]').fill('parent123');
    await page.click('button:has-text("บันทึก")');
    await expect(page.locator('tr', { hasText: studentName }).first()).toBeVisible();

    // 3. Create Class
    await page.click('button:has-text("จัดการชั้นเรียน")');
    await page.click('button:has-text("+ เพิ่มชั้นเรียน")');
    await page.locator('input[type="text"]').first().fill(className);
    await page.click('button:has-text("บันทึก")');
    await expect(page.locator('tr', { hasText: className }).first()).toBeVisible();

    // 4. Enroll Student
    const classRow = page.locator('tr', { hasText: className }).first();
    await classRow.locator('button[title="จัดการนักเรียนในคลาส"]').click();
    await expect(page.locator(`text=นักเรียนในคลาส: ${className}`)).toBeVisible();
    
    // Select student
    await page.locator('select').selectOption({ label: studentName });
    // Set custom enrollment amount
    await page.locator('input[type="number"]').fill('2000');
    await page.click('button:has-text("เพิ่มเข้าคลาส")');
    await expect(page.locator('li', { hasText: studentName }).first()).toBeVisible();

    // Close enrollment modal (Click the Back/Close button)
    await page.click('button:has-text("กลับไปหน้าจัดการชั้นเรียน")');

    // 5. Billing Calculation Check
    await page.click('button:has-text("ระบบรายเดือน")');
    // Find student row in billing
    const billingRow = page.locator('tr', { hasText: studentName }).first();
    // Verify amount is 2000 (from enrollment) instead of 1500
    await expect(billingRow.locator('td').nth(1)).toContainText('2000');
    
    // Generate Bill
    await billingRow.locator('button:has-text("สร้างบิลเดือนนี้")').click();
    
    // Wait for Generate Bill button to become "รับชำระเงิน"
    await expect(billingRow.locator('button:has-text("รับชำระเงิน")')).toBeVisible();

    // Mark as paid
    await billingRow.locator('button:has-text("รับชำระเงิน")').click();
    await expect(billingRow.locator('span:has-text("เสร็จสิ้น")')).toBeVisible();

    // 6. Parent Portal Login Check
    // Get the student name we created
    await page.goto('/parent/login');
    await page.locator('select').selectOption({ label: studentName });
    await page.fill('input[type="password"]', 'parent123');
    await page.click('button:has-text("เข้าสู่ระบบ")');
    await expect(page.locator('h1:has-text("ตารางเรียนของฉัน")')).toBeVisible();
    await expect(page.locator(`text=${className}`).first()).toBeVisible();

    // 7. Clean up
    // Back to admin
    await page.goto('/');
    const logo2 = page.locator('text=PastelTutor');
    for (let i = 0; i < 5; i++) {
      await logo2.click();
    }
    
    // Delete Class
    await page.click('button:has-text("จัดการชั้นเรียน")');
    await classRow.locator('button[title="ลบคลาส"]').click();
    await expect(classRow).not.toBeVisible();

    // Delete Student
    await page.click('button:has-text("จัดการนักเรียน")');
    const studentRow = page.locator('tr', { hasText: studentName }).first();
    await studentRow.locator('button[title="ลบ"]').click();
    await expect(studentRow).not.toBeVisible();
  });
});
