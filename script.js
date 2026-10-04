// ============================================================
// PWA INSTALL PROMPT HANDLER
// ============================================================

let deferredPrompt;

window.addEventListener('beforeinstallprompt', (e) => {

    e.preventDefault();

    deferredPrompt = e;

    const installBtn =
        document.getElementById('installBtn');

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

        const btn =
            document.getElementById('installBtn');

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

            console.log(
                'Service Worker Registered!',
                reg
            );

        })

        .catch(err => {

            console.log(
                'Service Worker Registration Failed:',
                err
            );

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

const INACTIVITY_LIMIT_MS =
    15 * 60 * 1000;


// ============================================================
// PREVIEW STATE
// ============================================================

let isPreviewMode = false;
let previewDateKey = null;
let previewBackup = null;


// ============================================================
// SESSION DATE DISPLAY
// ============================================================

function updateSessionDateDisplay() {

    const dateEl =
        document.getElementById(
            "displayFileDate"
        );

    const nameEl =
        document.getElementById(
            "displayFileName"
        );

    const watermarkEl =
        document.getElementById(
            "dateWatermark"
        );

    const dayEl =
        document.getElementById(
            "displayFileDay"
        );


    if (!dateEl || !nameEl) {
        return;
    }


    if (!currentSessionDate) {

        dateEl.textContent =
            "Date: --";

        nameEl.textContent =
            currentSessionName || "--";

        if (watermarkEl) {
            watermarkEl.textContent =
                "--";
        }

        if (dayEl) {
            dayEl.textContent =
                "---";
        }

        return;
    }


    const date =
        new Date(
            currentSessionDate + "T00:00:00"
        );


    if (isNaN(date.getTime())) {

        dateEl.textContent =
            "Date: " +
            currentSessionDate;

        nameEl.textContent =
            currentSessionName || "--";

        if (watermarkEl) {
            watermarkEl.textContent =
                "--";
        }

        if (dayEl) {
            dayEl.textContent =
                "---";
        }

        return;
    }


    const dayNumber =
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    const weekdayNames = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat"
    ];


    dateEl.textContent =
        "Date: " +
        currentSessionDate;


    nameEl.textContent =
        currentSessionName || "--";


    if (watermarkEl) {

        watermarkEl.textContent =
            dayNumber;

    }


    if (dayEl) {

        dayEl.textContent =
            weekdayNames[
                date.getDay()
            ];

    }

}


// ============================================================
// INACTIVITY
// ============================================================

function resetInactivityTimer() {

    clearTimeout(inactivityTimer);

    inactivityTimer =
        setTimeout(() => {

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

    const inputs =
        document.querySelectorAll(
            '.main-wrapper input:not(.price-input):not(#modalDateInput):not(#modalNameInput)'
        );


    inputs.forEach(input => {

        if (
            !input.classList.contains(
                'readonly-col'
            )
        ) {

            input.disabled =
                !editable;

        }

    });

}


// ============================================================
// PREVIEW MODE INPUT CONTROL
// ============================================================

function setPreviewMode(preview) {

    isPreviewMode =
        preview;

    document.body.classList.toggle(
        "preview-mode",
        preview
    );


    if (preview) {

        isEditingActive = false;

        const inputs =
            document.querySelectorAll(
                '.main-wrapper input:not(#modalDateInput):not(#modalNameInput)'
            );


        inputs.forEach(input => {

            input.disabled = true;

        });


    } else {

        document.body.classList.remove(
            "preview-mode"
        );

    }

}


// ============================================================
// MODALS
// ============================================================

function showOpenModal() {

    modalMode = "OPEN";

    document.getElementById(
        "modalTitle"
    ).textContent =
        "Start New Ledger File";


    document.getElementById(
        "modalSubtext"
    ).textContent =
        "Please fill out both the Date and Name to unlock encoding.";


    document.getElementById(
        "modalActionBtn"
    ).textContent =
        "Open Ledger";


    document.getElementById(
        "modalDateInput"
    ).value = "";


    document.getElementById(
        "modalNameInput"
    ).value = "";


    document.getElementById(
        "setupModal"
    ).style.display =
        "flex";

}


function openSaveConfirmationModal() {

    if (
        !currentSessionDate ||
        !currentSessionName
    ) {

        alert(
            "No active session to save. Please start a session first."
        );

        return;

    }


    if (isPreviewMode) {

        alert(
            "Preview mode is read-only. Tap the saved file again to return to the working ledger, or tap Edit."
        );

        return;

    }


    modalMode = "SAVE";


    document.getElementById(
        "modalTitle"
    ).textContent =
        "Confirm & Save Ledger File";


    document.getElementById(
        "modalSubtext"
    ).textContent =
        "Review or edit the Date and Name before saving to history.";


    document.getElementById(
        "modalActionBtn"
    ).textContent =
        "Save File";


    document.getElementById(
        "modalDateInput"
    ).value =
        currentSessionDate;


    document.getElementById(
        "modalNameInput"
    ).value =
        currentSessionName;


    document.getElementById(
        "setupModal"
    ).style.display =
        "flex";

}


function handleModalSubmit() {

    const dateVal =
        document.getElementById(
            "modalDateInput"
        ).value;


    const nameVal =
        document.getElementById(
            "modalNameInput"
        ).value.trim();


    if (!dateVal || !nameVal) {

        alert(
            "Both Date and Name are required!"
        );

        return;

    }


    if (modalMode === "SAVE") {

        const history =
            JSON.parse(
                localStorage.getItem(
                    "miki_30day_history"
                ) || "[]"
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

            const confirmOverwrite =
                confirm(
                    `Warning: A saved file with the date ${dateVal} already exists. Do you want to overwrite/update this file?`
                );


            if (!confirmOverwrite) {
                return;
            }

        }

    }


    currentSessionDate =
        dateVal;


    currentSessionName =
        nameVal;


    updateSessionDateDisplay();


    document.getElementById(
        "setupModal"
    ).style.display =
        "none";


    if (modalMode === "SAVE") {

        forceSaveCurrentDay();

        clearAllLedgerInputs();

        currentSessionDate = "";
        currentSessionName = "";

        updateSessionDateDisplay();


        localStorage.removeItem(
            "miki_ledger_data"
        );


        setEncodingEditable(false);

    } else {

        setPreviewMode(false);

        setEncodingEditable(true);

        resetInactivityTimer();

    }

}


// ============================================================
// CLOSE MODAL
// ============================================================

function closeSetupModal() {

    document.getElementById(
        "setupModal"
    ).style.display =
        "none";

}


// ============================================================
// NEW FILE
// ============================================================

function promptNewFile() {

    resetLedgerState();

}


// ============================================================
// AUTO SAVE
// ============================================================

function autoSaveAndReset() {

    if (
        currentSessionDate &&
        currentSessionName &&
        !isPreviewMode
    ) {

        forceSaveCurrentDay();

        alert(
            "System auto-saved due to 15 minutes of inactivity. Ledger refreshed for new day."
        );

        resetLedgerState();

    }

}


// ============================================================
// RESET LEDGER
// ============================================================

function resetLedgerState() {

    setPreviewMode(false);

    previewBackup = null;
    previewDateKey = null;

    currentSessionDate = "";
    currentSessionName = "";


    updateSessionDateDisplay();


    clearAllLedgerInputs();


    localStorage.removeItem(
        "miki_ledger_data"
    );


    setEncodingEditable(false);


    renderHistoryUI();


    showOpenModal();

}


// ============================================================
// CLEAR EVERYTHING
// ============================================================

function clearAllLedgerInputs() {

    clearMainInputs();


    // ========================================================
    // SECOND TABLE
    // ========================================================

    for (let i = 1; i <= 16; i++) {

        document.getElementById(
            `ledgerName_${i}`
        ).value = "";

        document.getElementById(
            `ledgerDry_${i}`
        ).value = "";

        document.getElementById(
            `ledgerFresh_${i}`
        ).value = "";

        document.getElementById(
            `ledgerCab_${i}`
        ).value = "";

        document.getElementById(
            `ledgerBo_${i}`
        ).value = "";

        document.getElementById(
            `ledgerBal_${i}`
        ).value = "";

        document.getElementById(
            `ledgerBilling_${i}`
        ).value = "";

        document.getElementById(
            `ledgerPay_${i}`
        ).value = "";

        document.getElementById(
            `ledgerRem_${i}`
        ).value = "";

    }


    // ========================================================
    // THIRD TABLE
    // ========================================================

    for (let i = 1; i <= 8; i++) {

        document.getElementById(
            `extraItem_${i}`
        ).value = "";

        document.getElementById(
            `extraAmount_${i}`
        ).value = "";

    }


    document.getElementById(
        "inputCOH"
    ).value = "0";


    const note =
        document.getElementById(
            "newTableNote"
        );


    if (note) {
        note.value = "";
    }


    activeRow = 1;


    document.getElementById(
        "activeCustomerDisplay"
    ).textContent =
        "Row 1";


    calculateLedgerTotals();

    calculateExtraTable();

}


// ============================================================
// LOCK NAME COLUMN
// ============================================================

function handleKeyClick() {

    if (isPreviewMode) {
        return;
    }


    tapCount++;

    clearTimeout(tapTimer);


    tapTimer =
        setTimeout(() => {

            tapCount = 0;

        }, 1000);


    if (tapCount >= 5) {

        tapCount = 0;

        isLocked =
            !isLocked;


        toggleLockState(
            isLocked
        );

    }

}


function toggleLockState(locked) {

    const header =
        document.getElementById(
            "lockHeader"
        );


    header.textContent =
        locked ?
        "🔒" :
        "🔑";


    const nameInputs =
        document.querySelectorAll(
            ".name-input"
        );


    nameInputs.forEach(field => {

        field.readOnly =
            locked;

        field.style.backgroundColor =
            locked ?
            "#e5e7eb" :
            "white";

    });

}


// ============================================================
// LOCK PRICES
// ============================================================

function handlePriceKeyClick() {

    if (isPreviewMode) {
        return;
    }


    priceTapCount++;

    clearTimeout(priceTapTimer);


    priceTapTimer =
        setTimeout(() => {

            priceTapCount = 0;

        }, 1000);


    if (priceTapCount >= 5) {

        priceTapCount = 0;

        isPriceLocked =
            !isPriceLocked;


        togglePriceLockState(
            isPriceLocked
        );

    }

}


function togglePriceLockState(locked) {

    const header =
        document.getElementById(
            "priceLockHeader"
        );


    header.textContent =
        locked ?
        "Price 🔒" :
        "Price 🔑";


    const priceInputs =
        document.querySelectorAll(
            ".price-input"
        );


    priceInputs.forEach(field => {

        field.readOnly =
            locked;

        field.style.backgroundColor =
            locked ?
            "#e5e7eb" :
            "white";

    });

}


// ============================================================
// HELPERS
// ============================================================

function getVal(id) {

    const element =
        document.getElementById(id);


    if (!element) {
        return 0;
    }


    const val =
        parseFloat(
            element.value
        );


    return isNaN(val) ?
        0 :
        val;

}


function formatMoney(value) {

    return Math.round(
        value
    ).toLocaleString(
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

    if (isPreviewMode) {
        return;
    }


    const val =
        document.getElementById(
            "sync" + type
        ).value;


    const targetId =
        type === "Dry" ?
        "qtyReg" :
        "qty" + type;


    document.getElementById(
        targetId
    ).value =
        val;


    calculateMain();

}


function syncFromTable(type) {

    if (isPreviewMode) {
        return;
    }


    const targetId =
        type === "Reg" ?
        "syncDry" :
        "sync" + type;


    const val =
        document.getElementById(
            "qty" + type
        ).value;


    const syncInput =
        document.getElementById(
            targetId
        );


    if (syncInput) {

        syncInput.value =
            val;

    }


    calculateMain();

}


// ============================================================
// CLEAR MAIN
// ============================================================

function clearMainInputs() {

    document.getElementById(
        "qtyReg"
    ).value = "";

    document.getElementById(
        "syncDry"
    ).value = "";


    document.getElementById(
        "qtyFresh"
    ).value = "";

    document.getElementById(
        "syncFresh"
    ).value = "";


    document.getElementById(
        "qtyCab"
    ).value = "";

    document.getElementById(
        "syncCab"
    ).value = "";


    document.getElementById(
        "qtyBo"
    ).value = "";

    document.getElementById(
        "syncBo"
    ).value = "";


    document.getElementById(
        "inputBal"
    ).value = "";

    document.getElementById(
        "inputPay"
    ).value = "";


    calculateMain();

}


// ============================================================
// MAIN CALCULATION
// ============================================================

function calculateMain() {

    const regQty =
        getVal("qtyReg");

    const regPrice =
        getVal("priceReg");

    const regAmount =
        Math.round(
            regQty * regPrice
        );


    const freshQty =
        getVal("qtyFresh");

    const freshPrice =
        getVal("priceFresh");

    const freshAmount =
        Math.round(
            freshQty * freshPrice
        );


    const cabQty =
        getVal("qtyCab");

    const cabPrice =
        getVal("priceCab");

    const cabAmount =
        Math.round(
            cabQty * cabPrice
        );


    const boQty =
        getVal("qtyBo");

    const boPrice =
        getVal("priceBo");

    const boAmount =
        Math.round(
            (boQty / 2) * boPrice
        );


    const balAmount =
        Math.round(
            getVal("inputBal")
        );


    const payAmount =
        Math.round(
            getVal("inputPay")
        );


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


    document.getElementById(
        "amountReg"
    ).textContent =
        formatMoney(regAmount);


    document.getElementById(
        "amountFresh"
    ).textContent =
        formatMoney(freshAmount);


    document.getElementById(
        "amountCab"
    ).textContent =
        formatMoney(cabAmount);


    document.getElementById(
        "amountBo"
    ).textContent =
        formatMoney(boAmount);


    document.getElementById(
        "totalAmount"
    ).textContent =
        formatMoney(total);


    document.getElementById(
        "netTotalAmount"
    ).textContent =
        formatMoney(netTotal);


    // ========================================================
    // SYNC TO SECOND TABLE
    // ========================================================

    document.getElementById(
        `ledgerDry_${activeRow}`
    ).value =
        document.getElementById(
            "qtyReg"
        ).value;


    document.getElementById(
        `ledgerFresh_${activeRow}`
    ).value =
        document.getElementById(
            "qtyFresh"
        ).value;


    document.getElementById(
        `ledgerCab_${activeRow}`
    ).value =
        document.getElementById(
            "qtyCab"
        ).value;


    document.getElementById(
        `ledgerBo_${activeRow}`
    ).value =
        document.getElementById(
            "qtyBo"
        ).value;


    document.getElementById(
        `ledgerBal_${activeRow}`
    ).value =
        document.getElementById(
            "inputBal"
        ).value;


    document.getElementById(
        `ledgerBilling_${activeRow}`
    ).value =
        formatMoney(
            billingAmount
        );


    const hasPayEntry =
        document.getElementById(
            "inputPay"
        ).value.trim() !== "";


    const collnVal =
        hasPayEntry ?
        payAmount :
        billingAmount;


    document.getElementById(
        `ledgerPay_${activeRow}`
    ).value =
        formatMoney(
            collnVal
        );


    const remVal =
        billingAmount -
        collnVal;


    document.getElementById(
        `ledgerRem_${activeRow}`
    ).value =
        formatMoney(
            remVal
        );


    calculateLedgerTotals();

    saveLedger();

}


// ============================================================
// LOAD ROW
// ============================================================

function loadRowToMain(row) {

    if (!isEditingActive || isPreviewMode) {
        return;
    }


    activeRow = row;


    updateActiveCustomerName(row);


    document.getElementById(
        "qtyReg"
    ).value =
        document.getElementById(
            `ledgerDry_${row}`
        ).value;


    document.getElementById(
        "syncDry"
    ).value =
        document.getElementById(
            `ledgerDry_${row}`
        ).value;


    document.getElementById(
        "qtyFresh"
    ).value =
        document.getElementById(
            `ledgerFresh_${row}`
        ).value;


    document.getElementById(
        "syncFresh"
    ).value =
        document.getElementById(
            `ledgerFresh_${row}`
        ).value;


    document.getElementById(
        "qtyCab"
    ).value =
        document.getElementById(
            `ledgerCab_${row}`
        ).value;


    document.getElementById(
        "syncCab"
    ).value =
        document.getElementById(
            `ledgerCab_${row}`
        ).value;


    document.getElementById(
        "qtyBo"
    ).value =
        document.getElementById(
            `ledgerBo_${row}`
        ).value;


    document.getElementById(
        "syncBo"
    ).value =
        document.getElementById(
            `ledgerBo_${row}`
        ).value;


    document.getElementById(
        "inputBal"
    ).value =
        document.getElementById(
            `ledgerBal_${row}`
        ).value;


    const rawColln =
        document.getElementById(
            `ledgerPay_${row}`
        ).value.replace(
            /,/g,
            ''
        );


    const rawBilling =
        document.getElementById(
            `ledgerBilling_${row}`
        ).value.replace(
            /,/g,
            ''
        );


    document.getElementById(
        "inputPay"
    ).value =
        (
            rawColln !== rawBilling
        ) ?
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
            ).value.replace(
                /,/g,
                ''
            );


        sumBilling +=
            parseFloat(
                billStr
            ) || 0;


        const collnStr =
            document.getElementById(
                `ledgerPay_${i}`
            ).value.replace(
                /,/g,
                ''
            );


        sumColln +=
            parseFloat(
                collnStr
            ) || 0;


        const remStr =
            document.getElementById(
                `ledgerRem_${i}`
            ).value.replace(
                /,/g,
                ''
            );


        sumRem +=
            parseFloat(
                remStr
            ) || 0;

    }


    document.getElementById(
        "totalDry"
    ).textContent =
        formatMoney(sumDry);


    document.getElementById(
        "totalFresh"
    ).textContent =
        formatMoney(sumFresh);


    document.getElementById(
        "totalCab"
    ).textContent =
        formatMoney(sumCab);


    document.getElementById(
        "totalBo"
    ).textContent =
        sumBo % 1 === 0 ?
        sumBo :
        sumBo.toFixed(1);


    document.getElementById(
        "totalBal"
    ).textContent =
        formatMoney(sumBal);


    document.getElementById(
        "totalBilling"
    ).textContent =
        formatMoney(sumBilling);


    document.getElementById(
        "totalColln"
    ).textContent =
        formatMoney(sumColln);


    document.getElementById(
        "totalRem"
    ).textContent =
        formatMoney(sumRem);


    calculateExtraTable();

}


// ============================================================
// THIRD TABLE CALCULATION
// ============================================================

function calculateExtraTable() {

    let leftTotal = 0;
    let allAmounts = 0;


    const c2Ids = [
        "extraAmount_1",
        "extraAmount_3",
        "extraAmount_5",
        "extraAmount_7"
    ];


    c2Ids.forEach(id => {

        const element =
            document.getElementById(id);


        if (element) {

            leftTotal +=
                parseFloat(
                    element.value
                ) || 0;

        }

    });


    for (let i = 1; i <= 8; i++) {

        const element =
            document.getElementById(
                `extraAmount_${i}`
            );


        if (element) {

            allAmounts +=
                parseFloat(
                    element.value
                ) || 0;

        }

    }


    const totalCollnElement =
        document.getElementById(
            "totalColln"
        );


    const secondTableColln =
        totalCollnElement ?
        parseFloat(
            totalCollnElement.textContent
                .replace(/,/g, '')
        ) || 0 :
        0;


    const collectionPlusExtra =
        secondTableColln -
        allAmounts;


    const cohElement =
        document.getElementById(
            "inputCOH"
        );


    const coh =
        cohElement ?
        parseFloat(
            cohElement.value
        ) || 0 :
        0;


    const grandTotal =
        collectionPlusExtra -
        coh;


    const c2Total =
        document.getElementById(
            "extraColumn2Total"
        );


    if (c2Total) {

        c2Total.textContent =
            formatMoney(
                leftTotal
            );

    }


    const c4Total =
        document.getElementById(
            "extraColumn4Total"
        );


    if (c4Total) {

        c4Total.textContent =
            formatMoney(
                allAmounts
            );

    }


    const collectionDisplay =
        document.getElementById(
            "collectionPlusExtra"
        );


    if (collectionDisplay) {

        collectionDisplay.textContent =
            formatMoney(
                collectionPlusExtra
            );

    }


    const grandDisplay =
        document.getElementById(
            "grandTotalAmount"
        );


    if (grandDisplay) {

        grandDisplay.textContent =
            formatMoney(
                grandTotal
            );

    }

}


// ============================================================
// SAVE CURRENT DAY DRAFT
// ============================================================

function saveLedger() {

    if (
        !currentSessionDate ||
        !currentSessionName ||
        !isEditingActive ||
        isPreviewMode
    ) {
        return;
    }


    const noteElement =
        document.getElementById(
            "newTableNote"
        );


    const ledgerData = {

        date:
            currentSessionDate,

        name:
            currentSessionName,

        rows: {},

        extraTable: {

            note:
                noteElement ?
                noteElement.value :
                ""

        }

    };


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
        JSON.stringify(
            ledgerData
        )
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
                item.date ===
                activeDraft.date
        );


    if (existingIndex !== -1) {

        history[existingIndex] =
            activeDraft;

    } else {

        history.unshift(
            activeDraft
        );

    }


    if (history.length > 30) {

        history =
            history.slice(
                0,
                30
            );

    }


    localStorage.setItem(
        "miki_30day_history",
        JSON.stringify(
            history
        )
    );


    renderHistoryUI();

}


// ============================================================
// CREATE DATA SNAPSHOT FROM CURRENT SCREEN
// ============================================================

function getCurrentLedgerSnapshot() {

    const snapshot = {

        date:
            currentSessionDate,

        name:
            currentSessionName,

        rows: {},

        extraTable: {

            note:
                document.getElementById(
                    "newTableNote"
                )?.value || ""

        }

    };


    for (let i = 1; i <= 16; i++) {

        snapshot.rows[`name_${i}`] =
            document.getElementById(
                `ledgerName_${i}`
            ).value;

        snapshot.rows[`dry_${i}`] =
            document.getElementById(
                `ledgerDry_${i}`
            ).value;

        snapshot.rows[`fresh_${i}`] =
            document.getElementById(
                `ledgerFresh_${i}`
            ).value;

        snapshot.rows[`cab_${i}`] =
            document.getElementById(
                `ledgerCab_${i}`
            ).value;

        snapshot.rows[`bo_${i}`] =
            document.getElementById(
                `ledgerBo_${i}`
            ).value;

        snapshot.rows[`bal_${i}`] =
            document.getElementById(
                `ledgerBal_${i}`
            ).value;

        snapshot.rows[`billing_${i}`] =
            document.getElementById(
                `ledgerBilling_${i}`
            ).value;

        snapshot.rows[`pay_${i}`] =
            document.getElementById(
                `ledgerPay_${i}`
            ).value;

        snapshot.rows[`rem_${i}`] =
            document.getElementById(
                `ledgerRem_${i}`
            ).value;

    }


    for (let i = 1; i <= 8; i++) {

        snapshot.extraTable[`item_${i}`] =
            document.getElementById(
                `extraItem_${i}`
            ).value;

        snapshot.extraTable[`amount_${i}`] =
            document.getElementById(
                `extraAmount_${i}`
            ).value;

    }


    snapshot.extraTable.coh =
        document.getElementById(
            "inputCOH"
        ).value;


    return snapshot;

}


// ============================================================
// RESTORE DATA TO SCREEN
// ============================================================

function restoreLedgerData(data) {

    if (!data) {
        return;
    }


    clearAllLedgerInputs();


    currentSessionDate =
        data.date || "";


    currentSessionName =
        data.name || "";


    updateSessionDateDisplay();


    for (let i = 1; i <= 16; i++) {

        if (
            data.rows &&
            data.rows[`name_${i}`] !== undefined
        ) {

            document.getElementById(
                `ledgerName_${i}`
            ).value =
                data.rows[`name_${i}`];

        }


        if (
            data.rows &&
            data.rows[`dry_${i}`] !== undefined
        ) {

            document.getElementById(
                `ledgerDry_${i}`
            ).value =
                data.rows[`dry_${i}`];

        }


        if (
            data.rows &&
            data.rows[`fresh_${i}`] !== undefined
        ) {

            document.getElementById(
                `ledgerFresh_${i}`
            ).value =
                data.rows[`fresh_${i}`];

        }


        if (
            data.rows &&
            data.rows[`cab_${i}`] !== undefined
        ) {

            document.getElementById(
                `ledgerCab_${i}`
            ).value =
                data.rows[`cab_${i}`];

        }


        if (
            data.rows &&
            data.rows[`bo_${i}`] !== undefined
        ) {

            document.getElementById(
                `ledgerBo_${i}`
            ).value =
                data.rows[`bo_${i}`];

        }


        if (
            data.rows &&
            data.rows[`bal_${i}`] !== undefined
        ) {

            document.getElementById(
                `ledgerBal_${i}`
            ).value =
                data.rows[`bal_${i}`];

        }


        if (
            data.rows &&
            data.rows[`billing_${i}`] !== undefined
        ) {

            document.getElementById(
                `ledgerBilling_${i}`
            ).value =
                data.rows[`billing_${i}`];

        }


        if (
            data.rows &&
            data.rows[`pay_${i}`] !== undefined
        ) {

            document.getElementById(
                `ledgerPay_${i}`
            ).value =
                data.rows[`pay_${i}`];

        }


        if (
            data.rows &&
            data.rows[`rem_${i}`] !== undefined
        ) {

            document.getElementById(
                `ledgerRem_${i}`
            ).value =
                data.rows[`rem_${i}`];

        }

    }


    if (data.extraTable) {

        for (let i = 1; i <= 8; i++) {

            if (
                data.extraTable[
                    `item_${i}`
                ] !== undefined
            ) {

                document.getElementById(
                    `extraItem_${i}`
                ).value =
                    data.extraTable[
                        `item_${i}`
                    ];

            }


            if (
                data.extraTable[
                    `amount_${i}`
                ] !== undefined
            ) {

                document.getElementById(
                    `extraAmount_${i}`
                ).value =
                    data.extraTable[
                        `amount_${i}`
                    ];

            }

        }


        if (
            data.extraTable.coh !== undefined
        ) {

            document.getElementById(
                "inputCOH"
            ).value =
                data.extraTable.coh;

        }


        const noteElement =
            document.getElementById(
                "newTableNote"
            );


        if (noteElement) {

            noteElement.value =
                data.extraTable.note || "";

        }

    }


    calculateLedgerTotals();

    calculateExtraTable();

}


// ============================================================
// LOAD HISTORY FILE - EDIT MODE
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
                item.date ===
                dateKey
        );


    if (!selectedFile) {
        return;
    }


    previewBackup = null;
    previewDateKey = null;

    setPreviewMode(false);


    restoreLedgerData(
        selectedFile
    );


    document.getElementById(
        "setupModal"
    ).style.display =
        "none";


    setEncodingEditable(true);


    loadRowToMain(1);


    calculateLedgerTotals();

    calculateExtraTable();


    saveLedger();


    renderHistoryUI(
        dateKey
    );


    resetInactivityTimer();

}


// ============================================================
// HISTORY PREVIEW
// ============================================================

function previewHistoryFile(dateKey) {

    const history =
        JSON.parse(
            localStorage.getItem(
                "miki_30day_history"
            ) || "[]"
        );


    const selectedFile =
        history.find(
            item =>
                item.date ===
                dateKey
        );


    if (!selectedFile) {
        return;
    }


    // Tap the same selected row again:
    // return to the previous working ledger.
    if (
        isPreviewMode &&
        previewDateKey === dateKey
    ) {

        exitHistoryPreview();

        return;

    }


    // First preview:
    // keep a temporary copy of the current working ledger.
    if (!isPreviewMode) {

        if (
            currentSessionDate &&
            currentSessionName
        ) {

            previewBackup =
                getCurrentLedgerSnapshot();

        } else {

            previewBackup = null;

        }

    }


    previewDateKey =
        dateKey;


    restoreLedgerData(
        selectedFile
    );


    document.getElementById(
        "setupModal"
    ).style.display =
        "none";


    setPreviewMode(true);


    updateSessionDateDisplay();


    calculateLedgerTotals();

    calculateExtraTable();


    renderHistoryUI(
        dateKey
    );


    resetInactivityTimer();

}


// ============================================================
// EXIT HISTORY PREVIEW
// ============================================================

function exitHistoryPreview() {

    if (!isPreviewMode) {
        return;
    }


    const backup =
        previewBackup;


    previewBackup = null;
    previewDateKey = null;


    setPreviewMode(false);


    if (backup) {

        restoreLedgerData(
            backup
        );


        setEncodingEditable(true);


        loadRowToMain(
            activeRow || 1
        );


        calculateLedgerTotals();

        calculateExtraTable();


        updateSessionDateDisplay();


        renderHistoryUI();

        resetInactivityTimer();

        return;

    }


    // If there was no working session before preview,
    // return to the normal new-session state.
    currentSessionDate = "";
    currentSessionName = "";


    updateSessionDateDisplay();


    clearAllLedgerInputs();


    setEncodingEditable(false);


    renderHistoryUI();

}


// ============================================================
// DELETE HISTORY
// ============================================================

function deleteHistoryFile(dateKey) {

    if (
        confirm(
            `Delete file for ${dateKey}?`
        )
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
                    item.date !==
                    dateKey
            );


        localStorage.setItem(
            "miki_30day_history",
            JSON.stringify(
                history
            )
        );


        if (
            isPreviewMode &&
            previewDateKey === dateKey
        ) {

            exitHistoryPreview();

        } else {

            renderHistoryUI();

        }

    }

}


// ============================================================
// HISTORY UI
// ============================================================

function renderHistoryUI(
    selectedDateKey = null
) {

    const historyContainer =
        document.getElementById(
            "historyContainer"
        );


    const historyCount =
        document.getElementById(
            "historyCount"
        );


    if (!historyContainer || !historyCount) {
        return;
    }


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
        (
            isPreviewMode ?
            previewDateKey :
            currentSessionDate
        );


    historyContainer.innerHTML =
        "";


    history.forEach(item => {

        const div =
            document.createElement(
                "div"
            );


        const isSelected =
            item.date ===
            highlightKey;


        const isPreviewFile =
            isPreviewMode &&
            item.date ===
            previewDateKey;


        div.className =
            `history-item ${
                isSelected ?
                'selected-file' :
                ''
            } ${
                isPreviewFile ?
                'preview-file' :
                ''
            }`;


        // Clicking the row itself opens read-only preview.
        div.addEventListener(
            "click",
            function(event) {

                if (
                    event.target.closest(
                        "button"
                    )
                ) {
                    return;
                }


                previewHistoryFile(
                    item.date
                );

            }
        );


        const infoDiv =
            document.createElement(
                "div"
            );


        const strong =
            document.createElement(
                "strong"
            );


        strong.textContent =
            item.date;


        infoDiv.appendChild(
            strong
        );


        infoDiv.appendChild(
            document.createTextNode(
                " - " +
                item.name
            )
        );


        const buttonDiv =
            document.createElement(
                "div"
            );


        const editButton =
            document.createElement(
                "button"
            );


        editButton.className =
            "btn-sm btn-edit";


        editButton.textContent =
            "Edit";


        editButton.addEventListener(
            "click",
            function(event) {

                event.stopPropagation();

                loadHistoryFile(
                    item.date
                );

            }
        );


        const deleteButton =
            document.createElement(
                "button"
            );


        deleteButton.className =
            "btn-sm btn-del";


        deleteButton.textContent =
            "Del";


        deleteButton.addEventListener(
            "click",
            function(event) {

                event.stopPropagation();

                deleteHistoryFile(
                    item.date
                );

            }
        );


        buttonDiv.appendChild(
            editButton
        );


        buttonDiv.appendChild(
            deleteButton
        );


        div.appendChild(
            infoDiv
        );


        div.appendChild(
            buttonDiv
        );


        historyContainer.appendChild(
            div
        );

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

        setPreviewMode(false);

        setEncodingEditable(false);

        updateSessionDateDisplay();

        showOpenModal();

        return;

    }


    let ledgerData;


    try {

        ledgerData =
            JSON.parse(saved);

    } catch (error) {

        console.error(
            "Invalid saved ledger data:",
            error
        );


        localStorage.removeItem(
            "miki_ledger_data"
        );


        setPreviewMode(false);

        setEncodingEditable(false);

        updateSessionDateDisplay();

        showOpenModal();

        return;

    }


    if (
        !ledgerData.date ||
        !ledgerData.name
    ) {

        setPreviewMode(false);

        setEncodingEditable(false);

        updateSessionDateDisplay();

        showOpenModal();

        return;

    }


    currentSessionDate =
        ledgerData.date;


    currentSessionName =
        ledgerData.name;


    updateSessionDateDisplay();


    restoreLedgerData(
        ledgerData
    );


    document.getElementById(
        "setupModal"
    ).style.display =
        "none";


    setPreviewMode(false);

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

window.onload =
    loadLedger;
