// ============================================================
// PWA INSTALL PROMPT HANDLER
// ============================================================

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {

    e.preventDefault();

    deferredPrompt = e;

    const installBtn = document.getElementById('installBtn');

    if (installBtn) {
        installBtn.style.display = 'block';
    }

});

function installApp() {

    if (!deferredPrompt) return;

    deferredPrompt.prompt();

    deferredPrompt.userChoice.then((choiceResult) => {

        if (choiceResult.outcome === 'accepted') {
            console.log('User accepted the install prompt');
        }

        deferredPrompt = null;

        const btn = document.getElementById('installBtn');

        if (btn) {
            btn.style.display = 'none';
        }

    });

}


// ============================================================
// SERVICE WORKER
// ============================================================

if ('serviceWorker' in navigator) {

    window.addEventListener('load', () => {

        navigator.serviceWorker.register('./sw.js?v=1', {
            scope: './'
        })

        .then(reg => {
            console.log('Service Worker Registered!', reg);
        })

        .catch(err => {
            console.log('Service Worker Registration Failed:', err);
        });

    });

}


// ============================================================
// GLOBAL STATE
// ============================================================

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


// ============================================================
// INACTIVITY
// ============================================================

function resetInactivityTimer() {

    clearTimeout(inactivityTimer);

    inactivityTimer = setTimeout(() => {
        autoSaveAndReset();
    }, INACTIVITY_LIMIT_MS);

}

[
    'mousemove',
    'keydown',
    'touchstart',
    'scroll',
    'click'
].forEach(evt => {

    document.addEventListener(
        evt,
        resetInactivityTimer,
        true
    );

});


// ============================================================
// ENABLE / DISABLE ENCODING
// ============================================================

function setEncodingEditable(editable) {

    isEditingActive = editable;

    const inputs = document.querySelectorAll(
        '.main-wrapper input:not(.price-input):not(#modalDateInput):not(#modalNameInput)'
    );

    inputs.forEach(input => {

        if (!input.classList.contains('readonly-col')) {
            input.disabled = !editable;
        }

    });

}


// ============================================================
// MODALS
// ============================================================

function showOpenModal() {

    modalMode = "OPEN";

    document.getElementById("modalTitle").textContent =
        "Start New Ledger File";

    document.getElementById("modalSubtext").textContent =
        "Please fill out both the Date and Name to unlock encoding.";

    document.getElementById("modalActionBtn").textContent =
        "Open Ledger";

    document.getElementById("modalDateInput").value = "";
    document.getElementById("modalNameInput").value = "";

    document.getElementById("setupModal").style.display =
        "flex";

}


function openSaveConfirmationModal() {

    if (!currentSessionDate || !currentSessionName) {

        alert(
            "No active session to save. Please start a session first."
        );

        return;
    }

    modalMode = "SAVE";

    document.getElementById("modalTitle").textContent =
        "Confirm & Save Ledger File";

    document.getElementById("modalSubtext").textContent =
        "Review or edit the Date and Name before saving to history.";

    document.getElementById("modalActionBtn").textContent =
        "Save File";

    document.getElementById("modalDateInput").value =
        currentSessionDate;

    document.getElementById("modalNameInput").value =
        currentSessionName;

    document.getElementById("setupModal").style.display =
        "flex";

}


function handleModalSubmit() {

    const dateVal =
        document.getElementById("modalDateInput").value;

    const nameVal =
        document.getElementById("modalNameInput").value.trim();

    if (!dateVal || !nameVal) {

        alert("Both Date and Name are required!");

        return;
    }


    if (modalMode === "SAVE") {

        const history =
            JSON.parse(
                localStorage.getItem("miki_30day_history") || "[]"
            );

        const isDuplicate =
            history.some(item =>
                item.date === dateVal &&
                item.date !== currentSessionDate
            );

        if (
            isDuplicate ||
            (
                dateVal === currentSessionDate &&
                history.some(item =>
                    item.date === dateVal
                )
            )
        ) {

            const confirmOverwrite = confirm(
                `Warning: A saved file with the date ${dateVal} already exists. Do you want to overwrite/update this file?`
            );

            if (!confirmOverwrite) {
                return;
            }

        }

    }


    currentSessionDate = dateVal;
    currentSessionName = nameVal;

    document.getElementById("displayFileDate").textContent =
        "Date: " + currentSessionDate;

    document.getElementById("displayFileName").textContent =
        currentSessionName;

    document.getElementById("setupModal").style.display =
        "none";


    if (modalMode === "SAVE") {

        forceSaveCurrentDay();

        clearAllLedgerInputs();

        currentSessionDate = "";
        currentSessionName = "";

        document.getElementById("displayFileDate").textContent =
            "Date: --";

        document.getElementById("displayFileName").textContent =
            "--";

        localStorage.removeItem("miki_ledger_data");

        setEncodingEditable(false);

    } else {

        setEncodingEditable(true);

        resetInactivityTimer();

    }

}


function closeSetupModal() {

    document.getElementById("setupModal").style.display =
        "none";

}


function promptNewFile() {

    resetLedgerState();

}


function autoSaveAndReset() {

    if (currentSessionDate && currentSessionName) {

        forceSaveCurrentDay();

        alert(
            "System auto-saved due to 15 minutes of inactivity. Ledger refreshed for new day."
        );

        resetLedgerState();

    }

}


function resetLedgerState() {

    currentSessionDate = "";
    currentSessionName = "";

    document.getElementById("displayFileDate").textContent =
        "Date: --";

    document.getElementById("displayFileName").textContent =
        "--";

    clearAllLedgerInputs();

    localStorage.removeItem("miki_ledger_data");

    setEncodingEditable(false);

    renderHistoryUI();

    showOpenModal();

}


// ============================================================
// CLEAR EVERYTHING
// ============================================================

function clearAllLedgerInputs() {

    clearMainInputs();


    // SECOND TABLE
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


    // THIRD TABLE
    for (let i = 1; i <= 8; i++) {

        document.getElementById(`extraItem_${i}`).value = "";
        document.getElementById(`extraAmount_${i}`).value = "";

    }

    document.getElementById("inputCOH").value = "0";


    activeRow = 1;

    document.getElementById("activeCustomerDisplay").textContent =
        "Row 1";

    document.getElementById("newTableNote").value = "";

    calculateLedgerTotals();

    calculateExtraTable();

}


// ============================================================
// LOCK NAME COLUMN
// ============================================================

function handleKeyClick() {

    tapCount++;

    clearTimeout(tapTimer);

    tapTimer = setTimeout(() => {
        tapCount = 0;
    }, 1000);


    if (tapCount >= 5) {

        tapCount = 0;

        isLocked = !isLocked;

        toggleLockState(isLocked);

    }

}


function toggleLockState(locked) {

    const header =
        document.getElementById("lockHeader");

    header.textContent =
        locked ? "🔒" : "🔑";


    const nameInputs =
        document.querySelectorAll(".name-input");

    nameInputs.forEach(field => {

        field.readOnly = locked;

        field.style.backgroundColor =
            locked ? "#e5e7eb" : "white";

    });

}


// ============================================================
// LOCK PRICES
// ============================================================

function handlePriceKeyClick() {

    priceTapCount++;

    clearTimeout(priceTapTimer);

    priceTapTimer = setTimeout(() => {
        priceTapCount = 0;
    }, 1000);


    if (priceTapCount >= 5) {

        priceTapCount = 0;

        isPriceLocked = !isPriceLocked;

        togglePriceLockState(isPriceLocked);

    }

}


function togglePriceLockState(locked) {

    const header =
        document.getElementById("priceLockHeader");

    header.textContent =
        locked ? "Price 🔒" : "Price 🔑";


    const priceInputs =
        document.querySelectorAll(".price-input");

    priceInputs.forEach(field => {

        field.readOnly = locked;

        field.style.backgroundColor =
            locked ? "#e5e7eb" : "white";

    });

}


// ============================================================
// HELPERS
// ============================================================

function getVal(id) {

    const val =
        parseFloat(
            document.getElementById(id).value
        );

    return isNaN(val) ? 0 : val;

}


function formatMoney(value) {

    return Math.round(value).toLocaleString(
        "en-US",
        {
            minimumFractionDigits: 0,
            maximumFractionDigits: 0
        }
    );

}


// ============================================================
// ACTIVE CUSTOMER
// ============================================================

function updateActiveCustomerName(row) {

    if (row === activeRow) {

        const nameVal =
            document.getElementById(
                `ledgerName_${row}`
            ).value.trim();

        const displayBox =
            document.getElementById(
                "activeCustomerDisplay"
            );

        displayBox.textContent =
            nameVal !== "" ?
            nameVal :
            `Row ${row}`;

    }

}


// ============================================================
// SYNC PANEL
// ============================================================

function syncFromPanel(type) {

    const val =
        document.getElementById(
            "sync" + type
        ).value;

    const targetId =
        type === "Dry" ?
        "qtyReg" :
        "qty" + type;

    document.getElementById(targetId).value =
        val;

    calculateMain();

}


function syncFromTable(type) {

    const targetId =
        type === "Reg" ?
        "syncDry" :
        "sync" + type;

    const val =
        document.getElementById(
            "qty" + type
        ).value;

    const syncInput =
        document.getElementById(targetId);

    if (syncInput) {
        syncInput.value = val;
    }

    calculateMain();

}


// ============================================================
// CLEAR MAIN
// ============================================================

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


// ============================================================
// MAIN CALCULATION
// ============================================================

function calculateMain() {

    const regQty = getVal("qtyReg");
    const regPrice = getVal("priceReg");
    const regAmount =
        Math.round(regQty * regPrice);


    const freshQty = getVal("qtyFresh");
    const freshPrice = getVal("priceFresh");
    const freshAmount =
        Math.round(freshQty * freshPrice);


    const cabQty = getVal("qtyCab");
    const cabPrice = getVal("priceCab");
    const cabAmount =
        Math.round(cabQty * cabPrice);


    const boQty = getVal("qtyBo");
    const boPrice = getVal("priceBo");
    const boAmount =
        Math.round((boQty / 2) * boPrice);


    const balAmount =
        Math.round(getVal("inputBal"));

    const payAmount =
        Math.round(getVal("inputPay"));


    const total =
        regAmount +
        freshAmount +
        cabAmount -
        boAmount;


    const billingAmount =
        total +
        balAmount;


    const netTotal =
        billingAmount -
        payAmount;


    document.getElementById("amountReg").textContent =
        formatMoney(regAmount);

    document.getElementById("amountFresh").textContent =
        formatMoney(freshAmount);

    document.getElementById("amountCab").textContent =
        formatMoney(cabAmount);

    document.getElementById("amountBo").textContent =
        formatMoney(boAmount);

    document.getElementById("totalAmount").textContent =
        formatMoney(total);

    document.getElementById("netTotalAmount").textContent =
        formatMoney(netTotal);


    document.getElementById(
        `ledgerDry_${activeRow}`
    ).value =
        document.getElementById("qtyReg").value;


    document.getElementById(
        `ledgerFresh_${activeRow}`
    ).value =
        document.getElementById("qtyFresh").value;


    document.getElementById(
        `ledgerCab_${activeRow}`
    ).value =
        document.getElementById("qtyCab").value;


    document.getElementById(
        `ledgerBo_${activeRow}`
    ).value =
        document.getElementById("qtyBo").value;


    document.getElementById(
        `ledgerBal_${activeRow}`
    ).value =
        document.getElementById("inputBal").value;


    document.getElementById(
        `ledgerBilling_${activeRow}`
    ).value =
        formatMoney(billingAmount);


    const hasPayEntry =
        document.getElementById("inputPay")
        .value.trim() !== "";


    const collnVal =
        hasPayEntry ?
        payAmount :
        billingAmount;


    document.getElementById(
        `ledgerPay_${activeRow}`
    ).value =
        formatMoney(collnVal);


    const remVal =
        billingAmount -
        collnVal;


    document.getElementById(
        `ledgerRem_${activeRow}`
    ).value =
        formatMoney(remVal);


    calculateLedgerTotals();

    saveLedger();

}


// ============================================================
// LOAD ROW
// ============================================================

function loadRowToMain(row) {

    if (!isEditingActive) return;

    activeRow = row;

    updateActiveCustomerName(row);


    document.getElementById("qtyReg").value =
        document.getElementById(
            `ledgerDry_${row}`
        ).value;

    document.getElementById("syncDry").value =
        document.getElementById(
            `ledgerDry_${row}`
        ).value;


    document.getElementById("qtyFresh").value =
        document.getElementById(
            `ledgerFresh_${row}`
        ).value;

    document.getElementById("syncFresh").value =
        document.getElementById(
            `ledgerFresh_${row}`
        ).value;


    document.getElementById("qtyCab").value =
        document.getElementById(
            `ledgerCab_${row}`
        ).value;

    document.getElementById("syncCab").value =
        document.getElementById(
            `ledgerCab_${row}`
        ).value;


    document.getElementById("qtyBo").value =
        document.getElementById(
            `ledgerBo_${row}`
        ).value;

    document.getElementById("syncBo").value =
        document.getElementById(
            `ledgerBo_${row}`
        ).value;


    document.getElementById("inputBal").value =
        document.getElementById(
            `ledgerBal_${row}`
        ).value;


    const rawColln =
        document.getElementById(
            `ledgerPay_${row}`
        ).value.replace(/,/g, '');


    const rawBilling =
        document.getElementById(
            `ledgerBilling_${row}`
        ).value.replace(/,/g, '');


    document.getElementById("inputPay").value =
        (rawColln !== rawBilling) ?
        rawColln :
        "";


    calculateMain();

}


// ============================================================
// SECOND TABLE TOTALS
// ============================================================

function calculateLedgerTotals() {

    let sumDry = 0;
    let sumFresh = 0;
    let sumCab = 0;
    let sumBo = 0;

    let sumBal = 0;
    let sumBilling = 0;
    let sumColln = 0;
    let sumRem = 0;


    for (let i = 1; i <= 16; i++) {

        sumDry +=
            parseFloat(
                document.getElementById(
                    `ledgerDry_${i}`
                ).value
            ) || 0;


        sumFresh +=
            parseFloat(
                document.getElementById(
                    `ledgerFresh_${i}`
                ).value
            ) || 0;


        sumCab +=
            parseFloat(
                document.getElementById(
                    `ledgerCab_${i}`
                ).value
            ) || 0;


        sumBo +=
            parseFloat(
                document.getElementById(
                    `ledgerBo_${i}`
                ).value
            ) || 0;


        sumBal +=
            parseFloat(
                document.getElementById(
                    `ledgerBal_${i}`
                ).value
            ) || 0;


        const billStr =
            document.getElementById(
                `ledgerBilling_${i}`
            ).value.replace(/,/g, '');


        sumBilling +=
            parseFloat(billStr) || 0;


        const collnStr =
            document.getElementById(
                `ledgerPay_${i}`
            ).value.replace(/,/g, '');


        sumColln +=
            parseFloat(collnStr) || 0;


        const remStr =
            document.getElementById(
                `ledgerRem_${i}`
            ).value.replace(/,/g, '');


        sumRem +=
            parseFloat(remStr) || 0;

    }


    document.getElementById("totalDry").textContent =
        formatMoney(sumDry);

    document.getElementById("totalFresh").textContent =
        formatMoney(sumFresh);

    document.getElementById("totalCab").textContent =
        formatMoney(sumCab);

    document.getElementById("totalBo").textContent =
        sumBo % 1 === 0 ?
        sumBo :
        sumBo.toFixed(1);

    document.getElementById("totalBal").textContent =
        formatMoney(sumBal);

    document.getElementById("totalBilling").textContent =
        formatMoney(sumBilling);

    document.getElementById("totalColln").textContent =
        formatMoney(sumColln);

    document.getElementById("totalRem").textContent =
        formatMoney(sumRem);


    // Update THIRD TABLE whenever second table changes
    calculateExtraTable();

}


// ============================================================
// THIRD TABLE CALCULATION
// ============================================================

function calculateExtraTable() {

    let totalAmountC2 = 0;
    let totalAmountC4 = 0;


    // C2 = amounts 1,3,5,7
    const c2Ids = [
        "extraAmount_1",
        "extraAmount_3",
        "extraAmount_5",
        "extraAmount_7"
    ];


    // C4 = amounts 2,4,6,8
    const c4Ids = [
        "extraAmount_2",
        "extraAmount_4",
        "extraAmount_6",
        "extraAmount_8"
    ];


    c2Ids.forEach(id => {

        totalAmountC2 +=
            parseFloat(
                document.getElementById(id).value
            ) || 0;

    });


    c4Ids.forEach(id => {

        totalAmountC4 +=
            parseFloat(
                document.getElementById(id).value
            ) || 0;

    });


    const allNewAmounts =
        totalAmountC2 +
        totalAmountC4;


    const secondTableColln =
        parseFloat(
            document.getElementById(
                "totalColln"
            ).textContent.replace(/,/g, '')
        ) || 0;


    const collectionPlusExtra =
        secondTableColln -
        allNewAmounts;


    const coh =
        parseFloat(
            document.getElementById(
                "inputCOH"
            ).value
        ) || 0;


    const grandTotal =
        collectionPlusExtra -
        coh;


    document.getElementById(
        "extraColumn2Total"
    ).textContent =
        formatMoney(totalAmountC2);


    document.getElementById(
        "extraColumn4Total"
    ).textContent =
        formatMoney(totalAmountC4);


    document.getElementById(
        "collectionPlusExtra"
    ).textContent =
        formatMoney(collectionPlusExtra);


    document.getElementById(
        "grandTotalAmount"
    ).textContent =
        formatMoney(grandTotal);

}


// ============================================================
// SAVE CURRENT DAY DRAFT
// ============================================================

function saveLedger() {

    if (
        !currentSessionDate ||
        !currentSessionName ||
        !isEditingActive
    ) {
        return;
    }


    const ledgerData = {

        date: currentSessionDate,

        name: currentSessionName,

        rows: {},

note: document.getElementById("newTableNote").value

    };


    // SECOND TABLE
    for (let i = 1; i <= 16; i++) {

        ledgerData.rows[`name_${i}`] =
            document.getElementById(
                `ledgerName_${i}`
            ).value;

        ledgerData.rows[`dry_${i}`] =
            document.getElementById(
                `ledgerDry_${i}`
            ).value;

        ledgerData.rows[`fresh_${i}`] =
            document.getElementById(
                `ledgerFresh_${i}`
            ).value;

        ledgerData.rows[`cab_${i}`] =
            document.getElementById(
                `ledgerCab_${i}`
            ).value;

        ledgerData.rows[`bo_${i}`] =
            document.getElementById(
                `ledgerBo_${i}`
            ).value;

        ledgerData.rows[`bal_${i}`] =
            document.getElementById(
                `ledgerBal_${i}`
            ).value;

        ledgerData.rows[`billing_${i}`] =
            document.getElementById(
                `ledgerBilling_${i}`
            ).value;

        ledgerData.rows[`pay_${i}`] =
            document.getElementById(
                `ledgerPay_${i}`
            ).value;

        ledgerData.rows[`rem_${i}`] =
            document.getElementById(
                `ledgerRem_${i}`
            ).value;

    }


    // THIRD TABLE
    ledgerData.extraTable = {};


    for (let i = 1; i <= 8; i++) {

        ledgerData.extraTable[`item_${i}`] =
            document.getElementById(
                `extraItem_${i}`
            ).value;

        ledgerData.extraTable[`amount_${i}`] =
            document.getElementById(
                `extraAmount_${i}`
            ).value;

    }


    ledgerData.extraTable.coh =
        document.getElementById(
            "inputCOH"
        ).value;


    localStorage.setItem(
        "miki_ledger_data",
        JSON.stringify(ledgerData)
    );

}


// ============================================================
// SAVE TO 30-DAY HISTORY
// ============================================================

function forceSaveCurrentDay() {

    if (
        !currentSessionDate ||
        !currentSessionName
    ) {
        return;
    }


    saveLedger();


    const activeDraft =
        JSON.parse(
            localStorage.getItem(
                "miki_ledger_data"
            )
        );


    if (!activeDraft) {
        return;
    }


    let history =
        JSON.parse(
            localStorage.getItem(
                "miki_30day_history"
            ) || "[]"
        );


    const existingIndex =
        history.findIndex(
            item =>
                item.date === activeDraft.date
        );


    if (existingIndex !== -1) {

        history[existingIndex] =
            activeDraft;

    } else {

        history.unshift(activeDraft);

    }


    if (history.length > 30) {

        history =
            history.slice(0, 30);

    }


    localStorage.setItem(
        "miki_30day_history",
        JSON.stringify(history)
    );


    renderHistoryUI();

}


// ============================================================
// LOAD HISTORY FILE
// ============================================================

function loadHistoryFile(dateKey) {

    const history =
        JSON.parse(
            localStorage.getItem(
                "miki_30day_history"
            ) || "[]"
        );


    const selectedFile =
        history.find(
            item =>
                item.date === dateKey
        );


    if (!selectedFile) {
        return;
    }


    clearAllLedgerInputs();


    currentSessionDate =
        selectedFile.date;

    currentSessionName =
        selectedFile.name;


    document.getElementById(
        "displayFileDate"
    ).textContent =
        "Date: " +
        currentSessionDate;


    document.getElementById(
        "displayFileName"
    ).textContent =
        currentSessionName;


    // SECOND TABLE
    for (let i = 1; i <= 16; i++) {

        if (
            selectedFile.rows &&
            selectedFile.rows[`name_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerName_${i}`
            ).value =
                selectedFile.rows[`name_${i}`];
        }


        if (
            selectedFile.rows &&
            selectedFile.rows[`dry_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerDry_${i}`
            ).value =
                selectedFile.rows[`dry_${i}`];
        }


        if (
            selectedFile.rows &&
            selectedFile.rows[`fresh_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerFresh_${i}`
            ).value =
                selectedFile.rows[`fresh_${i}`];
        }


        if (
            selectedFile.rows &&
            selectedFile.rows[`cab_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerCab_${i}`
            ).value =
                selectedFile.rows[`cab_${i}`];
        }


        if (
            selectedFile.rows &&
            selectedFile.rows[`bo_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerBo_${i}`
            ).value =
                selectedFile.rows[`bo_${i}`];
        }


        if (
            selectedFile.rows &&
            selectedFile.rows[`bal_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerBal_${i}`
            ).value =
                selectedFile.rows[`bal_${i}`];
        }


        if (
            selectedFile.rows &&
            selectedFile.rows[`billing_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerBilling_${i}`
            ).value =
                selectedFile.rows[`billing_${i}`];
        }


        if (
            selectedFile.rows &&
            selectedFile.rows[`pay_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerPay_${i}`
            ).value =
                selectedFile.rows[`pay_${i}`];
        }


        if (
            selectedFile.rows &&
            selectedFile.rows[`rem_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerRem_${i}`
            ).value =
                selectedFile.rows[`rem_${i}`];
        }

    }


    // THIRD TABLE
    if (selectedFile.extraTable) {

        for (let i = 1; i <= 8; i++) {

            if (
                selectedFile.extraTable[`item_${i}`] !== undefined
            ) {

                document.getElementById(
                    `extraItem_${i}`
                ).value =
                    selectedFile.extraTable[`item_${i}`];

            }


            if (
                selectedFile.extraTable[`amount_${i}`] !== undefined
            ) {

                document.getElementById(
                    `extraAmount_${i}`
                ).value =
                    selectedFile.extraTable[`amount_${i}`];

            }

        }


        if (
            selectedFile.extraTable.coh !== undefined
        ) {

            document.getElementById(
                "inputCOH"
            ).value =
                selectedFile.extraTable.coh;

        }

    }


    document.getElementById(
        "setupModal"
    ).style.display =
        "none";


    setEncodingEditable(true);


    loadRowToMain(1);

    calculateLedgerTotals();

    calculateExtraTable();

    saveLedger();

    renderHistoryUI(dateKey);

}


// ============================================================
// DELETE HISTORY
// ============================================================

function deleteHistoryFile(dateKey) {

    if (
        confirm(`Delete file for ${dateKey}?`)
    ) {

        let history =
            JSON.parse(
                localStorage.getItem(
                    "miki_30day_history"
                ) || "[]"
            );


        history =
            history.filter(
                item =>
                    item.date !== dateKey
            );


        localStorage.setItem(
            "miki_30day_history",
            JSON.stringify(history)
        );


        renderHistoryUI();

    }

}


// ============================================================
// HISTORY UI
// ============================================================

function renderHistoryUI(selectedDateKey = null) {

    const historyContainer =
        document.getElementById(
            "historyContainer"
        );


    const historyCount =
        document.getElementById(
            "historyCount"
        );


    const history =
        JSON.parse(
            localStorage.getItem(
                "miki_30day_history"
            ) || "[]"
        );


    historyCount.textContent =
        `${history.length} / 30`;


    if (history.length === 0) {

        historyContainer.innerHTML =
            `<p style="color:#9ca3af;text-align:center;margin:10px 0;">
                No saved files yet.
             </p>`;

        return;
    }


    const highlightKey =
        selectedDateKey ||
        currentSessionDate;


    historyContainer.innerHTML = "";


    history.forEach(item => {

        const div =
            document.createElement("div");


        const isSelected =
            item.date === highlightKey;


        div.className =
            `history-item ${
                isSelected ?
                'selected-file' :
                ''
            }`;


        div.innerHTML = `

            <div>
                <strong>${item.date}</strong> - ${item.name}
            </div>

            <div>

                <button class="btn-sm btn-edit"
                        onclick="loadHistoryFile('${item.date}')">
                    Edit
                </button>

                <button class="btn-sm btn-del"
                        onclick="deleteHistoryFile('${item.date}')">
                    Del
                </button>

            </div>

        `;


        historyContainer.appendChild(div);

    });

}


// ============================================================
// LOAD CURRENT DRAFT
// ============================================================

function loadLedger() {

    renderHistoryUI();


    const saved =
        localStorage.getItem(
            "miki_ledger_data"
        );


    if (!saved) {

        setEncodingEditable(false);

        showOpenModal();

        return;
    }


    const ledgerData =
        JSON.parse(saved);


    if (
        !ledgerData.date ||
        !ledgerData.name
    ) {

        setEncodingEditable(false);

        showOpenModal();

        return;
    }


    currentSessionDate =
        ledgerData.date;

    currentSessionName =
        ledgerData.name;


    document.getElementById(
        "displayFileDate"
    ).textContent =
        "Date: " +
        currentSessionDate;


    document.getElementById(
        "displayFileName"
    ).textContent =
        currentSessionName;

    document.getElementById("newTableNote").value =
    ledgerData.note || "";


    // SECOND TABLE
    for (let i = 1; i <= 16; i++) {

        if (
            ledgerData.rows &&
            ledgerData.rows[`name_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerName_${i}`
            ).value =
                ledgerData.rows[`name_${i}`];
        }


        if (
            ledgerData.rows &&
            ledgerData.rows[`dry_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerDry_${i}`
            ).value =
                ledgerData.rows[`dry_${i}`];
        }


        if (
            ledgerData.rows &&
            ledgerData.rows[`fresh_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerFresh_${i}`
            ).value =
                ledgerData.rows[`fresh_${i}`];
        }


        if (
            ledgerData.rows &&
            ledgerData.rows[`cab_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerCab_${i}`
            ).value =
                ledgerData.rows[`cab_${i}`];
        }


        if (
            ledgerData.rows &&
            ledgerData.rows[`bo_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerBo_${i}`
            ).value =
                ledgerData.rows[`bo_${i}`];
        }


        if (
            ledgerData.rows &&
            ledgerData.rows[`bal_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerBal_${i}`
            ).value =
                ledgerData.rows[`bal_${i}`];
        }


        if (
            ledgerData.rows &&
            ledgerData.rows[`billing_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerBilling_${i}`
            ).value =
                ledgerData.rows[`billing_${i}`];
        }


        if (
            ledgerData.rows &&
            ledgerData.rows[`pay_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerPay_${i}`
            ).value =
                ledgerData.rows[`pay_${i}`];
        }


        if (
            ledgerData.rows &&
            ledgerData.rows[`rem_${i}`] !== undefined
        ) {
            document.getElementById(
                `ledgerRem_${i}`
            ).value =
                ledgerData.rows[`rem_${i}`];
        }

    }


    // THIRD TABLE
    if (ledgerData.extraTable) {

        for (let i = 1; i <= 8; i++) {

            if (
                ledgerData.extraTable[`item_${i}`] !== undefined
            ) {

                document.getElementById(
                    `extraItem_${i}`
                ).value =
                    ledgerData.extraTable[`item_${i}`];

            }


            if (
                ledgerData.extraTable[`amount_${i}`] !== undefined
            ) {

                document.getElementById(
                    `extraAmount_${i}`
                ).value =
                    ledgerData.extraTable[`amount_${i}`];

            }

        }


        if (
            ledgerData.extraTable.coh !== undefined
        ) {

            document.getElementById(
                "inputCOH"
            ).value =
                ledgerData.extraTable.coh;

        }

    }


    document.getElementById(
        "setupModal"
    ).style.display =
        "none";


    setEncodingEditable(true);


    loadRowToMain(1);

    calculateLedgerTotals();

    calculateExtraTable();

    renderHistoryUI();

    resetInactivityTimer();

}


// ============================================================
// START APP
// ============================================================

window.onload = loadLedger;
