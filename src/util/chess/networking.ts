// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getDatabase, ref, onValue, get, remove, update } from "firebase/database";

// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
    apiKey: "AIzaSyAql9QEt6t6aXXAOUnLhFs0QpA2eNHR7E4",
    authDomain: "struglauk.firebaseapp.com",
    databaseURL: "https://struglauk-default-rtdb.firebaseio.com",
    projectId: "struglauk",
    storageBucket: "struglauk.firebasestorage.app",
    messagingSenderId: "235440467476",
    appId: "1:235440467476:web:fd2cdc5f6d8f3179f60101",
    measurementId: "G-EBFXSCT3PZ"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const database = getDatabase(app);

/* GET Data from Path */
export async function GET(path: string) {
    const snapshot = await get(ref(database, path));
    return snapshot.exists() ? snapshot.val() : null;
}

/* REMOVE Data from Path */
export async function REMOVE(path: string) {
    return remove(ref(database, path));
}

/* UPDATE Data at Path */
export async function UPDATE(path: string, data: any) {
    return update(ref(database, path), data);
}

/* Wait on a value to be updated to a specified value in the database */
export async function WaitFor(path: string, resolutionValue: any | null = null){
    return await new Promise((resolve) => {
        onValue(ref(database, path), (snapshot: any) => {
            const data = snapshot.val();
            // Resolve when data takes any value
            if (resolutionValue === null && data !== null){
                resolve(data);
            }
            // Resolve when data has specific value
            if (resolutionValue !== null && data === resolutionValue){
                resolve(data); 
            }
        });
    });
}

