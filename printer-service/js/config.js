// ============================================================
//  PrintCare Service Portal — configuration
// ============================================================
//  1. Leave `firebase.apiKey` empty to run in DEMO MODE
//     (data is saved only in this browser — good for trying it out).
//  2. To go live, create a free Firebase project and paste the
//     web-app config below (see README.md, "Go live with Firebase").
// ============================================================

export const CONFIG = {
  firebase: {
    apiKey: "AIzaSyD5mK5a4LZww5hyco3DLvEB_PoAwXEbJIQ",
    authDomain: "printer-com.firebaseapp.com",
    projectId: "printer-com",
    storageBucket: "printer-com.firebasestorage.app",
    messagingSenderId: "655869737054",
    appId: "1:655869737054:web:2dba9b9253366e03c5dccf",
  },

  // Optional automatic e-mail alerts via EmailJS (free tier: 200 mails/month).
  // Create a template whose body uses {{to_email}}, {{subject}} and {{message}}.
  // Leave publicKey empty to disable e-mail alerts.
  emailjs: {
    publicKey: "",
    serviceId: "",
    templateId: "",
  },

  // Photos: true  = small photos saved inside the database (works on the free
  //                  Firebase "Spark" plan, no billing card needed).
  //          false = full-size photos in Firebase Storage (needs the
  //                  pay-as-you-go "Blaze" plan; still free for small usage).
  inlinePhotos: true,

  // Default UI language: "en" or "ar"
  defaultLang: "en",
};
