import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";

const firebaseConfig = {
  apiKey: "AIzaSyAkSzCDGz04d9qP5WgZtF20LqI8Y4yPctw",
  authDomain: "shortify.cc.cd",
  databaseURL: "https://shortify-reels-default-rtdb.firebaseio.com",
  projectId: "shortify-reels",
  storageBucket: "shortify-reels.firebasestorage.app",
  messagingSenderId: "819482192507",
  appId: "1:819482192507:web:44ab78b7c55e42e2d150de",
  measurementId: "G-5WRLCXLDYH"
};

const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);

export { app, analytics };
