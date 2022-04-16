
import { initializeApp } from "https://www.gstatic.com/firebasejs/9.6.8/firebase-app.js";
import { getAnalytics } from "https://www.gstatic.com/firebasejs/9.6.8/firebase-analytics.js";
import { getAuth, signInWithEmailAndPassword, createUserWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/9.6.8/firebase-auth.js";
import { getDatabase, ref, set, onValue, update, get, child } from "https://www.gstatic.com/firebasejs/9.6.8/firebase-database.js";

client.on("ready", () => {
  console.log(`Logged in as ${client.user.tag}!`)
})

const firebaseConfig = {
    apiKey: "AIzaSyCxjN-1_hgA0sC6zJsuL6P3QO5l9_KmSEU",
    authDomain: "stock-app-83577.firebaseapp.com",
    projectId: "stock-app-83577",
    storageBucket: "stock-app-83577.appspot.com",
    messagingSenderId: "782289944348",
    appId: "1:782289944348:web:f9bcc2b691d121a8f444d9",
    measurementId: "G-FNV8W43TSH"
};
  
// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
const database = getDatabase(app);

let currentUser = "";

let loginButton = document.getElementById('login-button');
loginButton.addEventListener('click', function() {
    let email = document.getElementById('enter-username').value; 
    let password = document.getElementById('enter-password').value;
    const auth = getAuth();
    signInWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
            const user = userCredential.user;

            let displayUser = document.getElementById('current-user');
            displayUser.innerHTML = email;
            currentUser = createUsernameFromEmail(email);
            
            let dbRef = ref(getDatabase());
            get(child(dbRef, `users/${currentUser}/balance`)).then(snapshot => {
                const data = snapshot.val();
                let userBalance = document.createElement('p');
                userBalance.setAttribute('id', 'userBalance');
                userBalance.innerHTML = `Balance: ${data}`;
                let infoSection = document.getElementById('user-info');
                infoSection.appendChild(userBalance);
                displayUserData();
            });            
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
        console.log("oops");
    });
});

let createAccountButton = document.getElementById('create-account');
createAccountButton.addEventListener('click', function() {
    const auth = getAuth();
    let email = document.getElementById('new-username').value;
    let password = document.getElementById('new-password').value;
    createUserWithEmailAndPassword(auth, email, password)
        .then((userCredential) => {
        // Signed in 
        const user = userCredential.user;
        addUser(createUsernameFromEmail(email)); 
        let displayUser = document.getElementById('current-user');
        displayUser.innerHTML = email;
        currentUser = createUsernameFromEmail(email);
        let newBalance = {};
        newBalance[`users/${currentUser}/balance`] = 1000000;
        update(ref(database), newBalance);
    })
    .catch((error) => {
        const errorCode = error.code;
        const errorMessage = error.message;
    });
});

let buyButton = document.getElementById('buy-button');
buyButton.addEventListener('click', function() {    
    let stockSymbol = document.getElementById('buy-symbol').value;
    let buyAmount = parseFloat(document.getElementById('buy-amount').value);

    const dbRef = ref(getDatabase());
    get(child(dbRef, `users/${currentUser}/balance`)).then((snapshot) => {
        const data = snapshot.val();
        let balance = parseFloat(data);

        fetch(`https://finnhub.io/api/v1/quote?symbol=${stockSymbol}&token=sandbox_c1clrp748v6vbcpf4jt0`)
        .then(response => response.json())
        .then(data => {
            if((data.c * buyAmount) <= balance) {
                get(child(dbRef, `users/${currentUser}/${stockSymbol}`)).then((snapshot) => {
                    let prevStockAmount = snapshot.val();
                    let newStock = {};
                    newStock[`users/${currentUser}/${stockSymbol}`] = buyAmount + prevStockAmount;
                    update(ref(database), newStock);
                    
                    let newBalance = {};
                    let newBalanceValue = balance - (buyAmount * data.c);
                    newBalance[`users/${currentUser}/balance`] = newBalanceValue;
                    update(ref(database), newBalance);
                    let balanceDisplay = document.getElementById('userBalance');
                    balanceDisplay.innerHTML = `Balance: ${newBalanceValue}`;

                    displayUserData();
                    
                    alert(`You purchased ${buyAmount} shares of ${stockSymbol} at ${data.c} each`);
                });
            }
            else {
                alert('Insufficient Funds');
                return;
            }
        });
    });   
});

let sellButton = document.getElementById('sell-button');
sellButton.addEventListener('click', function() {
    let stockSymbol = document.getElementById('sell-symbol').value;
    let sellAmount = parseFloat(document.getElementById('sell-amount').value);

    let dbRef = ref(getDatabase());
    get(child(dbRef, `users/${currentUser}/${stockSymbol}`)).then((snapshot) => {
        let stockAmount = parseFloat(snapshot.val());
        if(stockAmount >= sellAmount) {
            let newStockAmount = stockAmount - sellAmount;
            let newStockAmountObj = {}
            newStockAmountObj[`users/${currentUser}/${stockSymbol}`] = newStockAmount;
            update(ref(database), newStockAmountObj);
            get(child(dbRef, `users/${currentUser}/balance`)).then((snapshot) => {
                let currentBalance = snapshot.val();
                fetch(`https://finnhub.io/api/v1/quote?symbol=${stockSymbol}&token=sandbox_c1clrp748v6vbcpf4jt0`)
                .then(response => response.json())
                .then(data => {
                    let currentStockPrice = data.c;
                    let newBalance = {}
                    let newBalanceValue = currentBalance + (sellAmount * currentStockPrice);
                    newBalance[`users/${currentUser}/balance`] = newBalanceValue;
                    update(ref(database), newBalance);
                    let balanceDisplay = document.getElementById('userBalance');
                    balanceDisplay.innerHTML = `Balance: ${newBalanceValue}`;

                    displayUserData();
                    alert(`You sold ${sellAmount} shares of ${stockSymbol} at ${currentStockPrice} each`);
                    return; 
                });
            }); 
        }
        else {
            alert('You do not have enough shares');
            return;
        }
    });    
});

function addUser(newUsername) {
    let newUser = {};
    newUser[`users/${newUsername}`] = 0;
    update(ref(database), newUser); 
}

function createUsernameFromEmail(emailAddress) {
    let newString = emailAddress.split('@');
    return newString[0];
}

function removeAllChildNodes(parent) {
    while (parent.firstChild) {
        parent.removeChild(parent.firstChild);
    }
}

function displayUserData() {
    get(ref(database), `users/${currentUser}/`).then((snapshot) => {
        let data = snapshot.val();
        let userData = data['users'][`${currentUser}`];
        let stockSection = document.getElementById('stocks');
        removeAllChildNodes(stockSection);
        const keys = Object.keys(userData);
        for(let i = 0; i < keys.length; i++) {
            if(keys[i] != 'balance') {
                let newStock = document.createElement('li');
                newStock.innerHTML = `${keys[i]}: ${userData[keys[i]]}`;
                stockSection.appendChild(newStock);
            }
        }
        
    });
}












