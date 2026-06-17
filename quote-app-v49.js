(() => {
  const { useState, useEffect, useMemo, useRef } = React;

  // =========================
  // ERROR BOUNDARY
  // =========================
  class ErrorBoundary extends React.Component {
      constructor(props) { super(props); this.state = { hasError: false, error: null, errorInfo: null }; }
      static getDerivedStateFromError(error) { return { hasError: true, error: error }; }
      componentDidCatch(error, errorInfo) { this.setState({ errorInfo }); }
      render() {
          if (this.state.hasError) {
              return (
                  <div className="tw-p-8 tw-m-8 tw-bg-red-50 tw-rounded-xl tw-border tw-border-red-200">
                      <h1 className="tw-text-2xl tw-font-bold tw-text-red-700 tw-mb-2">Something went wrong.</h1>
                      <pre className="tw-bg-white tw-p-4 tw-rounded-lg tw-border tw-border-red-100 tw-overflow-auto tw-text-sm tw-text-slate-800">{this.state.error && this.state.error.toString()}</pre>
                  </div>
              );
          }
          return this.props.children;
      }
  }

  // =========================
  // WIZED CONFIG & HELPERS
  // =========================
  const WIZED_REQ = { clients: "load_clients", suppliers: "load_suppliers" };
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  
  async function waitForWizedReady({ timeoutMs = 15000 } = {}) {
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
          if (window.Wized && Wized.requests && Wized.data) return true;
          await sleep(50);
      }
      throw new Error("Wized not ready.");
  }

  async function execWizedRequestAndWait(reqName, { timeoutMs = 20000 } = {}) {
      await Wized.requests.execute(reqName);
      await sleep(150);
      const start = Date.now();
      while (Date.now() - start < timeoutMs) {
          const req = Wized?.data?.r?.[reqName];
          if (req && req.hasRequested && !req.isRequesting) {
              if (req.ok) return req.data;
              throw new Error(`Wized request '${reqName}' failed`);
          }
          await sleep(50);
      }
      throw new Error(`Timed out waiting for '${reqName}'`);
  }

  // Escape HTML to prevent injection when we render bank/legal text into the PDF window.
  const escapeHtml = (str) => String(str || '').replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[c]));

  // Wraps any http(s) URLs in the string with <a href> tags (PDF / printed HTML).
  const linkifyHtml = (text, anchorStyle = 'color: #3b82f6; text-decoration: underline;') => {
      if (!text) return '';
      const escaped = escapeHtml(text);
      return escaped.replace(/(https?:\/\/[^\s<]+)/g, (url) => `<a href="${url}" target="_blank" rel="noopener noreferrer" style="${anchorStyle}">${url}</a>`);
  };

  // React variant: splits text on URLs and renders clickable anchors inline.
  const Linkified = ({ text, anchorClassName = 'tw-text-blue-500 hover:tw-underline' }) => {
      if (!text) return null;
      const parts = String(text).split(/(https?:\/\/[^\s<]+)/g);
      return (
          <>
              {parts.map((part, i) => /^https?:\/\//.test(part)
                  ? <a key={i} href={part} target="_blank" rel="noopener noreferrer" className={anchorClassName}>{part}</a>
                  : <React.Fragment key={i}>{part}</React.Fragment>
              )}
          </>
      );
  };

  // Helper to format dates
  const formatDate = (dateStr) => {
      if (!dateStr) return '';
      const [year, month, day] = dateStr.split('-');
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

  // =========================
  // ICONS & DATA
  // =========================
  const Icon = ({ size = 20, children, className = '' }) => <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{children}</svg>;
  const UserIcon = ({ size }) => <Icon size={size}><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path><circle cx="12" cy="7" r="4"></circle></Icon>;
  const Briefcase = ({ size }) => <Icon size={size}><rect x="2" y="7" width="20" height="14" rx="2" ry="2"></rect><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"></path></Icon>;
  const Hash = ({ size }) => <Icon size={size}><line x1="4" y1="9" x2="20" y2="9"></line><line x1="4" y1="15" x2="20" y2="15"></line><line x1="10" y1="3" x2="8" y2="21"></line><line x1="16" y1="3" x2="14" y2="21"></line></Icon>;
  const Calendar = ({ size }) => <Icon size={size}><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></Icon>;
  const ArrowRight = ({ size }) => <Icon size={size}><line x1="5" y1="12" x2="19" y2="12"></line><polyline points="12 5 19 12 12 19"></polyline></Icon>;
  const ArrowDown = ({ size }) => <Icon size={size}><polyline points="6 9 12 15 18 9"></polyline></Icon>;
  const ArrowUp = ({ size }) => <Icon size={size}><polyline points="18 15 12 9 6 15"></polyline></Icon>;
  const ArrowRightLeft = ({ size }) => <Icon size={size}><polyline points="17 1 21 5 17 9"></polyline><path d="M3 11V9a4 4 0 0 1 4-4h14"></path><polyline points="7 23 3 19 7 15"></polyline><path d="M21 13v2a4 4 0 0 1-4 4H3"></path></Icon>;
  const Plus = ({ size }) => <Icon size={size}><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></Icon>;
  const Trash2 = ({ size }) => <Icon size={size}><polyline points="3 6 5 6 21 6"></polyline><path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path><line x1="10" y1="11" x2="10" y2="17"></line><line x1="14" y1="11" x2="14" y2="17"></line></Icon>;
  const Copy = ({ size }) => <Icon size={size}><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></Icon>;

  const CURRENCIES = [{ code: 'USD', symbol: '$', name: 'US Dollar' }, { code: 'EUR', symbol: '€', name: 'Euro' }, { code: 'GBP', symbol: '£', name: 'British Pound' }, { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }, { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }, { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' }, { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' }, { code: 'ZAR', symbol: 'R', name: 'South African Rand' }];

  // =========================
  // LIVE FX RATES (exchangerate-api) + CT MARGIN
  // =========================
  // CT margin is the absolute amount added to the live spot rate for each
  // FROM -> TO pair. Sourced from the "Live Exchange Rates" sheet (CT Margin col).
  // If a pair is missing, the live spot is used as-is (margin = 0).
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

  // Credit-card fee presets driven by currency pair. "custom" allows manual entry.
  const CC_FEE_PRESETS = [
      { id: 'gbp-gbp',      label: 'GBP to GBP (1%)',      value: 1 },
      { id: 'gbp-gbp-amex', label: 'GBP to GBP Amex (2%)', value: 2 },
      { id: 'usd-usd',      label: 'USD to USD (3.6%)',    value: 3.6 },
      { id: 'eur',          label: 'EUR (2.5%)',           value: 2.5 },
      { id: 'other-usd',    label: 'Other to USD (0%)',    value: 0 },
      { id: 'other-gbp',    label: 'Other to GBP (0%)',    value: 0 },
      { id: 'zar',          label: 'ZAR (4%)',             value: 4 },
      { id: 'custom',       label: 'Other (enter manually)', value: null },
  ];

  const PRESET_EXCHANGE_RATES = {
      USD: 1.00, EUR: 0.95, GBP: 0.80, JPY: 150.00, AUD: 1.55, CAD: 1.35, CHF: 0.90, ZAR: 19.00,
  };

  const PRESET_BANK_ACCOUNTS = [
      { id: 'default', name: 'GBP Account (Default)', details: 'Cartology Travel Ltd\nAddress: 17 Dorien Road, London, SW20 8EL\nBarclays Bank\nSort: 20-45-45\nAcc: 50675156\nIBAN: GB53BUKB20454550675156\nSwift: BUKBGB22\nBank Address: 1 Churchill Place, London, E14 5HP - United Kingdom' },
      { id: 'usd', name: 'USD Account', details: 'Cartology Travel Ltd\nAddress: 17 Dorien Road, London, SW20 8EL, UK\nBarclays Bank\nSort: 20-45-45\nAcc: 65546399\nIBAN: GB38BUKB20454565546399\nSwift: BUKBGB22\nBank Address: 1 Churchill Place, London, E14 5HP - United Kingdom' },
      { id: 'eur', name: 'EUR Account', details: 'Cartology Travel Ltd\nAddress: 17 Dorien Road, London, SW20 8EL, UK\nBarclays Bank\nSort: 20-45-45\nAcc: 56279911\nIBAN: GB10 BUKB 20454556279911\nSwift: BUKBGB22\nBank Address: 1 Churchill Place, London, E14 5HP - United Kingdom' },
      { id: 'usd-us', name: 'USD (US Based)', details: 'Account Name: Cartology Travel Ltd\nAddress: 17 Dorien Road, London, SW20 8EL United Kingdom\nBank: JPMorgan Chase Bank\nBank Address: 270 Park Ave, New York, NY 10017 United States\nBank Swift: CHASUS33\nWire Transit No.: 021 000 021\nAch Transit No.: 028 000 024\nAccount Number: 20000044952854' }
  ];

  const PRESET_PAYMENT_LINKS = [
      { id: 'eur', name: 'EUR', url: 'https://cartologytravel-eur.flywire.com' },
      { id: 'gbp', name: 'GBP', url: 'https://cartologytravel-gbp.flywire.com' },
      { id: 'usd', name: 'USD', url: 'https://cartologytravel-usd.flywire.com' },
      { id: 'custom', name: 'Custom' }
  ];

  // Currencies a client can be asked to pay an invoice in.
  const PAYMENT_CURRENCIES = ['USD', 'GBP', 'EUR', 'CAD'];

  const DISPLAY_OPTIONS = [
      { id: 'summary', label: 'Summary', desc: 'One grand total line' },
      { id: 'grouped', label: 'By Category', desc: 'Grouped by Service Type' },
      { id: 'supplier', label: 'By Supplier', desc: 'Grouped by Vendor' },
      { id: 'detailed', label: 'Detailed', desc: 'Line-by-line breakdown' }
  ];

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
  // REUSABLE UI COMPONENTS
  // =========================
  const ControlCard = ({ title, children, defaultOpen = true, isComplete = false }) => {
      const [isOpen, setIsOpen] = useState(defaultOpen);
      
      return (
          <div className={`tw-bg-white tw-rounded-xl tw-shadow-sm tw-border tw-border-solid tw-overflow-hidden tw-transition-colors tw-duration-300 ${isComplete ? 'tw-border-emerald-500' : 'tw-border-slate-200'}`}> 
              <div 
                  className="tw-px-6 tw-py-5 tw-flex tw-justify-between tw-items-center tw-cursor-pointer tw-bg-white"
                  onClick={() => setIsOpen(!isOpen)}
              >
                  <h2 className="tw-text-[18px] tw-font-bold tw-text-slate-800 tw-m-0 tw-leading-none tw-flex tw-items-center tw-gap-3">
                      {title}
                  </h2>
                  <div className="tw-text-slate-400 tw-flex tw-items-center">
                      {isOpen ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                  </div>
              </div>
              {isOpen && (
                  <div className="tw-px-6 tw-pb-6 tw-pt-2 tw-border-t tw-border-solid tw-border-slate-100">
                      {children}
                  </div>
              )}
          </div> 
      );
  };

  const InputField = ({ label, symbol, icon, tooltipLink, ...props }) => (
      <div>
          <div className="tw-flex tw-items-center tw-mb-1.5 tw-m-0">
              <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-m-0">{label}</label>
              {tooltipLink && (
                  <div className="tw-relative tw-group tw-inline-flex tw-items-center tw-cursor-pointer tw-ml-1.5">
                      <span className="tw-text-slate-400 group-hover:tw-text-[#303350] tw-transition-colors">
                          <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                      </span>
                      <div className="tw-absolute tw-bottom-full tw-left-1/2 tw--translate-x-1/2 tw-pb-2 tw-hidden group-hover:tw-block tw-w-48 tw-z-50">
                          <div className="tw-p-2.5 tw-bg-slate-800 tw-text-white tw-text-xs tw-rounded-md tw-shadow-lg tw-text-center tw-relative tw-font-normal tw-leading-relaxed">
                              You can check our up to date details <a href={tooltipLink} target="_blank" rel="noopener noreferrer" className="tw-text-blue-300 hover:tw-text-blue-100 hover:tw-underline tw-font-semibold">here</a>.
                              <div className="tw-absolute tw-top-full tw-left-1/2 tw--translate-x-1/2 tw-border-4 tw-border-transparent tw-border-t-slate-800"></div>
                          </div>
                      </div>
                  </div>
              )}
          </div>
          <div className="tw-relative">
              {icon && <span className="tw-absolute tw-left-3 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400 tw-flex tw-items-center">{icon}</span>}
              <input {...props} className={`tw-w-full tw-h-10 tw-px-3 tw-text-sm tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] disabled:tw-bg-slate-100 disabled:tw-cursor-not-allowed ${icon ? 'tw-pl-9' : ''} ${symbol ? 'tw-pr-9' : ''}`} />
              {symbol && <span className="tw-absolute tw-right-3 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400 tw-text-sm">{symbol}</span>}
          </div>
      </div>
  );

  const MiniInputField = ({ label, symbol, ...props }) => (
      <div className="tw-flex tw-flex-col tw-justify-end">
          <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0 tw-leading-5">{label}</label>
          <div className="tw-relative">
              {symbol && <span className={`tw-absolute tw-left-3 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400 tw-text-sm ${symbol === '%' ? 'tw-right-3 tw-left-auto' : ''}`}>{symbol}</span>}
              <input {...props} className={`tw-w-full tw-h-10 tw-px-3 tw-text-sm tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] ${symbol && symbol !== '%' ? 'tw-pl-7' : ''} ${symbol === '%' ? 'tw-pr-7 tw-text-right' : ''}`} />
          </div>
      </div>
  );

  const CurrencySelector = ({ label, ...props }) => (
      <div>
          <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0 tw-leading-5">{label}</label>
          <select {...props} className="tw-w-full tw-h-10 tw-px-3 tw-text-sm tw-text-slate-700 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] tw-bg-white">
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)}
          </select>
      </div>
  );

  function SearchableSelect({ options, value, onChange, placeholder, icon, emptyLabel = "+ Add new item", onEmptyClick }) {
      const [query, setQuery] = useState('');
      const [isOpen, setIsOpen] = useState(false);
      const ref = useRef(null);

      useEffect(() => {
          const handleClick = (e) => { if (ref.current && !ref.current.contains(e.target)) setIsOpen(false); };
          document.addEventListener('mousedown', handleClick);
          return () => document.removeEventListener('mousedown', handleClick);
      }, []);

      const selectedOption = options.find(o => String(o.value) === String(value));
      const displayValue = isOpen ? query : (selectedOption ? selectedOption.label : '');
      const filteredOptions = options.filter(o => o.label.toLowerCase().includes(query.toLowerCase()));

      return (
          <div className="tw-relative" ref={ref}>
              {icon && <span className="tw-absolute tw-left-3 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400 tw-flex tw-items-center">{icon}</span>}
              <input
                  type="text"
                  className={`tw-w-full tw-h-10 tw-px-3 tw-text-sm tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] tw-bg-white ${icon ? 'tw-pl-9' : ''}`}
                  placeholder={placeholder}
                  value={displayValue}
                  onChange={(e) => { setQuery(e.target.value); setIsOpen(true); if(!isOpen) onChange(""); }}
                  onFocus={() => { setIsOpen(true); setQuery(''); }}
              />
              {isOpen && (
                  <div className="tw-absolute tw-z-50 tw-w-full tw-mt-1 tw-bg-white tw-border tw-border-solid tw-border-slate-200 tw-rounded-md tw-shadow-lg tw-max-h-60 tw-overflow-auto">
                      {filteredOptions.length === 0 ? (
                          <div 
                              className="tw-p-3 tw-text-sm tw-text-[#303350] tw-font-medium tw-cursor-pointer hover:tw-bg-slate-50"
                              onClick={() => { 
                                  if (onEmptyClick) onEmptyClick();
                                  setIsOpen(false); 
                              }}
                          >
                              {emptyLabel}
                          </div>
                      ) : (
                          filteredOptions.map(opt => (
                              <div 
                                  key={opt.value} 
                                  className="tw-p-3 tw-text-sm hover:tw-bg-slate-50 tw-cursor-pointer tw-text-slate-700 tw-border-b tw-border-solid tw-border-slate-50 last:tw-border-0"
                                  onClick={() => { onChange(opt.value); setIsOpen(false); setQuery(''); }}
                              >
                                  {opt.label}
                              </div>
                          ))
                      )}
                  </div>
              )}
          </div>
      );
  }

  // =========================
  // STEP 1: SETUP SCREEN
  // =========================
  function SetupScreen({ clients, onComplete, initialData }) {
      const [pricingModel, setPricingModel] = useState(initialData?.pricingModel || 'nett');
      const [selectedClientId, setSelectedClientId] = useState(initialData?.clientId || "");
      const [customCompany, setCustomCompany] = useState(initialData?.clientDetails?.company || "");
      
      const clientOptions = clients.map(c => ({ value: c.id, label: `${c.first_name || ''} ${c.last_name || ''}`.trim() }));

      useEffect(() => {
          if (selectedClientId && (!initialData || selectedClientId !== initialData.clientId)) {
              const client = clients.find(c => String(c.id) === String(selectedClientId));
              if (client && client.company) setCustomCompany(client.company);
          }
      }, [selectedClientId, clients, initialData]);

      const handleSubmit = (e) => {
          e.preventDefault();
          const clientData = clients.find(c => String(c.id) === String(selectedClientId));
          onComplete({ 
            pricingModel, 
            clientId: selectedClientId,
            clientDetails: clientData ? { name: `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim(), company: customCompany, email: clientData.email } : { name: '', company: '' }
          });
      };

      const handleAddClient = () => {
          const popup = document.querySelector('[wized="new-client-popup"]');
          if (popup) {
              popup.classList.add('show');
          } else {
              console.warn('Popup [wized="new-client-popup"] not found on this page.');
          }
      };

      return (
          <div className="tw-p-2 lg:tw-p-4 tw-mt-4 lg:tw-mt-8">
              <div className="tw-w-full tw-max-w-3xl tw-mx-auto">
                  <form onSubmit={handleSubmit} className="tw-space-y-6">
                      <div className="tw-bg-white tw-p-8 sm:tw-p-10 tw-rounded-2xl tw-shadow-[0_8px_30px_rgb(0,0,0,0.04)] tw-border tw-border-solid tw-border-slate-100 tw-space-y-10">
                          
                          <div>
                              <label className="tw-block tw-text-[18px] tw-font-bold tw-text-slate-800 tw-mb-4 tw-m-0">1. Choose Pricing Model</label>
                              <div className="tw-grid tw-grid-cols-2 tw-gap-6">
                                  <div 
                                      onClick={() => setPricingModel('nett')} 
                                      className="tw-p-5 tw-rounded-xl tw-cursor-pointer tw-transition-all"
                                      style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: pricingModel === 'nett' ? '#303350' : '#e2e8f0', backgroundColor: pricingModel === 'nett' ? '#f8fafc' : '#ffffff' }}
                                  >
                                      <img src="https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/6611ac28353fd48ae22ce9e5_arrow%20right.png" className="tw-w-6 tw-h-6 tw-mb-3" alt="icon" />
                                      <h3 className="tw-text-lg tw-font-bold tw-m-0 tw-mb-2 tw-text-slate-800">Nett Pricing</h3>
                                      <p className="tw-text-sm tw-text-slate-500 tw-m-0">Enter the cost to you (nett) and add your markup.</p>
                                  </div>
                                  <div 
                                      onClick={() => setPricingModel('gross')} 
                                      className="tw-p-5 tw-rounded-xl tw-cursor-pointer tw-transition-all"
                                      style={{ borderWidth: '1px', borderStyle: 'solid', borderColor: pricingModel === 'gross' ? '#303350' : '#e2e8f0', backgroundColor: pricingModel === 'gross' ? '#f8fafc' : '#ffffff' }}
                                  >
                                      <img src="https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/6611ac28353fd48ae22ce9e5_arrow%20right.png" className="tw-w-6 tw-h-6 tw-mb-3" alt="icon" />
                                      <h3 className="tw-text-lg tw-font-bold tw-m-0 tw-mb-2 tw-text-slate-800">Gross Pricing</h3>
                                      <p className="tw-text-sm tw-text-slate-500 tw-m-0">Enter the final client price (gross) and your commission.</p>
                                  </div>
                              </div>
                          </div>

                          <div>
                              <label className="tw-block tw-text-[18px] tw-font-bold tw-text-slate-800 tw-mb-4 tw-m-0">2. Select Client</label>
                              <div className="tw-space-y-5">
                                  <div>
                                      <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0">Client Name</label>
                                      <SearchableSelect 
                                          options={clientOptions}
                                          value={selectedClientId}
                                          onChange={setSelectedClientId}
                                          placeholder="Search for a client..."
                                          icon={<UserIcon size={16} />}
                                          emptyLabel="+ Add new client"
                                          onEmptyClick={handleAddClient}
                                      />
                                  </div>
                                  <InputField 
                                      icon={<Briefcase size={16}/>} 
                                      label="Client Company (Optional)" 
                                      value={customCompany}
                                      onChange={(e) => setCustomCompany(e.target.value)}
                                      placeholder="Enter company name" 
                                  />
                              </div>
                          </div>
                      </div>

                      <button type="submit" disabled={!selectedClientId} className="tw-w-full tw-flex tw-items-center tw-justify-center tw-gap-2 tw-bg-[#0b0e2c] tw-text-white tw-font-semibold tw-py-4 tw-px-4 tw-rounded-xl hover:tw-opacity-90 tw-transition-opacity disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-text-lg tw-shadow-md tw-border-none">
                          Prepare invoice <ArrowRight size={20} />
                      </button>
                  </form>
              </div>
          </div>
      );
  }

  // =========================
  // STEP 2: INVOICE BUILDER
  // =========================
  function InvoiceGenerator({ setupData, suppliers, onBack, savedInvoiceData, currentQuoteId }) {
      const [items, setItems] = useState(savedInvoiceData?.items || [
          { id: Date.now(), supplierId: "", category: "Hotel", description: '', nettUnitCost: '', quantity: '', markup: '', isFullDeposit: false }
      ]);
      
      const [companyLogoUrl, setCompanyLogoUrl] = useState(savedInvoiceData?.companyLogoUrl || 'https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/656cb820cffdc2c79973770f_Group%202.png');
      const [quoteInfo, setQuoteInfo] = useState(savedInvoiceData?.quoteInfo || { number: `Q-${Date.now().toString().slice(-6)}`, date: new Date().toISOString().split('T')[0], tripName: '', travelStartDate: '', travelEndDate: '' });
      
      const [currencySettings, setCurrencySettings] = useState(savedInvoiceData?.currencySettings || { base: 'USD', client: 'EUR', rate: 0.95 });
      const [fxStatus, setFxStatus] = useState({ loading: false, error: null, spotRate: null, margin: 0, fetchedAt: null });
      const [fees, setFees] = useState(savedInvoiceData?.fees || { creditCardFee: '', otherFees: '', isUKPackage: false });
      const [creditCardFeePreset, setCreditCardFeePreset] = useState(savedInvoiceData?.creditCardFeePreset || 'custom');
      const [creditCardFeeInclusion, setCreditCardFeeInclusion] = useState(savedInvoiceData?.creditCardFeeInclusion || 'included');
      
      const [invoiceView, setInvoiceView] = useState(savedInvoiceData?.invoiceView || 'detailed');
      const [summaryNotes, setSummaryNotes] = useState(savedInvoiceData?.summaryNotes || 'Your complete travel package includes all flights, accommodation, and transfers as discussed.');
      
      const [depositType, setDepositType] = useState(savedInvoiceData?.depositType || 'amount');
      const [depositValue, setDepositValue] = useState(savedInvoiceData?.depositValue !== undefined ? savedInvoiceData.depositValue : '');
      const [depositDueDate, setDepositDueDate] = useState(savedInvoiceData?.depositDueDate || '');
      const [balanceDueDate, setBalanceDueDate] = useState(savedInvoiceData?.balanceDueDate || savedInvoiceData?.quoteInfo?.dueDate || '');
      
      const [selectedPaymentPreset, setSelectedPaymentPreset] = useState(savedInvoiceData?.selectedPaymentPreset || 'custom');
      const [paymentLink, setPaymentLink] = useState(savedInvoiceData?.paymentLink || '');

      // Quote vs Invoice document mode + payment-currency / FX-conversion options.
      // NOTE: these values are captured & persisted here for a downstream application;
      // the actual FX-conversion maths/display is part of the pending restructure.
      const [documentType, setDocumentType] = useState(savedInvoiceData?.documentType || 'quote');
      const [paymentCurrency, setPaymentCurrency] = useState(savedInvoiceData?.paymentCurrency || savedInvoiceData?.currencySettings?.client || 'GBP');
      const [convertDepositToPaymentCurrency, setConvertDepositToPaymentCurrency] = useState(savedInvoiceData?.convertDepositToPaymentCurrency || false);
      const [convertCostToPaymentCurrency, setConvertCostToPaymentCurrency] = useState(savedInvoiceData?.convertCostToPaymentCurrency || false);
      const [fixedFxRate, setFixedFxRate] = useState(savedInvoiceData?.fixedFxRate !== undefined ? savedInvoiceData.fixedFxRate : '');

      const [selectedBankPreset, setSelectedBankPreset] = useState(savedInvoiceData?.selectedBankPreset || PRESET_BANK_ACCOUNTS[0].id);
      const [bankDetails, setBankDetails] = useState(savedInvoiceData?.bankDetails || PRESET_BANK_ACCOUNTS[0].details);
      const [legalInfo, setLegalInfo] = useState(savedInvoiceData?.legalInfo || '* Payment of the quote/invoice constitutes acceptance of the terms and conditions. For full terms & conditions please see: https://www.cartologytravel.com/booking-terms-conditions\n* Visas and passport validity are your responsibility\n* Amounts quoted are in the currency of the destination and any foreign exchange quotes are for guidance only.\n* The final exchange rate will be determined at the time of payment.');
      
      const [isExporting, setIsExporting] = useState(false);
      const [isSaving, setIsSaving] = useState(false);
      const [isDuplicating, setIsDuplicating] = useState(false);
      
      const { pricingModel } = setupData;
    
      const isBrandingComplete = !!companyLogoUrl;
      const isCurrencyComplete = !!currencySettings.base && !!currencySettings.client && !!currencySettings.rate;
      const isDetailsComplete = !!quoteInfo.number && !!quoteInfo.date && isCurrencyComplete;
      const isDisplayComplete = !!invoiceView;
      const isTravelComplete = items.length > 0 && items.every(i => i.description && Number(i.quantity || 0) > 0 && Number(i.nettUnitCost || 0) >= 0);
      const isFeesComplete = true; 
      const isPaymentsComplete = depositValue !== null && depositValue !== '';
      const isBankComplete = !!bankDetails;

      const handleAddItem = () => setItems([...items, { id: Date.now(), supplierId: "", category: "Hotel", description: '', nettUnitCost: '', quantity: '', markup: '', isFullDeposit: false }]);
      
      const handleDuplicateItem = (id) => {
          const itemIndex = items.findIndex(it => it.id === id);
          if (itemIndex === -1) return;
          const itemToCopy = items[itemIndex];
          const newItem = { ...itemToCopy, id: Date.now() + Math.random() };
          const newItems = [...items];
          newItems.splice(itemIndex + 1, 0, newItem);
          setItems(newItems);
      };

      const handleUpdateItem = (id, field, value) => {
          setItems(items.map(it => {
              if (it.id !== id) return it;
              const updated = { ...it, [field]: value };
              
              if (field === 'category') {
                  updated.supplierId = "";
              }

              if (pricingModel === 'gross' && (field === 'grossUnitCost' || field === 'markup')) {
                  const gross = field === 'grossUnitCost' ? Number(value) : (Number(it.grossUnitCost) || 0);
                  const markup = field === 'markup' ? Number(value) : (Number(it.markup) || 0);
                  updated.nettUnitCost = markup === 0 ? gross : gross / (1 + (markup / 100));
              }
              return updated;
          }));
      };
      
      const handleDeleteItem = (id) => setItems(items.filter(item => item.id !== id));
      
      const handleBankPresetChange = (e) => {
          const val = e.target.value;
          setSelectedBankPreset(val);
          if (val !== 'custom') {
              const preset = PRESET_BANK_ACCOUNTS.find(p => p.id === val);
              if (preset) setBankDetails(preset.details);
          }
      };

      const handlePaymentPresetChange = (e) => {
          const val = e.target.value;
          setSelectedPaymentPreset(val);
          if (val !== 'custom') {
              const preset = PRESET_PAYMENT_LINKS.find(p => p.id === val);
              if (preset) setPaymentLink(preset.url);
          } else {
              setPaymentLink('');
          }
      };
      
      const handleFeeChange = (e) => {
          const { name, value, type, checked } = e.target;
          setFees(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : value }));
      };

      const handleCurrencyChange = (field, newCurrency) => {
          setCurrencySettings(prev => ({ ...prev, [field]: newCurrency }));
      };

      const refreshLiveRate = async (base, client) => {
          if (!base || !client) return;
          if (base === client) {
              setFxStatus({ loading: false, error: null, spotRate: 1, margin: 0, fetchedAt: new Date().toISOString() });
              setCurrencySettings(prev => ({ ...prev, rate: 1 }));
              return;
          }
          setFxStatus(prev => ({ ...prev, loading: true, error: null }));
          try {
              const spot = await fetchLiveSpotRate(base, client);
              const margin = getFxMargin(base, client);
              const finalRate = parseFloat((spot + margin).toFixed(6));
              setFxStatus({ loading: false, error: null, spotRate: spot, margin, fetchedAt: new Date().toISOString() });
              setCurrencySettings(prev => ({ ...prev, rate: finalRate }));
          } catch (err) {
              console.error('FX fetch failed:', err);
              setFxStatus(prev => ({ ...prev, loading: false, error: err.message || 'Could not fetch live rate' }));
          }
      };

      // Auto-fetch live rate whenever currency pair changes.
      // Skip the first run when a saved quote is being restored so we keep the user's stored rate.
      const fxInitialMount = useRef(true);
      useEffect(() => {
          if (fxInitialMount.current && savedInvoiceData?.currencySettings) {
              fxInitialMount.current = false;
              return;
          }
          fxInitialMount.current = false;
          refreshLiveRate(currencySettings.base, currencySettings.client);
      }, [currencySettings.base, currencySettings.client]);

      // The Payment Currency (Payments section) is now the document's target currency,
      // replacing the old "Client Invoice Currency". Keep currencySettings.client mirrored
      // to it so all existing totals + the live FX fetch keep working.
      useEffect(() => {
          setCurrencySettings(prev => prev.client === paymentCurrency ? prev : { ...prev, client: paymentCurrency });
      }, [paymentCurrency]);

      const handleDateChange = (field, value) => {
          setQuoteInfo(prev => {
              const updated = { ...prev, [field]: value };
              if (field === 'travelStartDate' && updated.travelEndDate && value) {
                  if (new Date(value) > new Date(updated.travelEndDate)) {
                      updated.travelEndDate = value; // Force end date to match start date if pushed past
                  }
              }
              if (field === 'travelEndDate' && updated.travelStartDate && value) {
                  if (new Date(value) < new Date(updated.travelStartDate)) {
                      updated.travelEndDate = updated.travelStartDate; // Prevent end date before start date
                  }
              }
              return updated;
          });
      };

      const handleAddSupplier = () => {
          const popup = document.querySelector('[wized="new_supplier_popup"]');
          if (popup) {
              popup.classList.add('show');
          } else {
              console.warn('Popup [wized="new_supplier_popup"] not found');
          }
      };

      const handleLogoUpload = (e) => {
          const file = e.target.files[0];
          if (file) {
              const reader = new FileReader();
              reader.onloadend = () => {
                  setCompanyLogoUrl(reader.result);
              };
              reader.readAsDataURL(file);
          }
      };

      const calculations = useMemo(() => {
          const baseCurrency = CURRENCIES.find(c => c.code === currencySettings.base) || CURRENCIES[0];
          const clientCurrency = CURRENCIES.find(c => c.code === currencySettings.client) || CURRENCIES[0];
          const liveRate = Number(currencySettings.rate) || 0;   // base -> payment (live spot + CT margin)
          const fixedRate = Number(fixedFxRate) || 0;            // base -> payment (manually entered)

          const ccMultiplier = creditCardFeeInclusion === 'included' ? (1 + ((Number(fees.creditCardFee) || 0) / 100)) : 1;

          const itemsNet = items.reduce((sum, item) => sum + (Number(item.nettUnitCost || 0) * Number(item.quantity || 0)), 0);
          const itemsMarkup = items.reduce((sum, item) => sum + ((Number(item.nettUnitCost || 0) * Number(item.quantity || 0)) * (Number(item.markup || 0) / 100)), 0);
          const itemsTotalBase = (itemsNet + itemsMarkup) * ccMultiplier;
          
          const otherFeesBase = (Number(fees.otherFees) || 0) * ccMultiplier;
          const ffiFeeBase = fees.isUKPackage ? (itemsTotalBase + otherFeesBase) * 0.0112 : 0;
          const totalBeforeCCBase = itemsTotalBase + otherFeesBase + ffiFeeBase;
          
          const ccFeeBase = creditCardFeeInclusion === 'separate' ? totalBeforeCCBase * ((Number(fees.creditCardFee) || 0) / 100) : 0;

          // When the CC fee is shown "Separate" it is a stand-alone line item ONLY and is NOT
          // added into the Grand Total. (When "Included" it is already rolled into the prices.)
          let grandTotalBase = totalBeforeCCBase;

          // "Convert cost to Payment Currency based on a fixed FX rate" converts the WHOLE quote
          // into the Payment Currency at the entered fixed rate. Otherwise the quote is displayed
          // in the Destination currency (displayRate = 1).
          const paymentCurrencyObj = CURRENCIES.find(c => c.code === paymentCurrency) || clientCurrency;
          const costConversionActive = convertCostToPaymentCurrency && fixedRate > 0 && (paymentCurrency !== baseCurrency.code);
          const displayRate = costConversionActive ? fixedRate : 1;
          const displayCurrency = costConversionActive ? paymentCurrencyObj : baseCurrency;

          return {
              baseCurrency, clientCurrency, displayCurrency,
              grandTotal: grandTotalBase * displayRate,
              ccFee: ccFeeBase * displayRate,
              otherFees: otherFeesBase * displayRate,
              ffiFee: ffiFeeBase * displayRate,
              rate: displayRate,        // multiplier applied across the render (1, or the fixed FX rate)
              paymentRate: liveRate,    // live base -> payment, for the deposit-convert + "(approx. X)" lines
              costConversionActive,
          };
      }, [items, fees, currencySettings, creditCardFeeInclusion, convertCostToPaymentCurrency, fixedFxRate, paymentCurrency]);

      // The quote displays in the Destination currency by default, or in the Payment Currency
      // when "Convert cost ... fixed FX rate" is active. moneyClient follows the display currency.
      const moneyClient = (amount) => Number(amount).toLocaleString(undefined, { style: 'currency', currency: calculations.displayCurrency.code });
      const moneyBase = (amount) => Number(amount).toLocaleString(undefined, { style: 'currency', currency: calculations.baseCurrency.code });

      // Live-FX deposit conversion + "(approx. X)" lines. Suppressed when the fixed-rate cost
      // conversion is on (everything is already shown in the Payment Currency in that mode).
      const canConvertPayment = (calculations.paymentRate > 0) && (paymentCurrency !== calculations.baseCurrency.code);
      const showPaymentConversion = convertDepositToPaymentCurrency && canConvertPayment && !calculations.costConversionActive;
      const moneyPay = (destAmount) => Number(Number(destAmount) * (calculations.paymentRate || 0)).toLocaleString(undefined, { style: 'currency', currency: paymentCurrency });
      const fxApproxHtml = (destAmount) => showPaymentConversion ? `<div style="font-size:12px;font-weight:normal;color:#94a3b8;margin-top:4px;">(approx. ${moneyPay(destAmount)})</div>` : '';

      const calculatedDepositAmount = useMemo(() => {
          const ccMultiplier = creditCardFeeInclusion === 'included' ? (1 + ((Number(fees.creditCardFee) || 0) / 100)) : 1;
          const fullDepositItemsClientTotal = items
              .filter(it => it.isFullDeposit)
              .reduce((sum, it) => {
                  const itemPriceBase = (Number(it.nettUnitCost || 0) * (1 + (Number(it.markup || 0)/100))) * ccMultiplier;
                  const itemPriceClient = itemPriceBase * calculations.rate;
                  return sum + (itemPriceClient * Number(it.quantity || 0));
              }, 0);

          const depositValNum = Number(depositValue) || 0;
          if (depositType === 'amount') {
              // Entered in the Destination currency; multiply by the display rate so it lands
              // in the same currency as the Grand Total (1 normally, or the fixed FX rate).
              // "100% upfront" items are assumed already covered by the agent in the amount typed.
              return depositValNum * calculations.rate;
          }


          if (depositType === 'percentage') {
              const regularTotal = Math.max(0, calculations.grandTotal - fullDepositItemsClientTotal);
              return (regularTotal * (depositValNum / 100)) + fullDepositItemsClientTotal;
          }
          return 0;
      }, [depositType, depositValue, calculations.grandTotal, items, calculations.rate, creditCardFeeInclusion, fees.creditCardFee]);

      const handlePrintPdf = () => {
          setIsExporting(true);
          let tableRowsHTML = '';
          
          const ccMultiplier = creditCardFeeInclusion === 'included' ? (1 + ((Number(fees.creditCardFee) || 0) / 100)) : 1;
          const isSummary = invoiceView === 'summary';
          const showFFILine = fees.isUKPackage && !isSummary && invoiceView !== 'grouped' && creditCardFeeInclusion === 'separate';
          const ffiMultiplier = (fees.isUKPackage && invoiceView === 'grouped') ? 1.0112 : 1;
          const descColSpan = isSummary ? "1" : "3";
          
          if (invoiceView === 'detailed') {
              tableRowsHTML = items.map(it => {
                  const itemPriceBase = (Number(it.nettUnitCost || 0) * (1 + (Number(it.markup || 0)/100))) * ccMultiplier;
                  const itemPriceClient = itemPriceBase * calculations.rate;
                  const itemTotalClient = itemPriceClient * Number(it.quantity || 0);
                  const supplierName = it.supplierId ? suppliers.find(s => String(s.id) === String(it.supplierId))?.name : '';
                  const catIcon = CATEGORIES[it.category] || '';
                  
                  return `
                      <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 16px 12px; font-size: 14px; color: #0f172a; vertical-align: middle;">
                              <div style="display: flex; align-items: center; gap: 12px;">
                                  ${catIcon ? `<img src="${catIcon}" style="width: 24px; height: 24px; object-fit: contain;" />` : ''}
                                  <div>
                                      <strong style="display: block; margin-bottom: 4px;">${it.description || "—"}</strong>
                                      ${supplierName ? `<span style="color: #64748b; font-size: 12px;">Supplier: ${supplierName}</span>` : ''}
                                  </div>
                              </div>
                          </td>
                          <td style="padding: 16px 12px; text-align: right; font-size: 14px; color: #475569; vertical-align: middle;">${it.quantity}</td>
                          <td style="padding: 16px 12px; text-align: right; font-size: 14px; color: #475569; vertical-align: middle;">${moneyClient(itemPriceClient)}</td>
                          <td style="padding: 16px 12px; text-align: right; font-size: 14px; font-weight: bold; color: #0f172a; vertical-align: middle;">${moneyClient(itemTotalClient)}</td>
                      </tr>
                  `;
              }).join('');
          } else if (invoiceView === 'grouped') {
              const groupedTotals = items.reduce((acc, it) => {
                  if (!acc[it.category]) acc[it.category] = 0;
                  const itemPriceClient = (Number(it.nettUnitCost || 0) * (1 + (Number(it.markup || 0)/100))) * ccMultiplier * calculations.rate * Number(it.quantity || 0);
                  acc[it.category] += itemPriceClient * ffiMultiplier;
                  return acc;
              }, {});

              tableRowsHTML = Object.entries(groupedTotals).map(([cat, total]) => {
                  const catIcon = CATEGORIES[cat] || '';
                  return `
                      <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td colspan="3" style="padding: 16px 12px; font-size: 14px; color: #0f172a; vertical-align: middle;">
                              <div style="display: flex; align-items: center; gap: 12px;">
                                  ${catIcon ? `<img src="${catIcon}" style="width: 24px; height: 24px; object-fit: contain;" />` : ''}
                                  <div>
                                      <strong style="display: block;">${cat}</strong>
                                  </div>
                              </div>
                          </td>
                          <td style="padding: 16px 12px; text-align: right; font-size: 14px; font-weight: bold; color: #0f172a; vertical-align: middle;">${moneyClient(total)}</td>
                      </tr>
                  `;
              }).join('');
          } else if (invoiceView === 'supplier') {
              const supplierTotals = items.reduce((acc, it) => {
                  const supplierName = it.supplierId ? suppliers.find(s => String(s.id) === String(it.supplierId))?.name || 'Other Services' : 'Other Services';
                  if (!acc[supplierName]) acc[supplierName] = 0;
                  const itemPriceClient = (Number(it.nettUnitCost || 0) * (1 + (Number(it.markup || 0)/100))) * ccMultiplier * calculations.rate * Number(it.quantity || 0);
                  acc[supplierName] += itemPriceClient;
                  return acc;
              }, {});

              tableRowsHTML = Object.entries(supplierTotals).map(([supName, total]) => {
                  return `
                      <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td colspan="3" style="padding: 16px 12px; font-size: 14px; color: #0f172a; vertical-align: middle;">
                              <strong style="display: block;">${supName}</strong>
                          </td>
                          <td style="padding: 16px 12px; text-align: right; font-size: 14px; font-weight: bold; color: #0f172a; vertical-align: middle;">${moneyClient(total)}</td>
                      </tr>
                  `;
              }).join('');
          } else {
              // Summary View
              tableRowsHTML = `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td style="padding: 16px 12px; font-size: 14px; color: #475569; white-space: pre-wrap;">${summaryNotes}</td>
                      <td style="padding: 16px 12px; text-align: right; font-size: 14px; font-weight: bold; color: #0f172a;">${moneyClient(calculations.grandTotal)}</td>
                  </tr>
              `;
          }

          let feesHTML = '';
          const displayOtherFees = invoiceView === 'grouped' ? (calculations.otherFees * ffiMultiplier) : calculations.otherFees;
          
          if (creditCardFeeInclusion === 'separate' && Number(fees.otherFees || 0) > 0) feesHTML += `<tr><td colspan="${descColSpan}" style="padding: 12px; text-align: right; font-size: 14px; color: #475569;">Other Fees</td><td style="padding: 12px; text-align: right; font-size: 14px; color: #0f172a;">${moneyClient(displayOtherFees)}</td></tr>`;
          if (showFFILine) feesHTML += `<tr><td colspan="${descColSpan}" style="padding: 12px; text-align: right; font-size: 14px; color: #475569; font-style: italic;">FFI Fee (1.12%)</td><td style="padding: 12px; text-align: right; font-size: 14px; color: #0f172a;">${moneyClient(calculations.ffiFee)}</td></tr>`;
          if (creditCardFeeInclusion === 'separate' && Number(fees.creditCardFee || 0) > 0) feesHTML += `<tr><td colspan="${descColSpan}" style="padding: 12px; text-align: right; font-size: 14px; color: #475569;">Credit Card Fee (${fees.creditCardFee}%)</td><td style="padding: 12px; text-align: right; font-size: 14px; color: #0f172a;">${moneyClient(calculations.ccFee)}</td></tr>`;

          let depositHTML = '';
          if (calculatedDepositAmount > 0) {
              depositHTML = `
                  <tr style="background-color: #f8fafc;">
                      <td colspan="${descColSpan}" style="padding: 16px 12px 8px; text-align: right; font-size: 14px; color: #64748b;">Deposit Due ${depositDueDate ? `(by ${formatDate(depositDueDate)})` : ''}</td>
                      <td style="padding: 16px 12px 8px; text-align: right; font-size: 16px; font-weight: bold; color: #0f172a;">${showPaymentConversion ? moneyPay(calculatedDepositAmount) : moneyClient(calculatedDepositAmount)}</td>
                  </tr>
                  <tr style="background-color: #f8fafc;">
                      <td colspan="${descColSpan}" style="padding: 8px 12px 16px; text-align: right; font-size: 14px; color: #64748b;">Balance Due ${balanceDueDate ? `(by ${formatDate(balanceDueDate)})` : ''}</td>
                      <td style="padding: 8px 12px 16px; text-align: right; font-size: 16px; font-weight: bold; color: #0f172a;">${moneyClient(calculations.grandTotal - calculatedDepositAmount)}${fxApproxHtml(calculations.grandTotal - calculatedDepositAmount)}</td>
                  </tr>
              `;
          }

          const theadHTML = isSummary ? `
              <tr style="background-color: #f8fafc;">
                  <th style="padding: 12px; text-align: left; font-size: 14px; color: #334155; border-bottom: 2px solid #e2e8f0; font-weight: bold;">Description</th>
                  <th style="padding: 12px; text-align: right; font-size: 14px; color: #334155; border-bottom: 2px solid #e2e8f0; font-weight: bold;">Total</th>
              </tr>
          ` : `
              <tr style="background-color: #f8fafc;">
                  <th style="padding: 12px; text-align: left; font-size: 14px; color: #334155; border-bottom: 2px solid #e2e8f0; font-weight: bold;">Description</th>
                  <th style="padding: 12px; text-align: right; font-size: 14px; color: #334155; border-bottom: 2px solid #e2e8f0; font-weight: bold;">Qty</th>
                  <th style="padding: 12px; text-align: right; font-size: 14px; color: #334155; border-bottom: 2px solid #e2e8f0; font-weight: bold;">Price</th>
                  <th style="padding: 12px; text-align: right; font-size: 14px; color: #334155; border-bottom: 2px solid #e2e8f0; font-weight: bold;">Total</th>
              </tr>
          `;

          const fullHtml = `
              <!DOCTYPE html>
              <html>
              <head>
                  <title>${quoteInfo.number || 'Invoice'}</title>
                  <style>
                      body { font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; color: #333; padding: 40px; margin: 0; }
                      @media print { 
                          body { padding: 0; -webkit-print-color-adjust: exact; print-color-adjust: exact; } 
                          @page { margin: 0.5in; }
                      }
                  </style>
              </head>
              <body>
                  <div style="max-width: 800px; margin: 0 auto;">
                      <div style="margin-bottom: 50px;">
                          ${companyLogoUrl ? `<img src="${companyLogoUrl}" style="width: 120px; height: auto; margin-bottom: 24px;" />` : ''}
                          <h1 style="margin: 0; font-size: 38px; color: #0f172a; font-weight: bold;">${documentType === 'quote' ? 'Quote' : 'Payment Request'}</h1>
                          <p style="margin: 8px 0 0 0; color: #64748b; font-size: 16px;"># ${quoteInfo.number || 'Draft'}</p>
                      </div>

                      <table width="100%" style="margin-bottom: 50px; border-collapse: collapse;">
                          <tr>
                              <td width="50%" style="vertical-align: top;">
                                  <p style="margin: 0 0 8px 0; font-size: 12px; color: #64748b; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Billed To</p>
                                  <p style="margin: 0; font-size: 18px; font-weight: bold; color: #0f172a;">${setupData.clientDetails.name}</p>
                                  ${setupData.clientDetails.company ? `<p style="margin: 4px 0 0 0; font-size: 14px; color: #475569;">${setupData.clientDetails.company}</p>` : ''}
                              </td>
                              <td width="50%" style="text-align: right; vertical-align: bottom;">
                                  <div style="font-size: 14px; color: #475569; line-height: 1.6;">
                                      <p style="margin: 0;"><strong>Invoice Date:</strong> ${formatDate(quoteInfo.date)}</p>
                                  </div>
                              </td>
                          </tr>
                      </table>

                      <table width="100%" style="border-collapse: collapse; margin-bottom: 40px;">
                          <thead>
                              ${theadHTML}
                          </thead>
                          <tbody>
                              ${tableRowsHTML}
                              ${feesHTML}
                          </tbody>
                          <tfoot>
                              <tr>
                                  <td colspan="${descColSpan}" style="padding: 20px 12px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #0f172a; border-top: 2px solid #cbd5e1;">Grand Total</td>
                                  <td style="padding: 20px 12px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #0f172a; border-top: 2px solid #cbd5e1;">${moneyClient(calculations.grandTotal)}${fxApproxHtml(calculations.grandTotal)}</td>
                              </tr>
                              ${depositHTML}
                          </tfoot>
                      </table>

                      ${(documentType === 'invoice' && paymentLink) ? `
                          <div style="margin-top: 40px; text-align: right;">
                              <a href="${paymentLink.startsWith('http') ? paymentLink : 'https://' + paymentLink}" style="display: inline-block; background-color: #0b0e2c; color: #ffffff; font-weight: bold; padding: 14px 32px; border-radius: 8px; font-size: 16px; text-decoration: underline; text-decoration-color: #0b0e2c; -webkit-text-decoration-color: #0b0e2c;">Pay now</a>
                          </div>
                      ` : ''}

                      ${(documentType === 'invoice' && bankDetails) ? `
                          <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                              <h3 style="font-size: 16px; color: #334155; margin: 0 0 12px 0;">Payment Details</h3>
                              <p style="font-size: 14px; color: #64748b; white-space: pre-wrap; margin: 0; line-height: 1.5;">${escapeHtml(bankDetails)}</p>
                          </div>
                      ` : ''}

                      ${legalInfo ? `
                          <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                              <h3 style="font-size: 16px; color: #334155; margin: 0 0 12px 0;">Legal Information</h3>
                              <p style="font-size: 12px; color: #64748b; white-space: pre-wrap; margin: 0; line-height: 1.5;">${linkifyHtml(legalInfo)}</p>
                          </div>
                      ` : ''}
                  </div>
              </body>
              </html>
          `;

          const printWin = window.open('', '_blank');
          if (!printWin) {
              alert("Please allow pop-ups to generate the PDF.");
              setIsExporting(false);
              return;
          }
          
          printWin.document.open();
          printWin.document.write(fullHtml);
          printWin.document.close();

          setTimeout(() => {
              printWin.focus();
              printWin.print();
              setIsExporting(false);
          }, 500);
      };

const handleSaveQuote = async (options = {}) => {
          const { asCopy = false } = options;
          if (asCopy) setIsDuplicating(true); else setIsSaving(true);

          // When duplicating, force a brand-new record (no quote_id) and a fresh invoice number.
          const effectiveQuoteId = asCopy ? null : currentQuoteId;
          const effectiveQuoteNumber = asCopy
              ? `Q-${Date.now().toString().slice(-6)}`
              : (quoteInfo.number || "Draft");

          try {
              // --- NEW CALCULATIONS FOR THE PAYLOAD ---
              
              // 1. Calculate Absolute Commission & Percentage
              const absoluteCommissionBase = items.reduce((sum, item) => sum + ((Number(item.nettUnitCost || 0) * Number(item.quantity || 0)) * (Number(item.markup || 0) / 100)), 0);
              const absoluteCommissionLocal = absoluteCommissionBase * calculations.rate;
              const commissionPercentage = calculations.grandTotal > 0 ? (absoluteCommissionLocal / calculations.grandTotal) * 100 : 0;

              // 2. Extract & Format Travel Locations (Using 'country')
              const locationsArray = items
                  .map(item => {
                      const matchedSupplier = suppliers.find(s => String(s.id) === String(item.supplierId));
                      return matchedSupplier ? matchedSupplier.country : null; 
                  })
                  .filter((val, index, self) => val && self.indexOf(val) === index); // Removes blanks & duplicates
              const locationsString = locationsArray.join(', ');

              // ----------------------------------------

              const payload = {
                  quote_id: effectiveQuoteId,
                  client_id: setupData.clientId,
                  client_name: setupData.clientDetails.name,
                  quote_number: effectiveQuoteNumber,
                  trip_name: quoteInfo.tripName || "Unnamed Trip",
                  total_amount: calculations.grandTotal,
                  // Amounts are stored in whatever currency the quote is displayed in:
                  // Destination currency normally, or the Payment Currency when the fixed-rate
                  // cost conversion is active.
                  currency: calculations.displayCurrency.code,
                  status: "Draft",
                  // --- Document mode + payment-currency / FX options (consumed by downstream app) ---
                  document_type: documentType,
                  payment_currency: paymentCurrency,
                  convert_deposit_to_payment_currency: convertDepositToPaymentCurrency,
                  convert_cost_to_payment_currency: convertCostToPaymentCurrency,
                  fixed_fx_rate: fixedFxRate === '' ? null : Number(fixedFxRate),
                  app_data: {
                      setupData,
                      quoteInfo: asCopy ? { ...quoteInfo, number: effectiveQuoteNumber } : quoteInfo,
                      currencySettings,
                      items,
                      fees,
                      depositType,
                      depositValue,
                      depositDueDate,
                      balanceDueDate,
                      selectedPaymentPreset,
                      paymentLink,
                      selectedBankPreset,
                      documentType,
                      paymentCurrency,
                      convertDepositToPaymentCurrency,
                      convertCostToPaymentCurrency,
                      fixedFxRate,
                      companyLogoUrl,
                      summaryNotes,
                      invoiceView,
                      bankDetails,
                      legalInfo,
                      creditCardFeeInclusion,
                      creditCardFeePreset,
                      // --- ADDING CLEAN DATA FOR XANO ---
                      calculated_deposit_amount: calculatedDepositAmount,
                      calculated_balance_amount: calculations.grandTotal - calculatedDepositAmount,
                      absolute_commission_local: absoluteCommissionLocal,
                      commission_percentage: commissionPercentage,
                      travel_locations: locationsString
                  }
              };

              if (window.Wized && window.Wized.data) {
                  if (!window.Wized.data.v) window.Wized.data.v = {};
                  window.Wized.data.v.quote_payload = payload;

                  if (effectiveQuoteId) {
                      await Wized.requests.execute('update_quote');
                  } else {
                      await Wized.requests.execute('save_new_quote');
                  }

                  window.location.href = '/booking-tracker/all-quotes';

              } else {
                  throw new Error("Wized not found");
              }
          } catch (error) {
              console.error("Failed to save quote:", error);
              alert(asCopy ? "There was an issue duplicating the quote." : "There was an issue saving the quote.");
              if (asCopy) setIsDuplicating(false); else setIsSaving(false);
          }
      };

      return (
          <div className="tw-font-sans tw-bg-transparent tw-min-h-screen tw-p-2 lg:tw-p-4">
              <div className="tw-max-w-7xl tw-mx-auto tw-grid tw-grid-cols-1 lg:tw-grid-cols-5 tw-gap-8">
                  
                  {/* Left Controls */}
                  <div className="lg:tw-col-span-2 tw-space-y-6">
                      
                      <button 
                          type="button" 
                          onClick={onBack} 
                          style={{ backgroundColor: 'transparent' }}
                          className="tw-flex tw-items-center tw-gap-2 tw-text-slate-500 hover:tw-text-[#303350] tw-font-medium tw-transition-colors tw-border-none tw-shadow-none tw-p-0 tw-mb-2 tw-cursor-pointer"
                      >
                          <svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="19" y1="12" x2="5" y2="12"></line><polyline points="12 19 5 12 5"></polyline></svg>
                          Back to Setup
                      </button>

                      <ControlCard title="Branding" defaultOpen={false} isComplete={isBrandingComplete}>
                          <div className="tw-flex tw-flex-col tw-gap-3">
                              <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-m-0">Company Logo</label>
                              {companyLogoUrl ? (
                                  <div className="tw-flex tw-items-center tw-justify-between tw-p-4 tw-border tw-border-solid tw-border-slate-200 tw-rounded-lg tw-bg-slate-50 tw-gap-4">
                                      <img src={companyLogoUrl} alt="Logo Preview" className="tw-h-12 tw-w-auto tw-max-w-[65%] tw-object-contain" />
                                      <button type="button" onClick={() => setCompanyLogoUrl('')} className="tw-shrink-0 tw-text-sm tw-text-red-500 hover:tw-text-red-700 tw-font-medium tw-bg-transparent tw-border-none tw-cursor-pointer">
                                          Remove
                                      </button>
                                  </div>
                              ) : (
                                  <div className="tw-relative tw-border-2 tw-border-dashed tw-border-slate-300 tw-rounded-lg tw-p-8 tw-text-center hover:tw-bg-slate-50 tw-transition-colors tw-cursor-pointer">
                                      <input type="file" accept="image/*" onChange={handleLogoUpload} className="tw-absolute tw-inset-0 tw-w-full tw-h-full tw-opacity-0 tw-cursor-pointer" title="Upload Logo" />
                                      <div className="tw-text-slate-500 tw-flex tw-flex-col tw-items-center tw-gap-2">
                                          <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
                                          <span className="tw-text-sm tw-font-medium">Click or drag image to upload</span>
                                      </div>
                                  </div>
                              )}
                          </div>
                      </ControlCard>

                      <ControlCard title="Details" defaultOpen={true} isComplete={isDetailsComplete}>
                          <div className="tw-space-y-4">
                              <div className="tw-grid tw-grid-cols-1 tw-gap-4">
                                  <InputField icon={<Briefcase size={16}/>} label="Trip Name" value={quoteInfo.tripName || ''} onChange={(e) => setQuoteInfo({...quoteInfo, tripName: e.target.value})} placeholder="e.g. Summer in Italy" />
                              </div>
                              <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                                  <InputField type="date" label="Travel Start Date" value={quoteInfo.travelStartDate || ''} onChange={(e) => handleDateChange('travelStartDate', e.target.value)} />
                                  <InputField type="date" label="Travel End Date" value={quoteInfo.travelEndDate || ''} onChange={(e) => handleDateChange('travelEndDate', e.target.value)} min={quoteInfo.travelStartDate || ''} />
                              </div>
                              <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                                  <InputField icon={<Hash size={16}/>} label="Invoice #" value={quoteInfo.number} onChange={(e) => setQuoteInfo({...quoteInfo, number: e.target.value})} />
                                  <InputField icon={<Calendar size={16}/>} label="Invoice Date" type="date" value={quoteInfo.date} onChange={(e) => setQuoteInfo({...quoteInfo, date: e.target.value})} />
                              </div>
                              <div className="tw-pt-2 tw-border-t tw-border-solid tw-border-slate-100">
                                  <CurrencySelector
                                      label="Destination Currency"
                                      value={currencySettings.base}
                                      onChange={(e) => handleCurrencyChange('base', e.target.value)}
                                  />
                              </div>
                          </div>
                      </ControlCard>

                      <ControlCard title={`Travel Services (${calculations.baseCurrency.code} Pricing)`} isComplete={isTravelComplete}>
                          <div className="tw-space-y-4">
                              {items.map((item) => {
                                  
                                  const filteredSupplierOptions = suppliers
                                      .filter(s => {
                                          if (!s._supplier_type || !s._supplier_type.name) return true;
                                          return String(s._supplier_type.name).trim().toLowerCase() === String(item.category).trim().toLowerCase();
                                      })
                                      .map(s => ({ value: s.id, label: s.name }));

                                  return (
                                  <div key={item.id} className="tw-bg-slate-50/80 tw-p-5 tw-rounded-xl tw-border tw-border-solid tw-border-slate-200">
                                      
                                      <div className="tw-space-y-4 tw-mb-4">
                                          <div className="tw-flex tw-justify-between tw-items-end tw-gap-4">
                                              <div className="tw-flex-grow">
                                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0">Category</label>
                                                  <select
                                                      className="tw-w-full tw-h-10 tw-px-3 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md tw-bg-white tw-text-sm tw-text-slate-700 focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350]"
                                                      value={item.category}
                                                      onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                                                  >
                                                      {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                  </select>
                                              </div>
                                              
                                              <div className="tw-flex tw-gap-1 tw-mb-0.5">
                                                  <button 
                                                      type="button" 
                                                      onClick={() => handleDuplicateItem(item.id)} 
                                                      className="tw-text-slate-400 hover:tw-text-[#303350] tw-p-2 tw-transition-colors tw-flex-shrink-0" 
                                                      style={{ background: 'transparent', border: 'none' }}
                                                      title="Duplicate Service"
                                                  >
                                                      <Copy size={20} />
                                                  </button>
                                                  <button 
                                                      type="button" 
                                                      onClick={() => handleDeleteItem(item.id)} 
                                                      className="tw-text-slate-400 hover:tw-text-red-500 tw-p-2 tw-transition-colors tw-flex-shrink-0" 
                                                      style={{ background: 'transparent', border: 'none' }}
                                                      title="Delete Service"
                                                  >
                                                      <Trash2 size={20} />
                                                  </button>
                                              </div>
                                          </div>

                                          <div>
                                              <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0">Supplier (optional)</label>
                                              <SearchableSelect 
                                                  options={filteredSupplierOptions}
                                                  value={item.supplierId}
                                                  onChange={(val) => handleUpdateItem(item.id, 'supplierId', val)}
                                                  placeholder="Search supplier..."
                                                  emptyLabel="+ Add new supplier"
                                                  onEmptyClick={handleAddSupplier}
                                              />
                                          </div>
                                      </div>

                                      <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0">Description</label>
                                      <input type="text" placeholder="e.g. 5 nights at Capella Bangkok" value={item.description} onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)} className="tw-w-full tw-h-10 tw-px-3 tw-text-sm tw-border tw-border-solid tw-border-slate-300 tw-rounded-md tw-mb-4 focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350]" />
                                      
                                      <div className="tw-grid tw-grid-cols-3 tw-gap-3 tw-items-end">
                                          <MiniInputField label={item.category === 'Hotel' ? "# nights" : "Qty"} type="number" value={item.quantity} onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)} />
                                         {pricingModel === 'nett' ? (
                                              <MiniInputField label={item.category === 'Hotel' ? "Nett nightly cost" : "Nett Unit Cost"} type="number" value={item.nettUnitCost} onChange={(e) => handleUpdateItem(item.id, 'nettUnitCost', e.target.value)} symbol={calculations.baseCurrency.symbol} />
                                          ) : (
                                              <MiniInputField label={item.category === 'Hotel' ? "Gross nightly price" : "Gross Unit Price"} type="number" value={item.grossUnitCost ?? (item.nettUnitCost ? (Number(item.nettUnitCost) * (1 + (Number(item.markup || 0) / 100))) : '')} onChange={(e) => handleUpdateItem(item.id, 'grossUnitCost', e.target.value)} symbol={calculations.baseCurrency.symbol} />
                                          )}
                                          <MiniInputField label={pricingModel === 'nett' ? "Markup (%)" : "Commission (%)"} type="number" value={item.markup} onChange={(e) => handleUpdateItem(item.id, 'markup', e.target.value)} symbol="%" />
                                      </div>
                                      
                                      <div className="tw-flex tw-items-center tw-justify-between tw-mt-4 tw-pt-4 tw-border-t tw-border-solid tw-border-slate-200/60">
                                          <div className="tw-flex tw-items-center tw-gap-2">
                                              <input 
                                                  type="checkbox" 
                                                  id={`deposit-${item.id}`} 
                                                  checked={!!item.isFullDeposit} 
                                                  onChange={(e) => handleUpdateItem(item.id, 'isFullDeposit', e.target.checked)} 
                                                  className="tw-w-4 tw-h-4 tw-text-[#303350] tw-rounded tw-border-slate-300 focus:tw-ring-[#303350] tw-cursor-pointer" 
                                              />
                                              <label htmlFor={`deposit-${item.id}`} className="tw-text-sm tw-font-medium tw-text-slate-600 tw-m-0 tw-cursor-pointer">Require 100% upfront as deposit</label>
                                          </div>
                                          <div className="tw-text-right tw-text-sm tw-font-semibold tw-text-[#303350]">
                                              Line total (Base): {moneyBase((Number(item.quantity || 0) * Number(item.nettUnitCost || 0)) * (1 + (Number(item.markup || 0)/100)) * (creditCardFeeInclusion === 'included' ? (1 + (Number(fees.creditCardFee) || 0)/100) : 1))}
                                          </div>
                                      </div>
                                  </div>
                              )})}
                              <button type="button" onClick={handleAddItem} className="tw-w-full tw-flex tw-items-center tw-justify-center tw-gap-2 tw-bg-slate-100 tw-text-slate-700 tw-border tw-border-solid tw-border-slate-300 tw-py-3 tw-rounded-xl tw-font-semibold hover:tw-bg-slate-200 tw-transition-colors">
                                  <Plus size={18} /> Add Service
                              </button>
                              {(() => {
                                  const nettBase = items.reduce((s, it) => s + (Number(it.nettUnitCost || 0) * Number(it.quantity || 0)), 0);
                                  const grossBase = items.reduce((s, it) => s + (Number(it.nettUnitCost || 0) * (1 + (Number(it.markup || 0) / 100)) * Number(it.quantity || 0)), 0);
                                  // Nett model: commission = markup earned (gross − nett).
                                  // Gross model: commission is a % OF the gross client price.
                                  const commissionBase = pricingModel === 'gross'
                                      ? items.reduce((s, it) => s + (Number(it.nettUnitCost || 0) * (1 + (Number(it.markup || 0) / 100)) * Number(it.quantity || 0) * (Number(it.markup || 0) / 100)), 0)
                                      : (grossBase - nettBase);
                                  const commissionPct = grossBase > 0 ? (commissionBase / grossBase) * 100 : 0;
                                  return (
                                      <div className="tw-mt-4 tw-rounded-xl tw-border tw-border-dashed tw-border-amber-300 tw-bg-amber-50/70 tw-p-4">
                                          <div className="tw-flex tw-items-center tw-gap-2 tw-mb-3">
                                              <span className="tw-inline-flex tw-items-center tw-whitespace-nowrap tw-text-[11px] tw-font-bold tw-uppercase tw-tracking-wide tw-text-amber-700 tw-bg-amber-100 tw-px-2.5 tw-py-1 tw-rounded-full tw-leading-none">Internal</span>
                                              <span className="tw-text-xs tw-text-amber-700/80 tw-m-0">Not shown on quote/invoice</span>
                                          </div>
                                          <div className="tw-grid tw-grid-cols-2 tw-gap-x-4 tw-gap-y-2 tw-text-sm">
                                              <span className="tw-text-slate-600">Total nett cost</span>
                                              <span className="tw-text-right tw-font-semibold tw-text-slate-800">{moneyBase(nettBase)}</span>
                                              <span className="tw-text-slate-600">Total gross (before fees)</span>
                                              <span className="tw-text-right tw-font-semibold tw-text-slate-800">{moneyBase(grossBase)}</span>
                                              <span className="tw-text-slate-700 tw-font-medium tw-pt-2 tw-border-t tw-border-solid tw-border-amber-200">Expected commission</span>
                                              <span className="tw-text-right tw-font-bold tw-text-emerald-700 tw-pt-2 tw-border-t tw-border-solid tw-border-amber-200">{moneyBase(commissionBase)} <span className="tw-text-slate-400 tw-font-normal">({commissionPct.toFixed(1)}%)</span></span>
                                          </div>
                                      </div>
                                  );
                              })()}
                          </div>
                      </ControlCard>

                      <ControlCard title="Display Options" defaultOpen={false} isComplete={isDisplayComplete}>
                          <div className="tw-space-y-4">
                              <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-m-0">Invoice View Layout</label>
                              <div className="tw-grid tw-grid-cols-2 tw-gap-2 tw-w-full">
                                  {DISPLAY_OPTIONS.map(opt => (
                                      <div 
                                          key={opt.id}
                                          onClick={() => setInvoiceView(opt.id)}
                                          className={`tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-3 tw-rounded-lg tw-cursor-pointer tw-border tw-transition-colors ${invoiceView === opt.id ? 'tw-bg-[#303350] tw-border-[#303350] tw-text-white' : 'tw-bg-slate-50 tw-border-slate-200 tw-text-slate-700 hover:tw-bg-slate-100'}`}
                                      >
                                          <span className="tw-font-bold tw-text-sm tw-mb-1">{opt.label}</span>
                                          <span className={`tw-text-xs tw-text-center ${invoiceView === opt.id ? 'tw-text-slate-300' : 'tw-text-slate-500'}`}>{opt.desc}</span>
                                      </div>
                                  ))}
                              </div>
                              {invoiceView === 'summary' && ( 
                                  <div className="tw-mt-4"> 
                                      <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0">Summary Description</label> 
                                      <textarea rows="3" className="tw-w-full tw-p-2 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350]" value={summaryNotes} onChange={(e) => setSummaryNotes(e.target.value)} placeholder="Enter a custom description..." /> 
                                  </div> 
                              )}
                          </div>
                      </ControlCard>

                      <ControlCard title="Additional Fees" defaultOpen={false} isComplete={isFeesComplete}>
                          <div className="tw-space-y-5">
                              {/* UK Package toggle */}
                              <label htmlFor="isUKPackage" className="tw-flex tw-items-center tw-justify-between tw-px-4 tw-py-3 tw-bg-slate-50 tw-rounded-lg tw-border tw-border-solid tw-border-slate-200 tw-cursor-pointer hover:tw-bg-slate-100 tw-transition-colors tw-m-0">
                                  <div>
                                      <div className="tw-text-sm tw-font-medium tw-text-slate-700">UK Package trip?</div>
                                      <div className="tw-text-xs tw-text-slate-500 tw-mt-0.5">Adds 1.12% FFI</div>
                                  </div>
                                  <input id="isUKPackage" name="isUKPackage" type="checkbox" checked={fees.isUKPackage} onChange={handleFeeChange} className="tw-h-5 tw-w-5 tw-text-[#303350] tw-rounded tw-border-gray-300 focus:tw-ring-[#303350] tw-cursor-pointer" />
                              </label>

                              {/* Fee display: segmented control */}
                              <div>
                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0">Fee display</label>
                                  <div className="tw-grid tw-grid-cols-2 tw-gap-2">
                                      {[
                                          { id: 'included', label: 'Included', desc: 'Roll into prices' },
                                          { id: 'separate', label: 'Separate', desc: 'Show as line items' }
                                      ].map(opt => (
                                          <div
                                              key={opt.id}
                                              onClick={() => setCreditCardFeeInclusion(opt.id)}
                                              className={`tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-3 tw-rounded-lg tw-cursor-pointer tw-border tw-transition-colors ${creditCardFeeInclusion === opt.id ? 'tw-bg-[#303350] tw-border-[#303350] tw-text-white' : 'tw-bg-slate-50 tw-border-slate-200 tw-text-slate-700 hover:tw-bg-slate-100'}`}
                                          >
                                              <span className="tw-font-bold tw-text-sm tw-mb-1">{opt.label}</span>
                                              <span className={`tw-text-xs tw-text-center ${creditCardFeeInclusion === opt.id ? 'tw-text-slate-300' : 'tw-text-slate-500'}`}>{opt.desc}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              {/* Fee inputs */}
                              <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4 tw-items-start">
                                  {/* CC Fee */}
                                  <div>
                                      <div className="tw-flex tw-items-center tw-mb-1.5 tw-h-5">
                                          <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-m-0 tw-leading-5">Credit card fee</label>
                                          <div className="tw-relative tw-group tw-inline-flex tw-items-center tw-cursor-pointer tw-ml-1.5">
                                              <span className="tw-text-slate-400 group-hover:tw-text-[#303350] tw-transition-colors tw-flex tw-items-center">
                                                  <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>
                                              </span>
                                              <div className="tw-absolute tw-bottom-full tw-left-1/2 tw--translate-x-1/2 tw-pb-2 tw-hidden group-hover:tw-block tw-w-52 tw-z-50">
                                                  <div className="tw-p-2.5 tw-bg-slate-800 tw-text-white tw-text-xs tw-rounded-md tw-shadow-lg tw-text-center tw-relative tw-font-normal tw-leading-relaxed">
                                                      See up-to-date CC fee details <a href="https://drive.google.com/file/d/1nK7tJ9wh-cuXYP_w3bSjZ_ql0V7VlVGO/view?usp=drive_link" target="_blank" rel="noopener noreferrer" className="tw-text-blue-300 hover:tw-text-blue-100 hover:tw-underline tw-font-semibold">here</a>.
                                                      <div className="tw-absolute tw-top-full tw-left-1/2 tw--translate-x-1/2 tw-border-4 tw-border-transparent tw-border-t-slate-800"></div>
                                                  </div>
                                              </div>
                                          </div>
                                      </div>
                                      <select
                                          value={creditCardFeePreset}
                                          onChange={(e) => {
                                              const id = e.target.value;
                                              setCreditCardFeePreset(id);
                                              const preset = CC_FEE_PRESETS.find(p => p.id === id);
                                              if (preset && preset.value !== null) {
                                                  setFees(prev => ({ ...prev, creditCardFee: String(preset.value) }));
                                              } else {
                                                  setFees(prev => ({ ...prev, creditCardFee: '' }));
                                              }
                                          }}
                                          className="tw-w-full tw-h-10 tw-px-3 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] tw-bg-white tw-text-sm tw-text-slate-700"
                                      >
                                          {CC_FEE_PRESETS.map(p => <option key={p.id} value={p.id}>{p.label}</option>)}
                                      </select>
                                      {creditCardFeePreset === 'custom' && (
                                          <div className="tw-mt-2 tw-relative">
                                              <input
                                                  type="number"
                                                  name="creditCardFee"
                                                  value={fees.creditCardFee}
                                                  onChange={handleFeeChange}
                                                  step="0.1"
                                                  placeholder="Enter %"
                                                  className="tw-w-full tw-h-10 tw-px-3 tw-pr-8 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] tw-text-right tw-text-sm"
                                              />
                                              <span className="tw-absolute tw-right-3 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400 tw-text-sm">%</span>
                                          </div>
                                      )}
                                  </div>
                                  {/* Other Fees */}
                                  <div>
                                      <div className="tw-flex tw-items-center tw-mb-1.5 tw-h-5">
                                          <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-m-0 tw-leading-5">Other fees</label>
                                      </div>
                                      <div className="tw-relative">
                                          <span className="tw-absolute tw-left-3 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400 tw-text-sm">{calculations.baseCurrency.symbol}</span>
                                          <input
                                              name="otherFees"
                                              type="number"
                                              value={fees.otherFees}
                                              onChange={handleFeeChange}
                                              placeholder="0.00"
                                              className="tw-w-full tw-h-10 tw-pl-7 tw-pr-3 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] tw-text-sm"
                                          />
                                      </div>
                                  </div>
                              </div>
                          </div>
                      </ControlCard>

                      <ControlCard title="Payments" defaultOpen={false} isComplete={isPaymentsComplete}>
                          <div className="tw-space-y-4">
                              <div>
                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0">Document Type</label>
                                  <div className="tw-grid tw-grid-cols-2 tw-gap-2">
                                      {[
                                          { id: 'quote', label: 'Quote', desc: 'No bank details or payment link' },
                                          { id: 'invoice', label: 'Invoice', desc: 'Bank, payment currency & link' }
                                      ].map(opt => (
                                          <div
                                              key={opt.id}
                                              onClick={() => setDocumentType(opt.id)}
                                              className={`tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-3 tw-rounded-lg tw-cursor-pointer tw-border tw-transition-colors ${documentType === opt.id ? 'tw-bg-[#303350] tw-border-[#303350] tw-text-white' : 'tw-bg-slate-50 tw-border-slate-200 tw-text-slate-700 hover:tw-bg-slate-100'}`}
                                          >
                                              <span className="tw-font-bold tw-text-sm tw-mb-1">{opt.label}</span>
                                              <span className={`tw-text-xs tw-text-center ${documentType === opt.id ? 'tw-text-slate-300' : 'tw-text-slate-500'}`}>{opt.desc}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>

                              {documentType === 'invoice' && (
                                  <div className="tw-space-y-3 tw-rounded-lg tw-border tw-border-solid tw-border-slate-200 tw-bg-slate-50/60 tw-p-4">
                                      <div>
                                          <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0">Payment Currency</label>
                                          <select value={paymentCurrency} onChange={(e) => setPaymentCurrency(e.target.value)} className="tw-w-full tw-h-10 tw-px-3 tw-text-sm tw-text-slate-700 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] tw-bg-white">
                                              {PAYMENT_CURRENCIES.map(c => <option key={c} value={c}>{c}</option>)}
                                          </select>
                                      </div>
                                      <div>
                                          <InputField icon={<ArrowRightLeft size={16}/>} label={`Exchange Rate (1 ${currencySettings.base} = ? ${paymentCurrency})`} type="number" value={currencySettings.rate} onChange={(e) => setCurrencySettings({...currencySettings, rate: e.target.value})} step="0.0001" />
                                          <div className="tw-flex tw-items-center tw-justify-between tw-gap-2 tw-mt-1.5">
                                              <span className="tw-text-xs tw-m-0 tw-leading-tight">
                                                  {fxStatus.loading
                                                      ? <span className="tw-text-slate-500">Fetching live rate…</span>
                                                      : fxStatus.error
                                                          ? <span className="tw-text-red-500">{fxStatus.error}</span>
                                                          : (fxStatus.spotRate != null
                                                              ? <span className="tw-text-slate-500">Live spot {Number(fxStatus.spotRate).toFixed(4)} + CT margin {Number(fxStatus.margin).toFixed(4)} = <span className="tw-font-semibold tw-text-slate-700">{Number(currencySettings.rate).toFixed(4)}</span></span>
                                                              : <span className="tw-text-slate-400">Enter a rate or refresh the live rate.</span>)}
                                              </span>
                                              <button type="button" onClick={() => refreshLiveRate(currencySettings.base, paymentCurrency)} disabled={fxStatus.loading} className="tw-flex-shrink-0 tw-text-xs tw-font-semibold tw-text-[#303350] hover:tw-underline disabled:tw-opacity-50" style={{ background: 'transparent', border: 'none', cursor: fxStatus.loading ? 'default' : 'pointer' }}>Refresh</button>
                                          </div>
                                      </div>
                                      <label className="tw-flex tw-items-start tw-gap-2.5 tw-cursor-pointer">
                                          <input type="checkbox" checked={convertDepositToPaymentCurrency} onChange={(e) => setConvertDepositToPaymentCurrency(e.target.checked)} className="tw-mt-0.5 tw-w-4 tw-h-4 tw-text-[#303350] tw-rounded tw-border-slate-300 focus:tw-ring-[#303350] tw-cursor-pointer" />
                                          <span className="tw-text-sm tw-text-slate-700 tw-m-0">Convert deposit to Payment Currency using our FX rate</span>
                                      </label>
                                      <label className="tw-flex tw-items-start tw-gap-2.5 tw-cursor-pointer">
                                          <input type="checkbox" checked={convertCostToPaymentCurrency} onChange={(e) => setConvertCostToPaymentCurrency(e.target.checked)} className="tw-mt-0.5 tw-w-4 tw-h-4 tw-text-[#303350] tw-rounded tw-border-slate-300 focus:tw-ring-[#303350] tw-cursor-pointer" />
                                          <span className="tw-text-sm tw-text-slate-700 tw-m-0">Convert cost to Payment Currency based on a fixed FX rate</span>
                                      </label>
                                      {convertCostToPaymentCurrency && (
                                          <div className="tw-pl-6">
                                              <InputField label={`Fixed FX Rate (1 ${currencySettings.base} = ? ${paymentCurrency})`} type="number" value={fixedFxRate} onChange={(e) => setFixedFxRate(e.target.value)} step="0.0001" placeholder="e.g. 0.7850" />
                                          </div>
                                      )}
                                  </div>
                              )}

                              <div>
                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0">Deposit Type</label>
                                  <div className="tw-grid tw-grid-cols-2 tw-gap-2">
                                      {[
                                          { id: 'amount', label: 'Amount', desc: 'A fixed deposit figure' },
                                          { id: 'percentage', label: 'Percentage', desc: '% of the grand total' }
                                      ].map(opt => (
                                          <div
                                              key={opt.id}
                                              onClick={() => setDepositType(opt.id)}
                                              className={`tw-flex tw-flex-col tw-items-center tw-justify-center tw-p-3 tw-rounded-lg tw-cursor-pointer tw-border tw-transition-colors ${depositType === opt.id ? 'tw-bg-[#303350] tw-border-[#303350] tw-text-white' : 'tw-bg-slate-50 tw-border-slate-200 tw-text-slate-700 hover:tw-bg-slate-100'}`}
                                          >
                                              <span className="tw-font-bold tw-text-sm tw-mb-1">{opt.label}</span>
                                              <span className={`tw-text-xs tw-text-center ${depositType === opt.id ? 'tw-text-slate-300' : 'tw-text-slate-500'}`}>{opt.desc}</span>
                                          </div>
                                      ))}
                                  </div>
                              </div>
                              <div>
                                  <InputField label="Deposit Due Amount" type="number" value={depositValue} onChange={(e) => setDepositValue(e.target.value)} icon={depositType === 'amount' ? <span>{calculations.baseCurrency.symbol}</span> : null} symbol={depositType === 'percentage' ? '%' : null} />
                                  {items.some(it => it.isFullDeposit) && depositType === 'percentage' && (
                                      <p className="tw-text-xs tw-text-emerald-600 tw-font-medium tw-mt-1.5 tw-m-0">
                                          * Items marked "100% upfront" are automatically covered in the deposit on top of this percentage.
                                      </p>
                                  )}
                                  {items.some(it => it.isFullDeposit) && depositType === 'amount' && (
                                      <p className="tw-text-xs tw-text-slate-500 tw-font-medium tw-mt-1.5 tw-m-0">
                                          * Make sure the amount you enter already includes any items marked "100% upfront".
                                      </p>
                                  )}
                                  {calculatedDepositAmount > 0 && (!depositDueDate || !balanceDueDate) && (
                                      <p className="tw-text-xs tw-text-red-500 tw-font-medium tw-mt-2 tw-m-0">
                                          * Please select both Deposit and Balance due dates since a deposit is required.
                                      </p>
                                  )}
                              </div>
                              <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                                  <InputField label="Deposit Due Date" type="date" value={depositDueDate} onChange={(e) => setDepositDueDate(e.target.value)} />
                                  <InputField label="Balance Due Date" type="date" value={balanceDueDate} onChange={(e) => setBalanceDueDate(e.target.value)} />
                              </div>
                              
                              {documentType === 'invoice' && (
                              <div className="tw-mt-4">
                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0 tw-leading-5">Payment Link Preset</label>
                                  <select value={selectedPaymentPreset} onChange={handlePaymentPresetChange} className="tw-w-full tw-h-10 tw-px-3 tw-text-sm tw-text-slate-700 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] tw-bg-white">
                                      {PRESET_PAYMENT_LINKS.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                                  </select>
                                  {['gbp', 'custom'].includes(selectedPaymentPreset) && (
                                      <p className="tw-text-xs tw-text-amber-600 tw-mt-1.5 tw-m-0">Amex GBP requires to request Link</p>
                                  )}

                                  {selectedPaymentPreset === 'custom' && (
                                      <div className="tw-mt-3">
                                          <InputField label="Custom URL" type="url" value={paymentLink} onChange={(e) => setPaymentLink(e.target.value)} placeholder="https://buy.stripe.com/..." />
                                      </div>
                                  )}
                              </div>
                              )}
                          </div>
                      </ControlCard>

                      <ControlCard title="Bank details & legal" defaultOpen={false} isComplete={isBankComplete}>
                          <div className="tw-space-y-4">
                              {documentType === 'invoice' ? (
                              <>
                              <div>
                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-600 tw-mb-1.5 tw-m-0 tw-leading-5">Account Preset</label>
                                  <select value={selectedBankPreset} onChange={handleBankPresetChange} className="tw-w-full tw-h-10 tw-px-3 tw-text-sm tw-text-slate-700 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] tw-bg-white">
                                      {PRESET_BANK_ACCOUNTS.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                                      <option value="custom">Custom</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-600 tw-mb-1.5 tw-m-0">Bank Details</label>
                                  <textarea rows="4" className="tw-w-full tw-p-2 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-[#303350]" value={bankDetails} onChange={(e) => {setBankDetails(e.target.value); setSelectedBankPreset('custom');}} placeholder="Bank details here..." />
                              </div>
                              </>
                              ) : (
                                  <p className="tw-text-xs tw-text-slate-500 tw-m-0 tw-bg-slate-50 tw-rounded-md tw-p-3 tw-border tw-border-solid tw-border-slate-200">Bank details are hidden on a Quote. Switch to "Invoice" in the Payments section to add them.</p>
                              )}
                              <div>
                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-600 tw-mb-1.5 tw-m-0">Legal Information</label>
                                  <textarea rows="4" className="tw-w-full tw-p-2 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-[#303350]" value={legalInfo} onChange={(e) => setLegalInfo(e.target.value)} placeholder="Terms and conditions..." />
                              </div>
                          </div>
                      </ControlCard>

                      {/* ACTION BUTTONS (Save Quote, Save as Copy & Export PDF) */}
                      <div className="tw-flex tw-flex-col sm:tw-flex-row tw-gap-4 tw-mt-6">
                        <button
                              type="button"
                              onClick={() => handleSaveQuote()}
                              disabled={isSaving || isDuplicating}
                              className="tw-flex-1 tw-bg-white tw-text-[#0b0e2c] tw-py-4 tw-rounded-xl tw-font-semibold hover:tw-bg-slate-50 tw-transition-colors tw-text-lg tw-shadow-sm tw-cursor-pointer disabled:tw-opacity-50"
                              style={{ border: '1px solid #0b0e2c' }}
                          >
                              {isSaving ? 'Saving...' : 'Save quote'}
                          </button>
                          {currentQuoteId && (
                          <button
                              type="button"
                              onClick={() => handleSaveQuote({ asCopy: true })}
                              disabled={isSaving || isDuplicating}
                              title="Save a brand-new copy of this quote with a fresh invoice number (the current quote stays as it is)"
                              className="tw-flex-1 tw-bg-white tw-text-slate-600 tw-py-4 tw-rounded-xl tw-font-semibold hover:tw-bg-slate-50 tw-transition-colors tw-text-lg tw-shadow-sm tw-cursor-pointer disabled:tw-opacity-50"
                              style={{ border: '1px solid #cbd5e1' }}
                          >
                              {isDuplicating ? 'Copying...' : 'Copy quote'}
                          </button>
                          )}
                          <button
                              type="button"
                              onClick={handlePrintPdf}
                              disabled={isExporting}
                              className="tw-flex-1 tw-bg-[#0b0e2c] tw-text-white tw-py-4 tw-rounded-xl tw-font-semibold hover:tw-opacity-90 tw-transition-opacity tw-text-lg tw-shadow-md tw-border-none disabled:tw-opacity-50 tw-cursor-pointer"
                          >
                              {isExporting ? 'Generating PDF...' : 'Export as PDF'}
                          </button>
                      </div>

                  </div>

                  {/* Right Preview */}
                  <div className="lg:tw-col-span-3">
                      <div className="tw-sticky tw-top-8">
                          <div className="tw-bg-white tw-rounded-2xl tw-shadow-[0_8px_30px_rgb(0,0,0,0.04)] tw-border tw-border-solid tw-border-slate-100 tw-p-8 sm:tw-p-12 tw-block">
                              <div className="tw-mb-8">
                                  {companyLogoUrl && <img src={companyLogoUrl} alt="Logo" className="tw-w-[120px] tw-h-auto tw-mb-6" crossOrigin="anonymous" />}
                                  <div className="tw-flex tw-justify-between tw-items-end">
                                      <div><h1 className="tw-text-4xl tw-font-bold tw-text-slate-900 tw-m-0">{documentType === 'quote' ? 'Quote' : 'Payment Request'}</h1><p className="tw-text-slate-500 tw-mt-2 tw-m-0"># {quoteInfo.number}</p></div>
                                  </div>
                              </div>
                              <div className="tw-flex tw-justify-between tw-items-end tw-border-b tw-border-solid tw-border-slate-100 tw-pb-8 tw-mb-8"> 
                                  <div>
                                      <p className="tw-font-semibold tw-text-slate-400 tw-text-xs tw-uppercase tw-tracking-wider tw-mb-2 tw-m-0">Billed To</p>
                                      <p className="tw-font-bold tw-text-slate-900 tw-text-xl tw-m-0">{setupData.clientDetails.name}</p>
                                      {setupData.clientDetails.company && <p className="tw-text-slate-600 tw-mt-1 tw-m-0">{setupData.clientDetails.company}</p>}
                                  </div>
                                  <div className="tw-text-right tw-text-sm tw-text-slate-600 tw-space-y-1">
                                      <p className="tw-m-0"><span className="tw-font-semibold">Invoice Date:</span> {formatDate(quoteInfo.date)}</p>
                                  </div>
                              </div>
                              <div className="tw-mt-10">
                                  <table className="tw-w-full tw-text-left tw-border-collapse">
                                      <thead>
                                          <tr className="tw-bg-slate-50 tw-text-slate-700 tw-text-sm">
                                              <th className={`tw-p-4 tw-font-semibold tw-rounded-l-xl tw-border-b tw-border-solid tw-border-slate-100 ${invoiceView === 'summary' ? 'tw-rounded-r-none' : ''}`}>Description</th>
                                              {invoiceView !== 'summary' && <th className="tw-p-4 tw-font-semibold tw-text-right tw-border-b tw-border-solid tw-border-slate-100">Qty</th>}
                                              {invoiceView !== 'summary' && <th className="tw-p-4 tw-font-semibold tw-text-right tw-border-b tw-border-solid tw-border-slate-100">Price</th>}
                                              <th className="tw-p-4 tw-font-semibold tw-text-right tw-rounded-r-xl tw-border-b tw-border-solid tw-border-slate-100">Total</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {invoiceView === 'detailed' && items.map((it) => {
                                              const itemPriceBase = (Number(it.nettUnitCost || 0) * (1 + (Number(it.markup || 0)/100)));
                                              const itemPriceClient = itemPriceBase * calculations.rate;
                                              const itemTotalClient = itemPriceClient * Number(it.quantity || 0);
                                              const catIcon = CATEGORIES[it.category];
                                              return <tr key={it.id} className="tw-border-b tw-border-solid tw-border-slate-100 last:tw-border-0"><td className="tw-p-4"><div className="tw-flex tw-items-center tw-gap-3">{catIcon && <img src={catIcon} alt="" className="tw-w-6 tw-h-6 tw-object-contain" crossOrigin="anonymous" />}<div><div className="tw-text-slate-900 tw-font-medium">{it.description || "—"}</div>{it.supplierId && <div className="tw-text-sm tw-text-slate-500 tw-mt-1">Supplier: {suppliers.find(s => String(s.id) === String(it.supplierId))?.name}</div>}</div></div></td><td className="tw-p-4 tw-text-right tw-text-slate-700 tw-align-middle">{it.quantity}</td><td className="tw-p-4 tw-text-right tw-text-slate-700 tw-align-middle">{moneyClient(itemPriceClient)}</td><td className="tw-p-4 tw-text-right tw-font-semibold tw-text-slate-900 tw-align-middle">{moneyClient(itemTotalClient)}</td></tr>
                                          })}

                                          {invoiceView === 'grouped' && Object.entries(items.reduce((acc, it) => {
                                              if (!acc[it.category]) acc[it.category] = 0;
                                              const itemPriceClient = (Number(it.nettUnitCost || 0) * (1 + (Number(it.markup || 0)/100))) * calculations.rate * Number(it.quantity || 0);
                                              // If Grouped View and UK Package, invisibly inflate category cost by 1.12% instead of showing separate line
                                              const ffiMultiplier = fees.isUKPackage ? 1.0112 : 1;
                                              acc[it.category] += itemPriceClient * ffiMultiplier;
                                              return acc;
                                          }, {})).map(([cat, total]) => (
                                              <tr key={cat} className="tw-border-b tw-border-solid tw-border-slate-100 last:tw-border-0">
                                                  <td className="tw-p-4">
                                                      <div className="tw-flex tw-items-center tw-gap-3">
                                                          {CATEGORIES[cat] && <img src={CATEGORIES[cat]} alt="" className="tw-w-6 tw-h-6 tw-object-contain" crossOrigin="anonymous" />}
                                                          <div className="tw-text-slate-900 tw-font-medium">{cat}</div>
                                                      </div>
                                                  </td>
                                                  <td className="tw-p-4 tw-text-right tw-font-semibold tw-text-slate-900 tw-align-middle" colSpan="3">{moneyClient(total)}</td>
                                              </tr>
                                          ))}

                                          {invoiceView === 'supplier' && Object.entries(items.reduce((acc, it) => {
                                              const supplierName = it.supplierId ? suppliers.find(s => String(s.id) === String(it.supplierId))?.name || 'Other Services' : 'Other Services';
                                              if (!acc[supplierName]) acc[supplierName] = 0;
                                              const itemPriceClient = (Number(it.nettUnitCost || 0) * (1 + (Number(it.markup || 0)/100))) * calculations.rate * Number(it.quantity || 0);
                                              acc[supplierName] += itemPriceClient;
                                              return acc;
                                          }, {})).map(([supName, total]) => (
                                              <tr key={supName} className="tw-border-b tw-border-solid tw-border-slate-100 last:tw-border-0">
                                                  <td className="tw-p-4">
                                                      <div className="tw-text-slate-900 tw-font-medium">{supName}</div>
                                                  </td>
                                                  <td className="tw-p-4 tw-text-right tw-font-semibold tw-text-slate-900 tw-align-middle" colSpan="3">{moneyClient(total)}</td>
                                              </tr>
                                          ))}

                                          {invoiceView === 'summary' && <tr className="tw-border-b tw-border-solid tw-border-slate-100"><td className="tw-p-4 tw-text-slate-600 tw-whitespace-pre-wrap">{summaryNotes}</td><td className="tw-p-4 tw-text-right tw-font-semibold tw-text-slate-900 tw-align-middle">{moneyClient(calculations.grandTotal)}</td></tr>}

                                          {(() => {
                                              const isSummary = invoiceView === 'summary';
                                              const descColSpan = isSummary ? "1" : "3";
                                              const showFFILine = fees.isUKPackage && !isSummary && invoiceView !== 'grouped' && creditCardFeeInclusion === 'separate';
                                              const displayOtherFees = invoiceView === 'grouped' && fees.isUKPackage ? (calculations.otherFees * 1.0112) : calculations.otherFees;
                                              
                                              return (
                                                  <>
                                                    {creditCardFeeInclusion === 'separate' && Number(fees.otherFees || 0) > 0 && <tr><td colSpan={descColSpan} className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-600">Other Fees</td><td className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-900">{moneyClient(displayOtherFees)}</td></tr>}
                                                    {showFFILine && <tr><td colSpan={descColSpan} className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-600 tw-italic">FFI Fee (1.12%)</td><td className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-900">{moneyClient(calculations.ffiFee)}</td></tr>}
                                                    {creditCardFeeInclusion === 'separate' && Number(fees.creditCardFee || 0) > 0 && <tr><td colSpan={descColSpan} className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-600">Credit Card Fee ({fees.creditCardFee}%)</td><td className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-900">{moneyClient(calculations.ccFee)}</td></tr>}
                                                  </>
                                              );
                                          })()}
                                      </tbody>
                                      <tfoot>
                                          <tr className="tw-border-t-2 tw-border-solid tw-border-slate-200"><td className="tw-p-4 tw-font-bold tw-text-slate-900 tw-text-xl tw-text-right" colSpan={invoiceView === 'summary' ? "1" : "3"}>Grand Total</td><td className="tw-p-4 tw-text-right tw-font-bold tw-text-slate-900 tw-text-xl">{moneyClient(calculations.grandTotal)}{showPaymentConversion && <div className="tw-text-xs tw-font-normal tw-text-slate-400 tw-mt-1">(approx. {moneyPay(calculations.grandTotal)})</div>}</td></tr>
                                          {calculatedDepositAmount > 0 && (
                                              <>
                                                <tr className="tw-bg-slate-50">
                                                    <td colSpan={invoiceView === 'summary' ? "1" : "3"} className="tw-pt-4 tw-px-4 tw-text-right tw-text-sm tw-font-medium tw-text-slate-600">Deposit Due {depositDueDate ? `(by ${formatDate(depositDueDate)})` : ''}</td>
                                                    <td className="tw-pt-4 tw-px-4 tw-text-right tw-text-lg tw-font-bold tw-text-slate-900">{showPaymentConversion ? moneyPay(calculatedDepositAmount) : moneyClient(calculatedDepositAmount)}</td>
                                                </tr>
                                                <tr className="tw-bg-slate-50">
                                                    <td colSpan={invoiceView === 'summary' ? "1" : "3"} className="tw-pb-4 tw-px-4 tw-text-right tw-text-sm tw-font-medium tw-text-slate-600">Balance Due {balanceDueDate ? `(by ${formatDate(balanceDueDate)})` : ''}</td>
                                                    <td className="tw-pb-4 tw-px-4 tw-text-right tw-text-lg tw-font-bold tw-text-slate-900">{moneyClient(calculations.grandTotal - calculatedDepositAmount)}{showPaymentConversion && <div className="tw-text-xs tw-font-normal tw-text-slate-400 tw-mt-1">(approx. {moneyPay(calculations.grandTotal - calculatedDepositAmount)})</div>}</td>
                                                </tr>
                                              </>
                                          )}
                                      </tfoot>
                                  </table>
                              </div>
                              {documentType === 'invoice' && paymentLink && (
                                  <div className="tw-mt-10 tw-text-right">
                                      <a href={paymentLink.startsWith('http') ? paymentLink : 'https://' + paymentLink} target="_blank" rel="noopener noreferrer" className="tw-inline-block tw-bg-[#0b0e2c] tw-text-white tw-font-bold tw-py-3 tw-px-8 tw-rounded-lg tw-no-underline hover:tw-opacity-90 tw-transition-opacity tw-shadow-md">Pay now</a>
                                  </div>
                              )}

                              {documentType === 'invoice' && bankDetails && <div className="tw-mt-12 tw-pt-6 tw-border-t tw-border-solid tw-border-slate-100"><h3 className="tw-font-semibold tw-text-slate-800 tw-mb-2 tw-m-0">Payment Details</h3><p className="tw-text-slate-600 tw-text-sm tw-whitespace-pre-wrap tw-leading-relaxed tw-m-0">{bankDetails}</p></div>}

                              {legalInfo && <div className="tw-mt-8 tw-pt-6 tw-border-t tw-border-solid tw-border-slate-100"><h3 className="tw-font-semibold tw-text-slate-800 tw-mb-2 tw-m-0">Legal Information</h3><p className="tw-text-slate-600 tw-text-xs tw-whitespace-pre-wrap tw-leading-relaxed tw-m-0"><Linkified text={legalInfo} /></p></div>}
                          </div>
                      </div>
                  </div>
              </div>
          </div>
      );
  }

// =========================
  // MAIN APP CONTROLLER
  // =========================
  function App() {
      const [view, setView] = useState('setup'); 
      const [setupData, setSetupData] = useState(null);
      const [savedInvoiceData, setSavedInvoiceData] = useState(null);
      const [currentQuoteId, setCurrentQuoteId] = useState(null);
      const [loading, setLoading] = useState(true);
      const [dbData, setDbData] = useState({ clients: [], suppliers: [] });

      useEffect(() => {
          let isMounted = true;
          let syncInterval;

          (async () => {
              try {
                  await waitForWizedReady();
                  
                  // 1. Check URL for an existing quote ID
                  const urlParams = new URLSearchParams(window.location.search);
                  const qId = urlParams.get('quote_id');

                  // 2. Prepare our requests (always need clients & suppliers)
                  const reqs = [
                      execWizedRequestAndWait(WIZED_REQ.clients),
                      execWizedRequestAndWait(WIZED_REQ.suppliers)
                  ];

                  if (qId) {
                      reqs.push(execWizedRequestAndWait('load_specific_quote'));
                  }
                  
                  // 3. Fire them all at the same time
                  const results = await Promise.all(reqs);
                  const clientData = results[0];
                  const supplierData = results[1];
                  const quoteRecord = qId ? results[2] : null;

                  if (isMounted) {
                      // Get the logged in agent's ID
                      const agentId = window.Wized?.data?.r?.load_user_data?.data?.id;
                      // Filter the clients array
                      const filteredInitialClients = Array.isArray(clientData) && agentId 
                          ? clientData.filter(c => String(c.agent_id) === String(agentId)) 
                          : [];

                      setDbData({ 
                          clients: filteredInitialClients, 
                          suppliers: Array.isArray(supplierData) ? supplierData : [] 
                      });

                      // 4. Inject existing quote data if we got it back
                      if (qId && quoteRecord && quoteRecord.app_data) {
                          setCurrentQuoteId(qId);
                          const parsedData = typeof quoteRecord.app_data === 'string' ? JSON.parse(quoteRecord.app_data) : quoteRecord.app_data;
                          
                          setSetupData(parsedData.setupData);
                          setSavedInvoiceData(parsedData);
                          setView('invoice'); 
                      }

                      setLoading(false);
                  }

                  // 🔄 BACKGROUND AUTO-SYNC: Watch Wized data for newly added clients/suppliers
                  let lastClientsStr = '';
                  let lastSuppliersStr = '';

                  syncInterval = setInterval(() => {
                      if (!window.Wized?.data?.r) return;
                      
                      const currentClients = window.Wized.data.r[WIZED_REQ.clients]?.data;
                      const currentSuppliers = window.Wized.data.r[WIZED_REQ.suppliers]?.data;
                      const currentAgentId = window.Wized.data.r.load_user_data?.data?.id;
                      
                      if (!currentClients || !currentSuppliers) return;

                      // Always apply the filter during the sync interval
                      const filteredCurrentClients = currentAgentId 
                          ? currentClients.filter(c => String(c.agent_id) === String(currentAgentId))
                          : [];

                      const currentClientsStr = JSON.stringify(filteredCurrentClients);
                      const currentSuppliersStr = JSON.stringify(currentSuppliers);

                      if (currentClientsStr !== lastClientsStr || currentSuppliersStr !== lastSuppliersStr) {
                          lastClientsStr = currentClientsStr;
                          lastSuppliersStr = currentSuppliersStr;
                          
                          setDbData({ 
                              clients: filteredCurrentClients, 
                              suppliers: Array.isArray(currentSuppliers) ? currentSuppliers : [] 
                          });
                      }
                  }, 500);

              } catch (e) {
                  console.error("Failed to load Wized data:", e);
                  if (isMounted) setLoading(false);
              }
          })();

          return () => {
              isMounted = false;
              if (syncInterval) clearInterval(syncInterval);
          };
      }, []);

      if (loading) return (
        <div className="tw-min-h-[70vh] tw-flex tw-items-center tw-justify-center">
          <lottie-player src="https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/65afedc751a231c6ae634164_Animation%20-%201706028438496.json" background="transparent" speed="1" style={{ width: '900px', height: '900px', maxWidth: '100%' }} loop autoplay></lottie-player>
        </div>
      );

      return (
          <>
              <div style={{ display: view === 'setup' ? 'block' : 'none' }}>
                  <SetupScreen clients={dbData.clients} initialData={setupData} onComplete={(data) => { setSetupData(data); setView('invoice'); }} />
              </div>
              {setupData && (
                  <div style={{ display: view === 'invoice' ? 'block' : 'none' }}>
                      <ErrorBoundary>
                          <InvoiceGenerator 
                              setupData={setupData} 
                              suppliers={dbData.suppliers} 
                              savedInvoiceData={savedInvoiceData}
                              currentQuoteId={currentQuoteId}
                              onBack={() => setView('setup')} 
                          />
                      </ErrorBoundary>
                  </div>
              )}
          </>
      );
  }

  const el = document.getElementById("quote-app");
  if (el) {
      const root = ReactDOM.createRoot(el);
      root.render(<App />);
  }
})();