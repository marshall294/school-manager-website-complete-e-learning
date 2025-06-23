// firebase-init.js
if (!firebase.apps.length) {
  const firebaseConfig = {
    apiKey: "AIzaSyB-yDq_hasmJ-feBHqNv7d8TxiIRORw9nE",
    authDomain: "year5f-ff94c.firebaseapp.com",
    databaseURL: "https://year5f-ff94c-default-rtdb.firebaseio.com",
    projectId: "year5f-ff94c",
    storageBucket: "year5f-ff94c.appspot.com",
    messagingSenderId: "725619624649",
    appId: "1:725619624649:web:8752cd00889bb07d41db18"
  };
  firebase.initializeApp(firebaseConfig);
}
const db = firebase.database();
