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

  const PRESET_EXCHANGE_RATES = {
      USD: 1.00, EUR: 0.95, GBP: 0.80, JPY: 150.00, AUD: 1.55, CAD: 1.35, CHF: 0.90, ZAR: 19.00,
  };

  const PRESET_BANK_ACCOUNTS = [
      { id: 'default', name: 'GBP Account (Default)', details: 'Cartology Travel Ltd\nAddress: 17 Dorien Road, London, SW20 8EL\nBarclays Bank\nSort: 20-45-45\nAcc: 80285463\nIBAN: GB32BUKB20454580285463\nSwift: BUKBGB22' },
      { id: 'usd', name: 'USD Account', details: 'Cartology Travel Ltd\nBarclays Bank\nSort: 20-45-45\nAcc: 65546399\nIBAN: GB38BUKB20454565546399' },
      { id: 'eur', name: 'EUR Account', details: 'Cartology Travel Ltd\nSort: 20-45-45\nAcc: 56279911\nIBAN: GB10 BUKB 20454556279911' }
  ];

  const PRESET_PAYMENT_LINKS = [
      { id: 'eur', name: 'EUR', url: 'https://cartologytravel-eur.flywire.com' },
      { id: 'gbp', name: 'GBP', url: 'https://cartologytravel-gbp.flywire.com' },
      { id: 'usd', name: 'USD', url: 'https://cartologytravel-usd.flywire.com' },
      { id: 'custom', name: 'Custom' }
  ];

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
              {icon && <span className="tw-absolute tw-left-3 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400">{icon}</span>}
              <input {...props} className={`tw-w-full tw-p-2 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] disabled:tw-bg-slate-100 disabled:tw-cursor-not-allowed ${icon ? 'tw-pl-9' : ''} ${symbol ? 'tw-pr-9' : ''}`} />
              {symbol && <span className="tw-absolute tw-right-3 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400">{symbol}</span>}
          </div>
      </div>
  );

  const MiniInputField = ({ label, symbol, ...props }) => ( 
      <div className="tw-flex tw-flex-col tw-justify-end"> 
          <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0">{label}</label> 
          <div className="tw-relative"> 
              {symbol && <span className={`tw-absolute tw-left-3 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400 ${symbol === '%' ? 'tw-right-3 tw-left-auto' : ''}`}>{symbol}</span>} 
              <input {...props} className={`tw-w-full tw-p-2 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] ${symbol && symbol !== '%' ? 'tw-pl-7' : ''} ${symbol === '%' ? 'tw-pr-7 tw-text-right' : ''}`} /> 
          </div> 
      </div> 
  );

  const CurrencySelector = ({ label, ...props }) => ( 
      <div> 
          <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0">{label}</label> 
          <select {...props} className="tw-w-full tw-p-2 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] tw-bg-white"> 
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
              {icon && <span className="tw-absolute tw-left-3 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400">{icon}</span>}
              <input 
                  type="text" 
                  className={`tw-w-full tw-p-2 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] tw-bg-white ${icon ? 'tw-pl-9' : ''}`}
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
      const [fees, setFees] = useState(savedInvoiceData?.fees || { creditCardFee: '', otherFees: '', isUKPackage: false });
      const [creditCardFeeInclusion, setCreditCardFeeInclusion] = useState(savedInvoiceData?.creditCardFeeInclusion || 'included'); 
      
      const [invoiceView, setInvoiceView] = useState(savedInvoiceData?.invoiceView || 'detailed');
      const [summaryNotes, setSummaryNotes] = useState(savedInvoiceData?.summaryNotes || 'Your complete travel package includes all flights, accommodation, and transfers as discussed.');
      
      const [depositType, setDepositType] = useState(savedInvoiceData?.depositType || 'amount');
      const [depositValue, setDepositValue] = useState(savedInvoiceData?.depositValue !== undefined ? savedInvoiceData.depositValue : '');
      const [depositDueDate, setDepositDueDate] = useState(savedInvoiceData?.depositDueDate || '');
      const [balanceDueDate, setBalanceDueDate] = useState(savedInvoiceData?.balanceDueDate || savedInvoiceData?.quoteInfo?.dueDate || '');
      
      const [selectedPaymentPreset, setSelectedPaymentPreset] = useState(savedInvoiceData?.selectedPaymentPreset || 'custom');
      const [paymentLink, setPaymentLink] = useState(savedInvoiceData?.paymentLink || '');

      const [selectedBankPreset, setSelectedBankPreset] = useState(savedInvoiceData?.selectedBankPreset || PRESET_BANK_ACCOUNTS[0].id);
      const [bankDetails, setBankDetails] = useState(savedInvoiceData?.bankDetails || PRESET_BANK_ACCOUNTS[0].details);
      const [legalInfo, setLegalInfo] = useState(savedInvoiceData?.legalInfo || 'Standard terms and conditions apply. All quotes are subject to availability at the time of booking.');
      
      const [isExporting, setIsExporting] = useState(false);
      const [isSaving, setIsSaving] = useState(false);
      
      const { pricingModel } = setupData;
    
      const isBrandingComplete = !!companyLogoUrl;
      const isDetailsComplete = !!quoteInfo.number && !!quoteInfo.date;
      const isDisplayComplete = !!invoiceView;
      const isCurrencyComplete = !!currencySettings.base && !!currencySettings.client && !!currencySettings.rate;
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
          setCurrencySettings(prev => {
              const newSettings = { ...prev, [field]: newCurrency };
              
              if (newSettings.base === newSettings.client) {
                  newSettings.rate = 1.00;
              } else {
                  const baseToUsd = 1 / (PRESET_EXCHANGE_RATES[newSettings.base] || 1);
                  const newRate = baseToUsd * (PRESET_EXCHANGE_RATES[newSettings.client] || 1);
                  newSettings.rate = parseFloat(newRate.toFixed(4));
              }
              return newSettings;
          });
      };

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
          const rate = Number(currencySettings.rate) || 0;

          const ccMultiplier = creditCardFeeInclusion === 'included' ? (1 + ((Number(fees.creditCardFee) || 0) / 100)) : 1;

          const itemsNet = items.reduce((sum, item) => sum + (Number(item.nettUnitCost || 0) * Number(item.quantity || 0)), 0);
          const itemsMarkup = items.reduce((sum, item) => sum + ((Number(item.nettUnitCost || 0) * Number(item.quantity || 0)) * (Number(item.markup || 0) / 100)), 0);
          const itemsTotalBase = (itemsNet + itemsMarkup) * ccMultiplier;
          
          const otherFeesBase = (Number(fees.otherFees) || 0) * ccMultiplier;
          const ffiFeeBase = fees.isUKPackage ? (itemsTotalBase + otherFeesBase) * 0.0112 : 0;
          const totalBeforeCCBase = itemsTotalBase + otherFeesBase + ffiFeeBase;
          
          const ccFeeBase = creditCardFeeInclusion === 'separate' ? totalBeforeCCBase * ((Number(fees.creditCardFee) || 0) / 100) : 0;
          
          let grandTotalBase = totalBeforeCCBase + ccFeeBase;

          return { 
              baseCurrency, clientCurrency, 
              grandTotal: grandTotalBase * rate,
              ccFee: ccFeeBase * rate,
              otherFees: otherFeesBase * rate,
              ffiFee: ffiFeeBase * rate,
              rate
          };
      }, [items, fees, currencySettings, creditCardFeeInclusion]);

      const moneyClient = (amount) => Number(amount).toLocaleString(undefined, { style: 'currency', currency: calculations.clientCurrency.code });
      const moneyBase = (amount) => Number(amount).toLocaleString(undefined, { style: 'currency', currency: calculations.baseCurrency.code });

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
              return depositValNum + fullDepositItemsClientTotal;
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
          const showFFILine = fees.isUKPackage && !isSummary && invoiceView !== 'grouped';
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
          
          if (Number(fees.otherFees || 0) > 0) feesHTML += `<tr><td colspan="${descColSpan}" style="padding: 12px; text-align: right; font-size: 14px; color: #475569;">Other Fees</td><td style="padding: 12px; text-align: right; font-size: 14px; color: #0f172a;">${moneyClient(displayOtherFees)}</td></tr>`;
          if (showFFILine) feesHTML += `<tr><td colspan="${descColSpan}" style="padding: 12px; text-align: right; font-size: 14px; color: #475569; font-style: italic;">FFI Fee (1.12%)</td><td style="padding: 12px; text-align: right; font-size: 14px; color: #0f172a;">${moneyClient(calculations.ffiFee)}</td></tr>`;
          if (creditCardFeeInclusion === 'separate' && Number(fees.creditCardFee || 0) > 0) feesHTML += `<tr><td colspan="${descColSpan}" style="padding: 12px; text-align: right; font-size: 14px; color: #475569;">Credit Card Fee (${fees.creditCardFee}%)</td><td style="padding: 12px; text-align: right; font-size: 14px; color: #0f172a;">${moneyClient(calculations.ccFee)}</td></tr>`;

          let depositHTML = '';
          if (calculatedDepositAmount > 0) {
              depositHTML = `
                  <tr style="background-color: #f8fafc;">
                      <td colspan="${descColSpan}" style="padding: 16px 12px 8px; text-align: right; font-size: 14px; color: #64748b;">Deposit Due ${depositDueDate ? `(by ${formatDate(depositDueDate)})` : ''}</td>
                      <td style="padding: 16px 12px 8px; text-align: right; font-size: 16px; font-weight: bold; color: #0f172a;">${moneyClient(calculatedDepositAmount)}</td>
                  </tr>
                  <tr style="background-color: #f8fafc;">
                      <td colspan="${descColSpan}" style="padding: 8px 12px 16px; text-align: right; font-size: 14px; color: #64748b;">Balance Due ${balanceDueDate ? `(by ${formatDate(balanceDueDate)})` : ''}</td>
                      <td style="padding: 8px 12px 16px; text-align: right; font-size: 16px; font-weight: bold; color: #0f172a;">${moneyClient(calculations.grandTotal - calculatedDepositAmount)}</td>
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
                          <h1 style="margin: 0; font-size: 38px; color: #0f172a; font-weight: bold;">Payment Request</h1>
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
                                  <td style="padding: 20px 12px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #0f172a; border-top: 2px solid #cbd5e1;">${moneyClient(calculations.grandTotal)}</td>
                              </tr>
                              ${depositHTML}
                          </tfoot>
                      </table>

                      ${bankDetails ? `
                          <div style="margin-top: 50px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                              <h3 style="font-size: 16px; color: #334155; margin: 0 0 12px 0;">Payment Details</h3>
                              <p style="font-size: 14px; color: #64748b; white-space: pre-wrap; margin: 0; line-height: 1.5;">${bankDetails}</p>
                          </div>
                      ` : ''}

                      ${legalInfo ? `
                          <div style="margin-top: 30px; padding-top: 30px; border-top: 1px solid #e2e8f0;">
                              <h3 style="font-size: 16px; color: #334155; margin: 0 0 12px 0;">Legal Information</h3>
                              <p style="font-size: 12px; color: #64748b; white-space: pre-wrap; margin: 0; line-height: 1.5;">${legalInfo}</p>
                          </div>
                      ` : ''}

                ${paymentLink ? `
                          <div style="margin-top: 40px; text-align: right;">
                              <a href="${paymentLink.startsWith('http') ? paymentLink : 'https://' + paymentLink}" target="_blank" style="display: inline-block; background-color: #0b0e2c; color: #ffffff; font-weight: bold; padding: 14px 32px; border-radius: 8px; text-decoration: none; font-size: 16px;">Pay now</a>
                              <p style="margin: 12px 0 0 0; font-size: 12px; color: #64748b;">Or securely pay online at:<br/><a href="${paymentLink.startsWith('http') ? paymentLink : 'https://' + paymentLink}" style="color: #3b82f6; text-decoration: underline;">${paymentLink.startsWith('http') ? paymentLink : 'https://' + paymentLink}</a></p>
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

const handleSaveQuote = async () => {
          setIsSaving(true);
          
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
                  quote_id: currentQuoteId, 
                  client_id: setupData.clientId,
                  client_name: setupData.clientDetails.name,
                  quote_number: quoteInfo.number || "Draft",
                  trip_name: quoteInfo.tripName || "Unnamed Trip", 
                  total_amount: calculations.grandTotal,
                  currency: currencySettings.client,
                  status: "Draft",
                  app_data: {
                      setupData,
                      quoteInfo,
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
                      companyLogoUrl,
                      summaryNotes,
                      invoiceView,
                      bankDetails,
                      legalInfo,
                      creditCardFeeInclusion,
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

                  if (currentQuoteId) {
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
              alert("There was an issue saving the quote.");
              setIsSaving(false);
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
                          </div>
                      </ControlCard>

                      <ControlCard title="Currency & Exchange Rate" defaultOpen={false} isComplete={isCurrencyComplete}>
                          <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4 tw-items-end">
                              <CurrencySelector 
                                  label="Nett Cost Currency" 
                                  value={currencySettings.base} 
                                  onChange={(e) => handleCurrencyChange('base', e.target.value)} 
                              />
                              <CurrencySelector 
                                  label="Client Invoice Currency" 
                                  value={currencySettings.client} 
                                  onChange={(e) => handleCurrencyChange('client', e.target.value)} 
                              />
                          </div>
                          <div className="tw-mt-4"> 
                              <InputField icon={<ArrowRightLeft size={16}/>} label={`Exchange Rate (1 ${currencySettings.base} = ? ${currencySettings.client})`} tooltipLink="https://drive.google.com/drive/u/3/folders/0ACXz2hC43zP7Uk9PVA" type="number" value={currencySettings.rate} onChange={(e) => setCurrencySettings({...currencySettings, rate: e.target.value})} step="0.0001" /> 
                              <p className="tw-text-xs tw-text-slate-400 tw-mt-1">Preset agency rate applied. You can edit this manually.</p>
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
                                                      className="tw-w-full tw-p-2 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md tw-bg-white tw-text-sm focus:tw-ring-[#303350]"
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
                                      <input type="text" placeholder="e.g. 5 nights at Capella Bangkok" value={item.description} onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)} className="tw-w-full tw-p-2 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md tw-mb-4 focus:tw-ring-[#303350] focus:tw-border-[#303350]" />
                                      
                                      <div className="tw-grid tw-grid-cols-3 tw-gap-3 tw-items-end">
                                          <MiniInputField label={item.category === 'Hotel' ? "# nights" : "Qty"} type="number" value={item.quantity} onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)} />
                                          {pricingModel === 'nett' ? (
                                              <MiniInputField label={item.category === 'Hotel' ? "Nett nightly cost" : "Nett Unit Cost"} type="number" value={item.nettUnitCost} onChange={(e) => handleUpdateItem(item.id, 'nettUnitCost', e.target.value)} symbol={calculations.baseCurrency.symbol} />
                                          ) : (
                                              <MiniInputField label={item.category === 'Hotel' ? "Gross nightly price" : "Gross Unit Price"} type="number" value={item.grossUnitCost || (Number(item.nettUnitCost || 0)*(1+(Number(item.markup || 0)/100)))} onChange={(e) => handleUpdateItem(item.id, 'grossUnitCost', e.target.value)} symbol={calculations.baseCurrency.symbol} />
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
                          <div className="tw-space-y-4">
                              <div className="tw-flex tw-items-center tw-justify-between tw-p-3 tw-bg-slate-50 tw-rounded-lg tw-border tw-border-solid tw-border-slate-200">
                                  <label htmlFor="isUKPackage" className="tw-text-sm tw-font-medium tw-text-slate-700 tw-m-0">UK Package trip? (adds 1.12% FFI)</label>
                                  <input id="isUKPackage" name="isUKPackage" type="checkbox" checked={fees.isUKPackage} onChange={handleFeeChange} className="tw-h-5 tw-w-5 tw-text-[#303350] tw-rounded tw-border-gray-300 focus:tw-ring-[#303350]" />
                              </div>
                              <div className="tw-flex tw-items-center tw-justify-between">
                                  <label className="tw-text-sm tw-font-medium tw-text-slate-700 tw-m-0">Credit Card Fee</label>
                                  <div className="tw-flex tw-items-center tw-gap-3">
                                      <span className={`tw-text-sm tw-font-medium ${creditCardFeeInclusion === 'included' ? 'tw-text-[#303350]' : 'tw-text-slate-500'}`}>Included</span>
                                      <button type="button" onClick={() => setCreditCardFeeInclusion(prev => prev === 'included' ? 'separate' : 'included')} className={`tw-relative tw-inline-flex tw-h-6 tw-w-11 tw-flex-shrink-0 tw-cursor-pointer tw-rounded-full tw-border-2 tw-border-transparent tw-transition-colors tw-duration-200 tw-ease-in-out focus:tw-outline-none ${creditCardFeeInclusion === 'separate' ? 'tw-bg-[#303350]' : 'tw-bg-gray-200'}`}>
                                          <span className={`tw-pointer-events-none tw-inline-block tw-h-5 tw-w-5 tw-transform tw-rounded-full tw-bg-white tw-shadow tw-ring-0 tw-transition tw-duration-200 tw-ease-in-out ${creditCardFeeInclusion === 'separate' ? 'tw-translate-x-5' : 'tw-translate-x-0'}`} />
                                      </button>
                                      <span className={`tw-text-sm tw-font-medium ${creditCardFeeInclusion === 'separate' ? 'tw-text-[#303350]' : 'tw-text-slate-500'}`}>Separate</span>
                                  </div>
                              </div>
                              <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
                                  <InputField label="CC Fee (%)" name="creditCardFee" tooltipLink="https://drive.google.com/drive/u/3/folders/0ACXz2hC43zP7Uk9PVA" type="number" value={fees.creditCardFee} onChange={handleFeeChange} step="0.1" />
                                  <InputField label={`Other Fees (${calculations.baseCurrency.symbol})`} name="otherFees" type="number" value={fees.otherFees} onChange={handleFeeChange} />
                              </div>
                          </div>
                      </ControlCard>

                      <ControlCard title="Payments" defaultOpen={false} isComplete={isPaymentsComplete}>
                          <div className="tw-space-y-4">
                              <div className="tw-flex tw-items-center tw-justify-between tw-mb-2">
                                  <label className="tw-text-sm tw-font-medium tw-text-slate-700 tw-m-0">Deposit Type</label>
                                  <div className="tw-flex tw-items-center tw-gap-3">
                                      <span className={`tw-text-sm tw-font-medium ${depositType === 'percentage' ? 'tw-text-[#303350]' : 'tw-text-slate-500'}`}>Percentage</span>
                                      <button type="button" onClick={() => setDepositType(prev => prev === 'amount' ? 'percentage' : 'amount')} className={`tw-relative tw-inline-flex tw-h-6 tw-w-11 tw-flex-shrink-0 tw-cursor-pointer tw-rounded-full tw-border-2 tw-border-transparent tw-transition-colors tw-duration-200 tw-ease-in-out focus:tw-outline-none ${depositType === 'amount' ? 'tw-bg-[#303350]' : 'tw-bg-gray-200'}`}>
                                          <span className={`tw-pointer-events-none tw-inline-block tw-h-5 tw-w-5 tw-transform tw-rounded-full tw-bg-white tw-shadow tw-ring-0 tw-transition tw-duration-200 tw-ease-in-out ${depositType === 'amount' ? 'tw-translate-x-5' : 'tw-translate-x-0'}`} />
                                      </button>
                                      <span className={`tw-text-sm tw-font-medium ${depositType === 'amount' ? 'tw-text-[#303350]' : 'tw-text-slate-500'}`}>Amount</span>
                                  </div>
                              </div>
                              <div>
                                  <InputField label="Deposit Due Amount" type="number" value={depositValue} onChange={(e) => setDepositValue(e.target.value)} icon={depositType === 'amount' ? <span>{calculations.clientCurrency.symbol}</span> : null} symbol={depositType === 'percentage' ? '%' : null} />
                                  {items.some(it => it.isFullDeposit) && (
                                      <p className="tw-text-xs tw-text-emerald-600 tw-font-medium tw-mt-1.5 tw-m-0">
                                          * Items marked "100% upfront" are automatically added to this {depositType === 'percentage' ? 'percentage calculation' : 'amount'}.
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
                              
                              <div className="tw-mt-4">
                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1.5 tw-m-0">Payment Link Preset</label>
                                  <select value={selectedPaymentPreset} onChange={handlePaymentPresetChange} className="tw-w-full tw-p-2 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-[#303350] tw-bg-white">
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
                          </div>
                      </ControlCard>

                      <ControlCard title="Bank details & legal" defaultOpen={false} isComplete={isBankComplete}>
                          <div className="tw-space-y-4">
                              <div>
                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-600 tw-mb-1.5 tw-m-0">Account Preset</label>
                                  <select value={selectedBankPreset} onChange={handleBankPresetChange} className="tw-w-full tw-p-2 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-[#303350] tw-bg-white">
                                      {PRESET_BANK_ACCOUNTS.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                                      <option value="custom">Custom</option>
                                  </select>
                              </div>
                              <div>
                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-600 tw-mb-1.5 tw-m-0">Bank Details</label>
                                  <textarea rows="4" className="tw-w-full tw-p-2 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-[#303350]" value={bankDetails} onChange={(e) => {setBankDetails(e.target.value); setSelectedBankPreset('custom');}} placeholder="Bank details here..." />
                              </div>
                              <div>
                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-600 tw-mb-1.5 tw-m-0">Legal Information</label>
                                  <textarea rows="4" className="tw-w-full tw-p-2 tw-border tw-border-solid tw-border-slate-300 tw-rounded-md focus:tw-ring-[#303350]" value={legalInfo} onChange={(e) => setLegalInfo(e.target.value)} placeholder="Terms and conditions..." />
                              </div>
                          </div>
                      </ControlCard>

                      {/* ACTION BUTTONS (Save Quote & Export PDF) */}
                      <div className="tw-flex tw-flex-col sm:tw-flex-row tw-gap-4 tw-mt-6">
                        <button 
                              type="button" 
                              onClick={handleSaveQuote} 
                              disabled={isSaving}
                              className="tw-flex-1 tw-bg-white tw-text-[#0b0e2c] tw-py-4 tw-rounded-xl tw-font-semibold hover:tw-bg-slate-50 tw-transition-colors tw-text-lg tw-shadow-sm tw-cursor-pointer disabled:tw-opacity-50"
                              style={{ border: '1px solid #0b0e2c' }}
                          >
                              {isSaving ? 'Saving...' : 'Save quote'}
                          </button>
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
                                      <div><h1 className="tw-text-4xl tw-font-bold tw-text-slate-900 tw-m-0">Payment Request</h1><p className="tw-text-slate-500 tw-mt-2 tw-m-0"># {quoteInfo.number}</p></div>
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
                                              const showFFILine = fees.isUKPackage && !isSummary && invoiceView !== 'grouped';
                                              const displayOtherFees = invoiceView === 'grouped' && fees.isUKPackage ? (calculations.otherFees * 1.0112) : calculations.otherFees;
                                              
                                              return (
                                                  <>
                                                    {Number(fees.otherFees || 0) > 0 && <tr><td colSpan={descColSpan} className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-600">Other Fees</td><td className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-900">{moneyClient(displayOtherFees)}</td></tr>}
                                                    {showFFILine && <tr><td colSpan={descColSpan} className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-600 tw-italic">FFI Fee (1.12%)</td><td className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-900">{moneyClient(calculations.ffiFee)}</td></tr>}
                                                    {creditCardFeeInclusion === 'separate' && Number(fees.creditCardFee || 0) > 0 && <tr><td colSpan={descColSpan} className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-600">Credit Card Fee ({fees.creditCardFee}%)</td><td className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-900">{moneyClient(calculations.ccFee)}</td></tr>}
                                                  </>
                                              );
                                          })()}
                                      </tbody>
                                      <tfoot>
                                          <tr className="tw-border-t-2 tw-border-solid tw-border-slate-200"><td className="tw-p-4 tw-font-bold tw-text-slate-900 tw-text-xl tw-text-right" colSpan={invoiceView === 'summary' ? "1" : "3"}>Grand Total</td><td className="tw-p-4 tw-text-right tw-font-bold tw-text-slate-900 tw-text-xl">{moneyClient(calculations.grandTotal)}</td></tr>
                                          {calculatedDepositAmount > 0 && (
                                              <>
                                                <tr className="tw-bg-slate-50">
                                                    <td colSpan={invoiceView === 'summary' ? "1" : "3"} className="tw-pt-4 tw-px-4 tw-text-right tw-text-sm tw-font-medium tw-text-slate-600">Deposit Due {depositDueDate ? `(by ${formatDate(depositDueDate)})` : ''}</td>
                                                    <td className="tw-pt-4 tw-px-4 tw-text-right tw-text-lg tw-font-bold tw-text-slate-900">{moneyClient(calculatedDepositAmount)}</td>
                                                </tr>
                                                <tr className="tw-bg-slate-50">
                                                    <td colSpan={invoiceView === 'summary' ? "1" : "3"} className="tw-pb-4 tw-px-4 tw-text-right tw-text-sm tw-font-medium tw-text-slate-600">Balance Due {balanceDueDate ? `(by ${formatDate(balanceDueDate)})` : ''}</td>
                                                    <td className="tw-pb-4 tw-px-4 tw-text-right tw-text-lg tw-font-bold tw-text-slate-900">{moneyClient(calculations.grandTotal - calculatedDepositAmount)}</td>
                                                </tr>
                                              </>
                                          )}
                                      </tfoot>
                                  </table>
                              </div>
                              {bankDetails && <div className="tw-mt-12 tw-pt-6 tw-border-t tw-border-solid tw-border-slate-100"><h3 className="tw-font-semibold tw-text-slate-800 tw-mb-2 tw-m-0">Payment Details</h3><p className="tw-text-slate-600 tw-text-sm tw-whitespace-pre-wrap tw-leading-relaxed tw-m-0">{bankDetails}</p></div>}
                              
                              {legalInfo && <div className="tw-mt-8 tw-pt-6 tw-border-t tw-border-solid tw-border-slate-100"><h3 className="tw-font-semibold tw-text-slate-800 tw-mb-2 tw-m-0">Legal Information</h3><p className="tw-text-slate-600 tw-text-xs tw-whitespace-pre-wrap tw-leading-relaxed tw-m-0">{legalInfo}</p></div>}

                              {paymentLink && (
                                  <div className="tw-mt-10 tw-text-right">
                                      <a href={paymentLink.startsWith('http') ? paymentLink : 'https://' + paymentLink} target="_blank" rel="noopener noreferrer" className="tw-inline-block tw-bg-[#0b0e2c] tw-text-white tw-font-bold tw-py-3 tw-px-8 tw-rounded-lg tw-no-underline hover:tw-opacity-90 tw-transition-opacity tw-shadow-md">Pay now</a>
                                      <p className="tw-m-0 tw-mt-3 tw-text-xs tw-text-slate-500">Or securely pay online at:<br/><a href={paymentLink.startsWith('http') ? paymentLink : 'https://' + paymentLink} className="tw-text-blue-500 hover:tw-underline">{paymentLink.startsWith('http') ? paymentLink : 'https://' + paymentLink}</a></p>
                                  </div>
                              )}
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

                  // If editing, ask Wized to load the specific quote too
                  if (qId) {
                      reqs.push(execWizedRequestAndWait('load_specific_quote'));
                  }
                  
                  // 3. Fire them all at the same time
                  const results = await Promise.all(reqs);
                  const clientData = results[0];
                  const supplierData = results[1];
                  const quoteRecord = qId ? results[2] : null;

                  if (isMounted) {
                      setDbData({ 
                          clients: Array.isArray(clientData) ? clientData : [], 
                          suppliers: Array.isArray(supplierData) ? supplierData : [] 
                      });

                      // 4. Inject existing quote data if we got it back
                      if (qId && quoteRecord && quoteRecord.app_data) {
                          setCurrentQuoteId(qId);
                          const parsedData = typeof quoteRecord.app_data === 'string' ? JSON.parse(quoteRecord.app_data) : quoteRecord.app_data;
                          
                          setSetupData(parsedData.setupData);
                          setSavedInvoiceData(parsedData);
                          setView('invoice'); // Skip setup screen!
                      }

                      setLoading(false);
                  }

                  // 🔄 BACKGROUND AUTO-SYNC: Watch Wized data for newly added clients/suppliers
                  let lastClientsStr = JSON.stringify(clientData);
                  let lastSuppliersStr = JSON.stringify(supplierData);

                  syncInterval = setInterval(() => {
                      if (!window.Wized?.data?.r) return;
                      
                      const currentClients = window.Wized.data.r[WIZED_REQ.clients]?.data;
                      const currentSuppliers = window.Wized.data.r[WIZED_REQ.suppliers]?.data;
                      
                      if (!currentClients || !currentSuppliers) return;

                      const currentClientsStr = JSON.stringify(currentClients);
                      const currentSuppliersStr = JSON.stringify(currentSuppliers);

                      if (currentClientsStr !== lastClientsStr || currentSuppliersStr !== lastSuppliersStr) {
                          lastClientsStr = currentClientsStr;
                          lastSuppliersStr = currentSuppliersStr;
                          
                          setDbData({ 
                              clients: Array.isArray(currentClients) ? currentClients : [], 
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
