let activeRow = 1;
let tapCount = 0;
let tapTimer = null;
let isLocked = true;

let priceTapCount = 0;
let priceTapTimer = null;
let isPriceLocked = true;

let currentSessionDate = "";
let currentSessionName = "";
let modalMode = "OPEN";
let inactivityTimer = null;
let isEditingActive = false;
const INACTIVITY_LIMIT_MS = 15 * 60 * 1000;

// Render 16 Rows dynamically & Load State
document.addEventListener("DOMContentLoaded", function () {
    const tbody = document.getElementById("ledgerTableBody");
    if (tbody) {
        let rowsHtml = "";
        for (let i = 1; i <= 16; i++) {
            rowsHtml += `
                <tr>
                    <td><input type="text" class="name-input" id="ledgerName_${i}" oninput="updateActiveCustomerName(${i}); saveLedger();" onfocus="loadRowToMain(${i})" readonly style="background-color: #e5e7eb;"></td>
                    <td><input type="text" class="readonly-col" id="ledgerDry_${i}" readonly onfocus="loadRowToMain(${i})"></td>
                    <td><input type="text" class="readonly-col" id="ledgerFresh_${i}" readonly onfocus="loadRowToMain(${i})"></td>
                    <td><input type="text" class="readonly-col" id="ledgerCab_${i}" readonly onfocus="loadRowToMain(${i})"></td>
                    <td><input type="text" class="readonly-col" id="ledgerBo_${i}" readonly onfocus="loadRowToMain(${i})"></td>
                    <td><input type="text" class="readonly-col" id="ledgerBal_${i}" readonly onfocus="loadRowToMain(${i})"></td>
                    <td><input type="text" class="readonly-col amount" id="ledgerBilling_${i}" readonly></td>
                    <td><input type="text" class="readonly-col colln-input" id="ledgerPay_${i}" readonly onfocus="loadRowToMain(${i})"></td>
                    <td><input type="text" class="readonly-col amount" id="ledgerRem_${i}" readonly></td>
                </tr>
            `;
        }
        tbody.innerHTML = rowsHtml;
    }
    loadLedger();
});

// PWA Install & SW Registration
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    const installBtn = document.getElementById('installBtn');
    if (installBtn) installBtn.style.display = 'block';
});

function installApp() {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        deferredPrompt.userChoice.then(() => {
            deferredPrompt = null;
            document.getElementById('installBtn').style.display = 'none';
        });
    }
}

if ('serviceWorker' in navigator) {
    window.addEventListener('load', () => {
        navigator.serviceWorker.register('./sw.js?v=1', { scope: './' }).catch(err => console.log(err));
    });
}

// INACTIVITY & LOCKING
function resetInactivityTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
        autoSaveAndReset();
    }, INACTIVITY_LIMIT_MS);
}

['mousemove', 'keydown', 'touchstart', 'scroll', 'click'].forEach(evt => {
    document.addEventListener(evt, resetInactivityTimer, true);
});

function autoSaveAndReset() {
    if (currentSessionDate && currentSessionName) {
        forceSaveCurrentDay();
        alert("System auto-saved due to 15 minutes of inactivity. Ledger refreshed for new day.");
        resetLedgerState();
    }
}

function setEncodingEditable(editable) {
    isEditingActive = editable;
    const inputs = document.querySelectorAll('.main-wrapper input:not(.price-input):not(#modalDateInput):not(#modalNameInput)');
    inputs.forEach(input => {
        if (!input.classList.contains('readonly-col')) {
            input.disabled = !editable;
        }
    });
}

// MODAL CONTROLS
function showOpenModal() {
    modalMode = "OPEN";
    document.getElementById("modalTitle").textContent = "Start New Ledger File";
    document.getElementById("modalSubtext").textContent = "Please fill out both the Date and Name to unlock encoding.";
    document.getElementById("modalActionBtn").textContent = "Open Ledger";
    document.getElementById("modalDateInput").value = "";
    document.getElementById("modalNameInput").value = "";
    document.getElementById("setupModal").style.display = "flex";
}

function openSaveConfirmationModal() {
    if (!currentSessionDate || !currentSessionName) {
        alert("No active session to save. Please start a session first.");
        return;
    }
    modalMode = "SAVE";
    document.getElementById("modalTitle").textContent = "Confirm & Save Ledger File";
    document.getElementById("modalSubtext").textContent = "Review or edit the Date and Name before saving to history.";
    document.getElementById("modalActionBtn").textContent = "Save File";
    document.getElementById("modalDateInput").value = currentSessionDate;
    document.getElementById("modalNameInput").value = currentSessionName;
    document.getElementById("setupModal").style.display = "flex";
}

function handleModalSubmit() {
    const dateVal = document.getElementById("modalDateInput").value;
    const nameVal = document.getElementById("modalNameInput").value.trim();

    if (!dateVal || !nameVal) {
        alert("Both Date and Name are required!");
        return;
    }

    if (modalMode === "SAVE") {
        const history = JSON.parse(localStorage.getItem("miki_30day_history") || "[]");
        const isDuplicate = history.some(item => item.date === dateVal && item.date !== currentSessionDate);
        if (isDuplicate || (dateVal === currentSessionDate && history.some(item => item.date === dateVal))) {
            const confirmOverwrite = confirm(`Warning: A saved file with the date ${dateVal} already exists. Do you want to overwrite/update this file?`);
            if (!confirmOverwrite) return;
        }
    }

    currentSessionDate = dateVal;
    currentSessionName = nameVal;

    document.getElementById("displayFileDate").textContent = "Date: " + currentSessionDate;
    document.getElementById("displayFileName").textContent = currentSessionName;
    document.getElementById("setupModal").style.display = "none";

    if (modalMode === "SAVE") {
        forceSaveCurrentDay();
        clearAllLedgerInputs();
        currentSessionDate = "";
        currentSessionName = "";
        document.getElementById("displayFileDate").textContent = "Date: --";
        document.getElementById("displayFileName").textContent = "--";
        localStorage.removeItem("miki_ledger_data");
        setEncodingEditable(false);
    } else {
        setEncodingEditable(true);
        resetInactivityTimer();
    }
}

function closeSetupModal() {
    document.getElementById("setupModal").style.display = "none";
}

function promptNewFile() {
    resetLedgerState();
}

function resetLedgerState() {
    currentSessionDate = "";
    currentSessionName = "";
    document.getElementById("displayFileDate").textContent = "Date: --";
    document.getElementById("displayFileName").textContent = "--";

    clearAllLedgerInputs();
    localStorage.removeItem("miki_ledger_data");
    setEncodingEditable(false);
    renderHistoryUI();
    showOpenModal();
}

function clearAllLedgerInputs() {
    clearMainInputs();
    for (let i = 1; i <= 16; i++) {
        document.getElementById(`ledgerName_${i}`).value = "";
        document.getElementById(`ledgerDry_${i}`).value = "";
        document.getElementById(`ledgerFresh_${i}`).value = "";
        document.getElementById(`ledgerCab_${i}`).value = "";
        document.getElementById(`ledgerBo_${i}`).value = "";
        document.getElementById(`ledgerBal_${i}`).value = "";
        document.getElementById(`ledgerBilling_${i}`).value = "";
        document.getElementById(`ledgerPay_${i}`).value = "";
        document.getElementById(`ledgerRem_${i}`).value = "";
    }
    calculateLedgerTotals();
}

// TAP LOCKS
function handleKeyClick() {
    tapCount++;
    clearTimeout(tapTimer);
    tapTimer = setTimeout(() => { tapCount = 0; }, 1000);

    if (tapCount >= 5) {
        tapCount = 0;
        isLocked = !isLocked;
        toggleLockState(isLocked);
    }
}

function toggleLockState(locked) {
    document.getElementById("lockHeader").textContent = locked ? "🔒 Name" : "🔑 Name";
    document.querySelectorAll(".name-input").forEach(field => {
        field.readOnly = locked;
        field.style.backgroundColor = locked ? "#e5e7eb" : "white";
    });
}

function handlePriceKeyClick() {
    priceTapCount++;
    clearTimeout(priceTapTimer);
    priceTapTimer = setTimeout(() => { priceTapCount = 0; }, 1000);

    if (priceTapCount >= 5) {
        priceTapCount = 0;
        isPriceLocked = !isPriceLocked;
        togglePriceLockState(isPriceLocked);
    }
}

function togglePriceLockState(locked) {
    document.getElementById("priceLockHeader").textContent = locked ? "Price 🔒" : "Price 🔑";
    document.querySelectorAll(".price-input").forEach(field => {
        field.readOnly = locked;
        field.style.backgroundColor = locked ? "#e5e7eb" : "white";
    });
}

// HELPERS & CALCULATIONS
function getVal(id) {
    const val = parseFloat(document.getElementById(id).value);
    return isNaN(val) ? 0 : val;
}

function formatMoney(value) {
    return Math.round(value).toLocaleString("en-US", {
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    });
}

function updateActiveCustomerName(row) {
    if (row === activeRow) {
        const nameVal = document.getElementById(`ledgerName_${row}`).value.trim();
        document.getElementById("activeCustomerDisplay").textContent = nameVal !== "" ? nameVal : `Row ${row}`;
    }
}

function syncFromPanel(type) {
    const val = document.getElementById("sync" + type).value;
    const targetId = type === "Dry" ? "qtyReg" : "qty" + type;
    document.getElementById(targetId).value = val;
    calculateMain();
}

function syncFromTable(type) {
    const targetId = type === "Reg" ? "syncDry" : "sync" + type;
    const val = document.getElementById("qty" + type).value;
    const syncInput = document.getElementById(targetId);
    if (syncInput) syncInput.value = val;
    calculateMain();
}

function clearMainInputs() {
    document.getElementById("qtyReg").value = "";
    document.getElementById("syncDry").value = "";
    document.getElementById("qtyFresh").value = "";
    document.getElementById("syncFresh").value = "";
    document.getElementById("qtyCab").value = "";
    document.getElementById("syncCab").value = "";
    document.getElementById("qtyBo").value = "";
    document.getElementById("syncBo").value = "";
    document.getElementById("inputBal").value = "";
    document.getElementById("inputPay").value = "";
    calculateMain();
}

function calculateMain() {
    const regQty = getVal("qtyReg");
    const regPrice = getVal("priceReg");
    const regAmount = Math.round(regQty * regPrice);

    const freshQty = getVal("qtyFresh");
    const freshPrice = getVal("priceFresh");
    const freshAmount = Math.round(freshQty * freshPrice);

    const cabQty = getVal("qtyCab");
    const cabPrice = getVal("priceCab");
    const cabAmount = Math.round(cabQty * cabPrice);

    const boQty = getVal("qtyBo");
    const boPrice = getVal("priceBo");
    const boAmount = Math.round((boQty / 2) * boPrice);

    const balAmount = Math.round(getVal("inputBal"));
    const payAmount = Math.round(getVal("inputPay"));

    const total = regAmount + freshAmount + cabAmount - boAmount;
    const billingAmount = total + balAmount;
    const netTotal = billingAmount - payAmount;

    document.getElementById("amountReg").textContent = formatMoney(regAmount);
    document.getElementById("amountFresh").textContent = formatMoney(freshAmount);
    document.getElementById("amountCab").textContent = formatMoney(cabAmount);
    document.getElementById("amountBo").textContent = formatMoney(boAmount);
    document.getElementById("totalAmount").textContent = formatMoney(total);
    document.getElementById("netTotalAmount").textContent = formatMoney(netTotal);

    if (activeRow >= 1 && activeRow <= 16) {
        document.getElementById(`ledgerDry_${activeRow}`).value = document.getElementById("qtyReg").value;
        document.getElementById(`ledgerFresh_${activeRow}`).value = document.getElementById("qtyFresh").value;
        document.getElementById(`ledgerCab_${activeRow}`).value = document.getElementById("qtyCab").value;
        document.getElementById(`ledgerBo_${activeRow}`).value = document.getElementById("qtyBo").value;
        document.getElementById(`ledgerBal_${activeRow}`).value = document.getElementById("inputBal").value;
        
        document.getElementById(`ledgerBilling_${activeRow}`).value = formatMoney(billingAmount);

        const hasPayEntry = document.getElementById("inputPay").value.trim() !== "";
        const collnVal = hasPayEntry ? payAmount : billingAmount;
        document.getElementById(`ledgerPay_${activeRow}`).value = formatMoney(collnVal);

        const remVal = billingAmount - collnVal;
        document.getElementById(`ledgerRem_${activeRow}`).value = formatMoney(remVal);
    }

    calculateLedgerTotals();
    saveLedger();
}

function loadRowToMain(row) {
    if (!isEditingActive) return;

    activeRow = row;
    updateActiveCustomerName(row);

    document.getElementById("qtyReg").value = document.getElementById(`ledgerDry_${row}`).value;
    document.getElementById("syncDry").value = document.getElementById(`ledgerDry_${row}`).value;

    document.getElementById("qtyFresh").value = document.getElementById(`ledgerFresh_${row}`).value;
    document.getElementById("syncFresh").value = document.getElementById(`ledgerFresh_${row}`).value;

    document.getElementById("qtyCab").value = document.getElementById(`ledgerCab_${row}`).value;
    document.getElementById("syncCab").value = document.getElementById(`ledgerCab_${row}`).value;

    document.getElementById("qtyBo").value = document.getElementById(`ledgerBo_${row}`).value;
    document.getElementById("syncBo").value = document.getElementById(`ledgerBo_${row}`).value;

    document.getElementById("inputBal").value = document.getElementById(`ledgerBal_${row}`).value;
    
    const rawColln = document.getElementById(`ledgerPay_${row}`).value.replace(/,/g, '');
    const rawBilling = document.getElementById(`ledgerBilling_${row}`).value.replace(/,/g, '');
    document.getElementById("inputPay").value = (rawColln !== rawBilling) ? rawColln : "";

    calculateMain();
}

function calculateLedgerTotals() {
    let sumDry = 0, sumFresh = 0, sumCab = 0, sumBo = 0;
    let sumBal = 0, sumBilling = 0, sumColln = 0, sumRem = 0;

    for (let i = 1; i <= 16; i++) {
        sumDry += parseFloat(document.getElementById(`ledgerDry_${i}`).value) || 0;
        sumFresh += parseFloat(document.getElementById(`ledgerFresh_${i}`).value) || 0;
        sumCab += parseFloat(document.getElementById(`ledgerCab_${i}`).value) || 0;
        sumBo += parseFloat(document.getElementById(`ledgerBo_${i}`).value) || 0;
        sumBal += parseFloat(document.getElementById(`ledgerBal_${i}`).value) || 0;
        
        const billStr = document.getElementById(`ledgerBilling_${i}`).value.replace(/,/g, '');
        sumBilling += parseFloat(billStr) || 0;

        const collnStr = document.getElementById(`ledgerPay_${i}`).value.replace(/,/g, '');
        sumColln += parseFloat(collnStr) || 0;

        const remStr = document.getElementById(`ledgerRem_${i}`).value.replace(/,/g, '');
        sumRem += parseFloat(remStr) || 0;
    }

    document.getElementById("totalDry").textContent = formatMoney(sumDry);
    document.getElementById("totalFresh").textContent = formatMoney(sumFresh);
    document.getElementById("totalCab").textContent = formatMoney(sumCab);
    document.getElementById("totalBo").textContent = sumBo % 1 === 0 ? sumBo : sumBo.toFixed(1);
    document.getElementById("totalBal").textContent = formatMoney(sumBal);
    document.getElementById("totalBilling").textContent = formatMoney(sumBilling);
    document.getElementById("totalColln").textContent = formatMoney(sumColln);
    document.getElementById("totalRem").textContent = formatMoney(sumRem);
}

// LOCALSTORAGE & HISTORY
function saveLedger() {
    if (!currentSessionDate || !currentSessionName || !isEditingActive) return;

    const ledgerData = {
        date: currentSessionDate,
        name: currentSessionName,
        rows: {}
    };

    for (let i = 1; i <= 16; i++) {
        ledgerData.rows[`name_${i}`] = document.getElementById(`ledgerName_${i}`).value;
        ledgerData.rows[`dry_${i}`] = document.getElementById(`ledgerDry_${i}`).value;
        ledgerData.rows[`fresh_${i}`] = document.getElementById(`ledgerFresh_${i}`).value;
        ledgerData.rows[`cab_${i}`] = document.getElementById(`ledgerCab_${i}`).value;
        ledgerData.rows[`bo_${i}`] = document.getElementById(`ledgerBo_${i}`).value;
        ledgerData.rows[`bal_${i}`] = document.getElementById(`ledgerBal_${i}`).value;
        ledgerData.rows[`billing_${i}`] = document.getElementById(`ledgerBilling_${i}`).value;
        ledgerData.rows[`pay_${i}`] = document.getElementById(`ledgerPay_${i}`).value;
        ledgerData.rows[`rem_${i}`] = document.getElementById(`ledgerRem_${i}`).value;
    }

    localStorage.setItem("miki_ledger_data", JSON.stringify(ledgerData));
}

function forceSaveCurrentDay() {
    if (!currentSessionDate || !currentSessionName) return;

    saveLedger();
    const activeDraft = JSON.parse(localStorage.getItem("miki_ledger_data"));
    if (!activeDraft) return;

    let history = JSON.parse(localStorage.getItem("miki_30day_history") || "[]");
    const existingIndex = history.findIndex(item => item.date === activeDraft.date);
    if (existingIndex !== -1) {
        history[existingIndex] = activeDraft;
    } else {
        history.unshift(activeDraft);
    }

    if (history.length > 30) {
        history = history.slice(0, 30);
    }

    localStorage.setItem("miki_30day_history", JSON.stringify(history));
    renderHistoryUI();
}

function loadHistoryFile(dateKey) {
    const history = JSON.parse(localStorage.getItem("miki_30day_history") || "[]");
    const selectedFile = history.find(item => item.date === dateKey);

    if (!selectedFile) return;

    clearAllLedgerInputs();

    currentSessionDate = selectedFile.date;
    currentSessionName = selectedFile.name;

    document.getElementById("displayFileDate").textContent = "Date: " + currentSessionDate;
    document.getElementById("displayFileName").textContent = currentSessionName;

    for (let i = 1; i <= 16; i++) {
        if(selectedFile.rows[`name_${i}`] !== undefined) document.getElementById(`ledgerName_${i}`).value = selectedFile.rows[`name_${i}`];
        if(selectedFile.rows[`dry_${i}`] !== undefined) document.getElementById(`ledgerDry_${i}`).value = selectedFile.rows[`dry_${i}`];
        if(selectedFile.rows[`fresh_${i}`] !== undefined) document.getElementById(`ledgerFresh_${i}`).value = selectedFile.rows[`fresh_${i}`];
        if(selectedFile.rows[`cab_${i}`] !== undefined) document.getElementById(`ledgerCab_${i}`).value = selectedFile.rows[`cab_${i}`];
        if(selectedFile.rows[`bo_${i}`] !== undefined) document.getElementById(`ledgerBo_${i}`).value = selectedFile.rows[`bo_${i}`];
        if(selectedFile.rows[`bal_${i}`] !== undefined) document.getElementById(`ledgerBal_${i}`).value = selectedFile.rows[`bal_${i}`];
        if(selectedFile.rows[`billing_${i}`] !== undefined) document.getElementById(`ledgerBilling_${i}`).value = selectedFile.rows[`billing_${i}`];
        if(selectedFile.rows[`pay_${i}`] !== undefined) document.getElementById(`ledgerPay_${i}`).value = selectedFile.rows[`pay_${i}`];
        if(selectedFile.rows[`rem_${i}`] !== undefined) document.getElementById(`ledgerRem_${i}`).value = selectedFile.rows[`rem_${i}`];
    }

    document.getElementById("setupModal").style.display = "none";
    setEncodingEditable(true);
    loadRowToMain(1);
    calculateLedgerTotals();
    saveLedger();
    renderHistoryUI(dateKey);
}

function deleteHistoryFile(dateKey) {
    if (confirm(`Delete file for ${dateKey}?`)) {
        let history = JSON.parse(localStorage.getItem("miki_30day_history") || "[]");
        history = history.filter(item => item.date !== dateKey);
        localStorage.setItem("miki_30day_history", JSON.stringify(history));
        renderHistoryUI();
    }
}

function renderHistoryUI(selectedDateKey = null) {
    const historyContainer = document.getElementById("historyContainer");
    const historyCount = document.getElementById("historyCount");
    const history = JSON.parse(localStorage.getItem("miki_30day_history") || "[]");

    historyCount.textContent = `${history.length} / 30`;

    if (history.length === 0) {
        historyContainer.innerHTML = `<p style="color: #9ca3af; text-align: center; margin: 10px 0;">No saved files yet.</p>`;
        return;
    }

    const highlightKey = selectedDateKey || currentSessionDate;

    historyContainer.innerHTML = "";
    history.forEach(item => {
        const div = document.createElement("div");
        const isSelected = item.date === highlightKey;
        div.className = `history-item ${isSelected ? 'selected-file' : ''}`;
        div.innerHTML = `
            <div>
                <strong>${item.date}</strong> - ${item.name}
            </div>
            <div>
                <button class="btn-sm btn-edit" onclick="loadHistoryFile('${item.date}')">Edit</button>
                <button class="btn-sm btn-del" onclick="deleteHistoryFile('${item.date}')">Del</button>
            </div>
        `;
        historyContainer.appendChild(div);
    });
}

function loadLedger() {
    renderHistoryUI();
    const saved = localStorage.getItem("miki_ledger_data");

    if (!saved) {
        setEncodingEditable(false);
        showOpenModal();
        return;
    }

    const ledgerData = JSON.parse(saved);
    if (!ledgerData.date || !ledgerData.name) {
        setEncodingEditable(false);
        showOpenModal();
        return;
    }

    currentSessionDate = ledgerData.date;
    currentSessionName = ledgerData.name;
    document.getElementById("displayFileDate").textContent = "Date: " + currentSessionDate;
    document.getElementById("displayFileName").textContent = currentSessionName;

    for (let i = 1; i <= 16; i++) {
        if(ledgerData.rows[`name_${i}`] !== undefined) document.getElementById(`ledgerName_${i}`).value = ledgerData.rows[`name_${i}`];
        if(ledgerData.rows[`dry_${i}`] !== undefined) document.getElementById(`ledgerDry_${i}`).value = ledgerData.rows[`dry_${i}`];
        if(ledgerData.rows[`fresh_${i}`] !== undefined) document.getElementById(`ledgerFresh_${i}`).value = ledgerData.rows[`fresh_${i}`];
        if(ledgerData.rows[`cab_${i}`] !== undefined) document.getElementById(`ledgerCab_${i}`).value = ledgerData.rows[`cab_${i}`];
        if(ledgerData.rows[`bo_${i}`] !== undefined) document.getElementById(`ledgerBo_${i}`).value = ledgerData.rows[`bo_${i}`];
        if(ledgerData.rows[`bal_${i}`] !== undefined) document.getElementById(`ledgerBal_${i}`).value = ledgerData.rows[`bal_${i}`];
        if(ledgerData.rows[`billing_${i}`] !== undefined) document.getElementById(`ledgerBilling_${i}`).value = ledgerData.rows[`billing_${i}`];
        if(ledgerData.rows[`pay_${i}`] !== undefined) document.getElementById(`ledgerPay_${i}`).value = ledgerData.rows[`pay_${i}`];
        if(ledgerData.rows[`rem_${i}`] !== undefined) document.getElementById(`ledgerRem_${i}`).value = ledgerData.rows[`rem_${i}`];
    }

    document.getElementById("setupModal").style.display = "none";
    setEncodingEditable(true);
    loadRowToMain(1);
    calculateLedgerTotals();
    renderHistoryUI();
    resetInactivityTimer();
}
// 1. Render 5 Rows for Items & Amount Table
function renderExpenseTable() {
    const tbody = document.getElementById('expenseTableBody');
    if (!tbody) return;
    
    let html = '';
    for (let i = 0; i < 5; i++) {
        html += `
            <tr>
                <td><input type="text" id="expItem1_${i}" style="width:100%; border:none; text-align:left; padding-left:4px;"></td>
                <td><input type="number" id="expAmt1_${i}" class="exp-amount-input" oninput="calculateExpensesAndSummary()" style="width:100%; border:none; text-align:right; padding-right:4px;"></td>
                <td><input type="text" id="expItem2_${i}" style="width:100%; border:none; text-align:left; padding-left:4px;"></td>
                <td><input type="number" id="expAmt2_${i}" class="exp-amount-input" oninput="calculateExpensesAndSummary()" style="width:100%; border:none; text-align:right; padding-right:4px;"></td>
                <td style="background:#e5e7eb;"></td>
            </tr>
        `;
    }
    tbody.innerHTML = html;
}

// 2. Calculation Logic for Expenses, Yellow, Green (COH), Pink, and Red
function calculateExpensesAndSummary() {
    let pinkSum = 0;
    
    // Sum of all amounts in new table
    for (let i = 0; i < 5; i++) {
        const amt1 = parseFloat(document.getElementById(`expAmt1_${i}`)?.value) || 0;
        const amt2 = parseFloat(document.getElementById(`expAmt2_${i}`)?.value) || 0;
        pinkSum += amt1 + amt2;
    }
    
    // Get Coll'n Net Total from Table 2 (Total Pay Column)
    const collnTotal = parseFloat(document.getElementById('totalColln')?.innerText) || 0;
    
    // Yellow = Coll'n Net Total + Pink Sum
    const yellowTotal = collnTotal + pinkSum;
    
    // COH (Green)
    const cohInput = parseFloat(document.getElementById('inputCOH')?.value) || 0;
    
    // Red (Grand Total) = Yellow - COH
    const redGrandTotal = yellowTotal - cohInput;
    
    // Update UI Displays
    document.getElementById('pinkTotalDisplay').innerText = pinkSum.toLocaleString();
    document.getElementById('yellowTotalDisplay').innerText = yellowTotal.toLocaleString();
    document.getElementById('redGrandTotalDisplay').innerText = redGrandTotal.toLocaleString();
}

// 3. Toggle Slider Open / Close
function toggleExpenseSlider() {
    const content = document.getElementById('expenseSliderContent');
    const arrow = document.getElementById('sliderArrow');
    if (content.style.display === 'none') {
        content.style.display = 'block';
        arrow.innerText = '▼';
    } else {
        content.style.display = 'none';
        arrow.innerText = '►';
    }
}

// Automatic Initialization
document.addEventListener('DOMContentLoaded', () => {
    renderExpenseTable();
});
