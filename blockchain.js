
const CONTRACT_ADDRESS = "0xA16eA06C403b5F7A66132ee9C6054170F6772C42"; 

const CONTRACT_ABI = [
    { "inputs": [], "stateMutability": "nonpayable", "type": "constructor" },
    { "inputs": [ { "internalType": "string", "name": "_t", "type": "string" } ], "name": "approveOrg", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [], "name": "getAllTickers", "outputs": [ { "internalType": "string[]", "name": "", "type": "string[]" } ], "stateMutability": "view", "type": "function" },
    { "inputs": [], "name": "getMyOrgTicker", "outputs": [ { "internalType": "string", "name": "", "type": "string" } ], "stateMutability": "view", "type": "function" },
    { "inputs": [ { "internalType": "string", "name": "_t", "type": "string" } ], "name": "getOrgDetails", "outputs": [ { "internalType": "string", "name": "ticker", "type": "string" }, { "internalType": "string", "name": "name", "type": "string" }, { "internalType": "address", "name": "wallet", "type": "address" }, { "internalType": "string", "name": "financial", "type": "string" }, { "internalType": "string", "name": "ack", "type": "string" }, { "internalType": "string", "name": "flow", "type": "string" }, { "internalType": "string", "name": "execs", "type": "string" }, { "internalType": "bool", "name": "verified", "type": "bool" } ], "stateMutability": "view", "type": "function" },
    { "inputs": [ { "internalType": "string", "name": "_t", "type": "string" }, { "internalType": "string", "name": "_n", "type": "string" } ], "name": "registerOrg", "outputs": [], "stateMutability": "nonpayable", "type": "function" },
    { "inputs": [ { "internalType": "string", "name": "_t", "type": "string" }, { "internalType": "string", "name": "_l", "type": "string" }, { "internalType": "uint8", "name": "_type", "type": "uint8" } ], "name": "uploadDoc", "outputs": [], "stateMutability": "nonpayable", "type": "function" }
];

async function checkAuthorization(signer) {
    const userAddress = await signer.getAddress();
    return { isAuthorized: true, userAddress }; 
}

// --- 1. REGISTRATION ---
async function registerWithWallet() {
    if (!window.ethereum) return alert("MetaMask is required!");
    const orgTicker = document.getElementById("regTicker").value.trim(); 
    const orgName = document.getElementById("regOrgName").value.trim(); 
    
    // Safety check against spaces in Ticker
    if (orgTicker.includes(" ")) return alert("Error: Ticker cannot contain spaces! Use short codes like 'CIC'.");
    if (!orgTicker || !orgName) return alert("Please fill in both fields.");

    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        alert("Please confirm transaction in MetaMask...");
        const tx = await contract.registerOrg(orgTicker, orgName);
        await tx.wait();
        alert(`Success! ${orgName} (${orgTicker}) registered. \nNOTE: It requires Admin Verification before appearing in the list.`);
        window.location.reload();
    } catch (error) {
        console.error(error);
        alert("Registration Failed: Ticker taken or Wallet already registered.");
    }
}

// --- 2. LOGIN ---
async function loginWithMetaMask() {
    if (!window.ethereum) return alert("MetaMask not detected.");
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []); 
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);
        
        const myTicker = await contract.getMyOrgTicker();
        if (myTicker && myTicker !== "") {
            localStorage.setItem("ADMIN_TICKER", myTicker);
            window.location.href = "Admin.html"; 
        } else {
            alert("No Organization found for this wallet. Please Register.");
        }
    } catch (err) {
        console.error(err);
        alert("Login Failed.");
    }
}

// --- 3. DYNAMIC DROPDOWN (With Filter) ---
async function populateOrgDropdown() {
    const dropdown = document.getElementById("dynamicOrgSelect");
    if (!dropdown) return; 

    dropdown.innerHTML = '<option value="">Select Organisation</option>';
    dropdown.innerHTML += '<option disabled>Loading...</option>';

    if (!window.ethereum) {
        dropdown.innerHTML = '<option disabled>MetaMask Required</option>';
        return;
    }

    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

        const tickers = await contract.getAllTickers();
        
        // Reset
        dropdown.innerHTML = '<option value="">Select Organisation</option>';

        if (tickers.length === 0) {
            dropdown.innerHTML += '<option disabled>No Orgs Registered</option>';
            return;
        }

        let verifiedCount = 0;
        for (const ticker of tickers) {
            
            // 🛡️ FILTER: Hide the mistake!
            if (ticker === "CvSU - Imus Campus" || ticker === "CvSU Imus Campus") continue; 

            const details = await contract.getOrgDetails(ticker);
            const orgName = details[1];
            const isVerified = details[7]; 

            // ONLY ADD IF VERIFIED
            if (isVerified) {
                const option = document.createElement("option");
                option.value = `${ticker}.html`; 
                option.innerText = `${ticker} - ${orgName}`;

                // Set selected if currently on this page
                const currentPage = window.location.pathname.split("/").pop().toLowerCase();
                // Decode URI component handles %20 spaces in URL if they happen
                if (decodeURIComponent(currentPage) === option.value.toLowerCase()) {
                    option.selected = true;
                }
                dropdown.appendChild(option);
                verifiedCount++;
            }
        }
        
        if(verifiedCount === 0) {
             dropdown.innerHTML += '<option disabled>No Verified Orgs Yet</option>';
        }

    } catch (error) {
        console.error("Error loading dropdown:", error);
        dropdown.innerHTML = '<option disabled>Error Loading List</option>';
    }
}

// --- 4. ADMIN APPROVAL ---
async function approveOrganization(ticker) {
    if (!window.ethereum) return;
    try {
        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []);
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        alert(`Approving ${ticker}... Please confirm in MetaMask.`);
        const tx = await contract.approveOrg(ticker);
        await tx.wait();
        alert(`Success! ${ticker} is now Verified and visible.`);
        location.reload();
    } catch (err) {
        console.error(err);
        alert("Approval Failed. You must be the Contract Deployer (Admin) to do this.");
    }
}

// --- 5. DOCUMENT UPLOADS ---
async function uploadDocument(docTypeString, inputId) {
    const link = document.getElementById(inputId).value.trim();
    const ticker = localStorage.getItem("ADMIN_TICKER");
    if (!ticker) return alert("Session expired. Please Login again.");
    if (!link) return alert("Please paste a Google Drive link first.");

    try {
        let typeId = 0;
        if (docTypeString.includes("Acknowledgement")) typeId = 2;
        else if (docTypeString.includes("Financial")) typeId = 1;
        else if (docTypeString.includes("Executives")) typeId = 4;
        else if (docTypeString.includes("Flow")) typeId = 3;

        const provider = new ethers.providers.Web3Provider(window.ethereum);
        await provider.send("eth_requestAccounts", []); 
        const signer = provider.getSigner();
        const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, signer);

        alert("Check MetaMask to confirm...");
        const tx = await contract.uploadDoc(ticker, link, typeId);
        await tx.wait(); 
        
        saveTransactionToHistory(ticker, docTypeString, tx.hash);
        alert(`Uploaded Successfully!`);
        location.reload();
    } catch (error) {
        console.error(error);
        alert("Upload Failed. Ensure you are on the correct wallet AND your Org is Verified.");
    }
}

// --- 6. LOAD DATA & LOGS ---
async function loadOrgData(orgTicker) {
    if (!window.ethereum) return;
    const provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(CONTRACT_ADDRESS, CONTRACT_ABI, provider);

    try {
        const data = await contract.getOrgDetails(orgTicker);
        // data[3]=Financial, data[4]=Ack, data[5]=Flow, data[6]=Execs
        updateBox("financial-box", data[3], "Financial Statement");
        updateBox("ack-box", data[4], "Acknowledgement");
        updateBox("flow-box", data[5], "Org Flow");
        updateBox("exec-box", data[6], "Executives");
    } catch (error) { console.error(error); }
}

function updateBox(id, link, title) {
    const el = document.getElementById(id);
    if(el) {
        if(link && link !== "") el.innerHTML = `<h3>${title}</h3><a href="${link}" target="_blank" class="doc-link">View Document</a>`;
        else el.innerHTML = `<h3>${title}</h3><p>Not Uploaded</p>`;
    }
}

function saveTransactionToHistory(ticker, docType, txHash) {
    const newLog = { ticker: ticker, doc: docType, hash: txHash, time: new Date().toLocaleString() };
    let logs = JSON.parse(localStorage.getItem("TX_LOGS")) || [];
    logs.unshift(newLog);
    localStorage.setItem("TX_LOGS", JSON.stringify(logs));
}

function loadOrganizationLogs(targetTicker) {
    const logs = JSON.parse(localStorage.getItem("TX_LOGS")) || [];
    const tbody = document.getElementById("orgTxBody");
    if (!tbody) return; 
    tbody.innerHTML = "";
    const orgLogs = logs.filter(log => log.ticker === targetTicker);
    if (orgLogs.length === 0) { tbody.innerHTML = "<tr><td colspan='3' style='text-align:center; padding:15px; color:#aaa; font-size:12px;'>No recent updates.</td></tr>"; return; }
    orgLogs.forEach(log => {
        const etherscanLink = `https://sepolia.etherscan.io/tx/${log.hash}`;
        let shortDoc = log.doc.replace("Statement", "").replace("Certificate", "");
        tbody.innerHTML += `
            <tr style="border-bottom: 1px solid rgba(255,255,255,0.1);">
                <td style="padding: 10px; color:#ccc;">${log.time.split(',')[0]}</td>
                <td style="padding: 10px; font-weight:bold; color:#fff;">${shortDoc}</td>
                <td style="padding: 10px;"><a href="${etherscanLink}" target="_blank" style="color:#2563eb; text-decoration:none;">View Proof</a></td>
            </tr>`;
    });
}