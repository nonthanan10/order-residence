# Order Residence — Self Check-in Prototype

โปรเจกต์นี้เชื่อมต่อ **Supabase** แล้ว และพร้อม deploy ขึ้น **Netlify**

## ข้อมูล Supabase
- Project URL: `https://bpwuahacuymlycszlzuz.supabase.co`
- ตาราง: `settings`, `rooms`, `bookings`, `invoice_requests`

## วิธีรันในเครื่อง

```bash
cd order-residence
npm install
npm run dev
```

เปิด http://localhost:5173

## Deploy ขึ้น Netlify

1. Push โฟลเดอร์นี้ขึ้น GitHub
2. ไปที่ Netlify → Add new site → Import from Git
3. Build settings จะอ่านจาก `netlify.toml` อัตโนมัติ
4. Deploy

## ทดสอบหลัง Deploy
1. เปิดหน้าเว็บ
2. ไป Admin (ไอคอนเฟือง) → ใส่ PIN `2569`
3. เปลี่ยนราคาห้อง → กด Save
4. รีเฟรชหน้า → ราคาควรยังอยู่
5. ลองจองห้อง → ไปดูใน Admin → Bookings
