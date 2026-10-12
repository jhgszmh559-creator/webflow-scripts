(() => {
    const { useState, useEffect } = React;

    // --- CATEGORIES ---
    const CATEGORIES = {
        'Hotel': 'https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/69620d09e2985d359178f0c0_Screenshot%202026-01-10%20at%2015.04.44.png',
        'Air': 'https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/69620d0a508dce6a0a372d70_Screenshot%202026-01-10%20at%2015.05.03.png',
        'Cruise': 'https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/69620d0a254adfe5df568f88_Screenshot%202026-01-10%20at%2015.05.12.png',
        'DMC': 'https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/69620d0acc385e79edb1d0c0_Screenshot%202026-01-10%20at%2015.05.22.png',
        'Tour Op/Wholesaler': 'https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/69620d0992dc54bde7c1a4e3_Screenshot%202026-01-10%20at%2015.05.27.png',
        'Activity provider': 'https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/69620d0ac7bab2a2adb85387_Screenshot%202026-01-10%20at%2015.05.36.png',
        'Transport': 'https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/69620d0a3acbc928a3a1e16a_Screenshot%202026-01-10%20at%2015.05.46.png',
        'Insurance': 'https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/69620d09e1650e33c97305f8_Screenshot%202026-01-10%20at%2015.05.59.png',
        'Homes & Villas': 'https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/69620d0afd98092bed806be7_Screenshot%202026-01-10%20at%2015.06.07.png'
    };

    // =========================
    // LIVE FX RATES (exchangerate-api) + CT MARGIN
    // Mirrors the quotation tool: final rate = live spot + CT margin for the FROM->TO pair.
    // =========================
    const EXCHANGE_API_KEY = '26c030e3bca6646989d8948e';
    const FX_MARGIN_TABLE = {
        USD: { GBP: 0.015,   EUR: 0.015,   ZAR: 0.285,   CAD: 0.025 },
        GBP: { USD: 0.025,   EUR: 0.022,   ZAR: 0.4,     CAD: 0.033 },
        EUR: { GBP: 0.015,   USD: 0.02,    ZAR: 0.35,    CAD: 0.0275 },
        ZAR: { USD: 0.001,   GBP: 0.001,   EUR: 0.0015,  CAD: 0.0018 },
        CAD: { USD: 0.015,   GBP: 0.015,   EUR: 0.015,   ZAR: 0.21 },
        JPY: { USD: 0.00015, GBP: 0.00015, EUR: 0.00012, CAD: 0.0002, ZAR: 0.005 },
        ISK: { USD: 0.0004,  GBP: 0.00035, EUR: 0.0005,  CAD: 0.006,  ZAR: 0.008 },
        SGD: { USD: 0.018,   GBP: 0.01,    EUR: 0.0135 },
        NOK: { USD: 0.0027,  GBP: 0.0018,  EUR: 0.002 },
        MYR: { USD: 0.01,    GBP: 0.008,   EUR: 0.007 },
        NZD: { USD: 0.02,    GBP: 0.015,   EUR: 0.015 },
        AUD: { USD: 0.02,    GBP: 0.012,   EUR: 0.015 },
        CHF: { USD: 0.028,   GBP: 0.018,   EUR: 0.02 },
        MAD: { USD: 0.004,   GBP: 0.003,   EUR: 0.003 },
    };

    const getFxMargin = (base, target) => {
        if (base === target) return 0;
        return FX_MARGIN_TABLE?.[base]?.[target] ?? 0;
    };

    async function fetchLiveSpotRate(base, target) {
        if (base === target) return 1;
        const url = `https://v6.exchangerate-api.com/v6/${EXCHANGE_API_KEY}/pair/${encodeURIComponent(base)}/${encodeURIComponent(target)}`;
        const res = await fetch(url);
        if (!res.ok) throw new Error(`FX API HTTP ${res.status}`);
        const data = await res.json();
        if (data.result !== 'success') throw new Error(data['error-type'] || 'FX fetch failed');
        return Number(data.conversion_rate);
    }

    // =========================
    // PDF DOWNLOAD (html2pdf.js, loaded on demand the first time it's needed)
    // =========================
    const HTML2PDF_SRC = 'https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.14.0/html2pdf.bundle.min.js';
    const HTML2PDF_SRI = 'sha512-+9GoO5OUX2MmPRHUH5dnOY+KGReMLcxywEvQxvAI0y5JxXh/lkz99dKj4xdYfODP3dMFsoZRz4CF/vHcaqa2Ag==';

    // Renders the invoice HTML in its own off-screen A4-width iframe and returns a PDF Blob.
    // Using a separate iframe keeps the page's CSS out of the invoice and makes the PDF
    // layout independent of how wide the popup happens to be.
    async function renderInvoicePdf(html) {
        const frame = document.createElement('iframe');
        frame.setAttribute('aria-hidden', 'true');
        frame.style.cssText = 'position:fixed;left:-10000px;top:0;width:794px;height:1123px;border:0;opacity:0;pointer-events:none;';
        try {
            await new Promise((resolve) => {
                frame.onload = resolve;
                frame.srcdoc = html;
                document.body.appendChild(frame);
            });
            const doc = frame.contentDocument;

            await new Promise((resolve, reject) => {
                const script = doc.createElement('script');
                script.src = HTML2PDF_SRC;
                script.integrity = HTML2PDF_SRI;
                script.crossOrigin = 'anonymous';
                script.onload = resolve;
                script.onerror = () => reject(new Error('Could not load html2pdf.js'));
                doc.head.appendChild(script);
            });

            // Give each line of the multi-line text blocks (bank details, T&Cs) its own
            // element so a page break falls between lines instead of slicing through one.
            doc.querySelectorAll('p[style*="pre-wrap"]').forEach((p) => {
                if (p.children.length) return;
                const lines = p.textContent.split(/\r?\n/);
                p.textContent = '';
                lines.forEach((line) => {
                    const div = doc.createElement('div');
                    div.className = 'pdf-line';
                    div.textContent = line || '\u00A0';
                    p.appendChild(div);
                });
            });

            // Each section (Payment Details, T&Cs) opens with a separator line below a top
            // margin. Move that margin inside a wrapper so a section pushed onto a new page
            // keeps the gap above its line, instead of the line landing on the page edge.
            doc.querySelectorAll('div[style*="border-top"]').forEach((section) => {
                const wrapper = doc.createElement('div');
                wrapper.className = 'pdf-section';
                wrapper.style.paddingTop = section.style.marginTop;
                section.style.marginTop = '0';
                section.replaceWith(wrapper);
                wrapper.appendChild(section);
            });

            const blob = await frame.contentWindow.html2pdf()
                .set({
                    margin: 12,
                    image: { type: 'jpeg', quality: 0.92 },
                    html2canvas: { scale: 2, useCORS: true, logging: false },
                    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
                    // Keep rows, lines and (when they fit on one page) whole sections together.
                    pagebreak: { mode: ['css', 'legacy'], avoid: ['tr', 'h1', 'h3', 'img', 'a', '.pdf-line', '.pdf-section'] }
                })
                .from(doc.body.firstElementChild)
                .outputPdf('blob');

            // Re-wrap so the Blob belongs to this page, not the iframe we're about to remove.
            return new Blob([blob], { type: 'application/pdf' });
        } finally {
            frame.remove();
        }
    }

    // Helper to format dates
    const formatDate = (dateStr) => {
        if (!dateStr) return '';
        const [year, month, day] = dateStr.split('T')[0].split('-');
        if (!year || !month || !day) return dateStr;

        const date = new Date(year, month - 1, day);
        const monthName = date.toLocaleString('default', { month: 'long' });
        const d = date.getDate();

        const nth = (d) => {
            if (d > 3 && d < 21) return 'th';
            switch (d % 10) {
                case 1:  return "st";
                case 2:  return "nd";
                case 3:  return "rd";
                default: return "th";
            }
        };
        return `${monthName} ${d}${nth(d)} ${year}`;
    };

    // Helper to check if a date is overdue (past today)
    const isOverdue = (dateStr) => {
        if (!dateStr) return false;
        const targetDate = new Date(dateStr);
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        return targetDate < today;
    };

    // Icons
    const SendIcon = ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="22" y1="2" x2="11" y2="13"></line><polygon points="22 2 15 22 11 13 2 9 22 2"></polygon></svg>;
    const DownloadIcon = ({ size = 20 }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="7 10 12 15 17 10"></polyline><line x1="12" y1="15" x2="12" y2="3"></line></svg>;

    // MAIN COMPONENT
    function InvoicePreviewEmbed() {
        const [isVisible, setIsVisible] = useState(false);
        const [isLoading, setIsLoading] = useState(false);
        const [serviceData, setServiceData] = useState(null);
        const [quoteData, setQuoteData] = useState(null);
        const [suppliers, setSuppliers] = useState([]);
        const [agentEmail, setAgentEmail] = useState('');
        const [generatedHtml, setGeneratedHtml] = useState('');
        const [isSending, setIsSending] = useState(false);
        const [sendSuccess, setSendSuccess] = useState(false);
        const [isDownloading, setIsDownloading] = useState(false);
        const [fxRate, setFxRate] = useState(null); // live (spot + CT margin) for base -> serviceData.currency

        // 1. Listen for the Wized button click & Wait for Data
        useEffect(() => {
            const handleGlobalClick = async (e) => {
                const triggerBtn = e.target.closest('[wized="service_booked_button_download_client_invoice"]');
                if (!triggerBtn) return;

                setIsVisible(true);
                setIsLoading(true);
                setSendSuccess(false);

                // Grab the agent email instantly since it should already be loaded
                const userEmail = window.Wized?.data?.r?.load_user_data?.data?.email;
                setAgentEmail(userEmail || '');

                let retries = 0;
                let sData = null;
                let qData = null;
                let supData = [];

                // Poll Wized until all 3 requests are done
                while (retries < 150) {
                    const serviceReq = window.Wized?.data?.r?.Load_specific_service_booked;
                    const quoteReq = window.Wized?.data?.r?.load_specific_quote;
                    const supplierReq = window.Wized?.data?.r?.load_suppliers;

                    const isExecuting = serviceReq?.isRequesting || quoteReq?.isRequesting || supplierReq?.isRequesting;
                    const hasData = serviceReq?.data && quoteReq?.data?.app_data;

                    if (!isExecuting && hasData) {
                        sData = Array.isArray(serviceReq.data) ? serviceReq.data[0] : serviceReq.data;
                        qData = quoteReq.data.app_data;
                        supData = Array.isArray(supplierReq?.data) ? supplierReq.data : [];
                        break;
                    }

                    await new Promise(r => setTimeout(r, 50));
                    retries++;
                }

                if (!sData || !qData) {
                    console.warn("Wized request timed out or failed. Close popup and try again.");
                    setIsVisible(false);
                    return;
                }

                try {
                    const parsedQuote = typeof qData === 'string' ? JSON.parse(qData) : qData;
                    setServiceData(sData);
                    setQuoteData(parsedQuote);
                    setSuppliers(supData);
                    setIsLoading(false);
                } catch (error) {
                    console.error("Failed to parse app_data", error);
                    setIsVisible(false);
                }
            };

            document.addEventListener('click', handleGlobalClick);
            return () => document.removeEventListener('click', handleGlobalClick);
        }, []);

        // 1b. Fetch the CURRENT exchange rate (live spot + CT margin) to convert the
        //     displayed amounts (in serviceData.currency) INTO the quote's selected
        //     Payment Currency. Display-only: serviceData.currency & amounts are untouched.
        useEffect(() => {
            if (!quoteData || !serviceData) return;

            const source = serviceData.currency || quoteData.currencySettings?.client;
            const target = quoteData.paymentCurrency || quoteData.currencySettings?.client;

            // Nothing to show if we can't resolve a pair or it's the same currency.
            if (!source || !target) { setFxRate(null); return; }
            if (source === target) { setFxRate(1); return; }

            let cancelled = false;
            (async () => {
                try {
                    const spot = await fetchLiveSpotRate(source, target);
                    const margin = getFxMargin(source, target);
                    if (!cancelled) setFxRate(Number((spot + margin).toFixed(6)));
                } catch (err) {
                    // Don't show a converted figure we can't trust — hide the line instead.
                    console.warn('Live FX fetch failed; converted total hidden:', err);
                    if (!cancelled) setFxRate(null);
                }
            })();

            return () => { cancelled = true; };
        }, [quoteData, serviceData]);

        // 2. Generate the HTML
        useEffect(() => {
            if (!isVisible || !quoteData || !serviceData) return;

            const q = quoteData;
            const fees = q.fees || {};

            // --- CURRENCY & BANKING CONFIG ---
            // Overriding with the serviceData currency
            const clientCurrencyCode = serviceData.currency || q.currencySettings?.client || 'USD';
            const moneyClient = (amount) => Number(amount).toLocaleString(undefined, { style: 'currency', currency: clientCurrencyCode });

            // Payment Currency selected on the quote (the currency we convert the total INTO).
            const fxTargetCode = q.paymentCurrency || q.currencySettings?.client;
            const moneyPayment = (amount) => Number(amount).toLocaleString(undefined, { style: 'currency', currency: fxTargetCode });

            const currencyConfig = {
                'GBP': {
                    bankDetails: "Cartology Travel Ltd\nAddress: 17 Dorien Road, London, SW20 8EL\nBarclays Bank\nSort: 20-45-45\nAcc: 50675156\nIBAN: GB53BUKB20454550675156\nSwift: BUKBGB22\nBank Address: 1 Churchill Place, London, E14 5HP - United Kingdom",
                    paymentLink: "https://cartologytravel-gbp.flywire.com"
             },
                'EUR': {
                    bankDetails: "Cartology Travel Ltd\nSort: 20-45-45\nAcc: 56279911\nIBAN: GB10 BUKB 20454556279911",
                    paymentLink: "https://cartologytravel-eur.flywire.com"
                },
                'USD': {
                    bankDetails: "Account Name: Cartology Travel Ltd\nAddress: 17 Dorien Road, London, SW20 8EL United Kingdom\nBank: JPMorgan Chase Bank\nBank Address: 270 Park Ave, New York, NY 10017 United States\nBank Swift: CHASUS33\nWire Transit No.: 021 000 021\nAch Transit No.: 028 000 024\nAccount Number: 20000044952854",
                    paymentLink: "https://cartologytravel-usd.flywire.com"
                }
            };

            // Bank details + Flywire link follow the currency the client actually PAYS in
            // (the quote's Payment Currency). The currency the amounts are displayed in is
            // only used when we hold no account for the payment currency.
            const normCode = (code) => String(code || '').trim().toUpperCase();
            const bankCurrencyCode = [fxTargetCode, clientCurrencyCode].map(normCode).find((code) => currencyConfig[code]);
            if (!bankCurrencyCode) {
                console.warn(`No bank details configured for ${normCode(fxTargetCode) || '?'} / ${normCode(clientCurrencyCode) || '?'}; showing the USD account.`);
            }

            // Last resort: USD config if neither currency is in the list
            const activeCurrencySetup = currencyConfig[bankCurrencyCode] || currencyConfig['USD'];

            // --- DATA MAPPING ---
            const clientName = `${serviceData._client?.first_name || ''} ${serviceData._client?.last_name || ''}`.trim() || q.setupData?.clientDetails?.name || '';
            const invoiceNumber = `${q.quoteInfo?.number || ''}${serviceData.commission_invoice_number ? ` / ${serviceData.commission_invoice_number}` : ''}`;

            const depositDueDate = serviceData.deposit_due_date || q.depositDueDate;
            const balanceDueDate = serviceData.balance_due_date || q.balanceDueDate;

            // Calculate Trip Days
            const calcTripDays = (start, end) => {
                if (!start || !end) return 'X';
                const d1 = new Date(start);
                const d2 = new Date(end);
                if (isNaN(d1) || isNaN(d2)) return 'X';

                // Calculate difference in time, then convert to days.
                // Adding 1 because e.g., 10th to 12th is 2 nights, but typically a 3-day trip.
                const diffTime = Math.abs(d2 - d1);
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
                return diffDays > 0 ? diffDays + 1 : 1;
            };
            const tripDays = calcTripDays(serviceData.start_date, serviceData.end_date);

            // Core Math
            const grandTotal = serviceData.total_amount_local || 0;
            const actualDeposit = serviceData.deposit_amount || 0;
            const remainingBalance = serviceData.balance_amount || 0;

            // Renders a bracketed sub-line converting an amount into the selected Payment
            // Currency at our current FX rate, e.g. "(approx. €186.24)".
            // Returns '' when there's no rate / same currency. Display-only.
            const fxConvLine = (amount, fontSize = 12) => (fxRate && fxTargetCode && fxTargetCode !== clientCurrencyCode)
                ? `<div style="font-size: ${fontSize}px; font-weight: normal; color: #94a3b8; margin-top: 4px;">(approx. ${moneyPayment(amount * fxRate)})</div>`
                : '';

            const depositDue = actualDeposit;
            const balanceDue = remainingBalance;

            // Scenarios for Payment Rows (Colspans changed from 3 to 1 to match 2-column layout)
            let paymentRowsHTML = '';
            let paidInFullBanner = '';

            // Scenario 3: Paid in Full
            if (serviceData.balance_paid) {
                paidInFullBanner = `<div style="text-align: center; margin-bottom: 30px;"><span style="background-color: #16a34a; color: white; padding: 8px 16px; border-radius: 4px; font-weight: bold; font-size: 14px; letter-spacing: 2px;">PAID IN FULL</span></div>`;
                paymentRowsHTML = `
                    <tr style="background-color: #f0fdf4;">
                        <td colspan="1" style="padding: 12px; text-align: right; font-size: 14px; color: #166534;">Less Deposit Received ${serviceData.deposit_received_date ? `on ${formatDate(serviceData.deposit_received_date)}` : ''}</td>
                        <td style="padding: 12px; text-align: right; font-size: 14px; color: #166534;">-${moneyClient(actualDeposit)}</td>
                    </tr>
                    <tr style="background-color: #f0fdf4;">
                        <td colspan="1" style="padding: 12px; text-align: right; font-size: 14px; color: #166534;">Less Balance Received</td>
                        <td style="padding: 12px; text-align: right; font-size: 14px; color: #166534;">-${moneyClient(remainingBalance)}</td>
                    </tr>
                    <tr style="border-top: 2px solid #cbd5e1;">
                        <td colspan="1" style="padding: 16px 12px 8px; text-align: right; font-size: 16px; font-weight: bold; color: #0f172a;">Total Remaining</td>
                        <td style="padding: 16px 12px 8px; text-align: right; font-size: 16px; font-weight: bold; color: #0f172a;">${moneyClient(0)}</td>
                    </tr>
                `;
            }
            // Scenario 2: Deposit Paid
            else if (serviceData.depsoit_paid) {
                const balOverdue = isOverdue(balanceDueDate);
                paymentRowsHTML = `
                    <tr style="background-color: #f0fdf4;">
                        <td colspan="1" style="padding: 12px; text-align: right; font-size: 14px; color: #166534;">Less Deposit Received ${serviceData.deposit_received_date ? `on ${formatDate(serviceData.deposit_received_date)}` : ''}</td>
                        <td style="padding: 12px; text-align: right; font-size: 14px; color: #166534;">-${moneyClient(actualDeposit)}</td>
                    </tr>
                    <tr style="border-top: 2px solid #cbd5e1;">
                        <td colspan="1" style="padding: 16px 12px 8px; text-align: right; font-size: 14px; color: ${balOverdue ? '#ef4444' : '#64748b'};">
                            Remaining Balance Due ${balanceDueDate ? `(${formatDate(balanceDueDate)})` : ''}
                            ${balOverdue ? '<b> - OVERDUE</b>' : ''}
                        </td>
                        <td style="padding: 16px 12px 8px; text-align: right; font-size: 16px; font-weight: bold; color: ${balOverdue ? '#ef4444' : '#0f172a'};">${moneyClient(remainingBalance)}${fxConvLine(remainingBalance)}</td>
                    </tr>
                `;
            }
            // Scenario 1: Unpaid
            else {
                const depOverdue = isOverdue(depositDueDate);
                const balOverdue = isOverdue(balanceDueDate);
                if (depositDue > 0) {
                    paymentRowsHTML = `
                        <tr>
                            <td colspan="1" style="padding: 16px 12px 8px; text-align: right; font-size: 14px; color: ${depOverdue ? '#ef4444' : '#64748b'};">
                                Deposit Due ${depositDueDate ? `(${formatDate(depositDueDate)})` : ''}
                                ${depOverdue ? '<b> - OVERDUE</b>' : ''}
                            </td>
                            <td style="padding: 16px 12px 8px; text-align: right; font-size: 16px; font-weight: bold; color: ${depOverdue ? '#ef4444' : '#0f172a'};">${moneyClient(depositDue)}${fxConvLine(depositDue)}</td>
                        </tr>
                        <tr>
                            <td colspan="1" style="padding: 8px 12px 16px; text-align: right; font-size: 14px; color: ${balOverdue ? '#ef4444' : '#64748b'};">
                                Balance Due ${balanceDueDate ? `(${formatDate(balanceDueDate)})` : ''}
                                ${balOverdue ? '<b> - OVERDUE</b>' : ''}
                            </td>
                            <td style="padding: 8px 12px 16px; text-align: right; font-size: 16px; font-weight: bold; color: ${balOverdue ? '#ef4444' : '#0f172a'};">${moneyClient(balanceDue)}${fxConvLine(balanceDue)}</td>
                        </tr>
                    `;
                }
            }

            // Build Item Rows (Simplified 2 Columns)
            const summaryText = q.summaryNotes && q.summaryNotes.trim() !== ''
                ? q.summaryNotes
                : `Your complete travel package for your ${tripDays}-day trip as discussed.`;

            const tableRowsHTML = `
                <tr style="border-bottom: 1px solid #f1f5f9;">
                    <td colspan="1" style="padding: 16px 12px; font-size: 14px; color: #475569; white-space: pre-wrap;">${summaryText}</td>
                    <td style="padding: 16px 12px; text-align: right; font-size: 14px; font-weight: bold; color: #0f172a;">${moneyClient(grandTotal)}</td>
                </tr>
            `;

            // Build Fee Rows (Colspans changed from 3 to 1)
            let feesHTML = '';
            const ccMultiplier = q.creditCardFeeInclusion === 'included' ? (1 + ((fees.creditCardFee||0) / 100)) : 1;
            const otherFeesLocal = (fees.otherFees || 0) * ccMultiplier * (q.currencySettings?.rate || 1);

            if (otherFeesLocal > 0) feesHTML += `<tr><td colspan="1" style="padding: 12px; text-align: right; font-size: 14px; color: #475569;">Other Fees</td><td style="padding: 12px; text-align: right; font-size: 14px; color: #0f172a;">${moneyClient(otherFeesLocal)}</td></tr>`;

            if (fees.isUKPackage) {
                const ffiAmountLocal = grandTotal - (grandTotal / 1.0112);
                feesHTML += `<tr><td colspan="1" style="padding: 12px; text-align: right; font-size: 14px; color: #475569; font-style: italic;">FFI Fee (1.12%)</td><td style="padding: 12px; text-align: right; font-size: 14px; color: #0f172a;">${moneyClient(ffiAmountLocal)}</td></tr>`;
            }

            if (q.creditCardFeeInclusion === 'separate' && fees.creditCardFee > 0) {
                const ccFeeLocal = (grandTotal - (grandTotal / (1 + (fees.creditCardFee / 100))));
                feesHTML += `<tr><td colspan="1" style="padding: 12px; text-align: right; font-size: 14px; color: #475569;">Credit Card Fee (${fees.creditCardFee}%)</td><td style="padding: 12px; text-align: right; font-size: 14px; color: #0f172a;">${moneyClient(ccFeeLocal)}</td></tr>`;
            }

            // Assemble Full HTML
            const fullHtml = `
                <!DOCTYPE html>
                <html>
                <head>
                    <title>${invoiceNumber}</title>
                    <style>
                        body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; margin: 0; }
                    </style>
                </head>
                <body>
                    <div style="max-width: 800px; margin: 0 auto;">
                        ${paidInFullBanner}
                        <div style="margin-bottom: 50px;">
                            ${q.companyLogoUrl ? `<img src="${q.companyLogoUrl}" style="width: 120px; height: auto; margin-bottom: 24px;" />` : ''}
                            <h1 style="margin: 0; font-size: 38px; color: #0f172a; font-weight: bold;">Payment Request</h1>
                            <p style="margin: 8px 0 0 0; color: #64748b; font-size: 16px;"># ${invoiceNumber}</p>
                        </div>

                        <table width="100%" style="margin-bottom: 50px; border-collapse: collapse;">
                            <tr>
                                <td width="50%" style="vertical-align: top;">
                                    <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Billed To</p>
                                    <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0f172a;">${clientName}</p>
                                    ${q.setupData?.clientDetails?.company ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #475569;">${q.setupData.clientDetails.company}</p>` : ''}
                                </td>
                                <td width="50%" style="text-align: right; vertical-align: bottom;">
                                    <div style="font-size: 14px; color: #475569; line-height: 1.6;">
                                        <p style="margin: 0;"><strong>Original Invoice Date:</strong> ${formatDate(q.quoteInfo?.date)}</p>
                                    </div>
                                </td>
                            </tr>
                        </table>

                        <table width="100%" style="border-collapse: collapse; margin-bottom: 40px;">
                            <thead>
                                <tr style="background-color: #f8fafc;">
                                    <th style="padding: 12px; text-align: left; font-size: 14px; color: #334155; border-bottom: 2px solid #e2e8f0; font-weight: bold;">Description</th>
                                    <th style="padding: 12px; text-align: right; font-size: 14px; color: #334155; border-bottom: 2px solid #e2e8f0; font-weight: bold;">Total</th>
                                </tr>
                            </thead>
                            <tbody>
                                ${tableRowsHTML}
                                ${feesHTML}
                            </tbody>
                            <tfoot>
                                <tr>
                                    <td colspan="1" style="padding: 20px 12px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #0f172a; border-top: 2px solid #cbd5e1;">Grand Total</td>
                                    <td style="padding: 20px 12px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #0f172a; border-top: 2px solid #cbd5e1;">${moneyClient(grandTotal)}${fxConvLine(grandTotal)}</td>
                                </tr>
                                ${paymentRowsHTML}
                            </tfoot>
                        </table>

                        ${activeCurrencySetup.bankDetails ? `
                            <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                                <h3 style="font-size: 16px; color: #334155; margin: 0 0 12px 0;">Payment Details</h3>
                                <p style="font-size: 14px; color: #64748b; white-space: pre-wrap; margin: 0; line-height: 1.5;">${activeCurrencySetup.bankDetails}</p>
                            </div>
                        ` : ''}

                        ${(!serviceData.balance_paid && activeCurrencySetup.paymentLink) ? `
                            <div style="margin-top: 40px; text-align: right;">
                                <a href="${activeCurrencySetup.paymentLink}" target="_blank" style="display: inline-block; background-color: #0b0e2c; color: #ffffff; font-weight: bold; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">Pay now</a>
                            </div>
                        ` : ''}

                        ${q.legalInfo ? `
                            <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                                <h3 style="font-size: 14px; color: #334155; margin: 0 0 12px 0;">Terms & Conditions</h3>
                                <p style="font-size: 12px; color: #64748b; white-space: pre-wrap; margin: 0; line-height: 1.5;">${q.legalInfo}</p>
                            </div>
                        ` : ''}
                    </div>
                </body>
                </html>
            `;

            setGeneratedHtml(fullHtml);
        }, [isVisible, quoteData, serviceData, suppliers, fxRate]);

        const getInvoiceNumber = () => `${quoteData?.quoteInfo?.number || ''}${serviceData.commission_invoice_number ? ` / ${serviceData.commission_invoice_number}` : ''}`;

        // 3. Send to Make.com Webhook (Make builds the PDF and emails it to the agent)
        const sendToMake = async () => {
            setIsSending(true);
            try {
                const MAKE_WEBHOOK_URL = 'https://hook.eu1.make.com/qkfzeol08jyrmyttkxsyoj6oztmqr3gw';

                await fetch(MAKE_WEBHOOK_URL, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        service_id: serviceData.id,
                        client_name: `${serviceData._client?.first_name || ''} ${serviceData._client?.last_name || ''}`.trim() || quoteData?.setupData?.clientDetails?.name,
                        invoice_number: getInvoiceNumber(),
                        agent_email: agentEmail,
                        html: generatedHtml
                    })
                });

                setSendSuccess(true);
            } catch (error) {
                console.error(error);
                alert("Failed to send to Make.com.");
            } finally {
                setIsSending(false);
            }
        };

        // 4. Build the PDF in the browser and download it straight away
        const downloadPdf = async () => {
            setIsDownloading(true);
            try {
                const blob = await renderInvoicePdf(generatedHtml);
                const fileSuffix = getInvoiceNumber().replace(/[^\w.-]+/g, '-').replace(/^-+|-+$/g, '');

                const url = URL.createObjectURL(blob);
                const link = document.createElement('a');
                link.href = url;
                link.download = `Payment-Request${fileSuffix ? `-${fileSuffix}` : ''}.pdf`;
                document.body.appendChild(link);
                link.click();
                link.remove();
                setTimeout(() => URL.revokeObjectURL(url), 10000);
            } catch (error) {
                console.error(error);
                alert("Failed to generate the PDF. Please try again.");
            } finally {
                setIsDownloading(false);
            }
        };

        if (!isVisible) return null;

        if (isLoading) {
            return (
                <div className="tw-w-full tw-h-full tw-flex tw-flex-col tw-items-center tw-justify-center tw-bg-white tw-rounded-lg tw-min-h-[400px]">
                    <p className="tw-text-slate-500 tw-font-medium tw-text-lg tw-animate-pulse">Loading invoice preview...</p>
                </div>
            );
        }

        return (
            <div className="tw-w-full tw-h-full tw-flex tw-flex-col">
                {/* Scrollable Preview Area */}
                <div className="tw-flex-grow tw-overflow-y-auto tw-bg-slate-200 tw-p-4 tw-rounded-t-lg">
                    <div className="tw-bg-white tw-mx-auto tw-shadow-md tw-rounded-sm tw-overflow-hidden" style={{ maxWidth: '800px', minHeight: '600px' }}>
                        <iframe
                            srcDoc={generatedHtml}
                            className="tw-w-full tw-h-[600px] tw-border-none"
                            title="Invoice Preview"
                        />
                    </div>
                </div>

                {/* Footer Action Bar */}
                <div className="tw-p-4 tw-border-t tw-border-slate-100 tw-bg-white tw-flex tw-justify-between tw-items-center tw-rounded-b-lg tw-shrink-0">
                    <p className="tw-text-sm tw-text-slate-500 tw-m-0">
                        {sendSuccess ? <span className="tw-text-emerald-600 tw-font-bold">Sent successfully. You'll receive it via email shortly</span> : "Review the invoice preview above."}
                    </p>
                    <div className="tw-flex tw-items-center tw-gap-2 tw-shrink-0">
                        <button
                            onClick={downloadPdf}
                            disabled={isDownloading || !generatedHtml}
                            className="tw-flex tw-items-center tw-gap-2 tw-bg-white tw-px-6 tw-py-2.5 tw-rounded-lg tw-font-semibold hover:tw-opacity-90 tw-transition-opacity disabled:tw-opacity-50 tw-cursor-pointer tw-shadow-sm"
                            style={{ color: '#0b0e2c', border: '1px solid #0b0e2c' }}
                        >
                            {isDownloading ? 'Generating...' : <><DownloadIcon size={18}/> Download PDF</>}
                        </button>
                        <button
                            onClick={sendToMake}
                            disabled={isSending}
                            className="tw-flex tw-items-center tw-gap-2 tw-bg-[#0b0e2c] tw-text-white tw-px-6 tw-py-2.5 tw-rounded-lg tw-font-semibold hover:tw-opacity-90 tw-transition-opacity disabled:tw-opacity-50 tw-border-none tw-cursor-pointer tw-shadow-sm"
                        >
                            {isSending ? 'Sending...' : <><SendIcon size={18}/> Send via email</>}
                        </button>
                    </div>
                </div>
            </div>
        );
    }

    // Wait for the HTML embed to be present before injecting React
    const checkInterval = setInterval(() => {
        const container = document.getElementById('invoice-preview-root');
        if (container) {
            clearInterval(checkInterval);
            const root = ReactDOM.createRoot(container);
            root.render(<InvoicePreviewEmbed />);
        }
    }, 100);
})();
