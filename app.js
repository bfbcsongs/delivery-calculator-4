// GLOBAL VARIABLES
let activeRowIndex = 0;
let isNameLocked = true;
let isPriceLocked = true;
let keyClickCount = 0;
let priceKeyClickCount = 0;
let keyClickTimer = null;
let priceKeyClickTimer = null;

let currentSessionDate = "";
let currentSessionName = "";
let modalMode = "NEW"; 

// MAIN INITIALIZATION
document.addEventListener("DOMContentLoaded", () => {
    generateLedgerRows();
    loadDefaultNames();
    loadHistoryFiles();
    
    // Check if active session exists
    const savedDate = localStorage.getItem("miki_current_date");
    const savedName = localStorage.getItem("miki_current_name");

    if (savedDate && savedName) {
        currentSessionDate = savedDate;
        currentSessionName = savedName;
        updateSessionUI();
        loadActiveSessionData();
    } else {
        openModal("NEW");
    }

    calculateExpensesAndSummary();
});

// GENERATE TABLE 2 ROWS
function generateLedgerRows() {
    const tbody = document.getElementById("ledgerTableBody");
    if (!tbody) return;
    tbody.innerHTML = "";

    for (let i = 0; i < 16; i++) {
        const tr = document.createElement("tr");
        tr.innerHTML = `
            <td><input type="text" id="name_${i}" class="name-input" readonly onfocus="selectRow(${i})"></td>
            <td><input type="number" id="dry_${i}" class="readonly-col" readonly tabindex="-1"></td>
            <td><input type="number" id="fresh_${i}" class="readonly-col" readonly tabindex="-1"></td>
            <td><input type="number" id="cab_${i}" class="readonly-col" readonly tabindex="-1"></td>
            <td><input type="number" id="bo_${i}" class="readonly-col" readonly tabindex="-1"></td>
            <td><input type="number" id="bal_${i}" class="readonly-col" readonly tabindex="-1"></td>
            <td><input type="number" id="billing_${i}" class="readonly-col" readonly tabindex="-1"></td>
            <td><input type="number" id="colln_${i}" class="colln-input" oninput="onCollnInput(${i})" onfocus="selectRow(${i})"></td>
            <td><input type="number" id="rem_${i}" class="readonly-col" readonly tabindex="-1"></td>
        `;
        tbody.appendChild(tr);
    }
}

// AUTO-COMPUTE EXPENSE & CASH SUMMARY TABLE
function calculateExpensesAndSummary() {
    let pinkSum = 0;
    
    // 1. Sum of all amount inputs in the new table (5 rows x 2 cols)
    for (let i = 0; i < 5; i++) {
        const amt1 = parseFloat(document.getElementById(`expAmt1_${i}`)?.value) || 0;
        const amt2 = parseFloat(document.getElementById(`expAmt2_${i}`)?.value) || 0;
        pinkSum += (amt1 + amt2);
    }

    // 2. Collection Net Total from Table 2 Total Pay
    const collnElem = document.getElementById('totalColln');
    let collnTotal = 0;
    if (collnElem) {
        const cleanText = collnElem.innerText.replace(/,/g, '').trim();
        collnTotal = parseFloat(cleanText) || 0;
    }

    // 3. Top-Right Total = Table 2 Pay Total + Pink Expenses Sum
    const yellowTotal = collnTotal + pinkSum;

    // 4. COH Input Value (Default 0)
    const cohInput = parseFloat(document.getElementById('inputCOH')?.value) || 0;

    // 5. Grand Total = Top-Right Total - COH
    const redGrandTotal = yellowTotal - cohInput;

    // 6. Update UI Displays
    const pinkElem = document.getElementById('pinkTotalDisplay');
    const yellowElem = document.getElementById('yellowTotalDisplay');
    const redElem = document.getElementById('redGrandTotalDisplay');

    if (pinkElem) pinkElem.innerText = Math.round(pinkSum).toLocaleString();
    if (yellowElem) yellowElem.innerText = Math.round(yellowTotal).toLocaleString();
    if (redElem) redElem.innerText = Math.round(redGrandTotal).toLocaleString();
}

// SELECT ROW LOGIC
function selectRow(index) {
    activeRowIndex = index;
    const nameVal = document.getElementById(`name_${index}`)?.value || `Row ${index + 1}`;
    document.getElementById("activeCustomerDisplay").innerText = nameVal;

    // Sync values from Table 2 row to Table 1 inputs
    document.getElementById("qtyReg").value = document.getElementById(`dry_${index}`)?.value || "";
    document.getElementById("qtyFresh").value = document.getElementById(`fresh_${index}`)?.value || "";
    document.getElementById("qtyCab").value = document.getElementById(`cab_${index}`)?.value || "";
    document.getElementById("qtyBo").value = document.getElementById(`bo_${index}`)?.value || "";
    document.getElementById("inputBal").value = document.getElementById(`bal_${index}`)?.value || "";
    document.getElementById("inputPay").value = document.getElementById(`colln_${index}`)?.value || "";

    syncPanelInputs();
    calculateMain();
}

// SYNC PANEL & MAIN INPUTS
function syncPanelInputs() {
    document.getElementById("syncDry").value = document.getElementById("qtyReg").value;
    document.getElementById("syncFresh").value = document.getElementById("qtyFresh").value;
    document.getElementById("syncCab").value = document.getElementById("qtyCab").value;
    document.getElementById("syncBo").value = document.getElementById("qtyBo").value;
}

function syncFromPanel(type) {
    const val = document.getElementById(`sync${type}`)?.value || "";
    if (type === "Dry") document.getElementById("qtyReg").value = val;
    else document.getElementById(`qty${type}`).value = val;
    syncToLedgerRow();
}

function syncFromTable(type) {
    const val = document.getElementById(type === "Reg" ? "qtyReg" : `qty${type}`)?.value || "";
    if (type === "Reg") document.getElementById("syncDry").value = val;
    else document.getElementById(`sync${type}`).value = val;
    syncToLedgerRow();
}

function syncToLedgerRow() {
    const idx = activeRowIndex;
    document.getElementById(`dry_${idx}`).value = document.getElementById("qtyReg").value;
    document.getElementById(`fresh_${idx}`).value = document.getElementById("qtyFresh").value;
    document.getElementById(`cab_${idx}`).value = document.getElementById("qtyCab").value;
    document.getElementById(`bo_${idx}`).value = document.getElementById("qtyBo").value;
    document.getElementById(`bal_${idx}`).value = document.getElementById("inputBal").value;
    document.getElementById(`colln_${idx}`).value = document.getElementById("inputPay").value;

    calculateMain();
    calculateLedgerTotals();
}

function onCollnInput(idx) {
    if (idx === activeRowIndex) {
        document.getElementById("inputPay").value = document.getElementById(`colln_${idx}`).value;
        calculateMain();
    }
    calculateLedgerTotals();
}

// CALCULATIONS FOR TABLE 1
function calculateMain() {
    const regQty = parseFloat(document.getElementById("qtyReg").value) || 0;
    const regPrice = parseFloat(document.getElementById("priceReg").value) || 0;
    const regAmt = regQty * regPrice;
    document.getElementById("amountReg").innerText = regAmt.toLocaleString();

    const freshQty = parseFloat(document.getElementById("qtyFresh").value) || 0;
    const freshPrice = parseFloat(document.getElementById("priceFresh").value) || 0;
    const freshAmt = freshQty * freshPrice;
    document.getElementById("amountFresh").innerText = freshAmt.toLocaleString();

    const cabQty = parseFloat(document.getElementById("qtyCab").value) || 0;
    const cabPrice = parseFloat(document.getElementById("priceCab").value) || 0;
    const cabAmt = cabQty * cabPrice;
    document.getElementById("amountCab").innerText = cabAmt.toLocaleString();

    const boQty = parseFloat(document.getElementById("qtyBo").value) || 0;
    const boPrice = parseFloat(document.getElementById("priceBo").value) || 0;
    const boAmt = boQty * boPrice;
    document.getElementById("amountBo").innerText = boAmt.toLocaleString();

    const totalAmt = regAmt + freshAmt + cabAmt + boAmt;
    document.getElementById("totalAmount").innerText = totalAmt.toLocaleString();

    const bal = parseFloat(document.getElementById("inputBal").value) || 0;
    const pay = parseFloat(document.getElementById("inputPay").value) || 0;

    const netTotal = totalAmt + bal - pay;
    document.getElementById("netTotalAmount").innerText = netTotal.toLocaleString();

    // Update Billing & Rem in Table 2
    const idx = activeRowIndex;
    const billing = totalAmt + bal;
    const rem = billing - pay;

    document.getElementById(`billing_${idx}`).value = billing || "";
    document.getElementById(`rem_${idx}`).value = rem || "";

    calculateLedgerTotals();
}

// CALCULATE TABLE 2 FOOTER TOTALS
function calculateLedgerTotals() {
    let tDry = 0, tFresh = 0, tCab = 0, tBo = 0, tBal = 0, tBilling = 0, tColln = 0, tRem = 0;

    for (let i = 0; i < 16; i++) {
        tDry += parseFloat(document.getElementById(`dry_${i}`)?.value) || 0;
        tFresh += parseFloat(document.getElementById(`fresh_${i}`)?.value) || 0;
        tCab += parseFloat(document.getElementById(`cab_${i}`)?.value) || 0;
        tBo += parseFloat(document.getElementById(`bo_${i}`)?.value) || 0;
        tBal += parseFloat(document.getElementById(`bal_${i}`)?.value) || 0;
        tBilling += parseFloat(document.getElementById(`billing_${i}`)?.value) || 0;
        tColln += parseFloat(document.getElementById(`colln_${i}`)?.value) || 0;
        tRem += parseFloat(document.getElementById(`rem_${i}`)?.value) || 0;
    }

    document.getElementById("totalDry").innerText = tDry.toLocaleString();
    document.getElementById("totalFresh").innerText = tFresh.toLocaleString();
    document.getElementById("totalCab").innerText = tCab.toLocaleString();
    document.getElementById("totalBo").innerText = tBo.toLocaleString();
    document.getElementById("totalBal").innerText = tBal.toLocaleString();
    document.getElementById("totalBilling").innerText = tBilling.toLocaleString();
    document.getElementById("totalColln").innerText = tColln.toLocaleString();
    document.getElementById("totalRem").innerText = tRem.toLocaleString();

    // Always recalculate expenses & summary whenever Table 2 total changes
    calculateExpensesAndSummary();
}

// CLEAR MAIN INPUTS
function clearMainInputs() {
    document.getElementById("qtyReg").value = "";
    document.getElementById("qtyFresh").value = "";
    document.getElementById("qtyCab").value = "";
    document.getElementById("qtyBo").value = "";
    document.getElementById("inputBal").value = "";
    document.getElementById("inputPay").value = "";

    syncPanelInputs();
    syncToLedgerRow();
}

// LOCK / UNLOCK NAMES (TAP 5 TIMES)
function handleKeyClick() {
    keyClickCount++;
    if (keyClickTimer) clearTimeout(keyClickTimer);

    if (keyClickCount >= 5) {
        toggleNameLock();
        keyClickCount = 0;
    } else {
        keyClickTimer = setTimeout(() => { keyClickCount = 0; }, 1500);
    }
}

function toggleNameLock() {
    isNameLocked = !isNameLocked;
    const header = document.getElementById("lockHeader");
    header.innerText = isNameLocked ? "🔒 Name" : "🔓 Name";

    for (let i = 0; i < 16; i++) {
        const input = document.getElementById(`name_${i}`);
        if (input) input.readOnly = isNameLocked;
    }
}

// LOCK / UNLOCK PRICES (TAP 5 TIMES)
function handlePriceKeyClick() {
    priceKeyClickCount++;
    if (priceKeyClickTimer) clearTimeout(priceKeyClickTimer);

    if (priceKeyClickCount >= 5) {
        togglePriceLock();
        priceKeyClickCount = 0;
    } else {
        priceKeyClickTimer = setTimeout(() => { priceKeyClickCount = 0; }, 1500);
    }
}

function togglePriceLock() {
    isPriceLocked = !isPriceLocked;
    const header = document.getElementById("priceLockHeader");
    header.innerText = isPriceLocked ? "Price 🔒" : "Price 🔓";

    const prices = ["priceReg", "priceFresh", "priceCab", "priceBo"];
    prices.forEach(id => {
        const elem = document.getElementById(id);
        if (elem) {
            elem.readOnly = isPriceLocked;
            elem.style.backgroundColor = isPriceLocked ? "#e5e7eb" : "#ffffff";
        }
    });
}

// MODAL & SESSION MANAGEMENT
function openModal(mode) {
    modalMode = mode;
    const modal = document.getElementById("setupModal");
    modal.style.display = "flex";

    if (mode === "NEW") {
        document.getElementById("modalTitle").innerText = "Start New Ledger File";
        document.getElementById("modalSubtext").innerText = "Please fill out both Date and Name to start encoding.";
        document.getElementById("modalDateInput").value = new Date().toISOString().split("T")[0];
        document.getElementById("modalNameInput").value = "";
        document.getElementById("modalActionBtn").innerText = "Open Ledger";
    } else {
        document.getElementById("modalTitle").innerText = "Save / Update File";
        document.getElementById("modalSubtext").innerText = "Confirm the Date and Name for saving.";
        document.getElementById("modalDateInput").value = currentSessionDate || new Date().toISOString().split("T")[0];
        document.getElementById("modalNameInput").value = currentSessionName || "";
        document.getElementById("modalActionBtn").innerText = "Save File";
    }
}

function closeSetupModal() {
    document.getElementById("setupModal").style.display = "none";
}

function handleModalSubmit() {
    const dVal = document.getElementById("modalDateInput").value;
    const nVal = document.getElementById("modalNameInput").value.trim();

    if (!dVal || !nVal) {
        alert("Please provide both Date and Name.");
        return;
    }

    currentSessionDate = dVal;
    currentSessionName = nVal;

    localStorage.setItem("miki_current_date", currentSessionDate);
    localStorage.setItem("miki_current_name", currentSessionName);

    updateSessionUI();
    closeSetupModal();

    if (modalMode === "SAVE") {
        saveCurrentSessionToFile();
    }
}

function updateSessionUI() {
    document.getElementById("displayFileDate").innerText = `Date: ${currentSessionDate}`;
    document.getElementById("displayFileName").innerText = currentSessionName;
}

function promptNewFile() {
    if (confirm("Start a new ledger session? Unsaved progress will be lost.")) {
        clearAllTableData();
        openModal("NEW");
    }
}

function openSaveConfirmationModal() {
    openModal("SAVE");
}

// SAVE & LOAD 30-DAY HISTORY
function saveCurrentSessionToFile() {
    let history = JSON.parse(localStorage.getItem("miki_ledger_history")) || [];

    const fileData = {
        id: `${currentSessionDate}_${currentSessionName}`,
        date: currentSessionDate,
        name: currentSessionName,
        timestamp: Date.now(),
        ledgerRows: getLedgerTableData(),
        expensesData: getExpensesTableData(),
        coh: document.getElementById("inputCOH")?.value || "0"
    };

    const existingIdx = history.findIndex(h => h.id === fileData.id);
    if (existingIdx >= 0) {
        history[existingIdx] = fileData;
    } else {
        history.unshift(fileData);
    }

    if (history.length > 30) history = history.slice(0, 30);

    localStorage.setItem("miki_ledger_history", JSON.stringify(history));
    loadHistoryFiles();
    alert("Ledger file saved successfully!");
}

function getLedgerTableData() {
    const data = [];
    for (let i = 0; i < 16; i++) {
        data.push({
            name: document.getElementById(`name_${i}`)?.value || "",
            dry: document.getElementById(`dry_${i}`)?.value || "",
            fresh: document.getElementById(`fresh_${i}`)?.value || "",
            cab: document.getElementById(`cab_${i}`)?.value || "",
            bo: document.getElementById(`bo_${i}`)?.value || "",
            bal: document.getElementById(`bal_${i}`)?.value || "",
            billing: document.getElementById(`billing_${i}`)?.value || "",
            colln: document.getElementById(`colln_${i}`)?.value || "",
            rem: document.getElementById(`rem_${i}`)?.value || ""
        });
    }
    return data;
}

function getExpensesTableData() {
    const data = [];
    for (let i = 0; i < 5; i++) {
        data.push({
            item1: document.getElementById(`expItem1_${i}`)?.value || "",
            amt1: document.getElementById(`expAmt1_${i}`)?.value || "",
            item2: document.getElementById(`expItem2_${i}`)?.value || "",
            amt2: document.getElementById(`expAmt2_${i}`)?.value || ""
        });
    }
    return data;
}

function loadHistoryFiles() {
    const container = document.getElementById("historyContainer");
    const countElem = document.getElementById("historyCount");
    if (!container) return;

    const history = JSON.parse(localStorage.getItem("miki_ledger_history")) || [];
    countElem.innerText = `${history.length} / 30 ▼`;

    if (history.length === 0) {
        container.innerHTML = `<div style="padding: 6px; color: #9ca3af; text-align: center;">No saved files yet.</div>`;
        return;
    }

    let html = "";
    history.forEach((file, idx) => {
        html += `
            <div class="history-item">
                <span><strong>${file.date}</strong> - ${file.name}</span>
                <div>
                    <button class="btn-sm btn-edit" onclick="loadSavedFile(${idx})">Load</button>
                    <button class="btn-sm btn-del" onclick="deleteSavedFile(${idx})">Del</button>
                </div>
            </div>
        `;
    });
    container.innerHTML = html;
}

function loadSavedFile(index) {
    const history = JSON.parse(localStorage.getItem("miki_ledger_history")) || [];
    const file = history[index];
    if (!file) return;

    currentSessionDate = file.date;
    currentSessionName = file.name;
    localStorage.setItem("miki_current_date", currentSessionDate);
    localStorage.setItem("miki_current_name", currentSessionName);
    updateSessionUI();

    // Restore Ledger Rows
    if (file.ledgerRows) {
        file.ledgerRows.forEach((row, i) => {
            if (i < 16) {
                document.getElementById(`name_${i}`).value = row.name || "";
                document.getElementById(`dry_${i}`).value = row.dry || "";
                document.getElementById(`fresh_${i}`).value = row.fresh || "";
                document.getElementById(`cab_${i}`).value = row.cab || "";
                document.getElementById(`bo_${i}`).value = row.bo || "";
                document.getElementById(`bal_${i}`).value = row.bal || "";
                document.getElementById(`billing_${i}`).value = row.billing || "";
                document.getElementById(`colln_${i}`).value = row.colln || "";
                document.getElementById(`rem_${i}`).value = row.rem || "";
            }
        });
    }

    // Restore Expenses Table
    if (file.expensesData) {
        file.expensesData.forEach((row, i) => {
            if (i < 5) {
                document.getElementById(`expItem1_${i}`).value = row.item1 || "";
                document.getElementById(`expAmt1_${i}`).value = row.amt1 || "";
                document.getElementById(`expItem2_${i}`).value = row.item2 || "";
                document.getElementById(`expAmt2_${i}`).value = row.amt2 || "";
            }
        });
    }

    // Restore COH
    if (document.getElementById("inputCOH")) {
        document.getElementById("inputCOH").value = file.coh || "0";
    }

    calculateLedgerTotals();
    selectRow(0);
}

function deleteSavedFile(index) {
    if (confirm("Are you sure you want to delete this file?")) {
        let history = JSON.parse(localStorage.getItem("miki_ledger_history")) || [];
        history.splice(index, 1);
        localStorage.setItem("miki_ledger_history", JSON.stringify(history));
        loadHistoryFiles();
    }
}

function clearAllTableData() {
    for (let i = 0; i < 16; i++) {
        document.getElementById(`dry_${i}`).value = "";
        document.getElementById(`fresh_${i}`).value = "";
        document.getElementById(`cab_${i}`).value = "";
        document.getElementById(`bo_${i}`).value = "";
        document.getElementById(`bal_${i}`).value = "";
        document.getElementById(`billing_${i}`).value = "";
        document.getElementById(`colln_${i}`).value = "";
        document.getElementById(`rem_${i}`).value = "";
    }

    for (let i = 0; i < 5; i++) {
        document.getElementById(`expItem1_${i}`).value = "";
        document.getElementById(`expAmt1_${i}`).value = "";
        document.getElementById(`expItem2_${i}`).value = "";
        document.getElementById(`expAmt2_${i}`).value = "";
    }

    if (document.getElementById("inputCOH")) {
        document.getElementById("inputCOH").value = "0";
    }

    clearMainInputs();
    calculateLedgerTotals();
}

function loadDefaultNames() {
    const defaultNames = ["Row 1", "Row 2", "Row 3", "Row 4", "Row 5", "Row 6", "Row 7", "Row 8", "Row 9", "Row 10", "Row 11", "Row 12", "Row 13", "Row 14", "Row 15", "Row 16"];
    defaultNames.forEach((n, i) => {
        const input = document.getElementById(`name_${i}`);
        if (input && !input.value) input.value = n;
    });
}

function toggleHistoryDrawer() {
    const container = document.getElementById("historyContainer");
    if (container.style.display === "none") {
        container.style.display = "block";
    } else {
        container.style.display = "none";
    }
}
