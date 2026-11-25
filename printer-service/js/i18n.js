import { CONFIG } from "./config.js";

const dict = {
  en: {
    appName: "Service Portal",
    lang: "العربية",
    demoBanner: "Demo mode — data is stored only in this browser. Configure Firebase in js/config.js to go live.",
    // common
    email: "Email", password: "Password", login: "Log in", logout: "Log out", save: "Save",
    cancel: "Cancel", close: "Close", delete: "Delete", edit: "Edit", search: "Search…",
    name: "Name", phone: "Phone", status: "Status", date: "Date", actions: "Actions",
    loading: "Loading…", saved: "Saved", error: "Something went wrong", required: "Required",
    loginTitle: "Staff login", wrongRole: "This account does not have access to this portal.",
    // statuses
    st_new: "New", st_assigned: "Assigned", st_in_progress: "In progress",
    st_completed: "Completed", st_follow_up: "Needs follow-up", st_cancelled: "Cancelled",
    // landing
    landingTitle: "Printer Service Portal",
    landingSub: "Scan the QR code on your printer to report a problem, or track an existing complaint.",
    trackComplaint: "Track a complaint", adminPortal: "Admin portal", techPortal: "Technician portal",
    // complaint form
    reportProblem: "Report a printer problem",
    printerNotFound: "This printer is not registered. Please call us directly.",
    noPrinter: "No printer selected. Please scan the QR code on the printer.",
    printer: "Printer", serial: "Serial No.", model: "Model", brand: "Brand", location: "Location",
    client: "Client", yourName: "Your name", yourPhone: "Phone / WhatsApp", yourEmail: "Email (optional)",
    company: "Company / Department", issueType: "Problem type", description: "Describe the problem",
    photos: "Photos (optional)", addPhotos: "Add photos", submit: "Submit complaint", submitting: "Submitting…",
    issue_paper_jam: "Paper jam", issue_print_quality: "Poor print quality", issue_toner: "Toner / ink",
    issue_not_printing: "Not printing", issue_error_code: "Error code on screen", issue_network: "Network / scanning",
    issue_noise: "Strange noise", issue_other: "Other",
    thanks: "Complaint received!", yourTicket: "Your ticket number",
    thanksSub: "Keep this number to track your complaint. Our team will contact you soon.",
    trackNow: "Track status", newComplaint: "Report another problem",
    // track
    ticketNo: "Ticket number", find: "Find", ticketNotFound: "Ticket not found.",
    reported: "Reported", lastUpdate: "Last update", technician: "Technician",
    // admin
    complaints: "Complaints", printers: "Printers", technicians: "Technicians", settings: "Settings",
    all: "All", assign: "Assign", assignTo: "Assign to technician", unassigned: "Unassigned",
    details: "Details", problem: "Problem", reportedBy: "Reported by",
    waTech: "WhatsApp technician", waClient: "WhatsApp client",
    importCsv: "Import CSV / Excel", downloadTemplate: "Download template", printQr: "Print QR labels",
    addPrinter: "Add printer", importDone: "printers imported / updated", importNoSerial: "rows skipped (no serial)",
    selected: "selected", selectAll: "Select all", showQr: "QR",
    addTech: "Add technician", techCreated: "Technician account created",
    companyName: "Company name", companyPhone: "Company phone", companyAddress: "Company address",
    companyEmail: "Company email (receives new complaint alerts)", logo: "Logo", portalUrl: "Portal URL (used inside QR codes)",
    portalUrlHint: "The web address where this portal is hosted, e.g. https://service.example.com",
    totalOpen: "Open", totalToday: "New today", totalDone: "Completed",
    dailyReport: "Daily report (PDF)", confirmDelete: "Delete this item?",
    cancelComplaint: "Cancel complaint",
    // tech
    myJobs: "My jobs", active: "Active", history: "History", noJobs: "No jobs here.",
    startJob: "I've arrived — start job", jobReport: "Service report",
    arrival: "Arrival time", departure: "Departure time", serviceDone: "Service performed",
    svc_repair: "Repair", svc_maintenance: "Preventive maintenance", svc_cleaning: "Cleaning",
    svc_toner: "Toner / ink replacement", svc_parts: "Part replacement", svc_install: "Installation / setup",
    svc_network: "Network / driver config", svc_inspection: "Inspection only",
    workNotes: "Work details / notes", partsReplaced: "Parts replaced", partName: "Part name", qty: "Qty",
    addPart: "Add part", meterReading: "Meter / counter reading", outcome: "Result",
    out_completed: "Fixed — completed", out_follow_up: "Needs follow-up visit",
    photosBefore: "Photos (before / after)", clientRep: "Client representative name",
    completeJob: "Save & complete job", exportDay: "Export day as PDF", reportDate: "Report date",
    duration: "Duration", jobsCount: "Jobs", generatedOn: "Generated on",
    onMyWay: "Tell client I'm on my way", notifyDone: "Send completion to client",
    // history + location
    printerHistory: "Printer service history", noHistory: "No previous service on this printer.",
    timeline: "Timeline", previousVisits: "previous visits", history_btn: "History",
    yourLocation: "Your location (optional)", locationHint: "Share your location so our technician can find you easily.",
    useMyLocation: "Use my current location", pickOnMap: "Pick on map", locating: "Getting your location…",
    locationSet: "Location pinned. Drag the pin or tap the map to adjust.", locationFailed: "Couldn't get your location. Tap the map to place the pin.",
    removePin: "Remove pin", mapPin: "Location pin", openMaps: "Open in Google Maps", navigate: "Navigate",
    accuracy: "accuracy",
  },
  ar: {
    appName: "بوابة الصيانة",
    lang: "English",
    demoBanner: "وضع تجريبي — البيانات محفوظة في هذا المتصفح فقط. قم بإعداد Firebase في js/config.js للتشغيل الفعلي.",
    email: "البريد الإلكتروني", password: "كلمة المرور", login: "تسجيل الدخول", logout: "تسجيل الخروج", save: "حفظ",
    cancel: "إلغاء", close: "إغلاق", delete: "حذف", edit: "تعديل", search: "بحث…",
    name: "الاسم", phone: "الهاتف", status: "الحالة", date: "التاريخ", actions: "إجراءات",
    loading: "جارٍ التحميل…", saved: "تم الحفظ", error: "حدث خطأ ما", required: "مطلوب",
    loginTitle: "دخول الموظفين", wrongRole: "هذا الحساب لا يملك صلاحية الدخول لهذه البوابة.",
    st_new: "جديدة", st_assigned: "مُسندة", st_in_progress: "قيد التنفيذ",
    st_completed: "مكتملة", st_follow_up: "تحتاج متابعة", st_cancelled: "ملغاة",
    landingTitle: "بوابة صيانة الطابعات",
    landingSub: "امسح رمز QR الموجود على الطابعة للإبلاغ عن مشكلة، أو تتبّع شكوى سابقة.",
    trackComplaint: "تتبّع شكوى", adminPortal: "بوابة المدير", techPortal: "بوابة الفني",
    reportProblem: "الإبلاغ عن مشكلة في الطابعة",
    printerNotFound: "هذه الطابعة غير مسجلة. يرجى الاتصال بنا مباشرة.",
    noPrinter: "لم يتم تحديد طابعة. يرجى مسح رمز QR الموجود على الطابعة.",
    printer: "الطابعة", serial: "الرقم التسلسلي", model: "الموديل", brand: "الماركة", location: "الموقع",
    client: "العميل", yourName: "اسمك", yourPhone: "الهاتف / واتساب", yourEmail: "البريد الإلكتروني (اختياري)",
    company: "الشركة / القسم", issueType: "نوع المشكلة", description: "صف المشكلة",
    photos: "صور (اختياري)", addPhotos: "إضافة صور", submit: "إرسال الشكوى", submitting: "جارٍ الإرسال…",
    issue_paper_jam: "انحشار الورق", issue_print_quality: "جودة طباعة سيئة", issue_toner: "الحبر / التونر",
    issue_not_printing: "لا تطبع", issue_error_code: "رسالة خطأ على الشاشة", issue_network: "الشبكة / المسح الضوئي",
    issue_noise: "صوت غريب", issue_other: "أخرى",
    thanks: "تم استلام الشكوى!", yourTicket: "رقم التذكرة",
    thanksSub: "احتفظ بهذا الرقم لتتبع شكواك. سيتواصل معك فريقنا قريبًا.",
    trackNow: "تتبّع الحالة", newComplaint: "الإبلاغ عن مشكلة أخرى",
    ticketNo: "رقم التذكرة", find: "بحث", ticketNotFound: "لم يتم العثور على التذكرة.",
    reported: "تاريخ البلاغ", lastUpdate: "آخر تحديث", technician: "الفني",
    complaints: "الشكاوى", printers: "الطابعات", technicians: "الفنيون", settings: "الإعدادات",
    all: "الكل", assign: "إسناد", assignTo: "إسناد إلى فني", unassigned: "غير مُسندة",
    details: "التفاصيل", problem: "المشكلة", reportedBy: "المُبلِّغ",
    waTech: "واتساب الفني", waClient: "واتساب العميل",
    importCsv: "استيراد CSV / Excel", downloadTemplate: "تنزيل النموذج", printQr: "طباعة ملصقات QR",
    addPrinter: "إضافة طابعة", importDone: "طابعة تم استيرادها / تحديثها", importNoSerial: "صفوف تم تجاهلها (بدون رقم تسلسلي)",
    selected: "محدد", selectAll: "تحديد الكل", showQr: "QR",
    addTech: "إضافة فني", techCreated: "تم إنشاء حساب الفني",
    companyName: "اسم الشركة", companyPhone: "هاتف الشركة", companyAddress: "عنوان الشركة",
    companyEmail: "بريد الشركة (يستقبل تنبيهات الشكاوى الجديدة)", logo: "الشعار", portalUrl: "رابط البوابة (يُستخدم داخل رموز QR)",
    portalUrlHint: "عنوان الموقع الذي تستضيف عليه البوابة، مثل https://service.example.com",
    totalOpen: "مفتوحة", totalToday: "جديدة اليوم", totalDone: "مكتملة",
    dailyReport: "التقرير اليومي (PDF)", confirmDelete: "هل تريد حذف هذا العنصر؟",
    cancelComplaint: "إلغاء الشكوى",
    myJobs: "مهامي", active: "النشطة", history: "السجل", noJobs: "لا توجد مهام.",
    startJob: "وصلت — بدء العمل", jobReport: "تقرير الخدمة",
    arrival: "وقت الوصول", departure: "وقت المغادرة", serviceDone: "الخدمة المنفذة",
    svc_repair: "إصلاح", svc_maintenance: "صيانة وقائية", svc_cleaning: "تنظيف",
    svc_toner: "تغيير الحبر / التونر", svc_parts: "تغيير قطعة", svc_install: "تركيب / إعداد",
    svc_network: "إعداد الشبكة / التعريفات", svc_inspection: "فحص فقط",
    workNotes: "تفاصيل العمل / ملاحظات", partsReplaced: "القطع المستبدلة", partName: "اسم القطعة", qty: "الكمية",
    addPart: "إضافة قطعة", meterReading: "قراءة العداد", outcome: "النتيجة",
    out_completed: "تم الإصلاح — مكتملة", out_follow_up: "تحتاج زيارة متابعة",
    photosBefore: "صور (قبل / بعد)", clientRep: "اسم ممثل العميل",
    completeJob: "حفظ وإنهاء المهمة", exportDay: "تصدير اليوم PDF", reportDate: "تاريخ التقرير",
    duration: "المدة", jobsCount: "المهام", generatedOn: "تاريخ الإنشاء",
    onMyWay: "إبلاغ العميل أنني في الطريق", notifyDone: "إرسال إشعار الإنجاز للعميل",
    printerHistory: "سجل صيانة الطابعة", noHistory: "لا توجد صيانة سابقة لهذه الطابعة.",
    timeline: "الخط الزمني", previousVisits: "زيارات سابقة", history_btn: "السجل",
    yourLocation: "موقعك (اختياري)", locationHint: "شارك موقعك ليتمكن الفني من الوصول إليك بسهولة.",
    useMyLocation: "استخدام موقعي الحالي", pickOnMap: "اختيار من الخريطة", locating: "جارٍ تحديد موقعك…",
    locationSet: "تم تثبيت الموقع. اسحب الدبوس أو اضغط على الخريطة للتعديل.", locationFailed: "تعذر تحديد موقعك. اضغط على الخريطة لوضع الدبوس.",
    removePin: "إزالة الدبوس", mapPin: "دبوس الموقع", openMaps: "فتح في خرائط Google", navigate: "التوجيه",
    accuracy: "الدقة",
  },
};

let lang = (() => {
  try { return localStorage.getItem("ps_lang") || CONFIG.defaultLang; } catch { return CONFIG.defaultLang; }
})();

export function getLang() { return lang; }

export function t(key) {
  return (dict[lang] && dict[lang][key]) ?? dict.en[key] ?? key;
}

export function applyI18n(root = document) {
  document.documentElement.lang = lang;
  document.documentElement.dir = lang === "ar" ? "rtl" : "ltr";
  root.querySelectorAll("[data-i18n]").forEach((el) => { el.textContent = t(el.dataset.i18n); });
  root.querySelectorAll("[data-i18n-ph]").forEach((el) => { el.placeholder = t(el.dataset.i18nPh); });
}

export function toggleLang() {
  lang = lang === "ar" ? "en" : "ar";
  try { localStorage.setItem("ps_lang", lang); } catch {}
  applyI18n();
  document.dispatchEvent(new CustomEvent("langchange"));
}
