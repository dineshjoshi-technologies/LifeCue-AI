import { initializeApp } from "firebase/app";
import { getMessaging, getToken, onMessage, isSupported } from "firebase/messaging";

const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};

const VAPID = process.env.REACT_APP_FIREBASE_VAPID_KEY;

let _app = null;
let _messaging = null;

async function getMsg() {
  if (_messaging) return _messaging;
  const supported = await isSupported().catch(() => false);
  if (!supported) return null;
  if (!_app) _app = initializeApp(firebaseConfig);
  _messaging = getMessaging(_app);
  return _messaging;
}

export async function isPushSupported() {
  if (typeof window === "undefined") return false;
  if (!("Notification" in window)) return false;
  if (!("serviceWorker" in navigator)) return false;
  return await isSupported().catch(() => false);
}

export async function requestPushPermissionAndGetToken() {
  if (!(await isPushSupported())) {
    throw new Error("Push notifications are not supported in this browser.");
  }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") {
    throw new Error("Permission denied — enable notifications in your browser settings.");
  }
  // register the service worker
  const reg = await navigator.serviceWorker.register("/firebase-messaging-sw.js");
  await navigator.serviceWorker.ready;
  const m = await getMsg();
  if (!m) throw new Error("Messaging unavailable");
  const token = await getToken(m, {
    vapidKey: VAPID,
    serviceWorkerRegistration: reg,
  });
  if (!token) throw new Error("Could not obtain a device token. Please try again.");
  return token;
}

export async function onForegroundMessage(handler) {
  const m = await getMsg();
  if (!m) return () => {};
  return onMessage(m, handler);
}
