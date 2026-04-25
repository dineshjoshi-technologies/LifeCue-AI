/* eslint-disable no-restricted-globals */
// Firebase Cloud Messaging service worker for LifeCue AI
// This file MUST live at the site root: /firebase-messaging-sw.js

importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/12.12.1/firebase-messaging-compat.js");

firebase.initializeApp({
  apiKey: "AIzaSyC86se8xbRiT19C7iFk0hboa_MA4fJL6cA",
  authDomain: "lifecueai.firebaseapp.com",
  projectId: "lifecueai",
  storageBucket: "lifecueai.firebasestorage.app",
  messagingSenderId: "582723003730",
  appId: "1:582723003730:web:06cd5ffe0fa74799a3868b",
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  const title = (payload.notification && payload.notification.title) || "LifeCue";
  const body = (payload.notification && payload.notification.body) || "A gentle nudge.";
  self.registration.showNotification(title, {
    body,
    icon: "/favicon.ico",
    badge: "/favicon.ico",
    tag: "lifecue-cue",
    data: payload.data || {},
  });
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  event.waitUntil(
    clients.matchAll({ type: "window" }).then((wins) => {
      const url = "/today";
      for (const w of wins) {
        if (w.url.includes(url) && "focus" in w) return w.focus();
      }
      if (clients.openWindow) return clients.openWindow(url);
    })
  );
});
