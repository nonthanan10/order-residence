import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  Search, Calendar, Users, MapPin, Check, ChevronRight, ChevronLeft, ChevronDown,
  ShieldCheck, KeyRound, DoorOpen, Wifi,
  Coffee, Sparkles, Receipt, Star, Bell, Clock, LogOut, QrCode,
  BedDouble, Bath, Plus, Minus, X, Loader2, Settings, Lock,
  Upload, Paperclip, Phone, LayoutList, Wallet, Building2, Tv, MessageCircle, FileText, Printer, Scissors, Gift
} from "lucide-react";
import { supabase } from "./lib/supabase";

/* ------------------------------------------------------------------
DESIGN TOKENS
This environment does not compile Tailwind's arbitrary bracket values
(bg-[#hex], h-[780px], rounded-[2.2rem], scale-[0.98], tracking-[0.15em]…)
so every custom color and custom size below is applied with inline
style objects instead. Tailwind classNames are used only for layout
utilities that ship as core classes (flex, gap, p-*, rounded-xl, text-sm…).

Color   ink #10161B · tealDark #0E4A45 · teal #16665F
        brass #8C6B3E (buttons / brand name) · brassLight #B08D57
        brassPale #D9BE8D · brassBg #FBF3E4 · paper #F3F6F5
        paperBorder #E8EDEB · success #2F8F6B · coral #D9542F
        textMuted #5B6B67 · textFaint #9AA6A3 · tealPale #D9F0EA
Type    Display: "Fraunces" · Body/UI: "Inter" · Codes: "IBM Plex Mono"
------------------------------------------------------------------- */

const c = {
  ink: "#10161B",
  tealDark: "#0E4A45",
  teal: "#16665F",
  brass: "#8C6B3E",
  brassHover: "#75592F",
  brassLight: "#B08D57",
  brassPale: "#D9BE8D",
  brassBg: "#FBF3E4",
  paper: "#F3F6F5",
  paperBorder: "#E8EDEB",
  success: "#2F8F6B",
  coral: "#D9542F",
  textMuted: "#5B6B67",
  textFaint: "#9AA6A3",
  tealPale: "#D9F0EA",
  white: "#FFFFFF",
  disabledBg: "#E8EDEB",
  disabledText: "#9AA6A3",
};

const FONT_LINK = "https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400;9..144,500;9..144,600&family=Inter:wght@400;500;600;700&family=IBM+Plex+Mono:wght@500;600&display=swap";

function useFonts() {
  useEffect(() => {
    if (document.getElementById("hotel-proto-fonts")) return;
    const link = document.createElement("link");
    link.id = "hotel-proto-fonts";
    link.rel = "stylesheet";
    link.href = FONT_LINK;
    document.head.appendChild(link);
  }, []);
}

const HOTEL_NAME = "Order Residence";
const HOTEL_ACCOUNT_NAME = "น.ส. สุพัตรา กิจตระกูล";
const STAFF_CONTACT_URL = "https://lin.ee/NMroa4F";
const POINTS_URL = "https://lin.ee/7TRA293";
const HOTEL_ROOM_COUNT = 13;
const HOTEL_MAP_URL = "https://maps.app.goo.gl/qj3EGjNvLboEqRz39?g_st=ic";
const SETTINGS_KEY = "order-residence-settings";
const BOOKINGS_KEY = "order-residence-bookings";
const ROOMS_KEY = "order-residence-rooms";
const INVOICE_REQUESTS_KEY = "order-residence-invoice-requests";
const LANG_KEY = "order-residence-lang";
const ADMIN_PIN = "2569";
const DEFAULT_SETTINGS = { price: 590, taxRate: 7, roomImage: "", lockboxCode: "", minibarItems: null, invoiceInfo: null, adminPin: null, houseRules: null };
const DEFAULT_HOUSE_RULES = [
  { id: "no-smoking", title: "ห้ามสูบบุหรี่ภายในห้อง", description: "หากพบร่องรอยการสูบบุหรี่ในห้อง โรงแรมขอสงวนสิทธิ์เรียกเก็บค่าทำความสะอาดเพิ่มเติม", image: "" },
];
const DEFAULT_INVOICE_INFO = { companyName: "Order Residence Co., Ltd.", taxId: "", address: "", logoImage: "" };
const ADDON_PRICE = 100;
const MINIBAR_CATALOG = [
  { id: "crab", name: "ขนมปูไทย", price: 25 },
  { id: "kohkae", name: "ขนมคอยเนย์", price: 25 },
  { id: "lays", name: "เลย์", price: 25 },
  { id: "kitkat", name: "Kitkat", price: 20 },
  { id: "coke", name: "Coke", price: 25 },
  { id: "sprite", name: "Sprite", price: 25 },
  { id: "sponsor", name: "Sponsor", price: 25 },
  { id: "ichitan", name: "อิชิตัน", price: 25 },
];

const ROOM_NUMBERS = [
  { number: "D1", floor: 1, noExtraBed: false }, { number: "D2", floor: 1, noExtraBed: false }, { number: "D3", floor: 1, noExtraBed: false },
  { number: "D4", floor: 1, noExtraBed: false }, { number: "D5", floor: 1, noExtraBed: false }, { number: "D6", floor: 1, noExtraBed: false },
  { number: "E1", floor: 2, noExtraBed: false }, { number: "E2", floor: 2, noExtraBed: false }, { number: "E3", floor: 2, noExtraBed: false },
  { number: "E4", floor: 2, noExtraBed: false }, { number: "E5", floor: 2, noExtraBed: false }, { number: "E6", floor: 2, noExtraBed: true }, { number: "E7", floor: 2, noExtraBed: false },
];

function buildDefaultRooms() {
  return ROOM_NUMBERS.map(r => ({
    number: r.number,
    floor: r.floor,
    noExtraBed: r.noExtraBed,
    status: "ready", // "ready" | "pending" | "occupied" | "checkout" | "cleaning"
    guestName: "",
    phone: "",
    checkIn: "",
    checkOut: "",
    code: "",
    hasExtraBed: false,
  }));
}

/* ------------------------------------------------------------------
SUPABASE STORAGE LAYER
Data is persisted in Supabase (project: order-residence)
------------------------------------------------------------------- */

async function storageGet(key, shared = true) {
  try {
    if (key === SETTINGS_KEY) {
      const { data, error } = await supabase
        .from("settings")
        .select("data")
        .eq("id", "default")
        .single();
      if (error || !data) return null;
      return { key, value: JSON.stringify(data.data), shared };
    }

    if (key === ROOMS_KEY) {
      const { data, error } = await supabase
        .from("rooms")
        .select("data")
        .eq("id", "default")
        .single();
      if (error || !data) return null;
      return { key, value: JSON.stringify(data.data), shared };
    }

    if (key === BOOKINGS_KEY) {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, data")
        .order("created_at", { ascending: true });
      if (error) return null;
      const list = (data || []).map((row) => ({ id: row.id, ...row.data }));
      return { key, value: JSON.stringify(list), shared };
    }

    if (key === INVOICE_REQUESTS_KEY) {
      const { data, error } = await supabase
        .from("invoice_requests")
        .select("id, data")
        .order("created_at", { ascending: true });
      if (error) return null;
      const list = (data || []).map((row) => ({ id: row.id, ...row.data }));
      return { key, value: JSON.stringify(list), shared };
    }

    if (key === LANG_KEY) {
      const val = localStorage.getItem(LANG_KEY);
      return val ? { key, value: val, shared: false } : null;
    }

    return null;
  } catch (e) {
    console.error("storageGet error:", e);
    return null;
  }
}

async function storageSet(key, value, shared = true) {
  try {
    if (key === SETTINGS_KEY) {
      const parsed = JSON.parse(value);
      await supabase.from("settings").upsert({
        id: "default",
        data: parsed,
        updated_at: new Date().toISOString(),
      });
      return { key, value, shared };
    }

    if (key === ROOMS_KEY) {
      const parsed = JSON.parse(value);
      await supabase.from("rooms").upsert({
        id: "default",
        data: parsed,
        updated_at: new Date().toISOString(),
      });
      return { key, value, shared };
    }

    if (key === BOOKINGS_KEY) {
      const list = JSON.parse(value);
      await supabase.from("bookings").delete().neq("id", "");
      if (list.length > 0) {
        const rows = list.map((b) => ({
          id: b.id || `bk-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          data: b,
          created_at: b.createdAt || new Date().toISOString(),
        }));
        await supabase.from("bookings").insert(rows);
      }
      return { key, value, shared };
    }

    if (key === INVOICE_REQUESTS_KEY) {
      const list = JSON.parse(value);
      await supabase.from("invoice_requests").delete().neq("id", "");
      if (list.length > 0) {
        const rows = list.map((r) => ({
          id: r.id || `inv-${Date.now()}`,
          data: r,
          created_at: r.requestedAt || new Date().toISOString(),
        }));
        await supabase.from("invoice_requests").insert(rows);
      }
      return { key, value, shared };
    }

    if (key === LANG_KEY) {
      localStorage.setItem(LANG_KEY, value);
      return { key, value, shared: false };
    }

    return { key, value, shared };
  } catch (e) {
    console.error("storageSet error:", e);
    return { key, value, shared };
  }
}

async function storageDelete(key, shared = true) {
  try {
    if (key === SETTINGS_KEY) {
      await supabase.from("settings").delete().eq("id", "default");
    } else if (key === ROOMS_KEY) {
      await supabase.from("rooms").delete().eq("id", "default");
    } else if (key === BOOKINGS_KEY) {
      await supabase.from("bookings").delete().neq("id", "");
    } else if (key === INVOICE_REQUESTS_KEY) {
      await supabase.from("invoice_requests").delete().neq("id", "");
    } else if (key === LANG_KEY) {
      localStorage.removeItem(LANG_KEY);
    }
    return { key, deleted: true, shared };
  } catch (e) {
    console.error("storageDelete error:", e);
    return { key, deleted: true, shared };
  }
}

function isUsingFallback() {
  return false;
}

/* ------------------------------------------------------------------
TRANSLATIONS — every user-facing string, keyed by "th" / "en"
------------------------------------------------------------------- */

const STRINGS = {
  th: {
    stepLabels: {
      search: "ค้นหาห้องพัก", results: "เลือกห้องพัก", guest: "ข้อมูลผู้เข้าพัก",
      payment: "ชำระเงิน", confirmed: "ยืนยันการจอง", arrival: "วันเข้าพัก",
      verify: "ยืนยันตัวตน", key: "กุญแจดิจิทัล", stay: "ระหว่างเข้าพัก",
      checkout: "เช็คเอาท์", receipt: "ใบเสร็จ",
    },
    checkinLabels: {
      lookup: "เช็คอินด้วยตนเอง", arrival: "วันเข้าพัก", verify: "ยืนยันตัวตน",
      key: "กุญแจดิจิทัล", rules: "คำแนะนำการเข้าพัก", stay: "ระหว่างเข้าพัก", checkout: "เช็คเอาท์", receipt: "ใบเสร็จ",
      adminTitle: "ผู้ดูแลระบบ",
    },
    tagline: "จองห้อง เช็คอิน และรับกุญแจได้เอง ไม่ต้องต่อคิว",
    search: {
      datesLabel: "วันเข้าพัก – วันออก",
      guestsLabel: "ผู้เข้าพัก",
      adultLabel: "ผู้ใหญ่",
      mapCta: "ดูแผนที่",
      priceLine: (price) => <>ราคาห้องพัก <b>฿{price.toLocaleString()}</b> / คืน <span style={{ color: c.textFaint }}>(ราคาเดียวทุกห้อง)</span></>,
      searchBtn: "ค้นหาห้องว่าง",
      checkinBtn: "จองไว้แล้ว? เช็คอินด้วยตนเอง",
    },
    results: {
      summaryLine: (checkIn, checkOut, guests, price) => `${checkIn} – ${checkOut} · ${guests} ผู้ใหญ่ · ราคาเดียว ฿${price}/คืน ทุกห้อง`,
      roomsLeft: (n) => `เหลือ ${n} ห้อง`,
      perkWifi: "Wi-Fi",
      perkBreakfast: "เช้า",
      perkBath: "อ่างอาบน้ำ",
      addonLabel: "เพิ่มฟูกเสริม",
      addonPrice: `+฿${ADDON_PRICE}/คืน`,
      perNightTax: "ต่อคืน, รวมภาษี",
      selectBtn: "เลือกห้อง",
    },
    guest: {
      nameLabel: "ชื่อ-นามสกุล",
      namePlaceholder: "เช่น สมชาย ใจดี",
      phoneLabel: "เบอร์โทรศัพท์",
      phonePlaceholder: "08X-XXX-XXXX",
      emailLabel: "อีเมล (ไม่บังคับ)",
      emailPlaceholder: "you@email.com",
      idNote: "คุณสามารถยืนยันตัวตน (บัตรประชาชน/พาสปอร์ต + สแกนใบหน้า) ได้ทันทีตอนนี้ หรือทำในวันเข้าพักที่หน้าตู้ kiosk",
      continueBtn: "ไปหน้าชำระเงิน",
      missingPrefix: "กรอกให้ครบ: ",
      missingName: "ชื่อ-นามสกุล",
      missingPhone: "เบอร์โทร (อย่างน้อย 9 หลัก)",
      missingEmail: "อีเมล",
    },
    roomSummary: {
      nights: (n) => `${n} คืน`,
      withAddon: " · + ฟูกเสริม",
    },
    payment: {
      summaryLabel: "สรุปค่าใช้จ่าย",
      roomLine: (n) => `ค่าห้อง × ${n} คืน`,
      addonLine: (n) => `เพิ่มฟูกเสริม × ${n} คืน`,
      taxLine: (rate) => `ภาษีและค่าบริการ (${rate}%)`,
      totalLine: "ยอดชำระทั้งหมด",
      qrLabel: "ชำระเงินผ่าน QR Code",
      scanToPay: (amount) => `สแกนเพื่อชำระ ฿${amount.toLocaleString()}`,
      promptpayNote: `พร้อมเพย์ · ${HOTEL_NAME}`,
      attachSlipLabel: "แนบสลิปการโอนเงิน",
      tapToAttach: "แตะเพื่อแนบรูปสลิป",
      slipAttached: "แนบสลิปแล้ว",
      processing: "กำลังยืนยันการชำระเงิน…",
      confirmBtn: "ยืนยันการชำระเงิน",
      needSlip: "แนบสลิปก่อนยืนยันการชำระเงิน",
    },
    slipCheck: {
      title: "ตรวจสอบสลิปด้วย AI",
      checking: "กำลังตรวจสอบสลิปด้วย AI…",
      checkBtn: "ตรวจสอบสลิปด้วย AI",
      amountLabel: "ยอดเงิน",
      dateLabel: "วันที่โอน",
      nameLabel: "ชื่อผู้รับโอน",
      expected: "ที่ควรเป็น",
      readFromSlip: "อ่านได้จากสลิป",
      statusMatch: "ตรงกัน",
      statusMismatch: "ไม่ตรงกัน",
      statusUnknown: "ไม่แน่ใจ / อ่านไม่ได้",
      warningNote: "AI ตรวจพบว่าอาจมีบางอย่างไม่ตรง โปรดตรวจสอบสลิปอีกครั้งด้วยตนเองก่อนดำเนินการต่อ",
      okNote: "ตรวจสอบเบื้องต้นด้วย AI แล้ว ดูสอดคล้องกันดี (โปรดใช้วิจารณญาณประกอบด้วย)",
      failedNote: "ไม่สามารถตรวจสอบสลิปด้วย AI ได้ในขณะนี้ กรุณาตรวจสอบด้วยตนเอง",
      disclaimer: "การตรวจสอบด้วย AI เป็นเพียงตัวช่วยเบื้องต้น ไม่ใช่การยืนยัน 100%",
    },
    confirmed: {
      successTitle: "จองสำเร็จแล้ว",
      successSub: "ยืนยันการจองส่งไปที่อีเมลของคุณแล้ว",
      bookingCode: "รหัสการจอง",
      arriveNote: (checkIn) => `ในวันเข้าพัก (${checkIn}) แสกน QR นี้ที่ตู้ kiosk หรือในแอป เพื่อทำการเช็คอินได้เอง`,
      simulateArrive: "จำลอง: ถึงวันเข้าพักแล้ว →",
      saveImageBtn: "บันทึกรหัสเป็นรูปภาพลงเครื่อง",
    },
    arrival: {
      welcomeTitle: "ยินดีต้อนรับกลับมา",
      welcomeSub: "วันนี้คือวันเข้าพักของคุณ — เริ่มเช็คอินได้เลย",
      step1: "ยืนยันรหัสการจอง",
      step2: "ยืนยันตัวตน (แนบรูปบัตร/พาสปอร์ต)",
      step3: "รับกุญแจดิจิทัล",
      startVerify: "เริ่มยืนยันตัวตน",
    },
    verify: {
      idleTitle: "แนบรูปถ่ายบัตรประจำตัวประชาชน/พาสปอร์ต",
      scanningTitle: "กำลังตรวจสอบเอกสาร…",
      doneTitle: "ยืนยันตัวตนสำเร็จ",
      idleSub: "ถ่ายรูปหรือแนบไฟล์รูปบัตรประชาชน/พาสปอร์ตของคุณให้ชัดเจน",
      doneSub: (name) => `ตรวจสอบว่าเป็นคุณ ${name} เรียบร้อย`,
      scanBtn: "ยืนยันเอกสาร",
      tapToAttachId: "แตะเพื่อแนบรูปบัตร/พาสปอร์ต",
      getKeyBtn: "รับกุญแจดิจิทัล",
      dontMove: "กำลังประมวลผล...",
      defaultGuest: "ผู้เข้าพัก",
    },
    key: {
      ready: "กุญแจดิจิทัลของคุณพร้อมแล้ว",
      roomLabel: (n) => `ห้อง ${n}`,
      guestLabel: "ผู้เข้าพัก",
      validUntil: "ใช้ได้จนถึง",
      nfcNote: "พร้อมแตะเปิดประตูด้วย NFC / Bluetooth",
      enterRoomBtn: "เข้าสู่ห้องพักของฉัน",
    },
    stay: {
      unlockedLabel: (n) => `ห้อง ${n} · ปลดล็อกแล้ว`,
      stayDates: (a, b) => `เข้าพัก ${a} – ${b}`,
      servicesLabel: "บริการระหว่างพัก",
      items: {
        minibar: "มินิบาร์",
        roomService: "อาหารเช้า Mini breakfast set",
        towel: "ผ้าเช็ดตัวเพิ่ม",
      },
      minibarPick: "แตะเพื่อเลือกเมนู",
      minibarNotPicked: "ยังไม่ได้เลือก",
      minibarCount: (n, total) => `${n} รายการ · ฿${total}`,
      minibarModalTitle: "เลือกมินิบาร์",
      minibarDone: "เสร็จสิ้น",
      minibarSummaryLabel: "สรุปที่ทานไป",
      free: "ฟรี",
      helpNote: "แจ้งพนักงานได้ตลอด 24 ชม. หากต้องการความช่วยเหลือ — แตะที่ไอคอนโทรศัพท์ด้านล่าง",
      checkoutBtn: "เช็คเอาท์",
    },
    checkout: {
      summaryLabel: "สรุปยอดก่อนเช็คเอาท์",
      roomLine: (n) => `ค่าห้อง × ${n} คืน`,
      addonLine: (n) => `เพิ่มฟูกเสริม × ${n} คืน`,
      taxLine: (rate) => `ภาษีและค่าบริการ (${rate}%)`,
      dueLabel: "ยอดชำระเพิ่มเติม (ไม่รวมค่าห้อง/ฟูกเสริมที่จ่ายแล้ว)",
      keyNote: "ยืนยันเช็คเอาท์แล้ว กุญแจดิจิทัลของคุณจะถูกปิดใช้งานทันที",
      processing: "กำลังปิดห้อง…",
      confirmBtn: "ยืนยันเช็คเอาท์และชำระเงิน",
    },
    receipt: {
      doneTitle: "เช็คเอาท์สำเร็จแล้ว",
      thankYou: (name) => `ขอบคุณที่เข้าพักกับเรา, ${name}`,
      defaultGuest: "คุณผู้เข้าพัก",
      sentTo: (email) => `ใบเสร็จส่งไปที่ ${email} แล้ว`,
      defaultEmail: "อีเมลของคุณ",
      rateLabel: "ให้คะแนนการเข้าพักของคุณ",
      restartBtn: "เริ่มต้นดูต้นแบบใหม่อีกครั้ง",
      requestInvoiceBtn: "ขอออกใบกำกับภาษี",
      collectPointsBtn: "สะสมแต้ม",
    },
    invoice: {
      title: "ขอใบกำกับภาษี",
      subtitle: "กรอกข้อมูลผู้ซื้อสำหรับออกใบกำกับภาษี",
      buyerName: "ชื่อ / ชื่อบริษัทผู้ซื้อ",
      buyerNamePlaceholder: "เช่น บริษัท ตัวอย่าง จำกัด",
      buyerTaxId: "เลขประจำตัวผู้เสียภาษี",
      buyerTaxIdPlaceholder: "เลข 13 หลัก",
      buyerAddress: "ที่อยู่ผู้ซื้อ",
      buyerAddressPlaceholder: "ที่อยู่สำหรับออกใบกำกับภาษี",
      methodLabel: "วิธีรับใบกำกับภาษี",
      pdfNow: "ออกเป็น PDF ทันที",
      waitStaff: "รอพนักงานพิมพ์ให้เช้าวันถัดไป",
      missingName: "กรุณากรอกชื่อ/ชื่อบริษัทผู้ซื้อ",
      savedForStaff: "ส่งคำขอแล้ว พนักงานจะจัดเตรียมใบกำกับภาษีให้ในเช้าวันถัดไป",
      close: "ปิด",
      printBtn: "พิมพ์ / บันทึกเป็น PDF",
      invoiceHeading: "ใบกำกับภาษีอย่างย่อ",
      no: "เลขที่",
      date: "วันที่ออกเอกสาร",
      seller: "ผู้ขาย",
      buyer: "ผู้ซื้อ",
      itemHeader: "รายการ",
      qtyHeader: "จำนวน",
      amountHeader: "จำนวนเงิน",
      subtotal: "รวมเป็นเงิน",
      taxLine: (rate) => `ภาษีมูลค่าเพิ่ม (${rate}%)`,
      grandTotal: "จำนวนเงินรวมทั้งสิ้น",
      roomLine: (n) => `ค่าห้องพัก × ${n} คืน`,
      addonLine: (n) => `ฟูกเสริม × ${n} คืน`,
      manualTitle: "ออกใบกำกับภาษี (Manual)",
      manualSubtitle: "กรอกข้อมูลผู้ซื้อและรายการสำหรับออกใบกำกับภาษีเอง",
      bookingCodeLabel: "รหัสอ้างอิง (ถ้ามี)",
      bookingCodePlaceholder: "เช่น เลขห้อง หรือเลขที่บิล",
      lineItemLabel: "รายการ",
      lineItemPlaceholder: "ชื่อรายการ",
      amountPlaceholder: "จำนวนเงิน",
      addLineItem: "เพิ่มรายการ",
      issuePdfBtn: "ออกใบกำกับภาษี",
      missingLineItems: "กรุณาเพิ่มอย่างน้อย 1 รายการที่มีชื่อและจำนวนเงิน",
      originalLabel: "ต้นฉบับ",
      copyLabel: "สำเนา",
      signatureLine: "ลงชื่อผู้รับเงิน",
      signatureDateLine: "วันที่",
    },
    rules: {
      title: "คำแนะนำการเข้าพักและกฎของโรงแรม",
      subtitle: "โปรดอ่านก่อนเข้าพัก",
      continueBtn: "เข้าใจแล้ว ไปต่อ",
    },
    checkinLookup: {
      title: "เช็คอินด้วยตนเอง",
      subtitle: "กรอกรหัสการจอง หรือชื่อ + เบอร์โทร เพื่อรับรหัสกุญแจ",
      tabCode: "รหัสการจอง",
      tabDetails: "ชื่อ + เบอร์โทร",
      codeLabel: "รหัสการจอง",
      codePlaceholder: "เช่น TH-7284-KX",
      nameLabel: "ชื่อ-นามสกุล",
      namePlaceholder: "เช่น สมชาย ใจดี",
      phoneLabel: "เบอร์โทรศัพท์",
      phonePlaceholder: "08X-XXX-XXXX",
      searching: "กำลังค้นหา…",
      searchBtn: "ค้นหาการจอง",
      notFound: "ไม่พบการจอง กรุณาตรวจสอบข้อมูลอีกครั้ง",
      systemError: "ระบบขัดข้อง กรุณาลองใหม่อีกครั้ง",
      backHome: "กลับสู่หน้าหลัก",
      contactStaff: "ติดต่อเจ้าหน้าที่",
    },
    admin: {
      loginTitle: "เข้าสู่ระบบผู้ดูแล",
      loginSub: "กรอกรหัส PIN เพื่อจัดการราคา รูปภาพ ภาษี และดูรายการจอง",
      loginBtn: "เข้าสู่ระบบ",
      wrongPin: "รหัสไม่ถูกต้อง ลองอีกครั้ง",
      tabSettings: "ตั้งค่า",
      tabBookings: "รายการจอง",
      tabRooms: "ห้องพัก",
      tabInvoices: "ใบกำกับภาษี",
      invoiceLetterheadTitle: "ข้อมูลหัวบิล (ใบกำกับภาษี)",
      invoiceCompanyName: "ชื่อบริษัท / ชื่อผู้ประกอบการ",
      invoiceTaxId: "เลขประจำตัวผู้เสียภาษี (ผู้ขาย)",
      invoiceAddress: "ที่อยู่สถานประกอบการ",
      invoiceLogoLabel: "โลโก้บนหัวบิล",
      houseRulesTitle: "กฎ/คำแนะนำการเข้าพัก",
      houseRulesNote: "จะแสดงให้ลูกค้าดูเป็นขั้นตอนถัดไปหลังรับกุญแจดิจิทัล",
      ruleTitleLabel: "หัวข้อ",
      ruleTitlePlaceholder: "เช่น ห้ามสูบบุหรี่ภายในห้อง",
      ruleDescLabel: "คำอธิบาย",
      ruleDescPlaceholder: "รายละเอียดเพิ่มเติม (ถ้ามี)",
      ruleImageLabel: "รูปภาพประกอบ",
      addRule: "เพิ่มหัวข้อ",
      invoiceRequestsEmpty: "ยังไม่มีคำขอใบกำกับภาษี",
      invoiceMethodPdf: "ลูกค้าออก PDF เอง",
      invoiceMethodStaff: "รอพนักงานพิมพ์",
      invoiceStatusPending: "รอพิมพ์",
      invoiceStatusDone: "พิมพ์แล้ว",
      markPrinted: "บันทึกว่าพิมพ์แล้ว",
      manualInvoiceBtn: "ออกใบกำกับภาษี",
      letterheadShortcutBtn: "ตั้งค่าหัวบิล",
      assignRoomBtn: "จัดห้องพัก",
      assignRoomTitle: "จัดห้องพักให้ลูกค้า",
      assignRoomSubtitle: "เลือกห้องตามที่ลูกค้าต้องการ (เช่น ชั้น/เลขห้องที่ร้องขอมา)",
      currentRoomLabel: "ห้องที่จัดไว้ตอนนี้",
      noRoomAssigned: "ยังไม่ได้จัดห้อง",
      confirmAssign: "ยืนยันจัดห้องนี้",
      assigning: "กำลังบันทึก…",
      cannotAssignExtraBed: "ห้องนี้ไม่รับเสริมฟูก — ลูกค้ารายนี้มีการเสริมฟูก",
      viewPrint: "ดู / พิมพ์",
      sharedNote: "การตั้งค่านี้ใช้ร่วมกันทุกอุปกรณ์ที่เปิดต้นแบบนี้ — ลูกค้าทุกคนจะเห็นราคาและรูปที่บันทึกไว้ล่าสุด",
      priceLabel: "ราคาห้องต่อคืน (บาท)",
      taxLabel: "ภาษีและค่าบริการ (%)",
      roomImageLabel: "รูปภาพห้องพัก",
      tapToAttachImage: "แตะเพื่อแนบรูปห้องพัก",
      processingImage: "กำลังประมวลผลรูป…",
      changeImage: "เปลี่ยนรูป",
      saveBtn: "บันทึกการตั้งค่า",
      saved: "บันทึกเรียบร้อย ลูกค้าจะเห็นการเปลี่ยนแปลงทันที",
      totalBookings: "ยอดจองทั้งหมด",
      totalRevenue: "ยอดรับเงินรวม",
      items: (n) => `${n} รายการ`,
      refresh: "รีเฟรชรายการ",
      loading: "กำลังโหลด…",
      noBookings: "ยังไม่มีรายการจอง — จะแสดงที่นี่หลังลูกค้าชำระเงินสำเร็จ",
      slipYes: "แนบสลิปแล้ว",
      slipNo: "ไม่มีสลิป",
      unnamedGuest: "ไม่ระบุชื่อ",
      floors: (rooms) => `${rooms} ห้อง`,
      refreshRooms: "รีเฟรชสถานะห้อง",
      manualNote: "เปลี่ยนสถานะห้องด้วยตนเองได้ทุกห้อง เผื่อกรณีลูกค้าลืมกดเช็คเอาท์ในระบบ",
      floor1: "ชั้น 1 · D1–D6",
      floor2: "ชั้น 2 · E1–E7",
      noGuest: "ไม่มีผู้เข้าพัก",
      guestLeft: (name) => `${name} (ออกแล้ว)`,
      selfCheckinCode: "รหัส Self Check-in",
      changeStatus: "เปลี่ยนสถานะ",
      status: {
        ready: "พร้อม",
        pending: "รอเช็คอิน",
        occupied: "เช็คอิน",
        checkout: "เช็คเอาท์",
        cleaning: "กำลังทำความสะอาด",
      },
      hasExtraBed: "มีการเสริมฟูก",
      noExtraBedRoom: "(ห้องนี้ไม่รับเสริมฟูก)",
    },
    lang: { th: "ไทย", en: "English" },
  },

  en: {
    stepLabels: {
      search: "Find a Room", results: "Choose a Room", guest: "Guest Details",
      payment: "Payment", confirmed: "Booking Confirmed", arrival: "Arrival Day",
      verify: "Identity Check", key: "Digital Key", stay: "During Your Stay",
      checkout: "Check-out", receipt: "Receipt",
    },
    checkinLabels: {
      lookup: "Self Check-in", arrival: "Arrival Day", verify: "Identity Check",
      key: "Digital Key", rules: "House Guide", stay: "During Your Stay", checkout: "Check-out", receipt: "Receipt",
      adminTitle: "Admin",
    },
    tagline: "Book, check in, and get your key yourself — no queueing",
    search: {
      datesLabel: "Check-in – Check-out",
      guestsLabel: "Guests",
      adultLabel: "Adults",
      mapCta: "View map",
      priceLine: (price) => <>Room rate <b>฿{price.toLocaleString()}</b> / night <span style={{ color: c.textFaint }}>(one rate, every room)</span></>,
      searchBtn: "Search availability",
      checkinBtn: "Already booked? Self check-in",
    },
    results: {
      summaryLine: (checkIn, checkOut, guests, price) => `${checkIn} – ${checkOut} · ${guests} adults · one rate ฿${price}/night, every room`,
      roomsLeft: (n) => `${n} rooms left`,
      perkWifi: "Wi-Fi",
      perkBreakfast: "Breakfast",
      perkBath: "Bathtub",
      addonLabel: "Add an extra mattress",
      addonPrice: `+฿${ADDON_PRICE}/night`,
      perNightTax: "per night, tax included",
      selectBtn: "Select room",
    },
    guest: {
      nameLabel: "Full name",
      namePlaceholder: "e.g. Somchai Jaidee",
      phoneLabel: "Phone number",
      phonePlaceholder: "08X-XXX-XXXX",
      emailLabel: "Email (optional)",
      emailPlaceholder: "you@email.com",
      idNote: "You can verify your ID (passport/ID card + face scan) right now, or do it at the kiosk on arrival day.",
      continueBtn: "Continue to payment",
      missingPrefix: "Please complete: ",
      missingName: "full name",
      missingPhone: "phone number (9+ digits)",
      missingEmail: "email",
    },
    roomSummary: {
      nights: (n) => `${n} nights`,
      withAddon: " · + extra mattress",
    },
    payment: {
      summaryLabel: "Cost summary",
      roomLine: (n) => `Room × ${n} nights`,
      addonLine: (n) => `Extra mattress × ${n} nights`,
      taxLine: (rate) => `Tax & service charge (${rate}%)`,
      totalLine: "Total due",
      qrLabel: "Pay by QR code",
      scanToPay: (amount) => `Scan to pay ฿${amount.toLocaleString()}`,
      promptpayNote: `PromptPay · ${HOTEL_NAME}`,
      attachSlipLabel: "Attach payment slip",
      tapToAttach: "Tap to attach your slip photo",
      slipAttached: "Slip attached",
      processing: "Confirming payment…",
      confirmBtn: "Confirm payment",
      needSlip: "Attach your slip before confirming payment",
    },
    slipCheck: {
      title: "AI slip check",
      checking: "Checking the slip with AI…",
      checkBtn: "Check slip with AI",
      amountLabel: "Amount",
      dateLabel: "Transfer date",
      nameLabel: "Recipient name",
      expected: "Expected",
      readFromSlip: "Read from slip",
      statusMatch: "Match",
      statusMismatch: "Mismatch",
      statusUnknown: "Uncertain / unreadable",
      warningNote: "AI found something that may not match — please double-check the slip yourself before proceeding.",
      okNote: "AI's quick check looks consistent (please still use your own judgement).",
      failedNote: "Couldn't check the slip with AI right now — please review it manually.",
      disclaimer: "AI checking is a best-effort assist, not a 100% guarantee.",
    },
    confirmed: {
      successTitle: "Booking confirmed",
      successSub: "A confirmation has been sent to your email.",
      bookingCode: "Booking code",
      arriveNote: (checkIn) => `On your check-in day (${checkIn}), scan this QR at the kiosk or in the app to check in yourself.`,
      simulateArrive: "Simulate: it's check-in day →",
      saveImageBtn: "Save code as image to device",
    },
    arrival: {
      welcomeTitle: "Welcome back",
      welcomeSub: "Today is your check-in day — let's get you checked in.",
      step1: "Confirm booking code",
      step2: "Verify identity (ID/passport photo)",
      step3: "Receive digital key",
      startVerify: "Start identity check",
    },
    verify: {
      idleTitle: "Attach a photo of your ID card / passport",
      scanningTitle: "Checking your document…",
      doneTitle: "Identity verified",
      idleSub: "Take a clear photo of your ID card or passport, or upload one.",
      doneSub: (name) => `Confirmed it's you, ${name}.`,
      scanBtn: "Verify document",
      tapToAttachId: "Tap to attach your ID/passport photo",
      getKeyBtn: "Get my digital key",
      dontMove: "Processing...",
      defaultGuest: "guest",
    },
    key: {
      ready: "Your digital key is ready",
      roomLabel: (n) => `Room ${n}`,
      guestLabel: "Guest",
      validUntil: "Valid until",
      nfcNote: "Ready to tap open with NFC / Bluetooth",
      enterRoomBtn: "Enter my room",
    },
    stay: {
      unlockedLabel: (n) => `Room ${n} · Unlocked`,
      stayDates: (a, b) => `Staying ${a} – ${b}`,
      servicesLabel: "In-stay services",
      items: {
        minibar: "Minibar",
        roomService: "Breakfast — Mini breakfast set",
        towel: "Extra towel",
      },
      minibarPick: "Tap to pick items",
      minibarNotPicked: "Nothing picked yet",
      minibarCount: (n, total) => `${n} items · ฿${total}`,
      minibarModalTitle: "Choose from the minibar",
      minibarDone: "Done",
      minibarSummaryLabel: "What you had",
      free: "Free",
      helpNote: "Staff are available 24/7 — tap the phone icon below for help.",
      checkoutBtn: "Check out",
    },
    checkout: {
      summaryLabel: "Summary before check-out",
      roomLine: (n) => `Room × ${n} nights`,
      addonLine: (n) => `Extra mattress × ${n} nights`,
      taxLine: (rate) => `Tax & service charge (${rate}%)`,
      dueLabel: "Additional amount due (room/mattress already paid)",
      keyNote: "Once you confirm check-out, your digital key will be deactivated immediately.",
      processing: "Closing out your room…",
      confirmBtn: "Confirm check-out & pay",
    },
    receipt: {
      doneTitle: "Check-out complete",
      thankYou: (name) => `Thank you for staying with us, ${name}`,
      defaultGuest: "guest",
      sentTo: (email) => `Your receipt has been sent to ${email}.`,
      defaultEmail: "your email",
      rateLabel: "Rate your stay",
      restartBtn: "Restart the prototype",
      requestInvoiceBtn: "Request a tax invoice",
      collectPointsBtn: "Collect points",
    },
    invoice: {
      title: "Request tax invoice",
      subtitle: "Enter the buyer's details for the tax invoice",
      buyerName: "Buyer name / company name",
      buyerNamePlaceholder: "e.g. Example Co., Ltd.",
      buyerTaxId: "Tax ID",
      buyerTaxIdPlaceholder: "13-digit number",
      buyerAddress: "Buyer address",
      buyerAddressPlaceholder: "Address for the tax invoice",
      methodLabel: "How to receive it",
      pdfNow: "Issue as PDF now",
      waitStaff: "Have staff print it tomorrow morning",
      missingName: "Please enter the buyer's name/company",
      savedForStaff: "Request sent — staff will prepare your tax invoice tomorrow morning.",
      close: "Close",
      printBtn: "Print / Save as PDF",
      invoiceHeading: "Abbreviated Tax Invoice",
      no: "No.",
      date: "Issue date",
      seller: "Seller",
      buyer: "Buyer",
      itemHeader: "Item",
      qtyHeader: "Qty",
      amountHeader: "Amount",
      subtotal: "Subtotal",
      taxLine: (rate) => `VAT (${rate}%)`,
      grandTotal: "Grand total",
      roomLine: (n) => `Room × ${n} nights`,
      addonLine: (n) => `Extra mattress × ${n} nights`,
      manualTitle: "Issue tax invoice (manual)",
      manualSubtitle: "Enter buyer details and line items to issue a tax invoice",
      bookingCodeLabel: "Reference (optional)",
      bookingCodePlaceholder: "e.g. room number or bill number",
      lineItemLabel: "Item",
      lineItemPlaceholder: "Item name",
      amountPlaceholder: "Amount",
      addLineItem: "Add item",
      issuePdfBtn: "Issue tax invoice",
      missingLineItems: "Add at least one item with a name and amount",
      originalLabel: "Original",
      copyLabel: "Copy",
      signatureLine: "Received by",
      signatureDateLine: "Date",
    },
    rules: {
      title: "House rules & room guide",
      subtitle: "Please read before your stay",
      continueBtn: "Got it, continue",
    },
    checkinLookup: {
      title: "Self Check-in",
      subtitle: "Enter your booking code, or your name + phone, to get your key",
      tabCode: "Booking code",
      tabDetails: "Name + phone",
      codeLabel: "Booking code",
      codePlaceholder: "e.g. TH-7284-KX",
      nameLabel: "Full name",
      namePlaceholder: "e.g. Somchai Jaidee",
      phoneLabel: "Phone number",
      phonePlaceholder: "08X-XXX-XXXX",
      searching: "Searching…",
      searchBtn: "Find my booking",
      notFound: "Booking not found — please check your details and try again.",
      systemError: "Something went wrong — please try again.",
      backHome: "Back to home",
      contactStaff: "Contact staff",
    },
    admin: {
      loginTitle: "Admin sign-in",
      loginSub: "Enter the PIN to manage pricing, photos, tax, and view bookings.",
      loginBtn: "Sign in",
      wrongPin: "Incorrect PIN, please try again.",
      tabSettings: "Settings",
      tabBookings: "Bookings",
      tabRooms: "Rooms",
      tabInvoices: "Tax Invoices",
      invoiceLetterheadTitle: "Invoice letterhead",
      invoiceCompanyName: "Company / business name",
      invoiceTaxId: "Tax ID (seller)",
      invoiceAddress: "Business address",
      invoiceLogoLabel: "Letterhead logo",
      houseRulesTitle: "House rules / room guide",
      houseRulesNote: "Shown to guests as the next step after they get their digital key",
      ruleTitleLabel: "Title",
      ruleTitlePlaceholder: "e.g. No smoking in the room",
      ruleDescLabel: "Description",
      ruleDescPlaceholder: "More detail (optional)",
      ruleImageLabel: "Photo",
      addRule: "Add rule",
      invoiceRequestsEmpty: "No tax invoice requests yet",
      invoiceMethodPdf: "Customer issued PDF",
      invoiceMethodStaff: "Awaiting staff print",
      invoiceStatusPending: "Pending",
      invoiceStatusDone: "Printed",
      markPrinted: "Mark as printed",
      manualInvoiceBtn: "Issue tax invoice",
      letterheadShortcutBtn: "Letterhead settings",
      assignRoomBtn: "Assign room",
      assignRoomTitle: "Assign a room",
      assignRoomSubtitle: "Pick the room the guest requested (floor / room number)",
      currentRoomLabel: "Currently assigned",
      noRoomAssigned: "No room assigned yet",
      confirmAssign: "Confirm this room",
      assigning: "Saving…",
      cannotAssignExtraBed: "This room can't take an extra mattress — this guest has one.",
      viewPrint: "View / print",
      sharedNote: "These settings are shared across every device that opens this prototype — all customers see the latest price and photo.",
      priceLabel: "Room rate per night (THB)",
      taxLabel: "Tax & service charge (%)",
      roomImageLabel: "Room photo",
      tapToAttachImage: "Tap to attach a room photo",
      processingImage: "Processing image…",
      changeImage: "Change photo",
      saveBtn: "Save settings",
      saved: "Saved — customers will see this update immediately.",
      totalBookings: "Total bookings",
      totalRevenue: "Total revenue",
      items: (n) => `${n} bookings`,
      refresh: "Refresh list",
      loading: "Loading…",
      noBookings: "No bookings yet — they'll show up here once a customer pays.",
      slipYes: "Slip attached",
      slipNo: "No slip",
      unnamedGuest: "Unnamed",
      floors: (rooms) => `${rooms} rooms`,
      refreshRooms: "Refresh room status",
      manualNote: "You can change any room's status manually — handy if a guest forgets to check out in the app.",
      floor1: "Floor 1 · D1–D6",
      floor2: "Floor 2 · E1–E7",
      noGuest: "No guest",
      guestLeft: (name) => `${name} (departed)`,
      selfCheckinCode: "Self Check-in code",
      changeStatus: "Change status",
      status: {
        ready: "Ready",
        pending: "Pending check-in",
        occupied: "Occupied",
        checkout: "Checked out",
        cleaning: "Cleaning",
      },
      hasExtraBed: "Extra mattress added",
      noExtraBedRoom: "(this room can't take an extra mattress)",
    },
    lang: { th: "ไทย", en: "English" },
  },
};

const STATUS_ORDER = ["ready", "pending", "occupied", "checkout", "cleaning"];

const TH_MONTHS = ["ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."];
const EN_MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

function formatDate(iso, lang) {
  if (!iso) return "";
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) return "";
  return lang === "th" ? `${d} ${TH_MONTHS[m - 1]} ${y + 543}` : `${EN_MONTHS[m - 1]} ${d}, ${y}`;
}

function todayISO() {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function addDaysISO(iso, days) {
  const d = new Date(iso + "T00:00:00");
  d.setDate(d.getDate() + days);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function calcNights(checkInISO, checkOutISO) {
  if (!checkInISO || !checkOutISO) return 1;
  const inDate = new Date(checkInISO + "T00:00:00");
  const outDate = new Date(checkOutISO + "T00:00:00");
  const diffDays = Math.round((outDate - inDate) / (1000 * 60 * 60 * 24));
  return diffDays > 0 ? diffDays : 1;
}

function buildInvoiceLineItems(lang, booking, settings) {
  const t = STRINGS[lang];
  const nights = calcNights(booking.checkInISO, booking.checkOutISO);
  const minibarCatalog = (settings && settings.minibarItems) || MINIBAR_CATALOG;
  const lineItems = [];
  if (booking.room) {
    lineItems.push({ label: `${booking.room.name} · ${t.invoice.roomLine(nights)}`, qty: nights, amount: booking.room.price * nights });
  }
  if (booking.extraBed) {
    lineItems.push({ label: t.invoice.addonLine(nights), qty: nights, amount: ADDON_PRICE * nights });
  }
  (booking.extras || []).forEach(e => {
    if (e.price > 0) lineItems.push({ label: e.label, qty: 1, amount: e.price });
  });
  Object.entries(booking.minibar || {}).forEach(([id, qty]) => {
    if (qty > 0) {
      const item = minibarCatalog.find(m => m.id === id);
      if (item) lineItems.push({ label: item.name, qty, amount: item.price * qty });
    }
  });
  const subtotal = lineItems.reduce((s, li) => s + li.amount, 0);
  const taxRate = settings && settings.taxRate != null ? settings.taxRate : 7;
  const tax = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + tax;
  return { lineItems, subtotal, taxRate, tax, total };
}

function escapeHtml(str) {
  return String(str == null ? "" : str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;");
}

function buildInvoiceCopyHtml(t, request, seller, issueDate, copyLabel) {
  const rows = request.lineItems.map(li => `
    <tr>
      <td>${escapeHtml(li.label)}</td>
      <td style="text-align:center;">${li.qty}</td>
      <td style="text-align:right;">฿${li.amount.toLocaleString()}</td>
    </tr>
  `).join("");

  return `
    <div class="copy">
      <p class="label">${escapeHtml(copyLabel)}</p>
      <div class="header">
        ${seller.logoImage ? `<img src="${seller.logoImage}" alt="logo" />` : ""}
        <div>
          <div class="company">${escapeHtml(seller.companyName || HOTEL_NAME)}</div>
          ${seller.taxId ? `<div class="meta">${escapeHtml(t.invoice.buyerTaxId)}: ${escapeHtml(seller.taxId)}</div>` : ""}
          ${seller.address ? `<div class="meta">${escapeHtml(seller.address)}</div>` : ""}
        </div>
      </div>
      <p class="title">${escapeHtml(t.invoice.invoiceHeading)}</p>
      <div class="row"><span>${escapeHtml(t.invoice.no)}: ${escapeHtml(request.bookingCode)}</span><span>${escapeHtml(t.invoice.date)}: ${escapeHtml(issueDate)}</span></div>
      <div style="margin: 8px 0 12px;">
        <div style="font-weight:700; font-size:12px;">${escapeHtml(t.invoice.buyer)}</div>
        <div class="meta">${escapeHtml(request.buyerName)}</div>
        ${request.buyerTaxId ? `<div class="meta">${escapeHtml(t.invoice.buyerTaxId)}: ${escapeHtml(request.buyerTaxId)}</div>` : ""}
        ${request.buyerAddress ? `<div class="meta">${escapeHtml(request.buyerAddress)}</div>` : ""}
      </div>
      <table>
        <thead><tr><th>${escapeHtml(t.invoice.itemHeader)}</th><th>${escapeHtml(t.invoice.qtyHeader)}</th><th>${escapeHtml(t.invoice.amountHeader)}</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
      <div class="totals">
        <div class="row"><span>${escapeHtml(t.invoice.subtotal)}</span><span>฿${request.subtotal.toLocaleString()}</span></div>
        <div class="row"><span>${escapeHtml(t.invoice.taxLine(request.taxRate))}</span><span>฿${request.tax.toLocaleString()}</span></div>
        <div class="row grand"><span>${escapeHtml(t.invoice.grandTotal)}</span><span>฿${request.total.toLocaleString()}</span></div>
      </div>
      <div class="sig">
        <div><div class="sigline"></div><p>${escapeHtml(t.invoice.signatureLine)}</p></div>
        <div><div class="sigline"></div><p>${escapeHtml(t.invoice.signatureDateLine)}</p></div>
      </div>
    </div>
  `;
}

function buildInvoiceDocumentHtml(t, lang, request) {
  const seller = request.seller || DEFAULT_INVOICE_INFO;
  const dateLocale = lang === "th" ? "th-TH" : "en-US";
  const issueDate = new Date(request.requestedAt).toLocaleDateString(dateLocale);

  const originalHtml = buildInvoiceCopyHtml(t, request, seller, issueDate, t.invoice.originalLabel);
  const copyHtml = buildInvoiceCopyHtml(t, request, seller, issueDate, t.invoice.copyLabel);

  return `<!DOCTYPE html>
<html lang="${lang}">
<head>
<meta charset="utf-8" />
<title>${escapeHtml(HOTEL_NAME)} — ${escapeHtml(request.bookingCode)}</title>
<style>
  @page { size: A4; margin: 15mm; }
  * { box-sizing: border-box; }
  html, body { background: #FFFFFF; margin: 0; padding: 0; }
  body { font-family: 'Noto Sans Thai', 'Sarabun', Arial, sans-serif; color: #10161B; }
  .copy { padding: 6mm 0; }
  .copy + .copy { border-top: 2px dashed #9AA6A3; margin-top: 10mm; padding-top: 10mm; }
  .label { text-align: center; font-size: 11px; font-weight: 700; color: #8C6B3E; letter-spacing: 2px; text-transform: uppercase; margin: 0 0 12px; }
  .header { display: flex; align-items: center; gap: 12px; margin-bottom: 14px; }
  .header img { width: 44px; height: 44px; object-fit: contain; }
  .company { font-size: 16px; font-weight: 700; }
  .meta { font-size: 11px; color: #5B6B67; }
  .title { text-align: center; font-size: 15px; font-weight: 700; margin: 10px 0; }
  .row { display: flex; justify-content: space-between; font-size: 12px; margin-bottom: 6px; }
  table { width: 100%; border-collapse: collapse; margin: 10px 0; font-size: 12px; }
  th, td { text-align: left; padding: 6px 4px; }
  th:nth-child(2), td:nth-child(2) { text-align: center; }
  th:last-child, td:last-child { text-align: right; }
  thead tr { border-top: 1px solid #E8EDEB; border-bottom: 1px solid #E8EDEB; font-size: 10px; color: #9AA6A3; }
  .totals { margin-top: 8px; border-top: 1px solid #E8EDEB; padding-top: 8px; }
  .totals .row.grand { font-weight: 700; font-size: 14px; }
  .sig { display: flex; justify-content: space-between; margin-top: 28px; }
  .sig > div { width: 45%; }
  .sigline { border-bottom: 1px dotted #9AA6A3; height: 24px; }
  .sig p { font-size: 10px; color: #9AA6A3; margin: 4px 0 0; }
</style>
</head>
<body>
  ${originalHtml}
  ${copyHtml}
</body>
</html>`;
}

function printInvoiceDocument(lang, request) {
  const t = STRINGS[lang];
  const html = buildInvoiceDocumentHtml(t, lang, request);
  const printWindow = window.open("", "_blank");
  if (!printWindow) return;
  printWindow.document.open();
  printWindow.document.write(html);
  printWindow.document.close();
  printWindow.onload = () => {
    printWindow.focus();
    printWindow.print();
  };
}

function downloadBookingCodeImage(booking, lang, hotelName) {
  const W = 640, H = 820;
  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d");

  // background
  ctx.fillStyle = "#F3F6F5";
  ctx.fillRect(0, 0, W, H);

  // header banner
  const grad = ctx.createLinearGradient(0, 0, W, 220);
  grad.addColorStop(0, "#0E4A45");
  grad.addColorStop(1, "#16665F");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, W, 200);
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "700 30px sans-serif";
  ctx.textAlign = "left";
  ctx.fillText(hotelName, 40, 90);
  ctx.font = "400 16px sans-serif";
  ctx.fillStyle = "#D9F0EA";
  ctx.fillText(lang === "th" ? "ยืนยันการจอง" : "Booking confirmation", 40, 125);

  // card
  const cardX = 40, cardY = 240, cardW = W - 80, cardH = 500;
  ctx.fillStyle = "#FFFFFF";
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(cardX, cardY, cardW, cardH, 20) : ctx.rect(cardX, cardY, cardW, cardH);
  ctx.fill();
  ctx.strokeStyle = "#E8EDEB";
  ctx.lineWidth = 1;
  ctx.stroke();

  // QR placeholder block
  const qrSize = 220;
  const qrX = W / 2 - qrSize / 2;
  const qrY = cardY + 40;
  ctx.fillStyle = "#10161B";
  ctx.beginPath();
  ctx.roundRect ? ctx.roundRect(qrX, qrY, qrSize, qrSize, 16) : ctx.rect(qrX, qrY, qrSize, qrSize);
  ctx.fill();
  ctx.fillStyle = "#FFFFFF";
  ctx.font = "600 18px sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("QR", W / 2, qrY + qrSize / 2 + 6);

  // labels
  ctx.fillStyle = "#9AA6A3";
  ctx.font = "600 13px sans-serif";
  ctx.fillText(lang === "th" ? "รหัสการจอง" : "BOOKING CODE", W / 2, qrY + qrSize + 50);

  ctx.fillStyle = "#10161B";
  ctx.font = "700 40px monospace";
  ctx.fillText(booking.code, W / 2, qrY + qrSize + 100);

  ctx.fillStyle = "#5B6B67";
  ctx.font = "400 15px sans-serif";
  ctx.fillText(
    lang === "th" ? `เข้าพัก ${booking.checkIn} – ${booking.checkOut}` : `Stay ${booking.checkIn} – ${booking.checkOut}`,
    W / 2, qrY + qrSize + 140
  );

  // footer note
  ctx.fillStyle = "#5B6B67";
  ctx.font = "400 14px sans-serif";
  ctx.textAlign = "center";
  const note = lang === "th"
    ? "แสดงรหัสนี้ที่ตู้ kiosk หรือในแอปเพื่อเช็คอินได้เอง"
    : "Show this code at the kiosk or in the app to self check-in";
  ctx.fillText(note, W / 2, cardY + cardH + 50);

  const dataUrl = canvas.toDataURL("image/png");
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = `${hotelName.replace(/\s+/g, "-").toLowerCase()}-booking-${booking.code}.png`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

function getNetflixCreds(roomNo) {
  if (!roomNo) return null;
  const digits = roomNo.replace(/\D/g, "");
  const lastDigit = digits.slice(-1) || "0";
  return { profile: roomNo, password: lastDigit.repeat(4) };
}

function generateBookingCode() {
  return String(Math.floor(100000 + Math.random() * 900000)); // simple 6-digit code
}

function compressImage(dataUrl, maxWidth, quality) {
  return new Promise((resolve) => {
    try {
      const img = new Image();
      img.onload = () => {
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(img.width * scale);
        canvas.height = Math.round(img.height * scale);
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        resolve(canvas.toDataURL("image/jpeg", quality));
      };
      img.onerror = () => resolve(null);
      img.src = dataUrl;
    } catch (e) {
      resolve(null);
    }
  });
}

/* ------------------------------------------------------------------
AI SLIP VERIFICATION — sends the attached slip photo to Claude (vision)
to read the amount, date, and recipient name off a Thai bank transfer
slip, then compares them against what we expect. This is a best-effort
assist, not a guarantee — OCR on a photo can misread, and slip layouts
vary by bank/app, so results are shown as match / mismatch / uncertain
rather than a hard pass/fail, and a human should still have the final
say (especially on "mismatch" or "uncertain").
------------------------------------------------------------------- */

function parseDataUrl(dataUrl) {
  const match = /^data:([^;]+);base64,(.*)$/.exec(dataUrl || "");
  if (!match) return null;
  return { mediaType: match[1], base64: match[2] };
}

function normalizeText(s) {
  return (s || "").toString().toLowerCase().replace(/[^a-z0-9ก-๙]/g, "");
}

function fuzzyMatch(a, b) {
  const na = normalizeText(a);
  const nb = normalizeText(b);
  if (!na || !nb) return "unknown";
  if (na === nb || na.includes(nb) || nb.includes(na)) return "match";
  return "mismatch";
}

const THAI_MONTHS_MAP = { "ม.ค.": 1, "ก.พ.": 2, "มี.ค.": 3, "เม.ย.": 4, "พ.ค.": 5, "มิ.ย.": 6, "ก.ค.": 7, "ส.ค.": 8, "ก.ย.": 9, "ต.ค.": 10, "พ.ย.": 11, "ธ.ค.": 12 };

function extractDayMonth(dateStr) {
  if (!dateStr) return null;
  const numeric = dateStr.match(/(\d{1,2})[\/\-.\s](\d{1,2})/);
  if (numeric) return { day: parseInt(numeric[1], 10), month: parseInt(numeric[2], 10) };
  for (const key in THAI_MONTHS_MAP) {
    if (dateStr.includes(key)) {
      const dayMatch = dateStr.match(/(\d{1,2})/);
      if (dayMatch) return { day: parseInt(dayMatch[1], 10), month: THAI_MONTHS_MAP[key] };
    }
  }
  return null;
}

function dateFreshnessStatus(extractedDateStr) {
  const parsed = extractDayMonth(extractedDateStr);
  if (!parsed) return "unknown";
  const now = new Date();
  return (parsed.day === now.getDate() && parsed.month === now.getMonth() + 1) ? "match" : "mismatch";
}

async function verifySlipWithAI(imageDataUrl, expected) {
  const parsed = parseDataUrl(imageDataUrl);
  if (!parsed) return { error: "no_image" };

  const prompt = "This is a photo of a Thai bank transfer payment slip. Read it and respond with ONLY a raw JSON object, no markdown fences, no explanation, in exactly this shape: " +
    '{"amount": <number or null>, "date": "<date text as shown on the slip, or null>", "recipientName": "<recipient account name as shown on the slip, or null>"}';

  try {
    const response = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 300,
        messages: [{
          role: "user",
          content: [
            { type: "image", source: { type: "base64", media_type: parsed.mediaType, data: parsed.base64 } },
            { type: "text", text: prompt },
          ],
        }],
      }),
    });
    const data = await response.json();
    const rawText = (data.content || []).map(block => block.text || "").join("");
    const cleaned = rawText.replace(/```json|```/g, "").trim();
    const extracted = JSON.parse(cleaned);

    const amountStatus = extracted.amount == null ? "unknown" : (Math.abs(Number(extracted.amount) - expected.amount) < 1 ? "match" : "mismatch");
    const dateStatus = dateFreshnessStatus(extracted.date);
    const nameStatus = fuzzyMatch(extracted.recipientName, expected.name);

    return {
      amount: extracted.amount,
      date: extracted.date,
      recipientName: extracted.recipientName,
      amountStatus,
      dateStatus,
      nameStatus,
    };
  } catch (e) {
    return { error: "failed" };
  }
}

const STEP_FLOW = ["search", "results", "guest", "payment", "confirmed"];
const CHECKIN_STEPS = ["lookup", "arrival", "verify", "key", "rules", "stay", "checkout", "receipt"];

export default function HotelPrototype() {
  useFonts();
  const [lang, setLang] = useState("th");
  const [screenMode, setScreenMode] = useState("guest"); // "guest" | "admin" | "checkin"
  const [stepIdx, setStepIdx] = useState(0);
  const [checkinStepIdx, setCheckinStepIdx] = useState(0);
  const [settings, setSettings] = useState(DEFAULT_SETTINGS);
  const [booking, setBooking] = useState({
    checkInISO: todayISO(),
    checkOutISO: addDaysISO(todayISO(), 1),
    checkIn: formatDate(todayISO(), "th"),
    checkOut: formatDate(addDaysISO(todayISO(), 1), "th"),
    guests: 2,
    room: null,
    extraBed: false,
    name: "",
    email: "",
    phone: "",
    idVerified: false,
    code: "",
    roomNo: "1207",
    extras: [],
    minibar: {},
  });

  useEffect(() => {
    (async () => {
      try {
        const res = await storageGet(SETTINGS_KEY, true);
        if (res && res.value) {
          const parsed = JSON.parse(res.value);
          setSettings((s) => ({ ...s, ...parsed }));
        }
      } catch (e) {
        // no saved settings yet — keep defaults
      }
      try {
        const langRes = await storageGet(LANG_KEY, false);
        if (langRes && (langRes.value === "th" || langRes.value === "en")) {
          setLang(langRes.value);
        }
      } catch (e) {
        // no saved language preference yet — keep default
      }
    })();
  }, []);

  // keep the displayed date text in sync with the selected language
  useEffect(() => {
    setBooking(b => ({
      ...b,
      checkIn: formatDate(b.checkInISO, lang) || b.checkIn,
      checkOut: formatDate(b.checkOutISO, lang) || b.checkOut,
    }));
  }, [lang]);

  const rooms = useMemo(() => ([
    {
      id: "r1",
      name: lang === "th" ? "ห้องเตียงเดี่ยว คิงไซส์" : "King Single Room",
      size: 24,
      bed: lang === "th" ? "เตียงคิงไซส์ (เตียงเดี่ยว)" : "King-size bed (single)",
      view: lang === "th" ? "วิวเมือง" : "City view",
      price: settings.price,
      perks: ["wifi"],
      available: HOTEL_ROOM_COUNT,
      image: settings.roomImage,
    },
  ]), [settings.price, settings.roomImage, lang]);

  const step = STEP_FLOW[stepIdx];
  const t = STRINGS[lang];
  const next = () => setStepIdx((i) => Math.min(i + 1, STEP_FLOW.length - 1));
  const back = () => setStepIdx((i) => Math.max(i - 1, 0));

  return (
    <div style={{ fontFamily: "'Inter', sans-serif", minHeight: "100vh", width: "100%", background: c.tealDark, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}>
      <div style={{ width: "100%", maxWidth: 420 }}>
        <PhoneFrame>
          {screenMode === "admin" ? (
            <AdminFlow lang={lang} setLang={setLang} settings={settings} setSettings={setSettings} onExit={() => setScreenMode("guest")} />
          ) : screenMode === "checkin" ? (
            <CheckinFlow
              lang={lang} setLang={setLang}
              booking={booking}
              setBooking={setBooking}
              settings={settings}
              stepIdx={checkinStepIdx}
              setStepIdx={setCheckinStepIdx}
              onExit={() => { setScreenMode("guest"); setCheckinStepIdx(0); }}
            />
          ) : (
            <>
              <TopBar
                title={t.stepLabels[step]}
                onBack={stepIdx > 0 && step !== "confirmed" ? back : null}
                onAdmin={step === "search" ? () => setScreenMode("admin") : null}
                lang={lang}
                setLang={setLang}
              />
              <div className="flex-1 overflow-y-auto" style={{ padding: "0 20px 20px" }}>
                {step === "search" && (
                  <SearchScreen
                    lang={lang}
                    booking={booking}
                    setBooking={setBooking}
                    settings={settings}
                    onNext={next}
                    onCheckin={() => { setScreenMode("checkin"); setCheckinStepIdx(0); }}
                  />
                )}
                {step === "results" && <ResultsScreen lang={lang} rooms={rooms} booking={booking} setBooking={setBooking} onNext={next} />}
                {step === "guest" && <GuestScreen lang={lang} booking={booking} setBooking={setBooking} onNext={next} />}
                {step === "payment" && <PaymentScreen lang={lang} booking={booking} setBooking={setBooking} settings={settings} onNext={next} />}
                {step === "confirmed" && <ConfirmedScreen lang={lang} booking={booking} onRestart={() => setStepIdx(0)} />}
              </div>
            </>
          )}
        </PhoneFrame>
        <p style={{ textAlign: "center", color: c.brassPale, fontSize: 12, marginTop: 16, letterSpacing: "0.02em" }}>
          {lang === "th" ? "ต้นแบบ (Prototype) — คลิกเพื่อทดลองทุกขั้นตอนของ flow" : "Prototype — click through to try every step of the flow"}
        </p>
      </div>
    </div>
  );
}

/* ---------------- Shell components ---------------- */

function PhoneFrame({ children }) {
  return (
    <div style={{ background: c.ink, borderRadius: "2.2rem", padding: 10, boxShadow: "0 25px 50px -12px rgba(0,0,0,0.5)" }}>
      <div style={{ background: c.paper, borderRadius: "1.7rem", overflow: "hidden", display: "flex", flexDirection: "column", height: 780, position: "relative" }}>
        {children}
      </div>
    </div>
  );
}

function LanguageSwitcher({ lang, setLang }) {
  const [open, setOpen] = useState(false);
  const options = [
    { code: "th", flag: "🇹🇭", label: "ไทย" },
    { code: "en", flag: "🇬🇧", label: "English" },
  ];
  const current = options.find(o => o.code === lang) || options[0];

  const choose = async (code) => {
    setLang(code);
    setOpen(false);
    try { await storageSet(LANG_KEY, code, false); } catch (e) { /* ignore */ }
  };

  return (
    <div style={{ position: "relative" }}>
      <button
        type="button"
        onClick={() => setOpen(o => !o)}
        className="flex items-center gap-1 justify-center"
        style={{ height: 32, padding: "0 10px", borderRadius: "9999px", background: c.white, boxShadow: "0 1px 2px rgba(0,0,0,0.06)", border: "none", cursor: "pointer" }}
        aria-label="Language"
      >
        <span style={{ fontSize: 16, lineHeight: 1 }}>{current.flag}</span>
        <ChevronDown size={12} style={{ color: c.textMuted }} />
      </button>
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 19 }} />
          <div style={{ position: "absolute", top: 38, right: 0, background: c.white, borderRadius: "0.6rem", boxShadow: "0 8px 24px rgba(0,0,0,0.18)", border: `1px solid ${c.paperBorder}`, overflow: "hidden", zIndex: 20, minWidth: 128 }}>
            {options.map(o => (
              <button
                key={o.code}
                type="button"
                onClick={() => choose(o.code)}
                className="flex items-center gap-2 w-full"
                style={{ padding: "9px 12px", background: o.code === lang ? c.paper : c.white, border: "none", cursor: "pointer", fontSize: 13, color: c.ink, textAlign: "left" }}
              >
                <span style={{ fontSize: 16, lineHeight: 1 }}>{o.flag}</span> {o.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

function TopBar({ title, onBack, onAdmin, lang, setLang }) {
  return (
    <div className="flex items-center gap-3 sticky top-0 z-10" style={{ padding: "24px 20px 16px", background: c.paper, borderBottom: `1px solid ${c.paperBorder}` }}>
      {onBack ? (
        <button type="button" onClick={onBack} className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: "9999px", background: c.white, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
          <ChevronLeft size={18} style={{ color: c.tealDark }} />
        </button>
      ) : <div style={{ width: 32, height: 32, flexShrink: 0 }} />}
      <div className="flex-1">
        <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: c.brass, fontWeight: 600 }}>{HOTEL_NAME}</p>
        <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: c.ink, lineHeight: 1.2 }}>{title}</h1>
      </div>
      <div className="flex items-center gap-2 shrink-0">
        {onAdmin && (
          <button type="button" onClick={onAdmin} aria-label="Admin" className="flex items-center justify-center" style={{ width: 32, height: 32, borderRadius: "9999px", background: c.white, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
            <Settings size={16} style={{ color: c.brass }} />
          </button>
        )}
        <LanguageSwitcher lang={lang} setLang={setLang} />
      </div>
    </div>
  );
}

function PrimaryButton({ children, onClick, disabled, icon: Icon }) {
  const [pressed, setPressed] = useState(false);
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onMouseLeave={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      className="w-full flex items-center justify-center gap-2"
      style={{
        padding: "14px 0",
        borderRadius: "0.75rem",
        fontWeight: 600,
        fontSize: 14,
        transition: "transform 0.15s, background 0.15s",
        transform: pressed && !disabled ? "scale(0.98)" : "scale(1)",
        background: disabled ? c.disabledBg : c.brass,
        color: disabled ? c.disabledText : c.white,
        cursor: disabled ? "not-allowed" : "pointer",
        border: "none",
        boxShadow: disabled ? "none" : `0 10px 20px -8px ${c.brass}55`,
      }}
    >
      {children}
      {Icon && <Icon size={16} />}
    </button>
  );
}

function SectionLabel({ children }) {
  return <p className="mb-2" style={{ fontSize: 12, fontWeight: 600, color: c.teal, textTransform: "uppercase", letterSpacing: "0.1em" }}>{children}</p>;
}

function TextField({ icon: Icon, value, onChange, placeholder, type = "text", inputMode, maxLength }) {
  const [focused, setFocused] = useState(false);
  return (
    <div
      className="flex items-center gap-2"
      style={{
        background: c.white,
        borderRadius: "0.75rem",
        padding: "12px 16px",
        border: `1px solid ${focused ? c.teal : c.paperBorder}`,
        transition: "border-color 0.15s",
      }}
    >
      {Icon && <Icon size={15} style={{ color: c.teal, flexShrink: 0 }} />}
      <input
        value={value}
        onChange={onChange}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        placeholder={placeholder}
        type={type}
        inputMode={inputMode}
        maxLength={maxLength}
        className="flex-1"
        style={{ fontSize: 14, outline: "none", background: "transparent", border: "none", color: c.ink, width: "100%" }}
      />
    </div>
  );
}

function DateField({ icon: Icon, label, isoValue, min, onChangeIso }) {
  return (
    <label
      className="flex-1 flex items-center gap-2"
      style={{ position: "relative", background: c.white, borderRadius: "0.75rem", padding: "12px 16px", border: `1px solid ${c.paperBorder}`, fontSize: 14, color: c.ink, cursor: "pointer" }}
    >
      <Icon size={15} style={{ color: c.teal, flexShrink: 0 }} />
      <span style={{ flex: 1 }}>{label}</span>
      <input
        type="date"
        value={isoValue}
        min={min}
        onChange={(e) => onChangeIso(e.target.value)}
        style={{ position: "absolute", inset: 0, opacity: 0, cursor: "pointer", border: "none" }}
      />
    </label>
  );
}

/* ---------------- 1. Search ---------------- */

function SearchScreen({ lang, booking, setBooking, settings, onNext, onCheckin }) {
  const t = STRINGS[lang];
  return (
    <div className="pt-2" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ borderRadius: "1rem", padding: 20, color: c.white, background: `linear-gradient(to bottom right, ${c.tealDark}, ${c.teal})` }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 20, marginBottom: 4 }}>{HOTEL_NAME}</p>
        <p style={{ fontSize: 12, color: c.tealPale }}>{t.tagline}</p>
      </div>

      <div>
        <SectionLabel>{t.search.datesLabel}</SectionLabel>
        <div className="flex gap-2">
          <DateField
            icon={Calendar}
            label={booking.checkIn}
            isoValue={booking.checkInISO}
            min={todayISO()}
            onChangeIso={(iso) => setBooking(b => {
              const nextCheckOutISO = b.checkOutISO && b.checkOutISO > iso ? b.checkOutISO : addDaysISO(iso, 1);
              return {
                ...b,
                checkInISO: iso,
                checkIn: formatDate(iso, lang),
                checkOutISO: nextCheckOutISO,
                checkOut: formatDate(nextCheckOutISO, lang),
              };
            })}
          />
          <DateField
            icon={Calendar}
            label={booking.checkOut}
            isoValue={booking.checkOutISO}
            min={addDaysISO(booking.checkInISO, 1)}
            onChangeIso={(iso) => setBooking(b => ({ ...b, checkOutISO: iso, checkOut: formatDate(iso, lang) }))}
          />
        </div>
      </div>

      <div>
        <SectionLabel>{t.search.guestsLabel}</SectionLabel>
        <div className="flex items-center justify-between" style={{ background: c.white, borderRadius: "0.75rem", padding: "12px 16px", border: `1px solid ${c.paperBorder}` }}>
          <div className="flex items-center gap-2" style={{ color: c.ink }}><Users size={16} style={{ color: c.teal }} /> {t.search.adultLabel}</div>
          <div className="flex items-center gap-3">
            <button type="button" onClick={() => setBooking(b => ({ ...b, guests: Math.max(1, b.guests - 1) }))} className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "9999px", background: c.paper, border: "none" }}><Minus size={14} /></button>
            <span style={{ width: 16, textAlign: "center", fontWeight: 500 }}>{booking.guests}</span>
            <button type="button" onClick={() => setBooking(b => ({ ...b, guests: b.guests + 1 }))} className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "9999px", background: c.paper, border: "none" }}><Plus size={14} /></button>
          </div>
        </div>
      </div>

      <a
        href={HOTEL_MAP_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="flex items-center gap-2"
        style={{ background: c.white, borderRadius: "0.75rem", padding: "12px 16px", border: `1px solid ${c.paperBorder}`, color: c.ink, fontSize: 14, textDecoration: "none" }}
      >
        <MapPin size={16} style={{ color: c.teal }} />
        <span className="flex-1">{HOTEL_NAME}</span>
        <span style={{ fontSize: 12, color: c.teal, textDecoration: "underline" }}>{t.search.mapCta}</span>
      </a>

      <div style={{ borderRadius: "0.75rem", background: c.paper, padding: "12px 16px", textAlign: "center" }}>
        <p style={{ fontSize: 14, color: c.ink }}>{t.search.priceLine(settings.price)}</p>
      </div>

      <PrimaryButton onClick={onNext} icon={Search}>{t.search.searchBtn}</PrimaryButton>

      <button
        type="button"
        onClick={onCheckin}
        className="w-full flex items-center justify-center gap-2"
        style={{ padding: "13px 0", borderRadius: "0.75rem", fontWeight: 600, fontSize: 14, border: `2px solid ${c.tealDark}`, color: c.tealDark, background: "transparent", cursor: "pointer" }}
      >
        <KeyRound size={16} /> {t.search.checkinBtn}
      </button>
    </div>
  );
}

/* ---------------- 2. Results ---------------- */

function ResultsScreen({ lang, rooms, booking, setBooking, onNext }) {
  const t = STRINGS[lang];
  const [extraBed, setExtraBed] = useState(false);

  const selectRoom = (r) => {
    setBooking(b => ({ ...b, room: r, extraBed }));
    onNext();
  };

  return (
    <div className="pt-2" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <p style={{ fontSize: 14, color: c.textMuted }}>
        {t.results.summaryLine(booking.checkIn, booking.checkOut, booking.guests, rooms[0] ? rooms[0].price.toLocaleString() : "")}
      </p>
      {rooms.map((r) => (
        <div
          key={r.id}
          role="button"
          tabIndex={0}
          onClick={() => selectRoom(r)}
          onKeyDown={(e) => { if (e.key === "Enter") selectRoom(r); }}
          style={{ background: c.white, borderRadius: "1rem", border: `1px solid ${c.paperBorder}`, overflow: "hidden", cursor: "pointer" }}
        >
          <div style={{ height: 112 }}>
            {r.image ? (
              <img
                src={r.image}
                alt={r.name}
                style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }}
                onError={(e) => { e.currentTarget.style.display = "none"; }}
              />
            ) : (
              <div className="flex items-center justify-center" style={{ width: "100%", height: "100%", background: `linear-gradient(to bottom right, ${c.brassPale}, ${c.brassLight})` }}>
                <BedDouble size={32} color="rgba(255,255,255,0.8)" />
              </div>
            )}
          </div>
          <div style={{ padding: 16 }}>
            <p style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: c.ink }}>{r.name}</p>
            <p style={{ fontSize: 12, color: c.textMuted, marginTop: 2 }}>{r.size} {lang === "th" ? "ตร.ม." : "sqm"} · {r.bed} · {r.view}</p>
            <div className="flex gap-2 items-center" style={{ marginTop: 8, flexWrap: "wrap" }}>
              {r.perks.includes("wifi") && <PerkPill icon={Wifi} label={t.results.perkWifi} />}
              <PerkPill icon={Tv} label="Netflix" />
              {r.perks.includes("breakfast") && <PerkPill icon={Coffee} label={t.results.perkBreakfast} />}
              {r.perks.includes("bath") && <PerkPill icon={Bath} label={t.results.perkBath} />}
            </div>

            <label
              className="flex items-center justify-between"
              onClick={(e) => e.stopPropagation()}
              style={{ marginTop: 12, padding: "10px 12px", borderRadius: "0.6rem", background: extraBed ? c.brassBg : c.paper, border: `1px solid ${extraBed ? c.brassPale : c.paperBorder}`, cursor: "pointer" }}
            >
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  checked={extraBed}
                  onChange={(e) => setExtraBed(e.target.checked)}
                  style={{ width: 16, height: 16, accentColor: c.brass }}
                />
                <span style={{ fontSize: 13, color: c.ink }}>{t.results.addonLabel}</span>
              </div>
              <span style={{ fontSize: 13, fontWeight: 600, color: c.brass }}>{t.results.addonPrice}</span>
            </label>

            <div className="flex items-end justify-between" style={{ marginTop: 12 }}>
              <div>
                <p style={{ fontSize: 20, fontWeight: 600, color: c.ink }}>฿{(r.price + (extraBed ? ADDON_PRICE : 0)).toLocaleString()}</p>
                <p style={{ fontSize: 11, color: c.textFaint }}>{t.results.perNightTax}{extraBed ? ` · ${t.results.addonLabel}` : ""}</p>
              </div>
              <button
                type="button"
                onClick={(e) => { e.stopPropagation(); selectRoom(r); }}
                style={{ padding: "10px 20px", borderRadius: "0.5rem", background: c.tealDark, color: c.white, fontSize: 14, fontWeight: 600, border: "none", cursor: "pointer" }}
              >
                {t.results.selectBtn}
              </button>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

const SLIP_STATUS_META = {
  match: { color: c.success, bg: "#E9F6EF" },
  mismatch: { color: c.coral, bg: "#FBEAE3" },
  unknown: { color: c.textMuted, bg: c.paper },
};

function SlipStatusBadge({ status, t }) {
  const meta = SLIP_STATUS_META[status] || SLIP_STATUS_META.unknown;
  const label = status === "match" ? t.slipCheck.statusMatch : status === "mismatch" ? t.slipCheck.statusMismatch : t.slipCheck.statusUnknown;
  return (
    <span style={{ fontSize: 11, fontWeight: 600, padding: "3px 8px", borderRadius: "9999px", background: meta.bg, color: meta.color, whiteSpace: "nowrap" }}>
      {label}
    </span>
  );
}

function SlipCheckResult({ lang, result, expected }) {
  const t = STRINGS[lang];
  if (!result) return null;
  if (result.error) {
    return (
      <div className="flex items-start gap-2" style={{ background: "#FBEAE3", borderRadius: "0.75rem", padding: 12 }}>
        <ShieldCheck size={15} style={{ color: c.coral, marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: c.coral }}>{t.slipCheck.failedNote}</p>
      </div>
    );
  }
  const anyMismatch = result.amountStatus === "mismatch" || result.dateStatus === "mismatch" || result.nameStatus === "mismatch";
  const rows = [
    { label: t.slipCheck.amountLabel, expectedVal: `฿${expected.amount.toLocaleString()}`, readVal: result.amount != null ? `฿${Number(result.amount).toLocaleString()}` : "-", status: result.amountStatus },
    { label: t.slipCheck.dateLabel, expectedVal: lang === "th" ? "วันนี้" : "today", readVal: result.date || "-", status: result.dateStatus },
    { label: t.slipCheck.nameLabel, expectedVal: expected.name, readVal: result.recipientName || "-", status: result.nameStatus },
  ];
  return (
    <div style={{ background: c.white, borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, padding: 12 }}>
      <p style={{ fontSize: 12, fontWeight: 600, color: c.teal, marginBottom: 8 }}>{t.slipCheck.title}</p>
      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {rows.map((row, i) => (
          <div key={i} style={{ display: "flex", flexDirection: "column", gap: 2 }}>
            <div className="flex items-center justify-between">
              <span style={{ fontSize: 12, color: c.ink, fontWeight: 500 }}>{row.label}</span>
              <SlipStatusBadge status={row.status} t={t} />
            </div>
            <p style={{ fontSize: 11, color: c.textFaint }}>
              {t.slipCheck.expected}: {row.expectedVal} · {t.slipCheck.readFromSlip}: {row.readVal}
            </p>
          </div>
        ))}
      </div>
      <div style={{ height: 1, background: c.paperBorder, margin: "10px 0" }} />
      <p style={{ fontSize: 11, color: anyMismatch ? c.coral : c.success }}>
        {anyMismatch ? t.slipCheck.warningNote : t.slipCheck.okNote}
      </p>
      <p style={{ fontSize: 10, color: c.textFaint, marginTop: 6 }}>{t.slipCheck.disclaimer}</p>
    </div>
  );
}

function PerkPill({ icon: Icon, label }) {
  return (
    <span className="flex items-center gap-1" style={{ fontSize: 11, padding: "4px 8px", borderRadius: "9999px", background: c.paper, color: c.teal }}>
      <Icon size={11} /> {label}
    </span>
  );
}

/* ---------------- 3. Guest info ---------------- */

function GuestScreen({ lang, booking, setBooking, onNext }) {
  const t = STRINGS[lang];
  const nameOk = booking.name.trim().length > 1;
  const emailOk = booking.email.trim() === "" || (booking.email.includes("@") && booking.email.includes("."));
  const phoneOk = booking.phone.replace(/\D/g, "").length >= 9;
  const valid = nameOk && emailOk && phoneOk;

  const missing = [];
  if (!nameOk) missing.push(t.guest.missingName);
  if (!phoneOk) missing.push(t.guest.missingPhone);
  if (!emailOk) missing.push(t.guest.missingEmail);

  return (
    <div className="pt-2" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <RoomSummaryCard lang={lang} booking={booking} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <div>
          <SectionLabel>{t.guest.nameLabel}</SectionLabel>
          <TextField
            value={booking.name}
            onChange={(e) => setBooking(b => ({ ...b, name: e.target.value }))}
            placeholder={t.guest.namePlaceholder}
          />
        </div>
        <div>
          <SectionLabel>{t.guest.phoneLabel}</SectionLabel>
          <TextField
            icon={Phone}
            value={booking.phone}
            onChange={(e) => setBooking(b => ({ ...b, phone: e.target.value }))}
            placeholder={t.guest.phonePlaceholder}
            type="tel"
          />
        </div>
        <div>
          <SectionLabel>{t.guest.emailLabel}</SectionLabel>
          <TextField
            value={booking.email}
            onChange={(e) => setBooking(b => ({ ...b, email: e.target.value }))}
            placeholder={t.guest.emailPlaceholder}
          />
        </div>
        <div className="flex items-start gap-2" style={{ background: c.paper, borderRadius: "0.75rem", padding: 12 }}>
          <ShieldCheck size={16} style={{ color: c.teal, marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: c.textMuted }}>{t.guest.idNote}</p>
        </div>
      </div>
      <PrimaryButton onClick={onNext} disabled={!valid} icon={ChevronRight}>{t.guest.continueBtn}</PrimaryButton>
      {!valid && (
        <p style={{ fontSize: 12, color: c.textFaint, textAlign: "center", marginTop: -8 }}>
          {t.guest.missingPrefix}{missing.join(", ")}
        </p>
      )}
    </div>
  );
}

function RoomSummaryCard({ lang, booking }) {
  const t = STRINGS[lang];
  if (!booking.room) return null;
  const nights = calcNights(booking.checkInISO, booking.checkOutISO);
  const addonTotal = booking.extraBed ? ADDON_PRICE * nights : 0;
  const total = booking.room.price * nights + addonTotal;
  return (
    <div className="flex items-center gap-3" style={{ background: c.white, borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, padding: 12 }}>
      <div className="flex items-center justify-center shrink-0" style={{ width: 48, height: 48, borderRadius: "0.5rem", overflow: "hidden", background: `linear-gradient(to bottom right, ${c.brassPale}, ${c.brassLight})` }}>
        {booking.room.image ? (
          <img src={booking.room.image} alt={booking.room.name} style={{ width: "100%", height: "100%", objectFit: "cover" }} onError={(e) => { e.currentTarget.style.display = "none"; }} />
        ) : (
          <BedDouble size={18} color="white" />
        )}
      </div>
      <div className="flex-1">
        <p style={{ fontSize: 14, fontWeight: 500, color: c.ink }}>{booking.room.name}</p>
        <p style={{ fontSize: 11, color: c.textFaint }}>{booking.checkIn} – {booking.checkOut} · {t.roomSummary.nights(nights)}{booking.extraBed ? t.roomSummary.withAddon : ""}</p>
      </div>
      <p style={{ fontSize: 14, fontWeight: 600, color: c.ink }}>฿{total.toLocaleString()}</p>
    </div>
  );
}

/* ---------------- 4. Payment ---------------- */
const PAYMENT_QR_IMAGE = "data:image/jpeg;base64,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";

function PaymentScreen({ lang, booking, setBooking, settings, onNext }) {
  const t = STRINGS[lang];
  const [processing, setProcessing] = useState(false);
  const [slip, setSlip] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [slipCheck, setSlipCheck] = useState(null);
  const fileRef = useRef(null);
  const nights = calcNights(booking.checkInISO, booking.checkOutISO);
  const roomTotal = booking.room ? booking.room.price * nights : 0;
  const addonTotal = booking.extraBed ? ADDON_PRICE * nights : 0;
  const total = roomTotal + addonTotal;
  const taxRate = (settings.taxRate ?? 7) / 100;
  const tax = Math.round(total * taxRate);
  const grandTotal = total + tax;

  const runVerify = async (imageDataUrl) => {
    setVerifying(true);
    setSlipCheck(null);
    const result = await verifySlipWithAI(imageDataUrl, { amount: grandTotal, name: HOTEL_ACCOUNT_NAME });
    setSlipCheck(result);
    setVerifying(false);
  };

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSlip(reader.result);
      runVerify(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const pay = async () => {
    setProcessing(true);
    const freshCode = generateBookingCode();
    const compressedSlip = slip ? await compressImage(slip, 640, 0.7) : null;
    const record = {
      id: `${freshCode}-${Date.now()}`,
      code: freshCode,
      name: booking.name,
      phone: booking.phone,
      email: booking.email,
      roomName: booking.room ? booking.room.name : "",
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      amount: grandTotal,
      slipAttached: !!slip,
      slipImage: compressedSlip,
      slipCheck: slipCheck || null,
      paidAt: new Date().toISOString(),
    };

    let bookingSaved = false;
    try {
      let list = [];
      try {
        const existing = await storageGet(BOOKINGS_KEY, true);
        if (existing && existing.value) list = JSON.parse(existing.value);
      } catch (e) {
        list = [];
      }
      list.push(record);
      const result = await storageSet(BOOKINGS_KEY, JSON.stringify(list), true);
      bookingSaved = !!result;
      if (!result) console.error("Storage set failed for BOOKINGS_KEY (returned null)");
    } catch (e) {
      console.error("Storage error while saving booking:", e);
    }

    let roomAssigned = false;
    try {
      let rooms = [];
      try {
        const existingRooms = await storageGet(ROOMS_KEY, true);
        rooms = existingRooms && existingRooms.value ? JSON.parse(existingRooms.value) : buildDefaultRooms();
      } catch (e) {
        rooms = buildDefaultRooms();
      }
      const readyRooms = rooms.filter(r => r.status === "ready");
      const eligibleRooms = booking.extraBed ? readyRooms.filter(r => !r.noExtraBed) : readyRooms;
      let target = eligibleRooms[0] || readyRooms[0] || rooms[0];
      const updatedRooms = rooms.map(r => r.number === target.number ? {
        ...r,
        status: "pending",
        guestName: booking.name,
        phone: booking.phone,
        checkIn: booking.checkIn,
        checkOut: booking.checkOut,
        code: freshCode,
        hasExtraBed: !!booking.extraBed,
      } : r);
      const roomResult = await storageSet(ROOMS_KEY, JSON.stringify(updatedRooms), true);
      roomAssigned = !!roomResult;
      if (roomResult) setBooking(b => ({ ...b, roomNo: target.number }));
      else console.error("Storage set failed for ROOMS_KEY (returned null)");
    } catch (e) {
      console.error("Storage error while assigning room:", e);
    }

    setBooking(b => ({ ...b, code: freshCode, backendSynced: bookingSaved && roomAssigned, usingFallback: isUsingFallback() }));
    setTimeout(() => { setProcessing(false); onNext(); }, 1200);
  };

  return (
    <div className="pt-2" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <RoomSummaryCard lang={lang} booking={booking} />
      <div>
        <SectionLabel>{t.payment.summaryLabel}</SectionLabel>
        <div style={{ background: c.white, borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, padding: 16, fontSize: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="flex justify-between" style={{ color: c.textMuted }}><span>{t.payment.roomLine(nights)}</span><span>฿{roomTotal.toLocaleString()}</span></div>
          {booking.extraBed && (
            <div className="flex justify-between" style={{ color: c.textMuted }}><span>{t.payment.addonLine(nights)}</span><span>฿{addonTotal.toLocaleString()}</span></div>
          )}
          <div className="flex justify-between" style={{ color: c.textMuted }}><span>{t.payment.taxLine(settings.taxRate ?? 7)}</span><span>฿{tax.toLocaleString()}</span></div>
          <div style={{ height: 1, background: c.paperBorder, margin: "4px 0" }} />
          <div className="flex justify-between" style={{ fontWeight: 600, color: c.ink }}><span>{t.payment.totalLine}</span><span>฿{grandTotal.toLocaleString()}</span></div>
        </div>
      </div>

      <div>
        <SectionLabel>{t.payment.qrLabel}</SectionLabel>
        <div style={{ background: c.white, borderRadius: "1rem", border: `2px solid ${c.brass}`, padding: 16, textAlign: "center" }}>
          <img
            src={PAYMENT_QR_IMAGE}
            alt="PromptPay QR"
            style={{ width: "100%", maxWidth: 260, margin: "0 auto", borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, display: "block" }}
          />
          <p style={{ fontSize: 14, fontWeight: 500, color: c.ink, marginTop: 12 }}>{t.payment.scanToPay(grandTotal)}</p>
          <p style={{ fontSize: 11, color: c.textFaint, marginTop: 4 }}>{t.payment.promptpayNote}</p>
        </div>
      </div>

      <div>
        <SectionLabel>{t.payment.attachSlipLabel}</SectionLabel>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
        {!slip ? (
          <button
            type="button"
            onClick={() => fileRef.current && fileRef.current.click()}
            className="w-full flex flex-col items-center gap-2"
            style={{ padding: "24px 0", borderRadius: "0.75rem", border: `2px dashed ${c.brassPale}`, background: c.brassBg, color: c.brass }}
          >
            <Upload size={22} />
            <span style={{ fontSize: 14, fontWeight: 500 }}>{t.payment.tapToAttach}</span>
          </button>
        ) : (
          <div style={{ position: "relative" }}>
            <img src={slip} alt="Payment slip" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, display: "block" }} />
            <button
              type="button"
              onClick={() => { setSlip(null); setSlipCheck(null); }}
              className="flex items-center justify-center"
              style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "9999px", background: c.white, border: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
            >
              <X size={14} style={{ color: c.ink }} />
            </button>
            <div className="flex items-center gap-1" style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(255,255,255,0.9)", borderRadius: "9999px", padding: "4px 8px" }}>
              <Check size={12} style={{ color: c.success }} />
              <span style={{ fontSize: 11, color: c.success, fontWeight: 500 }}>{t.payment.slipAttached}</span>
            </div>
          </div>
        )}
      </div>

      {verifying && (
        <div className="flex items-center gap-2" style={{ background: c.paper, borderRadius: "0.75rem", padding: 12 }}>
          <Loader2 size={16} className="animate-spin" style={{ color: c.teal }} />
          <p style={{ fontSize: 12, color: c.textMuted }}>{t.slipCheck.checking}</p>
        </div>
      )}
      {!verifying && slipCheck && (
        <SlipCheckResult lang={lang} result={slipCheck} expected={{ amount: grandTotal, name: HOTEL_ACCOUNT_NAME }} />
      )}

      <PrimaryButton onClick={pay} disabled={!slip || processing || verifying} icon={processing ? undefined : Paperclip}>
        {processing ? <><Loader2 size={16} className="animate-spin" /> {t.payment.processing}</> : t.payment.confirmBtn}
      </PrimaryButton>
      {!slip && <p style={{ fontSize: 11, color: c.textFaint, textAlign: "center" }}>{t.payment.needSlip}</p>}
    </div>
  );
}

/* ---------------- 5. Confirmed (end of the booking flow — check-in happens separately) ---------------- */

function ConfirmedScreen({ lang, booking, onRestart }) {
  const t = STRINGS[lang];
  return (
    <div className="pt-4" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20 }}>
      <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: "9999px", background: c.success }}>
        <Check size={28} color="white" />
      </div>
      <div>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: c.ink }}>{t.confirmed.successTitle}</p>
        <p style={{ fontSize: 14, color: c.textMuted, marginTop: 4 }}>{t.confirmed.successSub}</p>
      </div>

      <div style={{ background: c.white, borderRadius: "1rem", border: `1px solid ${c.paperBorder}`, padding: 20, width: "100%" }}>
        <div className="flex items-center justify-center" style={{ width: 112, height: 112, margin: "0 auto 12px", background: c.ink, borderRadius: "0.5rem" }}>
          <QrCode size={64} color="white" />
        </div>
        <p style={{ fontSize: 11, color: c.textFaint, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.confirmed.bookingCode}</p>
        <p style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 600, color: c.ink, letterSpacing: "0.05em" }}>{booking.code}</p>
      </div>

      <button
        type="button"
        onClick={() => downloadBookingCodeImage(booking, lang, HOTEL_NAME)}
        className="w-full flex items-center justify-center gap-2"
        style={{ padding: "13px 0", borderRadius: "0.75rem", fontWeight: 600, fontSize: 14, border: `2px solid ${c.brass}`, color: c.brass, background: "transparent", cursor: "pointer" }}
      >
        <Upload size={16} style={{ transform: "rotate(180deg)" }} /> {t.confirmed.saveImageBtn}
      </button>

      <div className="flex items-start gap-2" style={{ background: c.paper, borderRadius: "0.75rem", padding: 16, textAlign: "left", width: "100%" }}>
        <Bell size={16} style={{ color: c.teal, marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: c.textMuted }}>{t.confirmed.arriveNote(booking.checkIn)}</p>
      </div>

      {booking.usingFallback && (
        <div className="flex items-start gap-2" style={{ background: c.brassBg, borderRadius: "0.75rem", padding: 16, textAlign: "left", width: "100%" }}>
          <ShieldCheck size={16} style={{ color: c.brass, marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: c.brass }}>
            {lang === "th"
              ? "หมายเหตุ: อุปกรณ์นี้ไม่รองรับระบบหลังบ้านจริง การจองนี้เก็บไว้แบบชั่วคราวในเซสชันนี้เท่านั้น — เปิดแท็บแอดมินต่อจากหน้านี้โดยไม่รีเฟรชจะเห็นข้อมูล แต่จะหายไปถ้าปิดหรือรีเฟรชหน้า"
              : "Note: this device doesn't support the real backend. This booking is stored temporarily for this session only — open the admin tab from here without refreshing to see it, but it will be lost if you close or reload the page."}
          </p>
        </div>
      )}

      {booking.backendSynced === false && (
        <div className="flex items-start gap-2" style={{ background: "#FBEAE3", borderRadius: "0.75rem", padding: 16, textAlign: "left", width: "100%" }}>
          <ShieldCheck size={16} style={{ color: c.coral, marginTop: 2, flexShrink: 0 }} />
          <p style={{ fontSize: 12, color: c.coral }}>
            {lang === "th"
              ? "ไม่สามารถบันทึกการจองนี้ได้เลย (แม้แต่แบบชั่วคราว) — ลองจองใหม่อีกครั้ง"
              : "This booking couldn't be saved at all (not even temporarily) — please try booking again."}
          </p>
        </div>
      )}

      <PrimaryButton onClick={onRestart}>
        {lang === "th" ? "กลับสู่หน้าหลัก" : "Back to home"}
      </PrimaryButton>
    </div>
  );
}

/* ---------------- Screens shared with the separate self check-in flow ---------------- */

function ArrivalScreen({ lang, booking, onNext }) {
  const t = STRINGS[lang];
  return (
    <div className="pt-4" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ borderRadius: "1rem", padding: 20, color: c.white, textAlign: "center", background: `linear-gradient(to bottom right, ${c.teal}, ${c.tealDark})` }}>
        <Clock size={22} style={{ margin: "0 auto 8px", color: c.brassPale, display: "block" }} />
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 16 }}>{t.arrival.welcomeTitle}</p>
        <p style={{ fontSize: 12, color: c.tealPale, marginTop: 4 }}>{t.arrival.welcomeSub}</p>
      </div>

      <RoomSummaryCard lang={lang} booking={booking} />

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        <StepRow n={1} label={t.arrival.step1} active />
        <StepRow n={2} label={t.arrival.step2} />
        <StepRow n={3} label={t.arrival.step3} />
      </div>

      <div style={{ background: c.white, borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, padding: 16, textAlign: "center", fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, letterSpacing: "0.1em", color: c.ink }}>
        {booking.code}
      </div>

      <PrimaryButton onClick={onNext} icon={FileText}>{t.arrival.startVerify}</PrimaryButton>
    </div>
  );
}

function StepRow({ n, label, active }) {
  return (
    <div className="flex items-center gap-3">
      <div className="flex items-center justify-center shrink-0" style={{ width: 28, height: 28, borderRadius: "9999px", fontSize: 12, fontWeight: 600, background: active ? c.tealDark : c.paperBorder, color: active ? c.white : c.textFaint }}>{n}</div>
      <p style={{ fontSize: 14, color: active ? c.ink : c.textFaint, fontWeight: active ? 500 : 400 }}>{label}</p>
    </div>
  );
}

function VerifyScreen({ lang, booking, setBooking, onNext }) {
  const t = STRINGS[lang];
  const [status, setStatus] = useState("idle"); // idle, scanning, done
  const [idPhoto, setIdPhoto] = useState(null);
  const fileRef = useRef(null);

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setIdPhoto(reader.result);
      setStatus("scanning");
      setTimeout(() => {
        setStatus("done");
        setBooking(b => ({ ...b, idVerified: true }));
      }, 1500);
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="pt-4" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 24 }}>
      {idPhoto ? (
        <div style={{ position: "relative", width: "100%" }}>
          <img src={idPhoto} alt="ID document" style={{ width: "100%", height: 200, objectFit: "cover", borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, display: "block" }} />
          {status === "scanning" && (
            <div className="flex items-center justify-center" style={{ position: "absolute", inset: 0, background: "rgba(16,22,27,0.55)", borderRadius: "0.75rem" }}>
              <Loader2 size={28} className="animate-spin" color="white" />
            </div>
          )}
          {status === "done" && (
            <div className="flex items-center justify-center" style={{ position: "absolute", bottom: -10, right: -10, width: 36, height: 36, borderRadius: "9999px", background: c.success, border: `2px solid ${c.white}` }}>
              <Check size={16} color="white" />
            </div>
          )}
        </div>
      ) : (
        <div className="flex items-center justify-center" style={{ width: 160, height: 160, borderRadius: "9999px", background: c.white, border: `2px solid ${c.paperBorder}` }}>
          <FileText size={48} color="#B0B9B6" />
        </div>
      )}

      <div>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: c.ink }}>
          {status === "idle" && t.verify.idleTitle}
          {status === "scanning" && t.verify.scanningTitle}
          {status === "done" && t.verify.doneTitle}
        </p>
        <p style={{ fontSize: 14, color: c.textMuted, marginTop: 4 }}>
          {status !== "done" ? t.verify.idleSub : t.verify.doneSub(booking.name || t.verify.defaultGuest)}
        </p>
      </div>

      <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />

      {status === "idle" && (
        <button
          type="button"
          onClick={() => fileRef.current && fileRef.current.click()}
          className="w-full flex flex-col items-center gap-2"
          style={{ padding: "24px 0", borderRadius: "0.75rem", border: `2px dashed ${c.brassPale}`, background: c.brassBg, color: c.brass, cursor: "pointer" }}
        >
          <Upload size={22} />
          <span style={{ fontSize: 14, fontWeight: 500 }}>{t.verify.tapToAttachId}</span>
        </button>
      )}
      {status === "done" && <PrimaryButton onClick={onNext} icon={KeyRound}>{t.verify.getKeyBtn}</PrimaryButton>}
      {status === "scanning" && <p style={{ fontSize: 12, color: c.textFaint }}>{t.verify.dontMove}</p>}
    </div>
  );
}

function KeyScreen({ lang, booking, settings, onNext }) {
  const t = STRINGS[lang];
  const [revealed, setRevealed] = useState(false);
  const netflix = getNetflixCreds(booking.roomNo);
  useEffect(() => { const timer = setTimeout(() => setRevealed(true), 400); return () => clearTimeout(timer); }, []);

  useEffect(() => {
    (async () => {
      try {
        const res = await storageGet(ROOMS_KEY, true);
        const rooms = res && res.value ? JSON.parse(res.value) : null;
        if (!rooms) return;
        const updated = rooms.map(r => (r.number === booking.roomNo && r.status === "pending") ? { ...r, status: "occupied" } : r);
        await storageSet(ROOMS_KEY, JSON.stringify(updated), true);
      } catch (e) {
        // room board unavailable — the digital key still works for this session
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="pt-4" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 24 }}>
      <p style={{ fontSize: 14, color: c.textMuted }}>{t.key.ready}</p>

      <div
        className="w-full"
        style={{
          borderRadius: "1rem",
          padding: 20,
          position: "relative",
          overflow: "hidden",
          transition: "opacity 0.7s, transform 0.7s",
          opacity: revealed ? 1 : 0,
          transform: revealed ? "translateY(0)" : "translateY(12px)",
          background: "linear-gradient(135deg,#10161B 0%,#1B2A2E 55%,#0E4A45 100%)",
        }}
      >
        <div style={{ position: "absolute", inset: 0, pointerEvents: "none", background: "linear-gradient(115deg, transparent 40%, rgba(217,190,141,0.25) 50%, transparent 60%)" }} />
        <div className="flex justify-between items-start" style={{ position: "relative", zIndex: 1 }}>
          <div>
            <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.2em", color: c.brassPale }}>{HOTEL_NAME}</p>
            <p style={{ fontFamily: "'Fraunces', serif", fontSize: 24, color: c.white, marginTop: 4 }}>{t.key.roomLabel(booking.roomNo)}</p>
          </div>
          <KeyRound size={26} style={{ color: c.brassPale }} />
        </div>

        {settings && settings.lockboxCode && (
          <div
            className="flex items-center justify-between"
            style={{ position: "relative", zIndex: 1, marginTop: 16, padding: "10px 14px", borderRadius: "0.6rem", background: "rgba(217,190,141,0.16)", border: "1px solid rgba(217,190,141,0.4)" }}
          >
            <div className="flex items-center gap-2">
              <Lock size={14} style={{ color: c.brassPale }} />
              <span style={{ fontSize: 11, color: c.brassPale, textTransform: "uppercase", letterSpacing: "0.05em" }}>
                {lang === "th" ? "รหัส Lock box วันนี้" : "Today's lockbox code"}
              </span>
            </div>
            <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 18, fontWeight: 700, color: c.white, letterSpacing: "0.15em" }}>
              {settings.lockboxCode}
            </span>
          </div>
        )}

        {netflix && (
          <div
            style={{ position: "relative", zIndex: 1, marginTop: 12, padding: "10px 14px", borderRadius: "0.6rem", background: "rgba(217,190,141,0.16)", border: "1px solid rgba(217,190,141,0.4)" }}
          >
            <div className="flex items-center gap-2" style={{ marginBottom: 6 }}>
              <Tv size={14} style={{ color: c.brassPale }} />
              <span style={{ fontSize: 11, color: c.brassPale, textTransform: "uppercase", letterSpacing: "0.05em" }}>Netflix</span>
            </div>
            <div className="flex justify-between items-center">
              <span style={{ fontSize: 12, color: c.textFaint }}>Profile</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 700, color: c.white, letterSpacing: "0.1em" }}>{netflix.profile}</span>
            </div>
            <div className="flex justify-between items-center" style={{ marginTop: 4 }}>
              <span style={{ fontSize: 12, color: c.textFaint }}>Password</span>
              <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 15, fontWeight: 700, color: c.white, letterSpacing: "0.1em" }}>{netflix.password}</span>
            </div>
          </div>
        )}

        <div className="flex justify-between items-end" style={{ marginTop: 24, position: "relative", zIndex: 1 }}>
          <div>
            <p style={{ fontSize: 10, color: c.textFaint, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.key.guestLabel}</p>
            <p style={{ fontSize: 14, color: c.white }}>{booking.name || t.verify.defaultGuest}</p>
          </div>
          <div style={{ textAlign: "right" }}>
            <p style={{ fontSize: 10, color: c.textFaint, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.key.validUntil}</p>
            <p style={{ fontSize: 14, color: c.white, fontFamily: "'IBM Plex Mono', monospace" }}>{booking.checkOut} · 12:00</p>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-2" style={{ background: c.paper, borderRadius: "9999px", padding: "8px 16px" }}>
        <div className="animate-pulse" style={{ width: 8, height: 8, borderRadius: "9999px", background: c.success }} />
        <p style={{ fontSize: 12, color: c.teal, fontWeight: 500 }}>{t.key.nfcNote}</p>
      </div>

      <PrimaryButton onClick={onNext} icon={DoorOpen}>{t.key.enterRoomBtn}</PrimaryButton>
    </div>
  );
}

/* ---------------- House rules / room guide ---------------- */

function HouseRulesScreen({ lang, settings, onNext }) {
  const t = STRINGS[lang];
  const rules = (settings && settings.houseRules) || DEFAULT_HOUSE_RULES;

  return (
    <div className="pt-2" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ borderRadius: "1rem", padding: 20, color: c.white, background: `linear-gradient(to bottom right, ${c.tealDark}, ${c.teal})` }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 18 }}>{t.rules.title}</p>
        <p style={{ fontSize: 12, color: c.tealPale, marginTop: 4 }}>{t.rules.subtitle}</p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {rules.map(rule => (
          <div key={rule.id} style={{ background: c.white, borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, overflow: "hidden" }}>
            {rule.image && (
              <div style={{ width: "100%", maxHeight: 320, background: c.paper, display: "flex", alignItems: "center", justifyContent: "center" }}>
                <img src={rule.image} alt={rule.title} style={{ width: "100%", maxHeight: 320, objectFit: "contain", display: "block" }} />
              </div>
            )}
            <div style={{ padding: 14 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: c.ink }}>{rule.title}</p>
              {rule.description && <p style={{ fontSize: 12, color: c.textMuted, marginTop: 4 }}>{rule.description}</p>}
            </div>
          </div>
        ))}
      </div>

      <PrimaryButton onClick={onNext} icon={Check}>{t.rules.continueBtn}</PrimaryButton>
    </div>
  );
}

/* ---------------- Stay dashboard ---------------- */

function StayScreen({ lang, booking, setBooking, settings, onCheckout }) {
  const t = STRINGS[lang];
  const [minibarOpen, setMinibarOpen] = useState(false);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  const minibarCatalog = (settings && settings.minibarItems) || MINIBAR_CATALOG;
  const SIMPLE_ITEMS = [
    { id: "e2", label: t.stay.items.roomService, price: 0 },
    { id: "e3", label: t.stay.items.towel, price: 0 },
  ];
  const toggle = (item) => {
    setBooking(b => {
      const exists = b.extras.find(e => e.id === item.id);
      return { ...b, extras: exists ? b.extras.filter(e => e.id !== item.id) : [...b.extras, item] };
    });
  };

  const minibarEntries = Object.entries(booking.minibar || {}).filter(([, qty]) => qty > 0);
  const minibarCount = minibarEntries.reduce((s, [, qty]) => s + qty, 0);
  const minibarTotal = minibarEntries.reduce((s, [id, qty]) => {
    const item = minibarCatalog.find(m => m.id === id);
    return s + (item ? item.price * qty : 0);
  }, 0);

  return (
    <div className="pt-2" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="flex items-center gap-3" style={{ background: c.white, borderRadius: "1rem", border: `1px solid ${c.paperBorder}`, padding: 16 }}>
        <div className="flex items-center justify-center shrink-0" style={{ width: 44, height: 44, borderRadius: "9999px", background: c.tealDark }}>
          <DoorOpen size={18} color="white" />
        </div>
        <div>
          <p style={{ fontSize: 14, fontWeight: 500, color: c.ink }}>{t.stay.unlockedLabel(booking.roomNo)}</p>
          <p style={{ fontSize: 11, color: c.textFaint }}>{t.stay.stayDates(booking.checkIn, booking.checkOut)}</p>
        </div>
      </div>

      <div>
        <SectionLabel>{t.stay.servicesLabel}</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          <button
            type="button"
            onClick={() => setMinibarOpen(true)}
            className="w-full flex items-center justify-between"
            style={{ padding: 12, borderRadius: "0.75rem", border: `1px solid ${minibarCount > 0 ? c.tealDark : c.paperBorder}`, background: minibarCount > 0 ? c.paper : c.white, textAlign: "left", cursor: "pointer" }}
          >
            <div className="flex items-center gap-3">
              <Sparkles size={15} style={{ color: minibarCount > 0 ? c.tealDark : c.textFaint }} />
              <div>
                <span style={{ fontSize: 14, color: c.ink, display: "block" }}>{t.stay.items.minibar}</span>
                <span style={{ fontSize: 11, color: c.textFaint }}>{minibarCount > 0 ? t.stay.minibarCount(minibarCount, minibarTotal) : t.stay.minibarNotPicked}</span>
              </div>
            </div>
            <ChevronRight size={16} style={{ color: c.textFaint }} />
          </button>

          {SIMPLE_ITEMS.map(item => {
            const active = booking.extras.some(e => e.id === item.id);
            return (
              <button type="button" key={item.id} onClick={() => toggle(item)}
                className="w-full flex items-center justify-between"
                style={{ padding: 12, borderRadius: "0.75rem", border: `1px solid ${active ? c.tealDark : c.paperBorder}`, background: active ? c.paper : c.white, textAlign: "left", cursor: "pointer" }}>
                <div className="flex items-center gap-3">
                  <Sparkles size={15} style={{ color: active ? c.tealDark : c.textFaint }} />
                  <span style={{ fontSize: 14, color: c.ink }}>{item.label}</span>
                </div>
                <span style={{ fontSize: 14, fontFamily: "'IBM Plex Mono', monospace", color: c.textMuted }}>{item.price > 0 ? `+฿${item.price}` : t.stay.free}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="flex items-start gap-2" style={{ background: c.paper, borderRadius: "0.75rem", padding: 12 }}>
        <Bell size={15} style={{ color: c.teal, marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: c.textMuted }}>{t.stay.helpNote}</p>
      </div>

      <button
        type="button"
        onClick={() => setInvoiceOpen(true)}
        className="w-full flex items-center justify-center gap-2"
        style={{ padding: "13px 0", borderRadius: "0.75rem", fontWeight: 600, fontSize: 14, border: `2px solid ${c.brass}`, color: c.brass, background: "transparent", cursor: "pointer" }}
      >
        <FileText size={16} /> {t.receipt.requestInvoiceBtn}
      </button>

      <a
        href={POINTS_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2"
        style={{ padding: "13px 0", borderRadius: "0.75rem", fontWeight: 600, fontSize: 14, border: `2px solid ${c.teal}`, color: c.teal, background: "transparent", textDecoration: "none" }}
      >
        <Gift size={16} /> {t.receipt.collectPointsBtn}
      </a>

      <button type="button" onClick={onCheckout} className="w-full flex items-center justify-center gap-2" style={{ padding: "14px 0", borderRadius: "0.75rem", fontWeight: 600, fontSize: 14, border: `2px solid ${c.tealDark}`, color: c.tealDark, background: "transparent", cursor: "pointer" }}>
        {t.stay.checkoutBtn} <LogOut size={16} />
      </button>

      {minibarOpen && (
        <MinibarModal
          lang={lang}
          booking={booking}
          setBooking={setBooking}
          catalog={minibarCatalog}
          onClose={() => setMinibarOpen(false)}
        />
      )}

      {invoiceOpen && (
        <InvoiceRequestModal lang={lang} booking={booking} settings={settings} onClose={() => setInvoiceOpen(false)} />
      )}
    </div>
  );
}

function MinibarModal({ lang, booking, setBooking, catalog, onClose }) {
  const t = STRINGS[lang];
  const [qtyMap, setQtyMap] = useState(() => ({ ...(booking.minibar || {}) }));

  const setQty = (id, delta) => {
    setQtyMap(m => {
      const next = Math.max(0, (m[id] || 0) + delta);
      return { ...m, [id]: next };
    });
  };

  const total = catalog.reduce((s, item) => s + item.price * (qtyMap[item.id] || 0), 0);
  const count = Object.values(qtyMap).reduce((s, q) => s + (q || 0), 0);

  const done = () => {
    setBooking(b => ({ ...b, minibar: qtyMap }));
    onClose();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(16,22,27,0.85)", zIndex: 50, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: c.paper, borderRadius: "1.25rem 1.25rem 0 0", padding: 20, width: "100%", maxWidth: 420, maxHeight: "80vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: c.ink }}>{t.stay.minibarModalTitle}</p>
          <button type="button" onClick={onClose} className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "9999px", background: c.white, border: "none", cursor: "pointer" }}>
            <X size={14} style={{ color: c.ink }} />
          </button>
        </div>

        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          {catalog.map(item => {
            const qty = qtyMap[item.id] || 0;
            return (
              <div key={item.id} className="flex items-center justify-between" style={{ background: c.white, borderRadius: "0.75rem", padding: "10px 14px", border: `1px solid ${c.paperBorder}` }}>
                <div>
                  <p style={{ fontSize: 14, color: c.ink, fontWeight: 500 }}>{item.name}</p>
                  <p style={{ fontSize: 12, color: c.textFaint }}>฿{item.price}</p>
                </div>
                <div className="flex items-center gap-3">
                  <button type="button" onClick={() => setQty(item.id, -1)} disabled={qty === 0} className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "9999px", background: c.paper, border: "none", cursor: qty === 0 ? "not-allowed" : "pointer", opacity: qty === 0 ? 0.5 : 1 }}>
                    <Minus size={14} />
                  </button>
                  <span style={{ width: 20, textAlign: "center", fontWeight: 600, fontFamily: "'IBM Plex Mono', monospace" }}>{qty}</span>
                  <button type="button" onClick={() => setQty(item.id, 1)} className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "9999px", background: c.paper, border: "none", cursor: "pointer" }}>
                    <Plus size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

        <div style={{ height: 1, background: c.paperBorder, margin: "16px 0" }} />

        <div className="flex items-center justify-between" style={{ marginBottom: 16 }}>
          <span style={{ fontSize: 14, color: c.ink, fontWeight: 600 }}>{t.stay.minibarSummaryLabel}</span>
          <span style={{ fontSize: 16, color: c.brass, fontWeight: 700 }}>{count > 0 ? `${count} · ฿${total}` : t.stay.minibarNotPicked}</span>
        </div>

        <PrimaryButton onClick={done}>{t.stay.minibarDone}</PrimaryButton>
      </div>
    </div>
  );
}

/* ---------------- Checkout ---------------- */

function CheckoutScreen({ lang, booking, settings, onNext }) {
  const t = STRINGS[lang];
  const [confirming, setConfirming] = useState(false);
  const [slip, setSlip] = useState(null);
  const [verifying, setVerifying] = useState(false);
  const [slipCheck, setSlipCheck] = useState(null);
  const fileRef = useRef(null);
  const nights = calcNights(booking.checkInISO, booking.checkOutISO);
  const roomTotal = booking.room ? booking.room.price * nights : 0;
  const addonTotal = booking.extraBed ? ADDON_PRICE * nights : 0;
  const extrasTotal = booking.extras.reduce((s, e) => s + e.price, 0);
  const minibarCatalog = (settings && settings.minibarItems) || MINIBAR_CATALOG;
  const minibarEntries = Object.entries(booking.minibar || {}).filter(([, qty]) => qty > 0);
  const minibarTotal = minibarEntries.reduce((s, [id, qty]) => {
    const item = minibarCatalog.find(m => m.id === id);
    return s + (item ? item.price * qty : 0);
  }, 0);
  const taxRate = (settings.taxRate ?? 7) / 100;
  const tax = Math.round((roomTotal + addonTotal + extrasTotal + minibarTotal) * taxRate);
  const amountDue = extrasTotal + minibarTotal + tax;

  const runVerify = async (imageDataUrl) => {
    setVerifying(true);
    setSlipCheck(null);
    const result = await verifySlipWithAI(imageDataUrl, { amount: amountDue, name: HOTEL_ACCOUNT_NAME });
    setSlipCheck(result);
    setVerifying(false);
  };

  const handleFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      setSlip(reader.result);
      runVerify(reader.result);
    };
    reader.readAsDataURL(file);
  };

  const confirm = async () => {
    setConfirming(true);
    try {
      const existingRooms = await storageGet(ROOMS_KEY, true);
      const rooms = existingRooms && existingRooms.value ? JSON.parse(existingRooms.value) : buildDefaultRooms();
      const updatedRooms = rooms.map(r => r.number === booking.roomNo ? {
        ...r,
        status: "checkout",
        guestName: "",
        phone: "",
        checkIn: "",
        checkOut: "",
        code: "",
      } : r);
      await storageSet(ROOMS_KEY, JSON.stringify(updatedRooms), true);
    } catch (e) {
      // storage unavailable — room board just won't sync for this session
    }
    setTimeout(onNext, 1200);
  };

  return (
    <div className="pt-2" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div>
        <SectionLabel>{t.checkout.summaryLabel}</SectionLabel>
        <div style={{ background: c.white, borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, padding: 16, fontSize: 14, display: "flex", flexDirection: "column", gap: 8 }}>
          <div className="flex justify-between" style={{ color: c.textMuted }}><span>{t.checkout.roomLine(nights)}</span><span>฿{roomTotal.toLocaleString()}</span></div>
          {booking.extraBed && (
            <div className="flex justify-between" style={{ color: c.textMuted }}><span>{t.checkout.addonLine(nights)}</span><span>฿{addonTotal.toLocaleString()}</span></div>
          )}
          {booking.extras.map(e => (
            <div key={e.id} className="flex justify-between" style={{ color: c.textMuted }}><span>{e.label}</span><span>{e.price > 0 ? `฿${e.price}` : t.stay.free}</span></div>
          ))}
          {minibarEntries.map(([id, qty]) => {
            const item = minibarCatalog.find(m => m.id === id);
            if (!item) return null;
            return (
              <div key={id} className="flex justify-between" style={{ color: c.textMuted }}><span>{item.name} × {qty}</span><span>฿{item.price * qty}</span></div>
            );
          })}
          <div className="flex justify-between" style={{ color: c.textMuted }}><span>{t.checkout.taxLine(settings.taxRate ?? 7)}</span><span>฿{tax.toLocaleString()}</span></div>
          <div style={{ height: 1, background: c.paperBorder, margin: "4px 0" }} />
          <div className="flex justify-between" style={{ fontWeight: 600, color: c.ink }}><span>{t.checkout.dueLabel}</span><span>฿{amountDue.toLocaleString()}</span></div>
        </div>
      </div>

      {amountDue > 0 && (
        <>
          <div>
            <SectionLabel>{t.payment.qrLabel}</SectionLabel>
            <div style={{ background: c.white, borderRadius: "1rem", border: `2px solid ${c.brass}`, padding: 16, textAlign: "center" }}>
              <img
                src={PAYMENT_QR_IMAGE}
                alt="PromptPay QR"
                style={{ width: "100%", maxWidth: 260, margin: "0 auto", borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, display: "block" }}
              />
              <p style={{ fontSize: 14, fontWeight: 500, color: c.ink, marginTop: 12 }}>{t.payment.scanToPay(amountDue)}</p>
              <p style={{ fontSize: 11, color: c.textFaint, marginTop: 4 }}>{t.payment.promptpayNote}</p>
            </div>
          </div>

          <div>
            <SectionLabel>{t.payment.attachSlipLabel}</SectionLabel>
            <input ref={fileRef} type="file" accept="image/*" onChange={handleFile} style={{ display: "none" }} />
            {!slip ? (
              <button
                type="button"
                onClick={() => fileRef.current && fileRef.current.click()}
                className="w-full flex flex-col items-center gap-2"
                style={{ padding: "24px 0", borderRadius: "0.75rem", border: `2px dashed ${c.brassPale}`, background: c.brassBg, color: c.brass }}
              >
                <Upload size={22} />
                <span style={{ fontSize: 14, fontWeight: 500 }}>{t.payment.tapToAttach}</span>
              </button>
            ) : (
              <div style={{ position: "relative" }}>
                <img src={slip} alt="Payment slip" style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, display: "block" }} />
                <button
                  type="button"
                  onClick={() => { setSlip(null); setSlipCheck(null); }}
                  className="flex items-center justify-center"
                  style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "9999px", background: c.white, border: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
                >
                  <X size={14} style={{ color: c.ink }} />
                </button>
                <div className="flex items-center gap-1" style={{ position: "absolute", bottom: 8, left: 8, background: "rgba(255,255,255,0.9)", borderRadius: "9999px", padding: "4px 8px" }}>
                  <Check size={12} style={{ color: c.success }} />
                  <span style={{ fontSize: 11, color: c.success, fontWeight: 500 }}>{t.payment.slipAttached}</span>
                </div>
              </div>
            )}
          </div>

          {verifying && (
            <div className="flex items-center gap-2" style={{ background: c.paper, borderRadius: "0.75rem", padding: 12 }}>
              <Loader2 size={16} className="animate-spin" style={{ color: c.teal }} />
              <p style={{ fontSize: 12, color: c.textMuted }}>{t.slipCheck.checking}</p>
            </div>
          )}
          {!verifying && slipCheck && (
            <SlipCheckResult lang={lang} result={slipCheck} expected={{ amount: amountDue, name: HOTEL_ACCOUNT_NAME }} />
          )}
        </>
      )}

      <div className="flex items-start gap-2" style={{ background: c.paper, borderRadius: "0.75rem", padding: 16 }}>
        <ShieldCheck size={16} style={{ color: c.teal, marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: c.textMuted }}>{t.checkout.keyNote}</p>
      </div>

      <PrimaryButton onClick={confirm} disabled={confirming || (amountDue > 0 && (!slip || verifying))} icon={confirming ? undefined : Receipt}>
        {confirming ? <><Loader2 size={16} className="animate-spin" /> {t.checkout.processing}</> : t.checkout.confirmBtn}
      </PrimaryButton>
      {amountDue > 0 && !slip && <p style={{ fontSize: 11, color: c.textFaint, textAlign: "center" }}>{t.payment.needSlip}</p>}
    </div>
  );
}

/* ---------------- Receipt ---------------- */

function ReceiptScreen({ lang, booking, settings, onRestart }) {
  const t = STRINGS[lang];
  const [rating, setRating] = useState(0);
  const [invoiceOpen, setInvoiceOpen] = useState(false);
  return (
    <div className="pt-4" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20 }}>
      <div className="flex items-center justify-center" style={{ width: 64, height: 64, borderRadius: "9999px", background: c.tealDark }}>
        <Check size={28} color="white" />
      </div>
      <div>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 20, color: c.ink }}>{t.receipt.doneTitle}</p>
        <p style={{ fontSize: 14, color: c.textMuted, marginTop: 4 }}>{t.receipt.thankYou(booking.name || t.receipt.defaultGuest)}</p>
      </div>

      <div className="flex items-center gap-3" style={{ background: c.white, borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, padding: 16, width: "100%" }}>
        <Receipt size={18} style={{ color: c.teal }} />
        <p style={{ fontSize: 14, color: c.ink }}>{t.receipt.sentTo(booking.email || t.receipt.defaultEmail)}</p>
      </div>

      <button
        type="button"
        onClick={() => setInvoiceOpen(true)}
        className="w-full flex items-center justify-center gap-2"
        style={{ padding: "13px 0", borderRadius: "0.75rem", fontWeight: 600, fontSize: 14, border: `2px solid ${c.brass}`, color: c.brass, background: "transparent", cursor: "pointer" }}
      >
        <FileText size={16} /> {t.receipt.requestInvoiceBtn}
      </button>

      <div className="w-full">
        <p style={{ fontSize: 14, color: c.textMuted, marginBottom: 8 }}>{t.receipt.rateLabel}</p>
        <div className="flex justify-center gap-1">
          {[1, 2, 3, 4, 5].map(n => (
            <button type="button" key={n} onClick={() => setRating(n)} style={{ background: "none", border: "none", cursor: "pointer", padding: 2 }}>
              <Star size={26} style={{ color: n <= rating ? c.brassLight : c.paperBorder, fill: n <= rating ? c.brassLight : "none" }} />
            </button>
          ))}
        </div>
      </div>

      <button type="button" onClick={onRestart} style={{ fontSize: 14, color: c.teal, fontWeight: 500, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}>
        {t.receipt.restartBtn}
      </button>

      {invoiceOpen && (
        <InvoiceRequestModal lang={lang} booking={booking} settings={settings} onClose={() => setInvoiceOpen(false)} />
      )}
    </div>
  );
}

/* ---------------- Tax invoice request + preview (shared by guest + admin) ---------------- */

function InvoiceRequestModal({ lang, booking, settings, onClose }) {
  const t = STRINGS[lang];
  const [buyerName, setBuyerName] = useState("");
  const [buyerTaxId, setBuyerTaxId] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [savedRequest, setSavedRequest] = useState(null);
  const [staffConfirmed, setStaffConfirmed] = useState(false);

  const submit = async (method) => {
    if (!buyerName.trim()) {
      setError(t.invoice.missingName);
      return;
    }
    setError("");
    setSaving(true);
    const { lineItems, subtotal, taxRate, tax, total } = buildInvoiceLineItems(lang, booking, settings);
    const request = {
      id: `inv-${Date.now()}`,
      bookingCode: booking.code,
      buyerName: buyerName.trim(),
      buyerTaxId: buyerTaxId.trim(),
      buyerAddress: buyerAddress.trim(),
      method,
      printed: method === "pdf",
      requestedAt: new Date().toISOString(),
      seller: (settings && settings.invoiceInfo) || DEFAULT_INVOICE_INFO,
      guestName: booking.name,
      checkIn: booking.checkIn,
      checkOut: booking.checkOut,
      roomNo: booking.roomNo,
      lineItems, subtotal, taxRate, tax, total,
    };
    try {
      let list = [];
      try {
        const existing = await storageGet(INVOICE_REQUESTS_KEY, true);
        if (existing && existing.value) list = JSON.parse(existing.value);
      } catch (e) {
        list = [];
      }
      list.push(request);
      await storageSet(INVOICE_REQUESTS_KEY, JSON.stringify(list), true);
    } catch (e) {
      // storage unavailable — the request still previews/prints for this session
    }
    setSaving(false);
    if (method === "pdf") setSavedRequest(request);
    else setStaffConfirmed(true);
  };

  if (savedRequest) {
    return <InvoicePreview lang={lang} request={savedRequest} onClose={onClose} />;
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(16,22,27,0.85)", zIndex: 55, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: c.paper, borderRadius: "1.25rem 1.25rem 0 0", padding: 20, width: "100%", maxWidth: 420, maxHeight: "85vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: c.ink }}>{t.invoice.title}</p>
          <button type="button" onClick={onClose} className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "9999px", background: c.white, border: "none", cursor: "pointer" }}>
            <X size={14} style={{ color: c.ink }} />
          </button>
        </div>

        {!staffConfirmed ? (
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <p style={{ fontSize: 13, color: c.textMuted }}>{t.invoice.subtitle}</p>

            <div>
              <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 4 }}>{t.invoice.buyerName}</p>
              <TextField value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder={t.invoice.buyerNamePlaceholder} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 4 }}>{t.invoice.buyerTaxId}</p>
              <TextField value={buyerTaxId} onChange={(e) => setBuyerTaxId(e.target.value)} placeholder={t.invoice.buyerTaxIdPlaceholder} />
            </div>
            <div>
              <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 4 }}>{t.invoice.buyerAddress}</p>
              <TextField value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder={t.invoice.buyerAddressPlaceholder} />
            </div>

            {error && <p style={{ fontSize: 12, color: c.coral }}>{error}</p>}

            <div>
              <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 8, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.invoice.methodLabel}</p>
              <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
                <PrimaryButton onClick={() => submit("pdf")} disabled={saving} icon={saving ? undefined : FileText}>
                  {saving ? <><Loader2 size={16} className="animate-spin" /> {t.admin.loading}</> : t.invoice.pdfNow}
                </PrimaryButton>
                <button
                  type="button"
                  onClick={() => submit("staff")}
                  disabled={saving}
                  className="w-full flex items-center justify-center gap-2"
                  style={{ padding: "13px 0", borderRadius: "0.75rem", fontWeight: 600, fontSize: 14, border: `2px solid ${c.teal}`, color: c.teal, background: "transparent", cursor: saving ? "not-allowed" : "pointer" }}
                >
                  <Clock size={16} /> {t.invoice.waitStaff}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: 16, alignItems: "center", textAlign: "center", padding: "12px 0" }}>
            <div className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: "9999px", background: c.success }}>
              <Check size={24} color="white" />
            </div>
            <p style={{ fontSize: 14, color: c.ink }}>{t.invoice.savedForStaff}</p>
            <PrimaryButton onClick={onClose}>{t.invoice.close}</PrimaryButton>
          </div>
        )}
      </div>
    </div>
  );
}

function InvoiceCopyBlock({ t, lang, request, seller, issueDate, copyLabel }) {
  return (
    <div style={{ padding: "16px 4px" }}>
      <p style={{ textAlign: "center", fontSize: 11, fontWeight: 700, color: c.brass, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 10 }}>{copyLabel}</p>

      <div className="flex items-center gap-3" style={{ marginBottom: 12 }}>
        {seller.logoImage && <img src={seller.logoImage} alt="Logo" style={{ width: 36, height: 36, objectFit: "contain", flexShrink: 0 }} />}
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: c.ink }}>{seller.companyName || HOTEL_NAME}</p>
          {seller.taxId && <p style={{ fontSize: 10, color: c.textFaint }}>{t.invoice.buyerTaxId}: {seller.taxId}</p>}
          {seller.address && <p style={{ fontSize: 10, color: c.textFaint }}>{seller.address}</p>}
        </div>
      </div>

      <p style={{ textAlign: "center", fontSize: 12, fontWeight: 700, color: c.ink, margin: "6px 0" }}>{t.invoice.invoiceHeading}</p>

      <div className="flex justify-between" style={{ fontSize: 10, color: c.textMuted, marginBottom: 6 }}>
        <span>{t.invoice.no}: {request.bookingCode}</span>
        <span>{t.invoice.date}: {issueDate}</span>
      </div>

      <div style={{ fontSize: 10, color: c.textMuted, marginBottom: 8 }}>
        <p style={{ fontWeight: 600, color: c.ink }}>{t.invoice.buyer}</p>
        <p>{request.buyerName}</p>
        {request.buyerTaxId && <p>{t.invoice.buyerTaxId}: {request.buyerTaxId}</p>}
        {request.buyerAddress && <p>{request.buyerAddress}</p>}
      </div>

      <div style={{ borderTop: `1px solid ${c.paperBorder}`, borderBottom: `1px solid ${c.paperBorder}`, padding: "6px 0", marginBottom: 6 }}>
        <div className="flex justify-between" style={{ fontSize: 9, color: c.textFaint, fontWeight: 600 }}>
          <span style={{ flex: 2 }}>{t.invoice.itemHeader}</span>
          <span style={{ flex: 1, textAlign: "center" }}>{t.invoice.qtyHeader}</span>
          <span style={{ flex: 1, textAlign: "right" }}>{t.invoice.amountHeader}</span>
        </div>
      </div>
      <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 8 }}>
        {request.lineItems.map((li, i) => (
          <div key={i} className="flex justify-between" style={{ fontSize: 11, color: c.ink }}>
            <span style={{ flex: 2 }}>{li.label}</span>
            <span style={{ flex: 1, textAlign: "center" }}>{li.qty}</span>
            <span style={{ flex: 1, textAlign: "right" }}>฿{li.amount.toLocaleString()}</span>
          </div>
        ))}
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 3, borderTop: `1px solid ${c.paperBorder}`, paddingTop: 6 }}>
        <div className="flex justify-between" style={{ fontSize: 11, color: c.textMuted }}><span>{t.invoice.subtotal}</span><span>฿{request.subtotal.toLocaleString()}</span></div>
        <div className="flex justify-between" style={{ fontSize: 11, color: c.textMuted }}><span>{t.invoice.taxLine(request.taxRate)}</span><span>฿{request.tax.toLocaleString()}</span></div>
        <div className="flex justify-between" style={{ fontSize: 13, fontWeight: 700, color: c.ink }}><span>{t.invoice.grandTotal}</span><span>฿{request.total.toLocaleString()}</span></div>
      </div>

      <div className="flex justify-between items-end" style={{ marginTop: 24 }}>
        <div style={{ flex: 1 }}>
          <div style={{ borderBottom: `1px dotted ${c.textFaint}`, height: 24 }} />
          <p style={{ fontSize: 9, color: c.textFaint, marginTop: 4 }}>{t.invoice.signatureLine}</p>
        </div>
        <div style={{ width: 16 }} />
        <div style={{ width: 90 }}>
          <div style={{ borderBottom: `1px dotted ${c.textFaint}`, height: 24 }} />
          <p style={{ fontSize: 9, color: c.textFaint, marginTop: 4 }}>{t.invoice.signatureDateLine}</p>
        </div>
      </div>
    </div>
  );
}

function InvoicePreview({ lang, request, onClose }) {
  const t = STRINGS[lang];
  const seller = request.seller || DEFAULT_INVOICE_INFO;

  const dateLocale = lang === "th" ? "th-TH" : "en-US";
  const issueDate = new Date(request.requestedAt).toLocaleDateString(dateLocale);

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(16,22,27,0.85)", zIndex: 60, display: "flex", alignItems: "center", justifyContent: "center", padding: 16 }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: c.white, borderRadius: "1rem", padding: 20, maxWidth: 360, width: "100%", maxHeight: "85vh", overflowY: "auto" }}
      >
        <InvoiceCopyBlock t={t} lang={lang} request={request} seller={seller} issueDate={issueDate} copyLabel={t.invoice.originalLabel} />

        <div className="flex items-center gap-2" style={{ margin: "14px 0" }}>
          <div style={{ flex: 1, borderTop: `1px dashed ${c.paperBorder}` }} />
          <Scissors size={13} style={{ color: c.textFaint, transform: "rotate(90deg)" }} />
          <div style={{ flex: 1, borderTop: `1px dashed ${c.paperBorder}` }} />
        </div>

        <InvoiceCopyBlock t={t} lang={lang} request={request} seller={seller} issueDate={issueDate} copyLabel={t.invoice.copyLabel} />

        <div className="flex gap-2" style={{ marginTop: 16 }}>
          <button
            type="button"
            onClick={() => printInvoiceDocument(lang, request)}
            className="flex-1 flex items-center justify-center gap-2"
            style={{ padding: "11px 0", borderRadius: "0.6rem", fontWeight: 600, fontSize: 13, border: "none", color: c.white, background: c.brass, cursor: "pointer" }}
          >
            <Printer size={14} /> {t.invoice.printBtn}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="flex-1 flex items-center justify-center gap-2"
            style={{ padding: "11px 0", borderRadius: "0.6rem", fontWeight: 600, fontSize: 13, border: `1.5px solid ${c.paperBorder}`, color: c.textMuted, background: "transparent", cursor: "pointer" }}
          >
            {t.invoice.close}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ---------------- Admin ---------------- */

function AdminFlow({ lang, setLang, settings, setSettings, onExit }) {
  const t = STRINGS[lang];
  const [stage, setStage] = useState("login"); // "login" | "dashboard"
  const [tab, setTab] = useState("settings"); // "settings" | "bookings" | "rooms"
  const [pin, setPin] = useState("");
  const [error, setError] = useState("");

  const tryLogin = () => {
    const currentPin = settings.adminPin || ADMIN_PIN;
    if (pin === currentPin) {
      setStage("dashboard");
      setError("");
    } else {
      setError(t.admin.wrongPin);
    }
  };

  return (
    <>
      <div className="flex items-center gap-3 sticky top-0 z-10" style={{ padding: "24px 20px 16px", background: c.paper, borderBottom: `1px solid ${c.paperBorder}` }}>
        <button type="button" onClick={onExit} className="flex items-center justify-center shrink-0" style={{ width: 32, height: 32, borderRadius: "9999px", background: c.white, boxShadow: "0 1px 2px rgba(0,0,0,0.06)" }}>
          <X size={16} style={{ color: c.tealDark }} />
        </button>
        <div className="flex-1">
          <p style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.15em", color: c.brass, fontWeight: 600 }}>{HOTEL_NAME}</p>
          <h1 style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: c.ink, lineHeight: 1.2 }}>{t.checkinLabels.adminTitle}</h1>
        </div>
        <LanguageSwitcher lang={lang} setLang={setLang} />
      </div>
      <div className="flex-1 overflow-y-auto" style={{ padding: "0 20px 20px" }}>
        {stage === "login" ? (
          <AdminLogin lang={lang} pin={pin} setPin={setPin} error={error} onSubmit={tryLogin} settings={settings} />
        ) : (
          <div className="pt-4" style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
              <TabButton active={tab === "settings"} onClick={() => setTab("settings")} icon={Wallet}>{t.admin.tabSettings}</TabButton>
              <TabButton active={tab === "bookings"} onClick={() => setTab("bookings")} icon={LayoutList}>{t.admin.tabBookings}</TabButton>
              <TabButton active={tab === "rooms"} onClick={() => setTab("rooms")} icon={Building2}>{t.admin.tabRooms}</TabButton>
              <TabButton active={tab === "invoices"} onClick={() => setTab("invoices")} icon={FileText}>{t.admin.tabInvoices}</TabButton>
            </div>
            {tab === "settings" && <AdminDashboard lang={lang} settings={settings} setSettings={setSettings} />}
            {tab === "bookings" && <AdminBookings lang={lang} />}
            {tab === "rooms" && <AdminRooms lang={lang} />}
            {tab === "invoices" && <AdminInvoices lang={lang} settings={settings} onGoToSettings={() => setTab("settings")} />}
          </div>
        )}
      </div>
    </>
  );
}

function TabButton({ active, onClick, icon: Icon, children }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex-1 flex items-center justify-center gap-1.5"
      style={{
        padding: "10px 0",
        borderRadius: "0.6rem",
        fontSize: 13,
        fontWeight: 600,
        border: `1px solid ${active ? c.brass : c.paperBorder}`,
        background: active ? c.brass : c.white,
        color: active ? c.white : c.textMuted,
        cursor: "pointer",
      }}
    >
      {Icon && <Icon size={14} />}
      {children}
    </button>
  );
}

function AdminLogin({ lang, pin, setPin, error, onSubmit, settings }) {
  const t = STRINGS[lang];
  return (
    <div className="pt-8" style={{ display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center", gap: 20 }}>
      <div className="flex items-center justify-center" style={{ width: 56, height: 56, borderRadius: "9999px", background: c.brass }}>
        <Lock size={22} color="white" />
      </div>
      <div>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: c.ink }}>{t.admin.loginTitle}</p>
        <p style={{ fontSize: 14, color: c.textMuted, marginTop: 4 }}>{t.admin.loginSub}</p>
      </div>
      <input
        value={pin}
        onChange={(e) => setPin(e.target.value)}
        type="password"
        inputMode="numeric"
        maxLength={4}
        placeholder="••••"
        style={{
          width: 128, textAlign: "center", letterSpacing: "0.5em", fontSize: 18,
          background: c.white, borderRadius: "0.75rem", padding: "12px 16px",
          border: `1px solid ${c.paperBorder}`, outline: "none", color: c.ink,
        }}
      />
      {error && <p style={{ fontSize: 12, color: c.coral }}>{error}</p>}
      <PrimaryButton onClick={onSubmit}>{t.admin.loginBtn}</PrimaryButton>
    </div>
  );
}

function AdminDashboard({ lang, settings, setSettings }) {
  const t = STRINGS[lang];
  const [form, setForm] = useState(() => ({
    ...settings,
    minibarItems: settings.minibarItems || MINIBAR_CATALOG.map(i => ({ ...i })),
    invoiceInfo: settings.invoiceInfo || { ...DEFAULT_INVOICE_INFO },
    adminPin: settings.adminPin || ADMIN_PIN,
    houseRules: settings.houseRules || DEFAULT_HOUSE_RULES.map(r => ({ ...r })),
  }));
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [compressing, setCompressing] = useState(false);
  const [logoCompressing, setLogoCompressing] = useState(false);
  const [ruleImageCompressingId, setRuleImageCompressingId] = useState(null);
  const [testing, setTesting] = useState(false);
  const [testResult, setTestResult] = useState(null); // null | "ok" | "fallback"
  const fileRef = useRef(null);
  const logoFileRef = useRef(null);
  const ruleFileRefs = useRef({});

  useEffect(() => {
    setForm({
      ...settings,
      minibarItems: settings.minibarItems || MINIBAR_CATALOG.map(i => ({ ...i })),
      invoiceInfo: settings.invoiceInfo || { ...DEFAULT_INVOICE_INFO },
      adminPin: settings.adminPin || ADMIN_PIN,
      houseRules: settings.houseRules || DEFAULT_HOUSE_RULES.map(r => ({ ...r })),
    });
  }, [settings]);

  const updateInvoiceField = (field, value) => {
    setForm(f => ({ ...f, invoiceInfo: { ...f.invoiceInfo, [field]: value } }));
  };

  const handleLogoFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setLogoCompressing(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 300;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        updateInvoiceField("logoImage", canvas.toDataURL("image/png"));
        setLogoCompressing(false);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const updateMinibarItem = (index, field, value) => {
    setForm(f => {
      const items = [...f.minibarItems];
      items[index] = { ...items[index], [field]: value };
      return { ...f, minibarItems: items };
    });
  };

  const addMinibarItem = () => {
    setForm(f => ({ ...f, minibarItems: [...f.minibarItems, { id: `custom-${Date.now()}`, name: "", price: 0 }] }));
  };

  const removeMinibarItem = (index) => {
    setForm(f => ({ ...f, minibarItems: f.minibarItems.filter((_, i) => i !== index) }));
  };

  const updateRule = (index, field, value) => {
    setForm(f => {
      const rules = [...f.houseRules];
      rules[index] = { ...rules[index], [field]: value };
      return { ...f, houseRules: rules };
    });
  };

  const addRule = () => {
    setForm(f => ({ ...f, houseRules: [...f.houseRules, { id: `rule-${Date.now()}`, title: "", description: "", image: "" }] }));
  };

  const removeRule = (index) => {
    setForm(f => ({ ...f, houseRules: f.houseRules.filter((_, i) => i !== index) }));
  };

  const handleRuleImageFile = (index, e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const ruleId = form.houseRules[index].id;
    setRuleImageCompressingId(ruleId);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 700;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        updateRule(index, "image", canvas.toDataURL("image/jpeg", 0.8));
        setRuleImageCompressingId(null);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const runBackendTest = async () => {
    setTesting(true);
    setTestResult(null);
    const probeKey = "order-residence-backend-test";
    const probeValue = `ping-${Date.now()}`;
    try {
      const setRes = await storageSet(probeKey, probeValue, true);
      if (!setRes) { setTestResult("fallback"); setTesting(false); return; }
      const getRes = await storageGet(probeKey, true);
      if (getRes && getRes.value === probeValue) {
        setTestResult("ok");
        try { await storageDelete(probeKey, true); } catch (e) { /* ignore cleanup errors */ }
      } else {
        setTestResult("fallback");
      }
    } catch (e) {
      console.error("Backend test failed, running in same-session fallback mode:", e);
      setTestResult("fallback");
    }
    setTesting(false);
  };

  const handleImageFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    setCompressing(true);
    const reader = new FileReader();
    reader.onload = () => {
      const img = new Image();
      img.onload = () => {
        const maxWidth = 800;
        const scale = Math.min(1, maxWidth / img.width);
        const canvas = document.createElement("canvas");
        canvas.width = img.width * scale;
        canvas.height = img.height * scale;
        const ctx = canvas.getContext("2d");
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        const dataUrl = canvas.toDataURL("image/jpeg", 0.8);
        setForm(f => ({ ...f, roomImage: dataUrl }));
        setCompressing(false);
      };
      img.src = reader.result;
    };
    reader.readAsDataURL(file);
  };

  const save = async () => {
    setSaving(true);
    setSaved(false);
    const next = {
      price: Number(form.price) || 0,
      taxRate: Number(form.taxRate) || 0,
      roomImage: (form.roomImage || "").trim(),
      lockboxCode: (form.lockboxCode || "").trim(),
      minibarItems: (form.minibarItems || [])
        .filter(i => (i.name || "").trim())
        .map(i => ({ id: i.id, name: i.name.trim(), price: Number(i.price) || 0 })),
      invoiceInfo: {
        companyName: (form.invoiceInfo?.companyName || "").trim(),
        taxId: (form.invoiceInfo?.taxId || "").trim(),
        address: (form.invoiceInfo?.address || "").trim(),
        logoImage: form.invoiceInfo?.logoImage || "",
      },
      adminPin: /^\d{4}$/.test(form.adminPin || "") ? form.adminPin : (settings.adminPin || ADMIN_PIN),
      houseRules: (form.houseRules || [])
        .filter(r => (r.title || "").trim())
        .map(r => ({ id: r.id, title: r.title.trim(), description: (r.description || "").trim(), image: r.image || "" })),
    };
    try {
      await storageSet(SETTINGS_KEY, JSON.stringify(next), true);
    } catch (e) {
      // storage unavailable — settings still apply for this session
    }
    setSettings(next);
    setSaved(true);
    setSaving(false);
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div className="flex items-start gap-2" style={{ background: c.brassBg, borderRadius: "0.75rem", padding: 12 }}>
        <ShieldCheck size={15} style={{ color: c.brass, marginTop: 2, flexShrink: 0 }} />
        <p style={{ fontSize: 12, color: c.brass }}>{t.admin.sharedNote}</p>
      </div>

      <div>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <Lock size={14} style={{ color: c.teal }} />
          <SectionLabel>{lang === "th" ? "รหัส Lock box วันนี้" : "Today's lockbox code"}</SectionLabel>
        </div>
        <TextField
          value={form.lockboxCode}
          onChange={(e) => setForm(f => ({ ...f, lockboxCode: e.target.value }))}
          placeholder={lang === "th" ? "เช่น 4821" : "e.g. 4821"}
        />
        <p style={{ fontSize: 11, color: c.textFaint, marginTop: 6 }}>
          {lang === "th"
            ? "รีเซ็ตรหัสนี้ทุกวัน — รหัสจะไปแสดงในหน้ากุญแจดิจิทัลของลูกค้าตอนเช็คอินอัตโนมัติ"
            : "Reset this every day — it will automatically show on the guest's digital key screen at check-in."}
        </p>
      </div>

      <div>
        <div className="flex items-center gap-2" style={{ marginBottom: 8 }}>
          <Lock size={14} style={{ color: c.teal }} />
          <SectionLabel>{lang === "th" ? "รหัส PIN สำหรับแอดมิน" : "Admin PIN"}</SectionLabel>
        </div>
        <TextField
          value={form.adminPin}
          onChange={(e) => setForm(f => ({ ...f, adminPin: e.target.value.replace(/\D/g, "").slice(0, 4) }))}
          placeholder="2569"
          inputMode="numeric"
          maxLength={4}
        />
        <p style={{ fontSize: 11, color: c.textFaint, marginTop: 6 }}>
          {lang === "th"
            ? "รหัส 4 หลักที่ใช้เข้าหน้าผู้ดูแลระบบ — เปลี่ยนแล้วต้องใช้รหัสใหม่ในการเข้าสู่ระบบครั้งถัดไป"
            : "The 4-digit code used to sign in to this admin panel — change it and use the new one next time you log in."}
        </p>
        {form.adminPin && form.adminPin.length > 0 && form.adminPin.length < 4 && (
          <p style={{ fontSize: 11, color: c.coral, marginTop: 4 }}>
            {lang === "th" ? "ต้องเป็นตัวเลข 4 หลัก ไม่งั้นจะยังใช้รหัสเดิม" : "Must be exactly 4 digits, or the old PIN will stay in effect."}
          </p>
        )}
      </div>

      <div>
        <SectionLabel>{t.admin.priceLabel}</SectionLabel>
        <TextField
          type="number"
          value={form.price}
          onChange={(e) => setForm(f => ({ ...f, price: e.target.value }))}
        />
      </div>

      <div>
        <SectionLabel>{t.admin.taxLabel}</SectionLabel>
        <TextField
          type="number"
          value={form.taxRate}
          onChange={(e) => setForm(f => ({ ...f, taxRate: e.target.value }))}
        />
      </div>

      <div>
        <SectionLabel>{t.admin.roomImageLabel}</SectionLabel>
        <input ref={fileRef} type="file" accept="image/*" onChange={handleImageFile} style={{ display: "none" }} />
        {!form.roomImage ? (
          <button
            type="button"
            onClick={() => fileRef.current && fileRef.current.click()}
            disabled={compressing}
            className="w-full flex flex-col items-center gap-2"
            style={{ padding: "24px 0", borderRadius: "0.75rem", border: `2px dashed ${c.brassPale}`, background: c.brassBg, color: c.brass, cursor: compressing ? "not-allowed" : "pointer" }}
          >
            {compressing ? <Loader2 size={22} className="animate-spin" /> : <Upload size={22} />}
            <span style={{ fontSize: 14, fontWeight: 500 }}>{compressing ? t.admin.processingImage : t.admin.tapToAttachImage}</span>
          </button>
        ) : (
          <div style={{ position: "relative" }}>
            <img
              src={form.roomImage}
              alt="Room preview"
              style={{ width: "100%", height: 160, objectFit: "cover", borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, display: "block" }}
              onError={(e) => { e.currentTarget.style.display = "none"; }}
            />
            <button
              type="button"
              onClick={() => setForm(f => ({ ...f, roomImage: "" }))}
              className="flex items-center justify-center"
              style={{ position: "absolute", top: 8, right: 8, width: 28, height: 28, borderRadius: "9999px", background: c.white, border: "none", boxShadow: "0 1px 4px rgba(0,0,0,0.2)" }}
            >
              <X size={14} style={{ color: c.ink }} />
            </button>
            <button
              type="button"
              onClick={() => fileRef.current && fileRef.current.click()}
              style={{ marginTop: 8, fontSize: 12, color: c.teal, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
            >
              {t.admin.changeImage}
            </button>
          </div>
        )}
      </div>

      <div>
        <SectionLabel>{t.admin.invoiceLetterheadTitle}</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
          <div>
            <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 4 }}>{t.admin.invoiceCompanyName}</p>
            <TextField
              value={form.invoiceInfo?.companyName || ""}
              onChange={(e) => updateInvoiceField("companyName", e.target.value)}
            />
          </div>
          <div>
            <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 4 }}>{t.admin.invoiceTaxId}</p>
            <TextField
              value={form.invoiceInfo?.taxId || ""}
              onChange={(e) => updateInvoiceField("taxId", e.target.value)}
              placeholder="0-0000-00000-00-0"
            />
          </div>
          <div>
            <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 4 }}>{t.admin.invoiceAddress}</p>
            <TextField
              value={form.invoiceInfo?.address || ""}
              onChange={(e) => updateInvoiceField("address", e.target.value)}
            />
          </div>
          <div>
            <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 4 }}>{t.admin.invoiceLogoLabel}</p>
            <input ref={logoFileRef} type="file" accept="image/*" onChange={handleLogoFile} style={{ display: "none" }} />
            {!form.invoiceInfo?.logoImage ? (
              <button
                type="button"
                onClick={() => logoFileRef.current && logoFileRef.current.click()}
                disabled={logoCompressing}
                className="w-full flex flex-col items-center gap-2"
                style={{ padding: "18px 0", borderRadius: "0.75rem", border: `2px dashed ${c.brassPale}`, background: c.brassBg, color: c.brass, cursor: logoCompressing ? "not-allowed" : "pointer" }}
              >
                {logoCompressing ? <Loader2 size={18} className="animate-spin" /> : <Upload size={18} />}
                <span style={{ fontSize: 13, fontWeight: 500 }}>{t.admin.tapToAttachImage}</span>
              </button>
            ) : (
              <div className="flex items-center gap-3" style={{ background: c.white, borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, padding: 10 }}>
                <img src={form.invoiceInfo.logoImage} alt="Logo" style={{ width: 48, height: 48, objectFit: "contain", borderRadius: "0.5rem", background: c.paper }} />
                <button
                  type="button"
                  onClick={() => logoFileRef.current && logoFileRef.current.click()}
                  style={{ fontSize: 12, color: c.teal, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
                >
                  {t.admin.changeImage}
                </button>
                <button
                  type="button"
                  onClick={() => updateInvoiceField("logoImage", "")}
                  className="flex items-center justify-center"
                  style={{ marginLeft: "auto", width: 28, height: 28, borderRadius: "9999px", background: c.paper, border: "none", cursor: "pointer" }}
                >
                  <X size={13} style={{ color: c.coral }} />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>

      <div>
        <SectionLabel>{lang === "th" ? "จัดการสินค้ามินิบาร์" : "Manage minibar items"}</SectionLabel>
        <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
          {form.minibarItems.map((item, i) => (
            <div key={item.id || i} className="flex items-center gap-2">
              <input
                value={item.name}
                onChange={(e) => updateMinibarItem(i, "name", e.target.value)}
                placeholder={lang === "th" ? "ชื่อสินค้า" : "Item name"}
                style={{ flex: 2, minWidth: 0, fontSize: 13, padding: "10px 12px", borderRadius: "0.6rem", border: `1px solid ${c.paperBorder}`, outline: "none", color: c.ink, background: c.white }}
              />
              <input
                type="number"
                value={item.price}
                onChange={(e) => updateMinibarItem(i, "price", e.target.value)}
                placeholder="฿"
                style={{ width: 72, fontSize: 13, padding: "10px 10px", borderRadius: "0.6rem", border: `1px solid ${c.paperBorder}`, outline: "none", color: c.ink, background: c.white }}
              />
              <button
                type="button"
                onClick={() => removeMinibarItem(i)}
                className="flex items-center justify-center shrink-0"
                style={{ width: 34, height: 34, borderRadius: "0.5rem", background: c.paper, border: "none", cursor: "pointer" }}
              >
                <X size={14} style={{ color: c.coral }} />
              </button>
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addMinibarItem}
          className="w-full flex items-center justify-center gap-2"
          style={{ marginTop: 10, padding: "10px 0", borderRadius: "0.6rem", fontSize: 13, fontWeight: 600, border: `1.5px dashed ${c.brassPale}`, color: c.brass, background: c.brassBg, cursor: "pointer" }}
        >
          <Plus size={14} /> {lang === "th" ? "เพิ่มสินค้า" : "Add item"}
        </button>
        <p style={{ fontSize: 11, color: c.textFaint, marginTop: 6 }}>
          {lang === "th" ? "รายการที่ไม่ใส่ชื่อจะไม่ถูกบันทึก" : "Items left without a name won't be saved."}
        </p>
      </div>

      <div>
        <SectionLabel>{t.admin.houseRulesTitle}</SectionLabel>
        <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 10 }}>{t.admin.houseRulesNote}</p>
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          {form.houseRules.map((rule, i) => (
            <div key={rule.id} style={{ background: c.white, borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, padding: 12 }}>
              <div className="flex items-center justify-between" style={{ marginBottom: 8 }}>
                <p style={{ fontSize: 11, color: c.textFaint, textTransform: "uppercase", letterSpacing: "0.05em" }}>#{i + 1}</p>
                <button
                  type="button"
                  onClick={() => removeRule(i)}
                  className="flex items-center justify-center"
                  style={{ width: 28, height: 28, borderRadius: "9999px", background: c.paper, border: "none", cursor: "pointer" }}
                >
                  <X size={13} style={{ color: c.coral }} />
                </button>
              </div>

              <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 4 }}>{t.admin.ruleTitleLabel}</p>
              <TextField
                value={rule.title}
                onChange={(e) => updateRule(i, "title", e.target.value)}
                placeholder={t.admin.ruleTitlePlaceholder}
              />

              <p style={{ fontSize: 11, color: c.textFaint, margin: "10px 0 4px" }}>{t.admin.ruleDescLabel}</p>
              <TextField
                value={rule.description}
                onChange={(e) => updateRule(i, "description", e.target.value)}
                placeholder={t.admin.ruleDescPlaceholder}
              />

              <p style={{ fontSize: 11, color: c.textFaint, margin: "10px 0 4px" }}>{t.admin.ruleImageLabel}</p>
              <input
                ref={(el) => { ruleFileRefs.current[rule.id] = el; }}
                type="file"
                accept="image/*"
                onChange={(e) => handleRuleImageFile(i, e)}
                style={{ display: "none" }}
              />
              {!rule.image ? (
                <button
                  type="button"
                  onClick={() => ruleFileRefs.current[rule.id] && ruleFileRefs.current[rule.id].click()}
                  disabled={ruleImageCompressingId === rule.id}
                  className="w-full flex flex-col items-center gap-2"
                  style={{ padding: "16px 0", borderRadius: "0.6rem", border: `2px dashed ${c.brassPale}`, background: c.brassBg, color: c.brass, cursor: ruleImageCompressingId === rule.id ? "not-allowed" : "pointer" }}
                >
                  {ruleImageCompressingId === rule.id ? <Loader2 size={16} className="animate-spin" /> : <Upload size={16} />}
                  <span style={{ fontSize: 12, fontWeight: 500 }}>{t.admin.tapToAttachImage}</span>
                </button>
              ) : (
                <div className="flex items-center gap-2">
                  <img src={rule.image} alt={rule.title} style={{ width: 56, height: 56, objectFit: "cover", borderRadius: "0.5rem", border: `1px solid ${c.paperBorder}` }} />
                  <button
                    type="button"
                    onClick={() => ruleFileRefs.current[rule.id] && ruleFileRefs.current[rule.id].click()}
                    style={{ fontSize: 12, color: c.teal, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
                  >
                    {t.admin.changeImage}
                  </button>
                  <button
                    type="button"
                    onClick={() => updateRule(i, "image", "")}
                    className="flex items-center justify-center"
                    style={{ marginLeft: "auto", width: 26, height: 26, borderRadius: "9999px", background: c.paper, border: "none", cursor: "pointer" }}
                  >
                    <X size={12} style={{ color: c.coral }} />
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
        <button
          type="button"
          onClick={addRule}
          className="w-full flex items-center justify-center gap-2"
          style={{ marginTop: 10, padding: "10px 0", borderRadius: "0.6rem", fontSize: 13, fontWeight: 600, border: `1.5px dashed ${c.brassPale}`, color: c.brass, background: c.brassBg, cursor: "pointer" }}
        >
          <Plus size={14} /> {t.admin.addRule}
        </button>
      </div>

      <PrimaryButton onClick={save} disabled={saving || compressing}>
        {saving ? <><Loader2 size={16} className="animate-spin" /> {t.admin.loading}</> : t.admin.saveBtn}
      </PrimaryButton>
      {saved && <p style={{ fontSize: 12, color: c.success, textAlign: "center" }}>{t.admin.saved}</p>}

      <div style={{ borderTop: `1px solid ${c.paperBorder}`, paddingTop: 16 }}>
        <SectionLabel>{lang === "th" ? "ตรวจสอบระบบหลังบ้าน" : "Backend diagnostics"}</SectionLabel>
        <p style={{ fontSize: 12, color: c.textMuted, marginBottom: 10 }}>
          {lang === "th"
            ? "กดปุ่มนี้เพื่อทดสอบว่าอุปกรณ์/เบราว์เซอร์นี้เชื่อมต่อระบบเก็บข้อมูลหลังบ้านได้จริงหรือไม่ ก่อนไปทดสอบการจอง"
            : "Tap to check whether this device/browser can actually reach the shared backend storage, before testing a real booking."}
        </p>
        <button
          type="button"
          onClick={runBackendTest}
          disabled={testing}
          className="w-full flex items-center justify-center gap-2"
          style={{ padding: "12px 0", borderRadius: "0.75rem", fontWeight: 600, fontSize: 14, border: `2px solid ${c.teal}`, color: c.teal, background: "transparent", cursor: testing ? "not-allowed" : "pointer" }}
        >
          {testing ? <Loader2 size={16} className="animate-spin" /> : <ShieldCheck size={16} />}
          {lang === "th" ? "ทดสอบระบบหลังบ้าน" : "Test backend"}
        </button>
        {testResult === "ok" && (
          <p style={{ fontSize: 12, color: c.success, textAlign: "center", marginTop: 8 }}>
            {lang === "th" ? "✓ เชื่อมต่อสำเร็จ — ระบบหลังบ้านจริงพร้อมใช้งานในอุปกรณ์นี้ ข้อมูลจะแชร์ข้ามอุปกรณ์ได้" : "✓ Connected — the real backend works here. Data will sync across devices."}
          </p>
        )}
        {testResult === "fallback" && (
          <p style={{ fontSize: 12, color: c.coral, textAlign: "center", marginTop: 8 }}>
            {lang === "th"
              ? "⚠ อุปกรณ์/วิธีที่เปิดต้นแบบนี้ไม่รองรับระบบหลังบ้านจริง แอปจะสลับไปใช้โหมดสำรอง (เก็บในเซสชันนี้ชั่วคราว) ให้อัตโนมัติ — ยังลองจองแล้วดูในแอดมินได้ในหน้าเดียวกันนี้โดยไม่ต้องรีเฟรช แต่ข้อมูลจะไม่ข้ามอุปกรณ์/ไม่อยู่ถ้าปิดหรือรีเฟรชแท็บ ลองเปิดผ่าน claude.ai โดยตรงเพื่อใช้งานจริง"
              : "⚠ This device/how the prototype was opened doesn't support the real backend. The app will automatically fall back to a temporary same-session store — you can still test booking → admin in this same tab without refreshing, but data won't sync across devices or survive a reload/refresh. Open it directly on claude.ai for the real thing."}
          </p>
        )}
      </div>
    </div>
  );
}

function AdminBookings({ lang }) {
  const t = STRINGS[lang];
  const [bookings, setBookings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [viewingSlip, setViewingSlip] = useState(null); // booking object | null
  const [checkingSlipId, setCheckingSlipId] = useState(null);
  const [assigningRoom, setAssigningRoom] = useState(null); // booking object | null
  const [roomByCode, setRoomByCode] = useState({});

  const checkSlip = async (bookingRecord) => {
    setCheckingSlipId(bookingRecord.id);
    const result = await verifySlipWithAI(bookingRecord.slipImage, { amount: bookingRecord.amount || 0, name: HOTEL_ACCOUNT_NAME });
    const updatedList = bookings.map(b => b.id === bookingRecord.id ? { ...b, slipCheck: result } : b);
    setBookings(updatedList);
    setViewingSlip(prev => prev && prev.id === bookingRecord.id ? { ...prev, slipCheck: result } : prev);
    try {
      await storageSet(BOOKINGS_KEY, JSON.stringify(updatedList), true);
    } catch (e) {
      // storage unavailable — result still shows for this session
    }
    setCheckingSlipId(null);
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await storageGet(BOOKINGS_KEY, true);
      if (res && res.value) setBookings(JSON.parse(res.value));
      else setBookings([]);
    } catch (e) {
      setBookings([]);
    } finally {
      setLoading(false);
    }
    try {
      const roomsRes = await storageGet(ROOMS_KEY, true);
      const roomsList = roomsRes && roomsRes.value ? JSON.parse(roomsRes.value) : [];
      const map = {};
      roomsList.forEach(r => { if (r.code) map[r.code] = r; });
      setRoomByCode(map);
    } catch (e) {
      setRoomByCode({});
    }
  };

  useEffect(() => { load(); }, []);

  const totalRevenue = bookings.reduce((s, b) => s + (b.amount || 0), 0);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="flex gap-3">
        <StatCard label={t.admin.totalBookings} value={t.admin.items(bookings.length)} />
        <StatCard label={t.admin.totalRevenue} value={`฿${totalRevenue.toLocaleString()}`} />
      </div>

      <button
        type="button"
        onClick={load}
        style={{ fontSize: 12, color: c.teal, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", alignSelf: "flex-end" }}
      >
        {t.admin.refresh}
      </button>

      {loading && <p style={{ fontSize: 14, color: c.textMuted, textAlign: "center", padding: "24px 0" }}>{t.admin.loading}</p>}
      {!loading && bookings.length === 0 && (
        <p style={{ fontSize: 14, color: c.textFaint, textAlign: "center", padding: "24px 0" }}>{t.admin.noBookings}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {bookings.slice().reverse().map(b => (
          <div key={b.id} style={{ background: c.white, borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, padding: 12 }}>
            <div className="flex justify-between items-start">
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: c.ink }}>{b.name || t.admin.unnamedGuest}</p>
                <p style={{ fontSize: 11, color: c.textFaint }}>{b.phone || "-"} · {b.email || "-"}</p>
              </div>
              <p style={{ fontSize: 14, fontWeight: 600, color: c.brass }}>฿{(b.amount || 0).toLocaleString()}</p>
            </div>
            <div className="flex items-center gap-1" style={{ marginTop: 6 }}>
              <DoorOpen size={12} style={{ color: roomByCode[b.code] ? c.teal : c.textFaint }} />
              <span style={{ fontSize: 12, fontWeight: 600, color: roomByCode[b.code] ? c.teal : c.textFaint }}>
                {roomByCode[b.code] ? `${lang === "th" ? "ห้อง" : "Room"} ${roomByCode[b.code].number}` : t.admin.noRoomAssigned}
              </span>
            </div>
            <div className="flex items-center justify-between" style={{ marginTop: 8, fontSize: 11, color: c.textMuted }}>
              <span>{b.roomName} · {b.checkIn}–{b.checkOut}</span>
              {b.slipAttached && b.slipImage ? (
                <button
                  type="button"
                  onClick={() => setViewingSlip(b)}
                  className="flex items-center gap-1"
                  style={{ color: c.success, fontWeight: 600, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
                >
                  <Receipt size={12} /> {t.admin.slipYes}
                </button>
              ) : (
                <span style={{ color: b.slipAttached ? c.success : c.coral, fontWeight: 500 }}>{b.slipAttached ? t.admin.slipYes : t.admin.slipNo}</span>
              )}
            </div>
            <div className="flex items-center justify-between" style={{ marginTop: 6 }}>
              <p style={{ fontSize: 10, color: c.textFaint, fontFamily: "'IBM Plex Mono', monospace" }}>{b.code}</p>
              <button
                type="button"
                onClick={() => setAssigningRoom(b)}
                className="flex items-center gap-1"
                style={{ fontSize: 11, fontWeight: 600, color: c.brass, background: "none", border: "none", cursor: "pointer", padding: 0, textDecoration: "underline" }}
              >
                <Building2 size={11} /> {t.admin.assignRoomBtn}
              </button>
            </div>
          </div>
        ))}
      </div>

      {assigningRoom && (
        <AdminRoomAssignModal
          lang={lang}
          booking={assigningRoom}
          onClose={() => setAssigningRoom(null)}
          onAssigned={() => { setAssigningRoom(null); load(); }}
        />
      )}

      {viewingSlip && (
        <div
          onClick={() => setViewingSlip(null)}
          style={{ position: "fixed", inset: 0, background: "rgba(16,22,27,0.85)", zIndex: 50, display: "flex", alignItems: "center", justifyContent: "center", padding: 24 }}
        >
          <div onClick={(e) => e.stopPropagation()} style={{ background: c.white, borderRadius: "1rem", padding: 16, maxWidth: 320, width: "100%", maxHeight: "85vh", overflowY: "auto" }}>
            <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
              <p style={{ fontSize: 14, fontWeight: 600, color: c.ink }}>{viewingSlip.name || t.admin.unnamedGuest} · {viewingSlip.code}</p>
              <button type="button" onClick={() => setViewingSlip(null)} className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "9999px", background: c.paper, border: "none", cursor: "pointer" }}>
                <X size={14} style={{ color: c.ink }} />
              </button>
            </div>
            <img src={viewingSlip.slipImage} alt="Payment slip" style={{ width: "100%", borderRadius: "0.75rem", display: "block" }} />

            <div style={{ marginTop: 12 }}>
              <button
                type="button"
                onClick={() => checkSlip(viewingSlip)}
                disabled={checkingSlipId === viewingSlip.id}
                className="w-full flex items-center justify-center gap-2"
                style={{ padding: "11px 0", borderRadius: "0.6rem", fontWeight: 600, fontSize: 13, border: `2px solid ${c.teal}`, color: c.teal, background: "transparent", cursor: checkingSlipId === viewingSlip.id ? "not-allowed" : "pointer" }}
              >
                {checkingSlipId === viewingSlip.id ? <Loader2 size={14} className="animate-spin" /> : <ShieldCheck size={14} />}
                {checkingSlipId === viewingSlip.id ? t.slipCheck.checking : t.slipCheck.checkBtn}
              </button>
              {viewingSlip.slipCheck && checkingSlipId !== viewingSlip.id && (
                <div style={{ marginTop: 10 }}>
                  <SlipCheckResult lang={lang} result={viewingSlip.slipCheck} expected={{ amount: viewingSlip.amount || 0, name: HOTEL_ACCOUNT_NAME }} />
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function AdminRoomAssignModal({ lang, booking, onClose, onAssigned }) {
  const t = STRINGS[lang];
  const [floor, setFloor] = useState(1);
  const [rooms, setRooms] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const statusMeta = {
    ready: { label: t.admin.status.ready, color: c.success, bg: "#E9F6EF" },
    pending: { label: t.admin.status.pending, color: c.brassLight, bg: c.paper },
    occupied: { label: t.admin.status.occupied, color: c.teal, bg: c.tealPale },
    checkout: { label: t.admin.status.checkout, color: c.coral, bg: "#FBEAE3" },
    cleaning: { label: t.admin.status.cleaning, color: c.brass, bg: c.brassBg },
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await storageGet(ROOMS_KEY, true);
      const list = res && res.value ? JSON.parse(res.value) : buildDefaultRooms();
      setRooms(list);
      const current = list.find(r => r.code === booking.code);
      if (current) {
        setSelected(current.number);
        setFloor(current.floor);
      }
    } catch (e) {
      setRooms(buildDefaultRooms());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const currentRoom = (rooms || []).find(r => r.code === booking.code);
  const floorRooms = (rooms || []).filter(r => r.floor === floor);
  const hasExtraBed = currentRoom ? !!currentRoom.hasExtraBed : false;

  const pick = (room) => {
    if (room.number === (currentRoom && currentRoom.number)) { setSelected(room.number); setError(""); return; }
    if (room.status !== "ready") return;
    if (hasExtraBed && room.noExtraBed) { setError(t.admin.cannotAssignExtraBed); return; }
    setError("");
    setSelected(room.number);
  };

  const confirm = async () => {
    if (!selected || !rooms) return;
    setSaving(true);
    const target = rooms.find(r => r.number === selected);
    const carryStatus = currentRoom ? currentRoom.status : "pending";
    const updated = rooms.map(r => {
      if (currentRoom && r.number === currentRoom.number && r.number !== target.number) {
        return { ...r, status: "ready", guestName: "", phone: "", checkIn: "", checkOut: "", code: "", hasExtraBed: false };
      }
      if (r.number === target.number) {
        return {
          ...r,
          status: carryStatus,
          guestName: booking.name,
          phone: booking.phone,
          checkIn: booking.checkIn,
          checkOut: booking.checkOut,
          code: booking.code,
          hasExtraBed,
        };
      }
      return r;
    });
    try {
      await storageSet(ROOMS_KEY, JSON.stringify(updated), true);
    } catch (e) {
      // storage unavailable — assignment still applies for this session
    }
    setSaving(false);
    onAssigned();
  };

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(16,22,27,0.85)", zIndex: 55, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: c.paper, borderRadius: "1.25rem 1.25rem 0 0", padding: 20, width: "100%", maxWidth: 420, maxHeight: "85vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 4 }}>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: c.ink }}>{t.admin.assignRoomTitle}</p>
          <button type="button" onClick={onClose} className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "9999px", background: c.white, border: "none", cursor: "pointer" }}>
            <X size={14} style={{ color: c.ink }} />
          </button>
        </div>
        <p style={{ fontSize: 12, color: c.textMuted, marginBottom: 14 }}>{t.admin.assignRoomSubtitle}</p>

        <div style={{ background: c.white, borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, padding: 12, marginBottom: 14 }}>
          <p style={{ fontSize: 14, fontWeight: 500, color: c.ink }}>{booking.name || t.admin.unnamedGuest}</p>
          <p style={{ fontSize: 11, color: c.textFaint }}>{booking.roomName} · {booking.checkIn}–{booking.checkOut}</p>
          <p style={{ fontSize: 11, color: c.textMuted, marginTop: 6 }}>
            {t.admin.currentRoomLabel}: <b style={{ color: c.ink }}>{currentRoom ? currentRoom.number : t.admin.noRoomAssigned}</b>
          </p>
        </div>

        <div className="flex gap-2" style={{ marginBottom: 10 }}>
          <TabButton active={floor === 1} onClick={() => setFloor(1)}>{t.admin.floor1}</TabButton>
          <TabButton active={floor === 2} onClick={() => setFloor(2)}>{t.admin.floor2}</TabButton>
        </div>

        {loading ? (
          <p style={{ fontSize: 13, color: c.textMuted, textAlign: "center", padding: "16px 0" }}>{t.admin.loading}</p>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {floorRooms.map(r => {
              const meta = statusMeta[r.status] || statusMeta.ready;
              const isCurrent = currentRoom && r.number === currentRoom.number;
              const selectable = r.status === "ready" || isCurrent;
              const isSelected = selected === r.number;
              return (
                <button
                  type="button"
                  key={r.number}
                  onClick={() => pick(r)}
                  disabled={!selectable}
                  style={{
                    padding: "10px 0",
                    borderRadius: "0.6rem",
                    textAlign: "center",
                    cursor: selectable ? "pointer" : "not-allowed",
                    border: `1.5px solid ${isSelected ? c.brass : c.paperBorder}`,
                    background: isSelected ? c.brassBg : c.white,
                    opacity: selectable ? 1 : 0.5,
                  }}
                >
                  <p style={{ fontSize: 14, fontWeight: 700, color: isSelected ? c.brass : c.ink }}>{r.number}</p>
                  <p style={{ fontSize: 9, fontWeight: 600, color: meta.color, marginTop: 2 }}>{isCurrent ? t.admin.currentRoomLabel : meta.label}</p>
                </button>
              );
            })}
          </div>
        )}

        {error && <p style={{ fontSize: 12, color: c.coral, marginBottom: 10 }}>{error}</p>}

        <PrimaryButton onClick={confirm} disabled={!selected || saving}>
          {saving ? <><Loader2 size={16} className="animate-spin" /> {t.admin.assigning}</> : t.admin.confirmAssign}
        </PrimaryButton>
      </div>
    </div>
  );
}

function StatCard({ label, value }) {
  return (
    <div className="flex-1" style={{ background: c.paper, borderRadius: "0.75rem", padding: 12 }}>
      <p style={{ fontSize: 11, color: c.textMuted }}>{label}</p>
      <p style={{ fontSize: 18, fontWeight: 600, color: c.ink, marginTop: 2 }}>{value}</p>
    </div>
  );
}

/* ---------------- Admin: Rooms status board ---------------- */

function AdminRooms({ lang }) {
  const t = STRINGS[lang];
  const [rooms, setRooms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [updatingRoom, setUpdatingRoom] = useState(null);

  const statusMeta = {
    ready: { label: t.admin.status.ready, color: c.success, bg: "#E9F6EF" },
    pending: { label: t.admin.status.pending, color: c.brassLight, bg: c.paper },
    occupied: { label: t.admin.status.occupied, color: c.teal, bg: c.tealPale },
    checkout: { label: t.admin.status.checkout, color: c.coral, bg: "#FBEAE3" },
    cleaning: { label: t.admin.status.cleaning, color: c.brass, bg: c.brassBg },
  };

  const load = async () => {
    setLoading(true);
    try {
      const res = await storageGet(ROOMS_KEY, true);
      if (res && res.value) setRooms(JSON.parse(res.value));
      else setRooms(buildDefaultRooms());
    } catch (e) {
      setRooms(buildDefaultRooms());
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const updateStatus = async (number, newStatus) => {
    setUpdatingRoom(number);
    const updated = rooms.map(r => {
      if (r.number !== number) return r;
      if (newStatus === "ready") {
        return { ...r, status: newStatus, guestName: "", phone: "", checkIn: "", checkOut: "", code: "", hasExtraBed: false };
      }
      return { ...r, status: newStatus };
    });
    setRooms(updated);
    try {
      await storageSet(ROOMS_KEY, JSON.stringify(updated), true);
    } catch (e) {
      // storage unavailable — local view still updates for this session
    }
    setUpdatingRoom(null);
  };

  const counts = STATUS_ORDER.reduce((acc, key) => {
    acc[key] = rooms.filter(r => r.status === key).length;
    return acc;
  }, {});

  const floors = [
    { floor: 1, label: t.admin.floor1 },
    { floor: 2, label: t.admin.floor2 },
  ];

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
        {STATUS_ORDER.map(key => (
          <StatCard key={key} label={statusMeta[key].label} value={t.admin.floors(counts[key] || 0)} />
        ))}
      </div>

      <button
        type="button"
        onClick={load}
        style={{ fontSize: 12, color: c.teal, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", alignSelf: "flex-end" }}
      >
        {t.admin.refreshRooms}
      </button>

      <p style={{ fontSize: 11, color: c.textFaint, marginTop: -8 }}>{t.admin.manualNote}</p>

      {loading && <p style={{ fontSize: 14, color: c.textMuted, textAlign: "center", padding: "24px 0" }}>{t.admin.loading}</p>}

      {!loading && floors.map(f => (
        <div key={f.floor}>
          <SectionLabel>{f.label}</SectionLabel>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {rooms.filter(r => r.floor === f.floor).map(r => {
              const meta = statusMeta[r.status] || statusMeta.ready;
              const busy = updatingRoom === r.number;
              return (
                <div key={r.number} style={{ background: c.white, borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, padding: 12 }}>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center gap-2">
                      <div className="flex items-center justify-center" style={{ width: 36, height: 36, borderRadius: "0.5rem", background: c.paper }}>
                        <DoorOpen size={16} style={{ color: c.tealDark }} />
                      </div>
                      <div>
                        <p style={{ fontSize: 15, fontWeight: 600, color: c.ink }}>
                          {lang === "th" ? `ห้อง ${r.number}` : `Room ${r.number}`}
                          {r.noExtraBed && <span style={{ fontSize: 11, color: c.textFaint, fontWeight: 400 }}> {t.admin.noExtraBedRoom}</span>}
                        </p>
                        {(r.status === "occupied" || r.status === "pending") ? (
                          <p style={{ fontSize: 11, color: c.textFaint }}>{r.guestName || t.admin.unnamedGuest} · {r.checkIn}–{r.checkOut}</p>
                        ) : (
                          <p style={{ fontSize: 11, color: c.textFaint }}>{r.guestName ? t.admin.guestLeft(r.guestName) : t.admin.noGuest}</p>
                        )}
                      </div>
                    </div>
                    <span style={{ fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: "9999px", background: meta.bg, color: meta.color, whiteSpace: "nowrap" }}>
                      {meta.label}
                    </span>
                  </div>

                  {r.hasExtraBed && (
                    <div className="flex items-center gap-2" style={{ marginTop: 10, padding: "8px 12px", borderRadius: "0.5rem", background: c.brassBg }}>
                      <BedDouble size={13} style={{ color: c.brass }} />
                      <span style={{ fontSize: 11, color: c.brass, fontWeight: 600 }}>{t.admin.hasExtraBed}</span>
                    </div>
                  )}

                  {r.code && (
                    <div className="flex items-center justify-between" style={{ marginTop: 10, padding: "8px 12px", borderRadius: "0.5rem", background: c.paper }}>
                      <div className="flex items-center gap-2">
                        <KeyRound size={13} style={{ color: c.brass }} />
                        <span style={{ fontSize: 11, color: c.textMuted }}>{t.admin.selfCheckinCode}</span>
                      </div>
                      <span style={{ fontFamily: "'IBM Plex Mono', monospace", fontSize: 13, fontWeight: 600, color: c.brass, letterSpacing: "0.05em" }}>{r.code}</span>
                    </div>
                  )}

                  <div style={{ marginTop: 10 }}>
                    <p style={{ fontSize: 10, color: c.textFaint, marginBottom: 4, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.admin.changeStatus}</p>
                    <select
                      value={r.status}
                      disabled={busy}
                      onChange={(e) => updateStatus(r.number, e.target.value)}
                      style={{
                        width: "100%", padding: "9px 12px", borderRadius: "0.5rem", fontSize: 13, fontWeight: 500,
                        background: busy ? c.disabledBg : c.white, color: busy ? c.disabledText : c.ink,
                        border: `1px solid ${c.paperBorder}`, outline: "none", cursor: busy ? "not-allowed" : "pointer",
                        appearance: "auto",
                      }}
                    >
                      {STATUS_ORDER.map(key => (
                        <option key={key} value={key}>{statusMeta[key].label}</option>
                      ))}
                    </select>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---------------- Admin: Tax invoice requests ---------------- */

function AdminInvoices({ lang, settings, onGoToSettings }) {
  const t = STRINGS[lang];
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [printing, setPrinting] = useState(null); // request object | null
  const [manualOpen, setManualOpen] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const res = await storageGet(INVOICE_REQUESTS_KEY, true);
      setRequests(res && res.value ? JSON.parse(res.value) : []);
    } catch (e) {
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []);

  const markPrinted = async (id) => {
    const updated = requests.map(r => r.id === id ? { ...r, printed: true } : r);
    setRequests(updated);
    try {
      await storageSet(INVOICE_REQUESTS_KEY, JSON.stringify(updated), true);
    } catch (e) {
      // storage unavailable — local view still updates for this session
    }
  };

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
      <div className="flex gap-2">
        <button
          type="button"
          onClick={onGoToSettings}
          className="flex-1 flex items-center justify-center gap-1.5"
          style={{ padding: "10px 0", borderRadius: "0.6rem", fontSize: 13, fontWeight: 600, border: `1.5px solid ${c.teal}`, color: c.teal, background: "transparent", cursor: "pointer" }}
        >
          <Wallet size={14} /> {t.admin.letterheadShortcutBtn}
        </button>
        <button
          type="button"
          onClick={() => setManualOpen(true)}
          className="flex-1 flex items-center justify-center gap-1.5"
          style={{ padding: "10px 0", borderRadius: "0.6rem", fontSize: 13, fontWeight: 600, border: "none", color: c.white, background: c.brass, cursor: "pointer" }}
        >
          <Plus size={14} /> {t.admin.manualInvoiceBtn}
        </button>
      </div>

      <button
        type="button"
        onClick={load}
        style={{ fontSize: 12, color: c.teal, textDecoration: "underline", background: "none", border: "none", cursor: "pointer", alignSelf: "flex-end" }}
      >
        {t.admin.refresh}
      </button>

      {loading && <p style={{ fontSize: 14, color: c.textMuted, textAlign: "center", padding: "24px 0" }}>{t.admin.loading}</p>}
      {!loading && requests.length === 0 && (
        <p style={{ fontSize: 14, color: c.textFaint, textAlign: "center", padding: "24px 0" }}>{t.admin.invoiceRequestsEmpty}</p>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
        {requests.slice().reverse().map(r => (
          <div key={r.id} style={{ background: c.white, borderRadius: "0.75rem", border: `1px solid ${c.paperBorder}`, padding: 12 }}>
            <div className="flex justify-between items-start">
              <div>
                <p style={{ fontSize: 14, fontWeight: 500, color: c.ink }}>{r.buyerName}</p>
                <p style={{ fontSize: 11, color: c.textFaint }}>{r.bookingCode} · {r.method === "pdf" ? t.admin.invoiceMethodPdf : t.admin.invoiceMethodStaff}</p>
              </div>
              <span
                style={{
                  fontSize: 11, fontWeight: 600, padding: "4px 10px", borderRadius: "9999px",
                  background: r.printed ? "#E9F6EF" : c.brassBg,
                  color: r.printed ? c.success : c.brass,
                }}
              >
                {r.printed ? t.admin.invoiceStatusDone : t.admin.invoiceStatusPending}
              </span>
            </div>
            <div className="flex gap-2" style={{ marginTop: 10 }}>
              <button
                type="button"
                onClick={() => setPrinting(r)}
                className="flex-1 flex items-center justify-center gap-1.5"
                style={{ padding: "9px 0", borderRadius: "0.5rem", fontSize: 12, fontWeight: 600, border: `1.5px solid ${c.teal}`, color: c.teal, background: "transparent", cursor: "pointer" }}
              >
                <FileText size={13} /> {t.admin.viewPrint}
              </button>
              {!r.printed && (
                <button
                  type="button"
                  onClick={() => markPrinted(r.id)}
                  className="flex-1 flex items-center justify-center gap-1.5"
                  style={{ padding: "9px 0", borderRadius: "0.5rem", fontSize: 12, fontWeight: 600, border: "none", color: c.white, background: c.success, cursor: "pointer" }}
                >
                  <Check size={13} /> {t.admin.markPrinted}
                </button>
              )}
            </div>
          </div>
        ))}
      </div>

      {printing && (
        <InvoicePreview lang={lang} request={printing} onClose={() => setPrinting(null)} />
      )}

      {manualOpen && (
        <AdminManualInvoiceModal
          lang={lang}
          settings={settings}
          onClose={() => setManualOpen(false)}
          onIssued={() => { setManualOpen(false); load(); }}
        />
      )}
    </div>
  );
}

function AdminManualInvoiceModal({ lang, settings, onClose, onIssued }) {
  const t = STRINGS[lang];
  const [buyerName, setBuyerName] = useState("");
  const [buyerTaxId, setBuyerTaxId] = useState("");
  const [buyerAddress, setBuyerAddress] = useState("");
  const [bookingCode, setBookingCode] = useState("");
  const [lineItems, setLineItems] = useState([{ id: `li-${Date.now()}`, label: "", amount: "" }]);
  const [error, setError] = useState("");
  const [savedRequest, setSavedRequest] = useState(null);

  const updateLine = (index, field, value) => {
    setLineItems(items => {
      const next = [...items];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
  };

  const addLine = () => setLineItems(items => [...items, { id: `li-${Date.now()}`, label: "", amount: "" }]);
  const removeLine = (index) => setLineItems(items => items.filter((_, i) => i !== index));

  const validLines = lineItems.filter(li => li.label.trim() && Number(li.amount) > 0);
  const subtotal = validLines.reduce((s, li) => s + Number(li.amount), 0);
  const taxRate = (settings && settings.taxRate) ?? 7;
  const tax = Math.round(subtotal * (taxRate / 100));
  const total = subtotal + tax;

  const issue = async () => {
    if (!buyerName.trim()) { setError(t.invoice.missingName); return; }
    if (validLines.length === 0) { setError(t.invoice.missingLineItems); return; }
    setError("");

    const request = {
      id: `inv-${Date.now()}`,
      bookingCode: bookingCode.trim() || "-",
      buyerName: buyerName.trim(),
      buyerTaxId: buyerTaxId.trim(),
      buyerAddress: buyerAddress.trim(),
      method: "admin",
      printed: true,
      requestedAt: new Date().toISOString(),
      seller: (settings && settings.invoiceInfo) || DEFAULT_INVOICE_INFO,
      lineItems: validLines.map(li => ({ label: li.label.trim(), qty: 1, amount: Number(li.amount) })),
      subtotal, taxRate, tax, total,
    };

    try {
      let list = [];
      try {
        const existing = await storageGet(INVOICE_REQUESTS_KEY, true);
        if (existing && existing.value) list = JSON.parse(existing.value);
      } catch (e) {
        list = [];
      }
      list.push(request);
      await storageSet(INVOICE_REQUESTS_KEY, JSON.stringify(list), true);
    } catch (e) {
      // storage unavailable — the invoice still prints for this session
    }
    setSavedRequest(request);
  };

  if (savedRequest) {
    return <InvoicePreview lang={lang} request={savedRequest} onClose={onIssued} />;
  }

  return (
    <div
      onClick={onClose}
      style={{ position: "fixed", inset: 0, background: "rgba(16,22,27,0.85)", zIndex: 55, display: "flex", alignItems: "flex-end", justifyContent: "center" }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{ background: c.paper, borderRadius: "1.25rem 1.25rem 0 0", padding: 20, width: "100%", maxWidth: 420, maxHeight: "85vh", overflowY: "auto" }}
      >
        <div className="flex items-center justify-between" style={{ marginBottom: 12 }}>
          <p style={{ fontFamily: "'Fraunces', serif", fontSize: 18, color: c.ink }}>{t.invoice.manualTitle}</p>
          <button type="button" onClick={onClose} className="flex items-center justify-center" style={{ width: 28, height: 28, borderRadius: "9999px", background: c.white, border: "none", cursor: "pointer" }}>
            <X size={14} style={{ color: c.ink }} />
          </button>
        </div>

        <p style={{ fontSize: 13, color: c.textMuted, marginBottom: 14 }}>{t.invoice.manualSubtitle}</p>

        <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          <div>
            <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 4 }}>{t.invoice.buyerName}</p>
            <TextField value={buyerName} onChange={(e) => setBuyerName(e.target.value)} placeholder={t.invoice.buyerNamePlaceholder} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 4 }}>{t.invoice.buyerTaxId}</p>
            <TextField value={buyerTaxId} onChange={(e) => setBuyerTaxId(e.target.value)} placeholder={t.invoice.buyerTaxIdPlaceholder} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 4 }}>{t.invoice.buyerAddress}</p>
            <TextField value={buyerAddress} onChange={(e) => setBuyerAddress(e.target.value)} placeholder={t.invoice.buyerAddressPlaceholder} />
          </div>
          <div>
            <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 4 }}>{t.invoice.bookingCodeLabel}</p>
            <TextField value={bookingCode} onChange={(e) => setBookingCode(e.target.value)} placeholder={t.invoice.bookingCodePlaceholder} />
          </div>

          <div>
            <p style={{ fontSize: 11, color: c.textFaint, marginBottom: 6, textTransform: "uppercase", letterSpacing: "0.05em" }}>{t.invoice.lineItemLabel}</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {lineItems.map((li, i) => (
                <div key={li.id} className="flex items-center gap-2">
                  <input
                    value={li.label}
                    onChange={(e) => updateLine(i, "label", e.target.value)}
                    placeholder={t.invoice.lineItemPlaceholder}
                    style={{ flex: 2, minWidth: 0, fontSize: 13, padding: "10px 12px", borderRadius: "0.6rem", border: `1px solid ${c.paperBorder}`, outline: "none", color: c.ink, background: c.white }}
                  />
                  <input
                    type="number"
                    value={li.amount}
                    onChange={(e) => updateLine(i, "amount", e.target.value)}
                    placeholder={t.invoice.amountPlaceholder}
                    style={{ width: 92, fontSize: 13, padding: "10px 10px", borderRadius: "0.6rem", border: `1px solid ${c.paperBorder}`, outline: "none", color: c.ink, background: c.white }}
                  />
                  <button
                    type="button"
                    onClick={() => removeLine(i)}
                    className="flex items-center justify-center shrink-0"
                    style={{ width: 34, height: 34, borderRadius: "0.5rem", background: c.white, border: "none", cursor: "pointer" }}
                  >
                    <X size={14} style={{ color: c.coral }} />
                  </button>
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addLine}
              className="w-full flex items-center justify-center gap-2"
              style={{ marginTop: 8, padding: "9px 0", borderRadius: "0.6rem", fontSize: 12, fontWeight: 600, border: `1.5px dashed ${c.brassPale}`, color: c.brass, background: c.brassBg, cursor: "pointer" }}
            >
              <Plus size={13} /> {t.invoice.addLineItem}
            </button>
          </div>

          {validLines.length > 0 && (
            <div style={{ background: c.white, borderRadius: "0.6rem", border: `1px solid ${c.paperBorder}`, padding: 12, fontSize: 12, display: "flex", flexDirection: "column", gap: 4 }}>
              <div className="flex justify-between" style={{ color: c.textMuted }}><span>{t.invoice.subtotal}</span><span>฿{subtotal.toLocaleString()}</span></div>
              <div className="flex justify-between" style={{ color: c.textMuted }}><span>{t.invoice.taxLine(taxRate)}</span><span>฿{tax.toLocaleString()}</span></div>
              <div className="flex justify-between" style={{ fontWeight: 700, color: c.ink }}><span>{t.invoice.grandTotal}</span><span>฿{total.toLocaleString()}</span></div>
            </div>
          )}

          {error && <p style={{ fontSize: 12, color: c.coral }}>{error}</p>}

          <PrimaryButton onClick={issue} icon={FileText}>{t.invoice.issuePdfBtn}</PrimaryButton>
        </div>
      </div>
    </div>
  );
}

function CheckinFlow({ lang, setLang, booking, setBooking, settings, stepIdx, setStepIdx, onExit }) {
  const t = STRINGS[lang];
  const step = CHECKIN_STEPS[stepIdx];
  const next = () => setStepIdx(i => Math.min(i + 1, CHECKIN_STEPS.length - 1));
  const back = () => setStepIdx(i => Math.max(i - 1, 0));

  return (
    <>
      <TopBar
        title={t.checkinLabels[step]}
        onBack={stepIdx > 0 && step !== "receipt" ? back : null}
        lang={lang}
        setLang={setLang}
      />
      <div className="flex-1 overflow-y-auto" style={{ padding: "0 20px 20px" }}>
        {step === "lookup" && <CheckinLookupScreen lang={lang} setBooking={setBooking} onFound={next} onExit={onExit} />}
        {step === "arrival" && <ArrivalScreen lang={lang} booking={booking} onNext={next} />}
        {step === "verify" && <VerifyScreen lang={lang} booking={booking} setBooking={setBooking} onNext={next} />}
        {step === "key" && <KeyScreen lang={lang} booking={booking} settings={settings} onNext={next} />}
        {step === "rules" && <HouseRulesScreen lang={lang} settings={settings} onNext={next} />}
        {step === "stay" && <StayScreen lang={lang} booking={booking} setBooking={setBooking} settings={settings} onCheckout={next} />}
        {step === "checkout" && <CheckoutScreen lang={lang} booking={booking} settings={settings} onNext={next} />}
        {step === "receipt" && <ReceiptScreen lang={lang} booking={booking} settings={settings} onRestart={onExit} />}
      </div>
    </>
  );
}

function CheckinLookupScreen({ lang, setBooking, onFound, onExit }) {
  const t = STRINGS[lang];
  const [mode, setMode] = useState("code"); // "code" | "details"
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const canSearch = mode === "code"
    ? code.trim().length > 0
    : (name.trim().length > 1 && phone.replace(/\D/g, "").length >= 9);

  const search = async () => {
    setError("");
    setLoading(true);
    try {
      const res = await storageGet(BOOKINGS_KEY, true);
      const list = res && res.value ? JSON.parse(res.value) : [];

      let match = null;
      if (mode === "code") {
        match = list.find(b => (b.code || "").trim().toLowerCase() === code.trim().toLowerCase());
      } else {
        const digits = phone.replace(/\D/g, "");
        match = list.find(b => (b.phone || "").replace(/\D/g, "") === digits && (b.name || "").trim().toLowerCase() === name.trim().toLowerCase());
      }

      if (!match) {
        setError(t.checkinLookup.notFound);
        setLoading(false);
        return;
      }

      let roomNo = "";
      try {
        const roomsRes = await storageGet(ROOMS_KEY, true);
        const rooms = roomsRes && roomsRes.value ? JSON.parse(roomsRes.value) : [];
        const room = rooms.find(r => r.code === match.code);
        if (room) roomNo = room.number;
      } catch (e) {
        // room board unavailable — continue without a room number
      }

      setBooking(b => ({
        ...b,
        name: match.name || "",
        phone: match.phone || "",
        email: match.email || "",
        code: match.code,
        checkIn: match.checkIn || b.checkIn,
        checkOut: match.checkOut || b.checkOut,
        roomNo: roomNo || b.roomNo,
        extras: [],
        minibar: {},
        idVerified: false,
      }));
      setLoading(false);
      onFound();
    } catch (e) {
      setError(t.checkinLookup.systemError);
      setLoading(false);
    }
  };

  return (
    <div className="pt-2" style={{ display: "flex", flexDirection: "column", gap: 20 }}>
      <div style={{ borderRadius: "1rem", padding: 20, color: c.white, background: `linear-gradient(to bottom right, ${c.tealDark}, ${c.teal})` }}>
        <p style={{ fontFamily: "'Fraunces', serif", fontSize: 18 }}>{t.checkinLookup.title}</p>
        <p style={{ fontSize: 12, color: c.tealPale, marginTop: 4 }}>{t.checkinLookup.subtitle}</p>
      </div>

      <div className="flex gap-2">
        <TabButton active={mode === "code"} onClick={() => setMode("code")} icon={KeyRound}>{t.checkinLookup.tabCode}</TabButton>
        <TabButton active={mode === "details"} onClick={() => setMode("details")} icon={Users}>{t.checkinLookup.tabDetails}</TabButton>
      </div>

      {mode === "code" ? (
        <div>
          <SectionLabel>{t.checkinLookup.codeLabel}</SectionLabel>
          <TextField value={code} onChange={(e) => setCode(e.target.value)} placeholder={t.checkinLookup.codePlaceholder} />
        </div>
      ) : (
        <>
          <div>
            <SectionLabel>{t.checkinLookup.nameLabel}</SectionLabel>
            <TextField value={name} onChange={(e) => setName(e.target.value)} placeholder={t.checkinLookup.namePlaceholder} />
          </div>
          <div>
            <SectionLabel>{t.checkinLookup.phoneLabel}</SectionLabel>
            <TextField icon={Phone} value={phone} onChange={(e) => setPhone(e.target.value)} placeholder={t.checkinLookup.phonePlaceholder} type="tel" />
          </div>
        </>
      )}

      {error && <p style={{ fontSize: 12, color: c.coral }}>{error}</p>}

      <PrimaryButton onClick={search} disabled={!canSearch || loading} icon={loading ? undefined : ChevronRight}>
        {loading ? <><Loader2 size={16} className="animate-spin" /> {t.checkinLookup.searching}</> : t.checkinLookup.searchBtn}
      </PrimaryButton>

      <a
        href={STAFF_CONTACT_URL}
        target="_blank"
        rel="noopener noreferrer"
        className="w-full flex items-center justify-center gap-2"
        style={{ padding: "13px 0", borderRadius: "0.75rem", fontWeight: 600, fontSize: 14, border: `2px solid ${c.teal}`, color: c.teal, background: "transparent", textDecoration: "none" }}
      >
        <MessageCircle size={16} /> {t.checkinLookup.contactStaff}
      </a>

      <button
        type="button"
        onClick={onExit}
        style={{ fontSize: 14, color: c.textMuted, textDecoration: "underline", background: "none", border: "none", cursor: "pointer" }}
      >
        {t.checkinLookup.backHome}
      </button>
    </div>
  );
}
