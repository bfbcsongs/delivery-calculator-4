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

let previewingHistoryDate = null;

const INACTIVITY_LIMIT_MS =
    15 * 60 * 1000;


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

    if (
        !dateEl ||
        !nameEl ||
        !watermarkEl ||
        !dayEl
    ) {
        return;
    }


    if (!currentSessionDate) {

        dateEl.textContent =
            "Date: --";

        nameEl.textContent =
            currentSessionName || "--";

        watermarkEl.textContent =
            "--";

        dayEl.textContent =
            "---";

        return;
    }


    const date =
        new Date(
            currentSessionDate +
            "T00:00:00"
        );


    if (isNaN(date.getTime())) {

        dateEl.textContent =
            "Date: " +
            currentSessionDate;

        nameEl.textContent =
            currentSessionName || "--";

        watermarkEl.textContent =
            "--";

        dayEl.textContent =
            "---";

        return;
    }


    const dayNumber =
        String(
            date.getDate()
        ).padStart(2, "0");


    const weekdayNames = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat"
    ];


    const weekday =
        weekdayNames[
            date.getDay()
        ];


    dateEl.textContent =
        "Date: " +
        currentSessionDate;

    nameEl.textContent =
        currentSessionName || "--";

    watermarkEl.textContent =
        dayNumber;

    dayEl.textContent =
        weekday;
}


// ============================================================
// INACTIVITY
// ============================================================

function resetInactivityTimer() {

    clearTimeout(
        inactivityTimer
    );

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

    isEditingActive =
        editable;

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
// MODALS
// ============================================================

function showOpenModal() {

    modalMode =
        "OPEN";

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
    ).value =
        "";

    document.getElementById(
        "modalNameInput"
    ).value =
        "";

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


    modalMode =
        "SAVE";


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


    if (
        !dateVal ||
        !nameVal
    ) {

        alert(
            "Both Date and Name are required!"
        );

        return;
    }


    if (
        modalMode ===
        "SAVE"
    ) {

        const history =
            JSON.parse(
                localStorage.getItem(
                    "miki_30day_history"
                ) || "[]"
            );


        const isDuplicate =
            history.some(
                item =>
                    item.date ===
                    dateVal &&
                    item.date !==
                    currentSessionDate
            );


        if (
            isDuplicate ||
            (
                dateVal ===
                currentSessionDate &&
                history.some(
                    item =>
                        item.date ===
                        dateVal
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


    if (
        modalMode ===
        "SAVE"
    ) {

        forceSaveCurrentDay();

        clearAllLedgerInputs();

        currentSessionDate =
            "";

        currentSessionName =
            "";

        updateSessionDateDisplay();


        localStorage.removeItem(
            "miki_ledger_data"
        );


        setEncodingEditable(
            false
        );

    } else {

        setEncodingEditable(
            true
        );

        resetInactivityTimer();

    }

}


function closeSetupModal() {

    document.getElementById(
        "setupModal"
    ).style.display =
        "none";

}


function promptNewFile() {

    resetLedgerState();

}


function autoSaveAndReset() {

    if (
        currentSessionDate &&
        currentSessionName
    ) {

        forceSaveCurrentDay();

        alert(
            "System auto-saved due to 15 minutes of inactivity. Ledger refreshed for new day."
        );

        resetLedgerState();

    }

}


function resetLedgerState() {

    closeHistoryPreview();

    currentSessionDate =
        "";

    currentSessionName =
        "";


    updateSessionDateDisplay();


    clearAllLedgerInputs();


    localStorage.removeItem(
        "miki_ledger_data"
    );


    setEncodingEditable(
        false
    );


    renderHistoryUI();


    showOpenModal();

}


// ============================================================
// CLEAR EVERYTHING
// ============================================================

function clearAllLedgerInputs() {

    clearMainInputs();


    for (
        let i = 1;
        i <= 16;
        i++
    ) {

        document.getElementById(
            `ledgerName_${i}`
        ).value =
            "";

        document.getElementById(
            `ledgerDry_${i}`
        ).value =
            "";

        document.getElementById(
            `ledgerFresh_${i}`
        ).value =
            "";

        document.getElementById(
            `ledgerCab_${i}`
        ).value =
            "";

        document.getElementById(
            `ledgerBo_${i}`
        ).value =
            "";

        document.getElementById(
            `ledgerBal_${i}`
        ).value =
            "";

        document.getElementById(
            `ledgerBilling_${i}`
        ).value =
            "";

        document.getElementById(
            `ledgerPay_${i}`
        ).value =
            "";

        document.getElementById(
            `ledgerRem_${i}`
        ).value =
            "";

    }


    for (
        let i = 1;
        i <= 8;
        i++
    ) {

        document.getElementById(
            `extraItem_${i}`
        ).value =
            "";

        document.getElementById(
            `extraAmount_${i}`
        ).value =
            "";

    }


    document.getElementById(
        "inputCOH"
    ).value =
        "0";


    const note =
        document.getElementById(
            "newTableNote"
        );


    if (note) {
        note.value =
            "";
    }


    activeRow =
        1;


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

    tapCount++;

    clearTimeout(
        tapTimer
    );


    tapTimer =
        setTimeout(() => {

            tapCount =
                0;

        }, 1000);


    if (
        tapCount >= 5
    ) {

        tapCount =
            0;

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

    priceTapCount++;

    clearTimeout(
        priceTapTimer
    );


    priceTapTimer =
        setTimeout(() => {

            priceTapCount =
                0;

        }, 1000);


    if (
        priceTapCount >= 5
    ) {

        priceTapCount =
            0;

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
        document.getElementById(
            id
        );


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

    if (
        row ===
        activeRow
    ) {

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


    document.getElementById(
        targetId
    ).value =
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
    ).value =
        "";

    document.getElementById(
        "syncDry"
    ).value =
        "";


    document.getElementById(
        "qtyFresh"
    ).value =
        "";

    document.getElementById(
        "syncFresh"
    ).value =
        "";


    document.getElementById(
        "qtyCab"
    ).value =
        "";

    document.getElementById(
        "syncCab"
    ).value =
        "";


    document.getElementById(
        "qtyBo"
    ).value =
        "";

    document.getElementById(
        "syncBo"
    ).value =
        "";


    document.getElementById(
        "inputBal"
    ).value =
        "";

    document.getElementById(
        "inputPay"
    ).value =
        "";


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
            regQty *
            regPrice
        );


    const freshQty =
        getVal("qtyFresh");

    const freshPrice =
        getVal("priceFresh");

    const freshAmount =
        Math.round(
            freshQty *
            freshPrice
        );


    const cabQty =
        getVal("qtyCab");

    const cabPrice =
        getVal("priceCab");

    const cabAmount =
        Math.round(
            cabQty *
            cabPrice
        );


    const boQty =
        getVal("qtyBo");

    const boPrice =
        getVal("priceBo");

    const boAmount =
        Math.round(
            (boQty / 2) *
            boPrice
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
        formatMoney(
            regAmount
        );


    document.getElementById(
        "amountFresh"
    ).textContent =
        formatMoney(
            freshAmount
        );


    document.getElementById(
        "amountCab"
    ).textContent =
        formatMoney(
            cabAmount
        );


    document.getElementById(
        "amountBo"
    ).textContent =
        formatMoney(
            boAmount
        );


    document.getElementById(
        "totalAmount"
    ).textContent =
        formatMoney(
            total
        );


    document.getElementById(
        "netTotalAmount"
    ).textContent =
        formatMoney(
            netTotal
        );


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

    if (
        !isEditingActive
    ) {
        return;
    }


    activeRow =
        row;


    updateActiveCustomerName(
        row
    );


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
            rawColln !==
            rawBilling
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


    for (
        let i = 1;
        i <= 16;
        i++
    ) {

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
        formatMoney(
            sumDry
        );


    document.getElementById(
        "totalFresh"
    ).textContent =
        formatMoney(
            sumFresh
        );


    document.getElementById(
        "totalCab"
    ).textContent =
        formatMoney(
            sumCab
        );


    document.getElementById(
        "totalBo"
    ).textContent =
        sumBo % 1 === 0 ?
        sumBo :
        sumBo.toFixed(1);


    document.getElementById(
        "totalBal"
    ).textContent =
        formatMoney(
            sumBal
        );


    document.getElementById(
        "totalBilling"
    ).textContent =
        formatMoney(
            sumBilling
        );


    document.getElementById(
        "totalColln"
    ).textContent =
        formatMoney(
            sumColln
        );


    document.getElementById(
        "totalRem"
    ).textContent =
        formatMoney(
            sumRem
        );


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
            document.getElementById(
                id
            );


        if (element) {

            leftTotal +=
                parseFloat(
                    element.value
                ) || 0;

        }

    });


    for (
        let i = 1;
        i <= 8;
        i++
    ) {

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
                .replace(
                    /,/g,
                    ''
                )
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
        !isEditingActive
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


    for (
        let i = 1;
        i <= 16;
        i++
    ) {

        ledgerData.rows[
            `name_${i}`
        ] =
            document.getElementById(
                `ledgerName_${i}`
            ).value;


        ledgerData.rows[
            `dry_${i}`
        ] =
            document.getElementById(
                `ledgerDry_${i}`
            ).value;


        ledgerData.rows[
            `fresh_${i}`
        ] =
            document.getElementById(
                `ledgerFresh_${i}`
            ).value;


        ledgerData.rows[
            `cab_${i}`
        ] =
            document.getElementById(
                `ledgerCab_${i}`
            ).value;


        ledgerData.rows[
            `bo_${i}`
        ] =
            document.getElementById(
                `ledgerBo_${i}`
            ).value;


        ledgerData.rows[
            `bal_${i}`
        ] =
            document.getElementById(
                `ledgerBal_${i}`
            ).value;


        ledgerData.rows[
            `billing_${i}`
        ] =
            document.getElementById(
                `ledgerBilling_${i}`
            ).value;


        ledgerData.rows[
            `pay_${i}`
        ] =
            document.getElementById(
                `ledgerPay_${i}`
            ).value;


        ledgerData.rows[
            `rem_${i}`
        ] =
            document.getElementById(
                `ledgerRem_${i}`
            ).value;

    }


    for (
        let i = 1;
        i <= 8;
        i++
    ) {

        ledgerData.extraTable[
            `item_${i}`
        ] =
            document.getElementById(
                `extraItem_${i}`
            ).value;


        ledgerData.extraTable[
            `amount_${i}`
        ] =
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


    if (
        existingIndex !==
        -1
    ) {

        history[
            existingIndex
        ] =
            activeDraft;

    } else {

        history.unshift(
            activeDraft
        );

    }


    if (
        history.length >
        30
    ) {

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
// PREVIEW HELPERS
// ============================================================

function getHistoryFile(dateKey) {

    const history =
        JSON.parse(
            localStorage.getItem(
                "miki_30day_history"
            ) || "[]"
        );


    return history.find(
        item =>
            item.date ===
            dateKey
    ) || null;

}


function escapeHtml(value) {

    return String(
        value ?? ""
    )
    .replace(
        /&/g,
        "&amp;"
    )
    .replace(
        /</g,
        "&lt;"
    )
    .replace(
        />/g,
        "&gt;"
    )
    .replace(
        /"/g,
        "&quot;"
    )
    .replace(
        /'/g,
        "&#039;"
    );

}


function previewMoney(value) {

    const number =
        parseFloat(
            String(
                value ?? 0
            ).replace(
                /,/g,
                ""
            )
        ) || 0;

    return formatMoney(
        number
    );

}


function buildHistoryPreview(file) {

    const date =
        new Date(
            file.date +
            "T00:00:00"
        );


    const dayNumber =
        isNaN(
            date.getTime()
        ) ?
        "--" :
        String(
            date.getDate()
        ).padStart(
            2,
            "0"
        );


    const weekdays = [
        "Sun",
        "Mon",
        "Tue",
        "Wed",
        "Thu",
        "Fri",
        "Sat"
    ];


    const weekday =
        isNaN(
            date.getTime()
        ) ?
        "---" :
        weekdays[
            date.getDay()
        ];


    let rowsHtml = "";


    for (
        let i = 1;
        i <= 16;
        i++
    ) {

        const row =
            file.rows || {};


        rowsHtml += `

            <tr>

                <td class="preview-name">
                    ${escapeHtml(
                        row[`name_${i}`] || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row[`dry_${i}`] || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row[`fresh_${i}`] || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row[`cab_${i}`] || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row[`bo_${i}`] || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row[`bal_${i}`] || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row[`billing_${i}`] || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row[`pay_${i}`] || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        row[`rem_${i}`] || ""
                    )}
                </td>

            </tr>

        `;

    }


    let extraRowsHtml = "";


    for (
        let i = 1;
        i <= 8;
        i++
    ) {

        const extra =
            file.extraTable || {};


        extraRowsHtml += `

            <tr>

                <td>
                    ${escapeHtml(
                        extra[`item_${i}`] || ""
                    )}
                </td>

                <td>
                    ${escapeHtml(
                        extra[`amount_${i}`] || ""
                    )}
                </td>

            </tr>

        `;

    }


    const extra =
        file.extraTable || {};


    return `

        <div class="preview-sheet">

            <!-- PREVIEW HEADER -->

            <div class="preview-date-header">

                <div class="preview-watermark">
                    ${dayNumber}
                </div>

                <div class="preview-date-text">

                    <div>
                        Date: ${escapeHtml(
                            file.date
                        )}
                    </div>

                    <div class="preview-weekday">
                        ${weekday}
                    </div>

                    <div>
                        ${escapeHtml(
                            file.name
                        )}
                    </div>

                </div>

            </div>


            <!-- SECOND TABLE -->

            <div class="table-box table-box-2">

                <table>

                    <colgroup>

                        <col style="width:12%;">
                        <col style="width:8%;">
                        <col style="width:8%;">
                        <col style="width:8%;">
                        <col style="width:8%;">
                        <col style="width:15%;">
                        <col style="width:15%;">
                        <col style="width:15%;">
                        <col style="width:13%;">

                    </colgroup>

                    <thead>

                        <tr>

                            <th>Names</th>
                            <th>Dry</th>
                            <th>Fresh</th>
                            <th>Cab</th>
                            <th>BO</th>
                            <th>Bal</th>
                            <th>Billing</th>
                            <th class="colln-header">
                                Coll'n
                            </th>
                            <th>Utang</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${rowsHtml}

                    </tbody>

                </table>

            </div>


            <!-- SECOND TABLE TOTALS -->

            <div class="table-box">

                <table>

                    <tr>

                        <th>NET TOTAL</th>

                        <td>
                            ${previewMoney(
                                sumHistoryColumn(
                                    file,
                                    "dry"
                                )
                            )}
                        </td>

                        <td>
                            ${previewMoney(
                                sumHistoryColumn(
                                    file,
                                    "fresh"
                                )
                            )}
                        </td>

                        <td>
                            ${previewMoney(
                                sumHistoryColumn(
                                    file,
                                    "cab"
                                )
                            )}
                        </td>

                        <td>
                            ${previewMoney(
                                sumHistoryColumn(
                                    file,
                                    "bo"
                                )
                            )}
                        </td>

                        <td>
                            ${previewMoney(
                                sumHistoryColumn(
                                    file,
                                    "bal"
                                )
                            )}
                        </td>

                        <td>
                            ${previewMoney(
                                sumHistoryColumn(
                                    file,
                                    "billing"
                                )
                            )}
                        </td>

                        <td>
                            ${previewMoney(
                                sumHistoryColumn(
                                    file,
                                    "pay"
                                )
                            )}
                        </td>

                        <td>
                            ${previewMoney(
                                sumHistoryColumn(
                                    file,
                                    "rem"
                                )
                            )}
                        </td>

                    </tr>

                </table>

            </div>


            <!-- THIRD TABLE -->

            <div class="table-box table-box-3">

                <table>

                    <thead>

                        <tr>

                            <th>ITEMS</th>
                            <th>AMOUNT</th>
                            <th>ITEMS</th>
                            <th>AMOUNT</th>
                            <th>SUMMARY</th>

                        </tr>

                    </thead>

                    <tbody>

                        ${buildPreviewExtraRows(
                            file
                        )}

                    </tbody>

                </table>

            </div>


            <!-- NOTE -->

            <div class="preview-note">

                <strong>NOTE:</strong>

                ${escapeHtml(
                    extra.note || ""
                )}

            </div>

        </div>

    `;

}


function sumHistoryColumn(
    file,
    type
) {

    let total = 0;

    const rows =
        file.rows || {};


    for (
        let i = 1;
        i <= 16;
        i++
    ) {

        total +=
            parseFloat(
                String(
                    rows[
                        `${type}_${i}`
                    ] || 0
                ).replace(
                    /,/g,
                    ""
                )
            ) || 0;

    }


    return total;

}


function buildPreviewExtraRows(
    file
) {

    const extra =
        file.extraTable || {};


    let html = "";


    for (
        let i = 1;
        i <= 8;
        i++
    ) {

        const item =
            extra[
                `item_${i}`
            ] || "";

        const amount =
            extra[
                `amount_${i}`
            ] || "";


        html += `

            <tr>

                <td>
                    ${escapeHtml(item)}
                </td>

                <td>
                    ${escapeHtml(amount)}
                </td>

                <td>
                    ${i === 1 ? "Collection - Expenses" : ""}
                </td>

                <td>
                    ${i === 1 ? calculatePreviewCollection(file) : ""}
                </td>

                <td>
                    ${i === 1 ? "COH" : ""}
                    ${i === 2 ? escapeHtml(extra.coh || "0") : ""}
                </td>

            </tr>

        `;

    }


    return html;

}


function calculatePreviewCollection(
    file
) {

    const collection =
        sumHistoryColumn(
            file,
            "pay"
        );


    let expenses = 0;


    const extra =
        file.extraTable || {};


    for (
        let i = 1;
        i <= 8;
        i++
    ) {

        expenses +=
            parseFloat(
                extra[
                    `amount_${i}`
                ] || 0
            ) || 0;

    }


    return previewMoney(
        collection -
        expenses
    );

}


// ============================================================
// OPEN READ ONLY PREVIEW
// ============================================================

function openHistoryPreview(
    dateKey
) {

    const file =
        getHistoryFile(
            dateKey
        );


    if (!file) {
        return;
    }


    previewingHistoryDate =
        dateKey;


    closeHistoryPreview();


    const overlay =
        document.createElement(
            "div"
        );


    overlay.id =
        "historyPreviewOverlay";


    overlay.className =
        "readonly-preview-overlay";


    overlay.innerHTML = `

        <div
            class="readonly-preview-header"
            onclick="closeHistoryPreview()"
        >

            <div>

                <div class="readonly-preview-title">

                    READ ONLY —
                    ${escapeHtml(
                        file.date
                    )}
                    •
                    ${escapeHtml(
                        file.name
                    )}

                </div>

                <div class="readonly-preview-subtitle">

                    Tap this header again to return
                    to Saved Files

                </div>

            </div>


            <button
                class="readonly-preview-close"
                onclick="event.stopPropagation(); closeHistoryPreview();"
            >
                BACK
            </button>

        </div>


        <div
            class="readonly-preview-content"
            onclick="event.stopPropagation()"
        >

            ${buildHistoryPreview(
                file
            )}

        </div>

    `;


    document.body.appendChild(
        overlay
    );

}


// ============================================================
// CLOSE READ ONLY PREVIEW
// ============================================================

function closeHistoryPreview() {

    const existing =
        document.getElementById(
            "historyPreviewOverlay"
        );


    if (existing) {

        existing.remove();

    }


    previewingHistoryDate =
        null;

}


// ============================================================
// EDIT SAVED FILE
// ============================================================

function editHistoryFile(
    dateKey
) {

    closeHistoryPreview();

    loadHistoryFile(
        dateKey
    );

}


// ============================================================
// LOAD HISTORY FILE FOR EDITING
// ============================================================

function loadHistoryFile(
    dateKey
) {

    const selectedFile =
        getHistoryFile(
            dateKey
        );


    if (!selectedFile) {
        return;
    }


    clearAllLedgerInputs();


    currentSessionDate =
        selectedFile.date;

    currentSessionName =
        selectedFile.name;


    updateSessionDateDisplay();


    for (
        let i = 1;
        i <= 16;
        i++
    ) {

        if (
            selectedFile.rows &&
            selectedFile.rows[
                `name_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerName_${i}`
            ).value =
                selectedFile.rows[
                    `name_${i}`
                ];

        }


        if (
            selectedFile.rows &&
            selectedFile.rows[
                `dry_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerDry_${i}`
            ).value =
                selectedFile.rows[
                    `dry_${i}`
                ];

        }


        if (
            selectedFile.rows &&
            selectedFile.rows[
                `fresh_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerFresh_${i}`
            ).value =
                selectedFile.rows[
                    `fresh_${i}`
                ];

        }


        if (
            selectedFile.rows &&
            selectedFile.rows[
                `cab_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerCab_${i}`
            ).value =
                selectedFile.rows[
                    `cab_${i}`
                ];

        }


        if (
            selectedFile.rows &&
            selectedFile.rows[
                `bo_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerBo_${i}`
            ).value =
                selectedFile.rows[
                    `bo_${i}`
                ];

        }


        if (
            selectedFile.rows &&
            selectedFile.rows[
                `bal_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerBal_${i}`
            ).value =
                selectedFile.rows[
                    `bal_${i}`
                ];

        }


        if (
            selectedFile.rows &&
            selectedFile.rows[
                `billing_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerBilling_${i}`
            ).value =
                selectedFile.rows[
                    `billing_${i}`
                ];

        }


        if (
            selectedFile.rows &&
            selectedFile.rows[
                `pay_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerPay_${i}`
            ).value =
                selectedFile.rows[
                    `pay_${i}`
                ];

        }


        if (
            selectedFile.rows &&
            selectedFile.rows[
                `rem_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerRem_${i}`
            ).value =
                selectedFile.rows[
                    `rem_${i}`
                ];

        }

    }


    if (
        selectedFile.extraTable
    ) {

        for (
            let i = 1;
            i <= 8;
            i++
        ) {

            if (
                selectedFile.extraTable[
                    `item_${i}`
                ] !== undefined
            ) {

                document.getElementById(
                    `extraItem_${i}`
                ).value =
                    selectedFile.extraTable[
                        `item_${i}`
                    ];

            }


            if (
                selectedFile.extraTable[
                    `amount_${i}`
                ] !== undefined
            ) {

                document.getElementById(
                    `extraAmount_${i}`
                ).value =
                    selectedFile.extraTable[
                        `amount_${i}`
                    ];

            }

        }


        if (
            selectedFile.extraTable.coh !==
            undefined
        ) {

            document.getElementById(
                "inputCOH"
            ).value =
                selectedFile.extraTable.coh;

        }


        const noteElement =
            document.getElementById(
                "newTableNote"
            );


        if (noteElement) {

            noteElement.value =
                selectedFile.extraTable.note ||
                "";

        }

    }


    document.getElementById(
        "setupModal"
    ).style.display =
        "none";


    setEncodingEditable(
        true
    );


    loadRowToMain(
        1
    );


    calculateLedgerTotals();

    calculateExtraTable();


    saveLedger();


    renderHistoryUI(
        dateKey
    );


    resetInactivityTimer();

}


// ============================================================
// DELETE HISTORY
// ============================================================

function deleteHistoryFile(
    dateKey
) {

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
            previewingHistoryDate ===
            dateKey
        ) {

            closeHistoryPreview();

        }


        renderHistoryUI();

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


    const history =
        JSON.parse(
            localStorage.getItem(
                "miki_30day_history"
            ) || "[]"
        );


    historyCount.textContent =
        `${history.length} / 30`;


    if (
        history.length ===
        0
    ) {

        historyContainer.innerHTML =
            `<p style="color:#9ca3af;text-align:center;margin:10px 0;">
                No saved files yet.
             </p>`;

        return;
    }


    const highlightKey =
        selectedDateKey ||
        currentSessionDate;


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


        div.className =
            `history-item ${
                isSelected ?
                'selected-file' :
                ''
            }`;


        div.onclick =
            function() {

                openHistoryPreview(
                    item.date
                );

            };


        div.innerHTML = `

            <div class="history-file-info">

                <strong>
                    ${escapeHtml(
                        item.date
                    )}
                </strong>

                -
                ${escapeHtml(
                    item.name
                )}

            </div>


            <div class="history-file-actions">

                <button
                    class="btn-sm btn-edit"
                    onclick="
                        event.stopPropagation();
                        editHistoryFile('${item.date}');
                    "
                >
                    Edit
                </button>


                <button
                    class="btn-sm btn-del"
                    onclick="
                        event.stopPropagation();
                        deleteHistoryFile('${item.date}');
                    "
                >
                    Del
                </button>

            </div>

        `;


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

        setEncodingEditable(
            false
        );

        showOpenModal();

        return;
    }


    let ledgerData;


    try {

        ledgerData =
            JSON.parse(
                saved
            );

    } catch (error) {

        console.error(
            "Invalid saved ledger data:",
            error
        );


        localStorage.removeItem(
            "miki_ledger_data"
        );


        setEncodingEditable(
            false
        );

        showOpenModal();

        return;
    }


    if (
        !ledgerData.date ||
        !ledgerData.name
    ) {

        setEncodingEditable(
            false
        );

        showOpenModal();

        return;
    }


    currentSessionDate =
        ledgerData.date;

    currentSessionName =
        ledgerData.name;


    updateSessionDateDisplay();


    for (
        let i = 1;
        i <= 16;
        i++
    ) {

        if (
            ledgerData.rows &&
            ledgerData.rows[
                `name_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerName_${i}`
            ).value =
                ledgerData.rows[
                    `name_${i}`
                ];

        }


        if (
            ledgerData.rows &&
            ledgerData.rows[
                `dry_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerDry_${i}`
            ).value =
                ledgerData.rows[
                    `dry_${i}`
                ];

        }


        if (
            ledgerData.rows &&
            ledgerData.rows[
                `fresh_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerFresh_${i}`
            ).value =
                ledgerData.rows[
                    `fresh_${i}`
                ];

        }


        if (
            ledgerData.rows &&
            ledgerData.rows[
                `cab_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerCab_${i}`
            ).value =
                ledgerData.rows[
                    `cab_${i}`
                ];

        }


        if (
            ledgerData.rows &&
            ledgerData.rows[
                `bo_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerBo_${i}`
            ).value =
                ledgerData.rows[
                    `bo_${i}`
                ];

        }


        if (
            ledgerData.rows &&
            ledgerData.rows[
                `bal_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerBal_${i}`
            ).value =
                ledgerData.rows[
                    `bal_${i}`
                ];

        }


        if (
            ledgerData.rows &&
            ledgerData.rows[
                `billing_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerBilling_${i}`
            ).value =
                ledgerData.rows[
                    `billing_${i}`
                ];

        }


        if (
            ledgerData.rows &&
            ledgerData.rows[
                `pay_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerPay_${i}`
            ).value =
                ledgerData.rows[
                    `pay_${i}`
                ];

        }


        if (
            ledgerData.rows &&
            ledgerData.rows[
                `rem_${i}`
            ] !== undefined
        ) {

            document.getElementById(
                `ledgerRem_${i}`
            ).value =
                ledgerData.rows[
                    `rem_${i}`
                ];

        }

    }


    if (
        ledgerData.extraTable
    ) {

        for (
            let i = 1;
            i <= 8;
            i++
        ) {

            if (
                ledgerData.extraTable[
                    `item_${i}`
                ] !== undefined
            ) {

                document.getElementById(
                    `extraItem_${i}`
                ).value =
                    ledgerData.extraTable[
                        `item_${i}`
                    ];

            }


            if (
                ledgerData.extraTable[
                    `amount_${i}`
                ] !== undefined
            ) {

                document.getElementById(
                    `extraAmount_${i}`
                ).value =
                    ledgerData.extraTable[
                        `amount_${i}`
                    ];

            }

        }


        if (
            ledgerData.extraTable.coh !==
            undefined
        ) {

            document.getElementById(
                "inputCOH"
            ).value =
                ledgerData.extraTable.coh;

        }


        const noteElement =
            document.getElementById(
                "newTableNote"
            );


        if (noteElement) {

            noteElement.value =
                ledgerData.extraTable.note ||
                "";

        }

    }


    document.getElementById(
        "setupModal"
    ).style.display =
        "none";


    setEncodingEditable(
        true
    );


    loadRowToMain(
        1
    );


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
