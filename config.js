// ✅ 여기에 본인의 Firebase 설정값을 입력하세요
const firebaseConfig = {
  apiKey: "AIzaSyBStgnExqCIxAWDeos6GhCUoeytRXYDUzY",
  authDomain: "study-a0bf2.firebaseapp.com",
  projectId: "study-a0bf2",
  storageBucket: "study-a0bf2.firebasestorage.app",
  messagingSenderId: "407215369136",
  appId: "1:407215369136:web:705aa11c2a41c60ead8475"
};

// Firebase 초기화
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
