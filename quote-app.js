(() => {
  const { useState, useEffect, useMemo, useRef } = React;

  // =========================
  // ERROR BOUNDARY
  // =========================
  class ErrorBoundary extends React.Component {
      constructor(props) {
          super(props);
          this.state = { hasError: false, error: null, errorInfo: null };
      }
      static getDerivedStateFromError(error) {
          return { hasError: true, error: error };
      }
      componentDidCatch(error, errorInfo) {
          this.setState({ errorInfo });
      }
      render() {
          if (this.state.hasError) {
              return (
                  <div className="tw-p-8 tw-m-8 tw-bg-red-50 tw-rounded-xl tw-border tw-border-red-200 tw-font-sans">
                      <h1 className="tw-text-2xl tw-font-bold tw-text-red-700 tw-mb-2">Something went wrong on Screen 2.</h1>
                      <p className="tw-text-red-600 tw-mb-6">Please take a screenshot of this error and send it back to me so I can fix it instantly:</p>
                      <pre className="tw-bg-white tw-p-4 tw-rounded-lg tw-border tw-border-red-100 tw-overflow-auto tw-text-sm tw-text-slate-800 tw-whitespace-pre-wrap">
                          <span className="tw-font-bold">{this.state.error && this.state.error.toString()}</span>
                          <br /><br />
                          {this.state.errorInfo && this.state.errorInfo.componentStack}
                      </pre>
                  </div>
              );
          }
          return this.props.children;
      }
  }

  // =========================
  // WIZED CONFIG & HELPERS
  // =========================
  const WIZED_REQ = {
      clients: "load_clients",
      suppliers: "load_suppliers",
  };

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

  // =========================
  // ICONS & DATA
  // =========================
  const Icon = ({ size = 20, children, className = '' }) => (
      <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className={className}>{children}</svg>
  );
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

  const CURRENCIES = [
      { code: 'USD', symbol: '$', name: 'US Dollar' }, { code: 'EUR', symbol: '€', name: 'Euro' }, { code: 'GBP', symbol: '£', name: 'British Pound' }, { code: 'JPY', symbol: '¥', name: 'Japanese Yen' }, { code: 'AUD', symbol: 'A$', name: 'Australian Dollar' }, { code: 'CAD', symbol: 'C$', name: 'Canadian Dollar' }, { code: 'CHF', symbol: 'CHF', name: 'Swiss Franc' }, { code: 'CNY', symbol: '¥', name: 'Chinese Yuan' }, { code: 'NZD', symbol: 'NZ$', name: 'New Zealand Dollar' }, { code: 'ZAR', symbol: 'R', name: 'South African Rand' }
  ];

  const PRESET_BANK_ACCOUNTS = [
      { id: 'default', name: 'GBP Account (Default)', details: 'Cartology Travel Ltd\nAddress: 17 Dorien Road, London, SW20 8EL\nBarclays Bank\nSort: 20-45-45\nAcc: 80285463\nIBAN: GB32BUKB20454580285463\nSwift: BUKBGB22' },
      { id: 'usd', name: 'USD Account', details: 'Cartology Travel Ltd\nBarclays Bank\nSort: 20-45-45\nAcc: 65546399\nIBAN: GB38BUKB20454565546399' },
      { id: 'eur', name: 'EUR Account', details: 'Cartology Travel Ltd\nSort: 20-45-45\nAcc: 56279911\nIBAN: GB10 BUKB 20454556279911' }
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
  const ControlCard = ({ title, children, defaultOpen = true }) => {
      const [isOpen, setIsOpen] = useState(defaultOpen);
      return (
          <div className="tw-bg-white tw-rounded-xl tw-shadow-sm tw-border tw-border-slate-200 tw-overflow-hidden"> 
              <div 
                  className="tw-p-6 tw-flex tw-justify-between tw-items-center tw-cursor-pointer hover:tw-bg-slate-50 tw-transition-colors"
                  onClick={() => setIsOpen(!isOpen)}
              >
                  <h2 className="tw-text-xl tw-font-bold tw-text-slate-800">{title}</h2>
                  <div className="tw-text-slate-400">
                      {isOpen ? <ArrowUp size={20} /> : <ArrowDown size={20} />}
                  </div>
              </div>
              {isOpen && (
                  <div className="tw-p-6 tw-pt-0 tw-border-t tw-border-slate-100 tw-mt-2">
                      {children}
                  </div>
              )}
          </div> 
      );
  };

  const InputField = ({ label, symbol, icon, ...props }) => (
      <div>
          <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-600 tw-mb-1">{label}</label>
          <div className="tw-relative">
              {icon && <span className="tw-absolute tw-left-3 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400">{icon}</span>}
              <input {...props} className={`tw-w-full tw-p-2 tw-border tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] disabled:tw-bg-slate-100 disabled:tw-cursor-not-allowed ${icon ? 'tw-pl-9' : ''} ${symbol ? 'tw-pr-9' : ''}`} />
              {symbol && <span className="tw-absolute tw-right-3 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400">{symbol}</span>}
          </div>
      </div>
  );

  const MiniInputField = ({ label, symbol, ...props }) => ( 
      <div> 
          <label className="tw-block tw-text-xs tw-font-medium tw-text-slate-500">{label}</label> 
          <div className="tw-relative tw-mt-1"> 
              {symbol && <span className={`tw-absolute tw-left-2 tw-top-1/2 tw--translate-y-1/2 tw-text-slate-400 ${symbol === '%' ? 'tw-right-2 tw-left-auto' : ''}`}>{symbol}</span>} 
              <input {...props} className={`tw-w-full tw-text-sm tw-p-1.5 tw-border tw-border-slate-300 tw-rounded-md focus:tw-ring-1 focus:tw-ring-[#303350] focus:tw-border-[#303350] ${symbol && symbol !== '%' ? 'tw-pl-6' : ''} ${symbol === '%' ? 'tw-pr-6 tw-text-right' : ''}`} /> 
          </div> 
      </div> 
  );

  // MISSING CURRENCY SELECTOR COMPONENT ADDED BACK HERE
  const CurrencySelector = ({ label, ...props }) => ( 
      <div> 
          <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-600 tw-mb-1">{label}</label> 
          <select {...props} className="tw-w-full tw-p-2 tw-border tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] tw-bg-white"> 
              {CURRENCIES.map(c => <option key={c.code} value={c.code}>{c.code} - {c.name}</option>)} 
          </select> 
      </div> 
  );

  function SearchableSelect({ options, value, onChange, placeholder, icon, emptyLabel = "+ Add new item" }) {
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
                  className={`tw-w-full tw-p-2 tw-border tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350] tw-bg-white ${icon ? 'tw-pl-9' : ''}`}
                  placeholder={placeholder}
                  value={displayValue}
                  onChange={(e) => { setQuery(e.target.value); setIsOpen(true); if(!isOpen) onChange(""); }}
                  onFocus={() => { setIsOpen(true); setQuery(''); }}
              />
              {isOpen && (
                  <div className="tw-absolute tw-z-50 tw-w-full tw-mt-1 tw-bg-white tw-border tw-border-slate-200 tw-rounded-md tw-shadow-lg tw-max-h-60 tw-overflow-auto">
                      {filteredOptions.length === 0 ? (
                          <div 
                              className="tw-p-3 tw-text-sm tw-text-blue-600 tw-font-medium tw-cursor-pointer hover:tw-bg-blue-50"
                              onClick={() => { alert("Trigger Wized flow to create new item here."); setIsOpen(false); }}
                          >
                              {emptyLabel}
                          </div>
                      ) : (
                          filteredOptions.map(opt => (
                              <div 
                                  key={opt.value} 
                                  className="tw-p-3 tw-text-sm hover:tw-bg-slate-50 tw-cursor-pointer tw-text-slate-700 tw-border-b tw-border-slate-50 last:tw-border-0"
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
  function SetupScreen({ clients, onComplete }) {
      const [pricingModel, setPricingModel] = useState('nett');
      const [selectedClientId, setSelectedClientId] = useState("");
      const [customCompany, setCustomCompany] = useState("");
      
      const clientOptions = clients.map(c => ({ value: c.id, label: `${c.first_name || ''} ${c.last_name || ''}`.trim() }));

      useEffect(() => {
          if(selectedClientId) {
              const client = clients.find(c => String(c.id) === String(selectedClientId));
              if(client && client.company) setCustomCompany(client.company);
          }
      }, [selectedClientId, clients]);

      const handleSubmit = (e) => {
          e.preventDefault();
          const clientData = clients.find(c => String(c.id) === String(selectedClientId));
          onComplete({ 
            pricingModel, 
            clientDetails: clientData ? { name: `${clientData.first_name || ''} ${clientData.last_name || ''}`.trim(), company: customCompany, email: clientData.email } : { name: '', company: '' }
          });
      };

      return (
          <div className="tw-p-2 lg:tw-p-4 tw-mt-4 lg:tw-mt-8">
              <div className="tw-w-full tw-max-w-3xl tw-mx-auto">
                  <form onSubmit={handleSubmit} className="tw-space-y-6">
                      <div className="tw-bg-white tw-p-8 sm:tw-p-10 tw-rounded-2xl tw-shadow-[0_8px_30px_rgb(0,0,0,0.04)] tw-border tw-border-slate-100 tw-space-y-10">
                          
                          <div>
                              <label className="heading-h4-size tw-block tw-text-slate-700 tw-mb-4">1. Choose Pricing Model</label>
                              <div className="tw-grid tw-grid-cols-2 tw-gap-6">
                                  <div onClick={() => setPricingModel('nett')} className={`tw-p-5 tw-rounded-xl tw-border-2 tw-cursor-pointer tw-transition-all ${pricingModel === 'nett' ? 'tw-bg-slate-50 tw-border-[#303350]' : 'tw-bg-slate-50/50 tw-border-slate-200 hover:tw-border-slate-300'}`}>
                                      <img src="https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/6611ac28353fd48ae22ce9e5_arrow%20right.png" className="icon tw-w-6 tw-h-6 tw-mb-3" alt="icon" />
                                      <h3 className={`heading-h3-size tw-mb-2 ${pricingModel === 'nett' ? 'tw-text-[#303350]' : 'tw-text-slate-700'}`}>Nett Pricing</h3>
                                      <p className="tw-text-sm tw-text-slate-500">Enter the cost to you (nett) and add your markup.</p>
                                  </div>
                                  <div onClick={() => setPricingModel('gross')} className={`tw-p-5 tw-rounded-xl tw-border-2 tw-cursor-pointer tw-transition-all ${pricingModel === 'gross' ? 'tw-bg-slate-50 tw-border-[#303350]' : 'tw-bg-slate-50/50 tw-border-slate-200 hover:tw-border-slate-300'}`}>
                                      <img src="https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/6611ac28353fd48ae22ce9e5_arrow%20right.png" className="icon tw-w-6 tw-h-6 tw-mb-3" alt="icon" />
                                      <h3 className={`heading-h3-size tw-mb-2 ${pricingModel === 'gross' ? 'tw-text-[#303350]' : 'tw-text-slate-700'}`}>Gross Pricing</h3>
                                      <p className="tw-text-sm tw-text-slate-500">Enter the final client price (gross) and your commission.</p>
                                  </div>
                              </div>
                          </div>

                          <div>
                              <label className="heading-h4-size tw-block tw-text-slate-700 tw-mb-4">2. Select Client</label>
                              <div className="tw-space-y-5">
                                  <div>
                                      <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-600 tw-mb-1">Client Name</label>
                                      <SearchableSelect 
                                          options={clientOptions}
                                          value={selectedClientId}
                                          onChange={setSelectedClientId}
                                          placeholder="Search for a client..."
                                          icon={<UserIcon size={16} />}
                                          emptyLabel="+ Add new client"
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

                      <button type="submit" disabled={!selectedClientId} className="tw-w-full tw-flex tw-items-center tw-justify-center tw-gap-2 tw-bg-[#0b0e2c] tw-text-white tw-font-semibold tw-py-4 tw-px-4 tw-rounded-xl hover:tw-opacity-90 tw-transition-opacity disabled:tw-opacity-50 disabled:tw-cursor-not-allowed tw-text-lg tw-shadow-md">
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
  function InvoiceGenerator({ setupData, suppliers }) {
      const [items, setItems] = useState([
          { id: Date.now(), supplierId: "", category: "Hotel", description: '', nettUnitCost: 0, quantity: 1, markup: 20 }
      ]);
      
      const [companyLogoUrl, setCompanyLogoUrl] = useState('https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/656cb820cffdc2c79973770f_Group%202.png');
      const [quoteInfo, setQuoteInfo] = useState({ number: `Q-${Date.now().toString().slice(-6)}`, date: new Date().toISOString().split('T')[0], dueDate: '' });
      
      const [currencySettings, setCurrencySettings] = useState({ base: 'USD', client: 'EUR', rate: 0.93 });
      const [fees, setFees] = useState({ creditCardFee: 0, otherFees: 0, isUKPackage: false });
      const [creditCardFeeInclusion, setCreditCardFeeInclusion] = useState('included'); 
      
      const [invoiceView, setInvoiceView] = useState('detailed');
      const [summaryNotes, setSummaryNotes] = useState('Your complete travel package includes all flights, accommodation, and transfers as discussed.');
      const [depositType, setDepositType] = useState('amount');
      const [depositValue, setDepositValue] = useState(0);
      const [selectedBankPreset, setSelectedBankPreset] = useState(PRESET_BANK_ACCOUNTS[0].id);
      const [bankDetails, setBankDetails] = useState(PRESET_BANK_ACCOUNTS[0].details);
      const [isExporting, setIsExporting] = useState(false);

      const { pricingModel } = setupData;
      const supplierOptions = suppliers.map(s => ({ value: s.id, label: s.name }));

      const handleAddItem = () => setItems([...items, { id: Date.now(), supplierId: "", category: "Hotel", description: '', nettUnitCost: 0, quantity: 1, markup: 20 }]);
      const handleUpdateItem = (id, field, value) => {
          setItems(items.map(it => {
              if (it.id !== id) return it;
              const updated = { ...it, [field]: value };
              if (pricingModel === 'gross' && (field === 'grossUnitCost' || field === 'markup')) {
                  const gross = field === 'grossUnitCost' ? Number(value) : (Number(it.grossUnitCost) || 0);
                  const markup = field === 'markup' ? Number(value) : (Number(it.markup) || 0);
                  updated.nettUnitCost = gross / (1 + (markup / 100));
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
      
      const handleFeeChange = (e) => {
          const { name, value, type, checked } = e.target;
          setFees(prev => ({ ...prev, [name]: type === 'checkbox' ? checked : parseFloat(value) || 0 }));
      };

      const calculations = useMemo(() => {
          const baseCurrency = CURRENCIES.find(c => c.code === currencySettings.base) || CURRENCIES[0];
          const clientCurrency = CURRENCIES.find(c => c.code === currencySettings.client) || CURRENCIES[0];
          const rate = currencySettings.rate;

          const itemsNet = items.reduce((sum, item) => sum + (Number(item.nettUnitCost) * Number(item.quantity)), 0);
          const itemsMarkup = items.reduce((sum, item) => sum + ((Number(item.nettUnitCost) * Number(item.quantity)) * (Number(item.markup) / 100)), 0);
          const itemsTotalBase = itemsNet + itemsMarkup;
          
          const otherFeesBase = fees.otherFees;
          const ffiFeeBase = fees.isUKPackage ? (itemsTotalBase + otherFeesBase) * 0.01 : 0;
          const totalBeforeCCBase = itemsTotalBase + otherFeesBase + ffiFeeBase;
          const ccFeeBase = totalBeforeCCBase * (fees.creditCardFee / 100);
          
          let grandTotalBase = creditCardFeeInclusion === 'included' ? totalBeforeCCBase + ccFeeBase : totalBeforeCCBase;

          return { 
              baseCurrency, 
              clientCurrency, 
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
          if (depositType === 'amount') return depositValue;
          if (depositType === 'percentage') return calculations.grandTotal * (depositValue / 100);
          return 0;
      }, [depositType, depositValue, calculations.grandTotal]);

      const downloadPdf = async () => {
        setIsExporting(true);
        try {
          let tableRowsHTML = '';
          if (invoiceView === 'detailed') {
              tableRowsHTML = items.map(it => {
                  const itemPriceBase = (Number(it.nettUnitCost) * (1 + (Number(it.markup)/100)));
                  const itemPriceClient = itemPriceBase * calculations.rate;
                  const itemTotalClient = itemPriceClient * Number(it.quantity);
                  const supplierName = it.supplierId ? suppliers.find(s => String(s.id) === String(it.supplierId))?.name : '';
                  const catIcon = CATEGORIES[it.category] || '';
                  
                  return `
                      <tr style="border-bottom: 1px solid #f1f5f9;">
                          <td style="padding: 16px 12px; font-size: 14px; color: #0f172a; vertical-align: middle;">
                              <div style="display: flex; align-items: center; gap: 12px;">
                                  ${catIcon ? `<img src="${catIcon}" style="width: 24px; height: 24px; object-fit: contain;" crossorigin="anonymous" />` : ''}
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
          } else {
              tableRowsHTML = `
                  <tr style="border-bottom: 1px solid #f1f5f9;">
                      <td colspan="3" style="padding: 16px 12px; font-size: 14px; color: #475569; white-space: pre-wrap;">${summaryNotes}</td>
                      <td style="padding: 16px 12px; text-align: right; font-size: 14px; font-weight: bold; color: #0f172a;">${moneyClient(calculations.grandTotal)}</td>
                  </tr>
              `;
          }

          let feesHTML = '';
          if (fees.otherFees > 0) {
              feesHTML += `<tr><td colspan="3" style="padding: 12px; text-align: right; font-size: 14px; color: #475569;">Other Fees</td><td style="padding: 12px; text-align: right; font-size: 14px; color: #0f172a;">${moneyClient(calculations.otherFees)}</td></tr>`;
          }
          if (fees.isUKPackage) {
              feesHTML += `<tr><td colspan="3" style="padding: 12px; text-align: right; font-size: 14px; color: #475569; font-style: italic;">FFI Fee (1%)</td><td style="padding: 12px; text-align: right; font-size: 14px; color: #0f172a;">${moneyClient(calculations.ffiFee)}</td></tr>`;
          }
          if (creditCardFeeInclusion === 'included' && fees.creditCardFee > 0) {
              feesHTML += `<tr><td colspan="3" style="padding: 12px; text-align: right; font-size: 14px; color: #475569;">Credit Card Fee (${fees.creditCardFee}%)</td><td style="padding: 12px; text-align: right; font-size: 14px; color: #0f172a;">${moneyClient(calculations.ccFee)}</td></tr>`;
          }

          let depositHTML = '';
          if (calculatedDepositAmount > 0) {
              depositHTML = `
                  <tr>
                      <td colspan="3" style="padding: 16px 12px 8px; text-align: right; font-size: 14px; color: #64748b;">Deposit Due</td>
                      <td style="padding: 16px 12px 8px; text-align: right; font-size: 16px; font-weight: bold; color: #0f172a;">${moneyClient(calculatedDepositAmount)}</td>
                  </tr>
                  <tr>
                      <td colspan="3" style="padding: 8px 12px 16px; text-align: right; font-size: 14px; color: #64748b;">Balance Due</td>
                      <td style="padding: 8px 12px 16px; text-align: right; font-size: 16px; font-weight: bold; color: #0f172a;">${moneyClient(calculations.grandTotal - calculatedDepositAmount)}</td>
                  </tr>
              `;
          }

          const htmlTemplate = `
              <div style="font-family: 'Helvetica Neue', Helvetica, Arial, sans-serif; background: #ffffff; width: 100%; color: #333;">
                  
                  <div style="margin-bottom: 50px;">
                      ${companyLogoUrl ? `<img src="${companyLogoUrl}" style="width: 120px; height: auto; margin-bottom: 24px;" crossorigin="anonymous" />` : ''}
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
                                  <p style="margin: 0;"><strong>Invoice Date:</strong> ${quoteInfo.date}</p>
                                  ${quoteInfo.dueDate ? `<p style="margin: 0;"><strong>Due Date:</strong> ${quoteInfo.dueDate}</p>` : ''}
                              </div>
                          </td>
                      </tr>
                  </table>

                  <table width="100%" style="border-collapse: collapse; margin-bottom: 40px;">
                      <thead>
                          <tr style="background-color: #f8fafc;">
                              <th style="padding: 12px; text-align: left; font-size: 14px; color: #334155; border-bottom: 2px solid #e2e8f0; font-weight: bold;">Description</th>
                              <th style="padding: 12px; text-align: right; font-size: 14px; color: #334155; border-bottom: 2px solid #e2e8f0; font-weight: bold;">Qty</th>
                              <th style="padding: 12px; text-align: right; font-size: 14px; color: #334155; border-bottom: 2px solid #e2e8f0; font-weight: bold;">Price</th>
                              <th style="padding: 12px; text-align: right; font-size: 14px; color: #334155; border-bottom: 2px solid #e2e8f0; font-weight: bold;">Total</th>
                          </tr>
                      </thead>
                      <tbody>
                          ${tableRowsHTML}
                          ${feesHTML}
                      </tbody>
                      <tfoot>
                          <tr>
                              <td colspan="3" style="padding: 20px 12px 12px; text-align: right; font-size: 18px; font-weight: bold; color: #0f172a; border-top: 2px solid #cbd5e1;">Grand Total</td>
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
              </div>
          `;

          const tempContainer = document.createElement('div');
          tempContainer.innerHTML = htmlTemplate;
          tempContainer.style.position = 'absolute';
          tempContainer.style.left = '-9999px'; 
          tempContainer.style.top = '0';
          document.body.appendChild(tempContainer); 
          
          const opt = {
              margin: [0.5, 0.5, 0.5, 0.5], 
              filename: `${quoteInfo.number || 'invoice'}.pdf`,
              image: { type: "jpeg", quality: 1 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: "in", format: "a4", orientation: "portrait" },
          };

          await window.html2pdf().set(opt).from(tempContainer).save();
          document.body.removeChild(tempContainer);

        } catch (err) {
            console.error("PDF Generation Error:", err);
            alert("There was an issue generating the PDF.");
        } finally {
            setIsExporting(false);
        }
      };

      return (
          <div className="tw-font-sans tw-bg-transparent tw-min-h-screen tw-p-2 lg:tw-p-4">
              <div className="tw-max-w-7xl tw-mx-auto tw-grid tw-grid-cols-1 lg:tw-grid-cols-5 tw-gap-8">
                  
                  {/* Left Controls */}
                  <div className="lg:tw-col-span-2 tw-space-y-6">
                      
                      <ControlCard title="Branding" defaultOpen={false}>
                          <InputField label="Company Logo URL" value={companyLogoUrl} onChange={(e) => setCompanyLogoUrl(e.target.value)} placeholder="https://your-website.com/logo.png" />
                      </ControlCard>

                      <ControlCard title="Details">
                          <div className="tw-space-y-4">
                              <InputField icon={<UserIcon size={16}/>} label="Client Name" value={setupData.clientDetails.name} disabled />
                              <InputField icon={<Briefcase size={16}/>} label="Client Company (Optional)" value={setupData.clientDetails.company} disabled />
                              <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                                  <InputField icon={<Hash size={16}/>} label="Invoice #" value={quoteInfo.number} onChange={(e) => setQuoteInfo({...quoteInfo, number: e.target.value})} />
                                  <InputField icon={<Calendar size={16}/>} label="Invoice Date" type="date" value={quoteInfo.date} onChange={(e) => setQuoteInfo({...quoteInfo, date: e.target.value})} />
                              </div>
                              <div className="tw-grid tw-grid-cols-2 tw-gap-4">
                                  <InputField icon={<Calendar size={16}/>} label="Due Date" type="date" value={quoteInfo.dueDate} onChange={(e) => setQuoteInfo({...quoteInfo, dueDate: e.target.value})} />
                              </div>
                          </div>
                      </ControlCard>

                      <ControlCard title="Display Options" defaultOpen={false}>
                          <div className="tw-flex tw-items-center tw-justify-between">
                              <label className="tw-text-sm tw-font-medium tw-text-slate-700">Invoice View</label>
                              <div className="tw-flex tw-items-center tw-gap-3">
                                  <span className={`tw-text-sm tw-font-medium ${invoiceView === 'summary' ? 'tw-text-[#303350]' : 'tw-text-slate-500'}`}>Summary</span>
                                  <button onClick={() => setInvoiceView(prev => prev === 'detailed' ? 'summary' : 'detailed')} className={`tw-relative tw-inline-flex tw-h-6 tw-w-11 tw-flex-shrink-0 tw-cursor-pointer tw-rounded-full tw-border-2 tw-border-transparent tw-transition-colors tw-duration-200 tw-ease-in-out focus:tw-outline-none ${invoiceView === 'detailed' ? 'tw-bg-[#303350]' : 'tw-bg-gray-200'}`}>
                                      <span className={`tw-pointer-events-none tw-inline-block tw-h-5 tw-w-5 tw-transform tw-rounded-full tw-bg-white tw-shadow tw-ring-0 tw-transition tw-duration-200 tw-ease-in-out ${invoiceView === 'detailed' ? 'tw-translate-x-5' : 'tw-translate-x-0'}`} />
                                  </button>
                                  <span className={`tw-text-sm tw-font-medium ${invoiceView === 'detailed' ? 'tw-text-[#303350]' : 'tw-text-slate-500'}`}>Detailed</span>
                              </div>
                          </div>
                          {invoiceView === 'summary' && ( 
                              <div className="tw-mt-4"> 
                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-700 tw-mb-1">Summary Description</label> 
                                  <textarea rows="3" className="tw-w-full tw-p-2 tw-border tw-border-slate-300 tw-rounded-md focus:tw-ring-2 focus:tw-ring-[#303350] focus:tw-border-[#303350]" value={summaryNotes} onChange={(e) => setSummaryNotes(e.target.value)} placeholder="Enter a custom description..." /> 
                              </div> 
                          )}
                      </ControlCard>

                      <ControlCard title="Currency & Exchange Rate" defaultOpen={false}>
                          <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4 tw-items-end">
                              <CurrencySelector label="Nett Cost Currency" value={currencySettings.base} onChange={(e) => setCurrencySettings({...currencySettings, base: e.target.value})} />
                              <CurrencySelector label="Client Invoice Currency" value={currencySettings.client} onChange={(e) => setCurrencySettings({...currencySettings, client: e.target.value})} />
                          </div>
                          <div className="tw-mt-4"> 
                              <InputField icon={<ArrowRightLeft size={16}/>} label={`Exchange Rate (1 ${currencySettings.base} = ? ${currencySettings.client})`} type="number" value={currencySettings.rate} onChange={(e) => setCurrencySettings({...currencySettings, rate: parseFloat(e.target.value) || 0})} step="0.0001" disabled={currencySettings.base === currencySettings.client} /> 
                              <p className="tw-text-xs tw-text-slate-400 tw-mt-1">Connect this to Wized to auto-fetch rates.</p>
                          </div>
                      </ControlCard>

                      <ControlCard title={`Travel Services (${calculations.baseCurrency.code} Pricing)`}>
                          <div className="tw-space-y-4">
                              {items.map((item) => (
                                  <div key={item.id} className="tw-bg-slate-50/80 tw-p-4 tw-rounded-xl tw-border tw-border-slate-200">
                                      <div className="tw-flex tw-justify-between tw-items-start tw-mb-3">
                                          <div className="tw-flex-grow tw-mr-2">
                                              <div className="tw-grid tw-grid-cols-2 tw-gap-2">
                                                  <div>
                                                      <label className="tw-block tw-text-xs tw-font-medium tw-text-slate-500 tw-mb-1">Category</label>
                                                      <select 
                                                          className="tw-w-full tw-p-2 tw-border tw-border-slate-300 tw-rounded-md tw-bg-white tw-text-sm focus:tw-ring-[#303350]"
                                                          value={item.category}
                                                          onChange={(e) => handleUpdateItem(item.id, 'category', e.target.value)}
                                                      >
                                                          {Object.keys(CATEGORIES).map(cat => <option key={cat} value={cat}>{cat}</option>)}
                                                      </select>
                                                  </div>
                                                  <div>
                                                      <label className="tw-block tw-text-xs tw-font-medium tw-text-slate-500 tw-mb-1">Supplier (optional)</label>
                                                      <SearchableSelect 
                                                          options={supplierOptions}
                                                          value={item.supplierId}
                                                          onChange={(val) => handleUpdateItem(item.id, 'supplierId', val)}
                                                          placeholder="Search supplier..."
                                                          emptyLabel="+ Add new supplier"
                                                      />
                                                  </div>
                                              </div>
                                          </div>
                                          <button onClick={() => handleDeleteItem(item.id)} className="tw-mt-5 tw-p-2 tw-text-slate-400 hover:tw-text-red-600 hover:tw-bg-red-50 tw-rounded-md tw-transition-colors">
                                              <Trash2 size={18} />
                                          </button>
                                      </div>

                                      <label className="tw-block tw-text-xs tw-font-medium tw-text-slate-500 tw-mb-1">Description</label>
                                      <input type="text" placeholder="e.g. 5 nights at Capella Bangkok" value={item.description} onChange={(e) => handleUpdateItem(item.id, 'description', e.target.value)} className="tw-w-full tw-p-2 tw-border tw-border-slate-300 tw-rounded-md tw-mb-4 focus:tw-ring-[#303350] focus:tw-border-[#303350]" />
                                      
                                      <div className="tw-grid tw-grid-cols-3 tw-gap-3">
                                          <MiniInputField label="Qty" type="number" value={item.quantity} onChange={(e) => handleUpdateItem(item.id, 'quantity', e.target.value)} />
                                          {pricingModel === 'nett' ? (
                                              <MiniInputField label="Nett Unit Cost" type="number" value={item.nettUnitCost} onChange={(e) => handleUpdateItem(item.id, 'nettUnitCost', e.target.value)} symbol={calculations.baseCurrency.symbol} />
                                          ) : (
                                              <MiniInputField label="Gross Unit Price" type="number" value={item.grossUnitCost || (Number(item.nettUnitCost)*(1+(Number(item.markup)/100)))} onChange={(e) => handleUpdateItem(item.id, 'grossUnitCost', e.target.value)} symbol={calculations.baseCurrency.symbol} />
                                          )}
                                          <MiniInputField label={pricingModel === 'nett' ? "Markup (%)" : "Commission (%)"} type="number" value={item.markup} onChange={(e) => handleUpdateItem(item.id, 'markup', e.target.value)} symbol="%" />
                                      </div>
                                      <div className="tw-text-right tw-text-sm tw-mt-3 tw-font-medium tw-text-slate-600">
                                          Line total (Base): {moneyBase((item.quantity * item.nettUnitCost) * (1 + (item.markup/100)))}
                                      </div>
                                  </div>
                              ))}
                              <button onClick={handleAddItem} className="tw-w-full tw-flex tw-items-center tw-justify-center tw-gap-2 tw-bg-slate-100 tw-text-slate-700 tw-border tw-border-slate-300 tw-py-3 tw-rounded-xl tw-font-semibold hover:tw-bg-slate-200 tw-transition-colors">
                                  <Plus size={18} /> Add Service
                              </button>
                          </div>
                      </ControlCard>

                      <ControlCard title="Additional Fees" defaultOpen={false}>
                          <div className="tw-space-y-4">
                              <div className="tw-flex tw-items-center tw-justify-between tw-p-3 tw-bg-slate-50 tw-rounded-lg tw-border tw-border-slate-200">
                                  <label htmlFor="isUKPackage" className="tw-text-sm tw-font-medium tw-text-slate-700">UK Package trip? (adds 1% FFI)</label>
                                  <input id="isUKPackage" name="isUKPackage" type="checkbox" checked={fees.isUKPackage} onChange={handleFeeChange} className="tw-h-5 tw-w-5 tw-text-[#303350] tw-rounded tw-border-gray-300 focus:tw-ring-[#303350]" />
                              </div>
                              <div className="tw-flex tw-items-center tw-justify-between">
                                  <label className="tw-text-sm tw-font-medium tw-text-slate-700">Credit Card Fee</label>
                                  <div className="tw-flex tw-items-center tw-gap-3">
                                      <span className={`tw-text-sm tw-font-medium ${creditCardFeeInclusion === 'separate' ? 'tw-text-[#303350]' : 'tw-text-slate-500'}`}>Separate</span>
                                      <button onClick={() => setCreditCardFeeInclusion(prev => prev === 'included' ? 'separate' : 'included')} className={`tw-relative tw-inline-flex tw-h-6 tw-w-11 tw-flex-shrink-0 tw-cursor-pointer tw-rounded-full tw-border-2 tw-border-transparent tw-transition-colors tw-duration-200 tw-ease-in-out focus:tw-outline-none ${creditCardFeeInclusion === 'included' ? 'tw-bg-[#303350]' : 'tw-bg-gray-200'}`}>
                                          <span className={`tw-pointer-events-none tw-inline-block tw-h-5 tw-w-5 tw-transform tw-rounded-full tw-bg-white tw-shadow tw-ring-0 tw-transition tw-duration-200 tw-ease-in-out ${creditCardFeeInclusion === 'included' ? 'tw-translate-x-5' : 'tw-translate-x-0'}`} />
                                      </button>
                                      <span className={`tw-text-sm tw-font-medium ${creditCardFeeInclusion === 'included' ? 'tw-text-[#303350]' : 'tw-text-slate-500'}`}>Included</span>
                                  </div>
                              </div>
                              <div className="tw-grid tw-grid-cols-1 sm:tw-grid-cols-2 tw-gap-4">
                                  <InputField label="CC Fee (%)" name="creditCardFee" type="number" value={fees.creditCardFee} onChange={handleFeeChange} step="0.1" />
                                  <InputField label={`Other Fees (${calculations.baseCurrency.symbol})`} name="otherFees" type="number" value={fees.otherFees} onChange={handleFeeChange} />
                              </div>
                          </div>
                      </ControlCard>

                      <ControlCard title="Payments" defaultOpen={false}>
                          <div className="tw-flex tw-items-center tw-justify-between tw-mb-4">
                              <label className="tw-text-sm tw-font-medium tw-text-slate-700">Deposit Type</label>
                              <div className="tw-flex tw-items-center tw-gap-3">
                                  <span className={`tw-text-sm tw-font-medium ${depositType === 'percentage' ? 'tw-text-[#303350]' : 'tw-text-slate-500'}`}>Percentage</span>
                                  <button onClick={() => setDepositType(prev => prev === 'amount' ? 'percentage' : 'amount')} className={`tw-relative tw-inline-flex tw-h-6 tw-w-11 tw-flex-shrink-0 tw-cursor-pointer tw-rounded-full tw-border-2 tw-border-transparent tw-transition-colors tw-duration-200 tw-ease-in-out focus:tw-outline-none ${depositType === 'amount' ? 'tw-bg-[#303350]' : 'tw-bg-gray-200'}`}>
                                      <span className={`tw-pointer-events-none tw-inline-block tw-h-5 tw-w-5 tw-transform tw-rounded-full tw-bg-white tw-shadow tw-ring-0 tw-transition tw-duration-200 tw-ease-in-out ${depositType === 'amount' ? 'tw-translate-x-5' : 'tw-translate-x-0'}`} />
                                  </button>
                                  <span className={`tw-text-sm tw-font-medium ${depositType === 'amount' ? 'tw-text-[#303350]' : 'tw-text-slate-500'}`}>Amount</span>
                              </div>
                          </div>
                          <InputField label="Deposit Due" type="number" value={depositValue} onChange={(e) => setDepositValue(parseFloat(e.target.value) || 0)} icon={depositType === 'amount' ? <span>{calculations.clientCurrency.symbol}</span> : null} symbol={depositType === 'percentage' ? '%' : null} />
                      </ControlCard>

                      <ControlCard title="Bank Details" defaultOpen={false}>
                          <div className="tw-space-y-4">
                              <div>
                                  <label className="tw-block tw-text-sm tw-font-medium tw-text-slate-600 tw-mb-1">Account Preset</label>
                                  <select value={selectedBankPreset} onChange={handleBankPresetChange} className="tw-w-full tw-p-2 tw-border tw-border-slate-300 tw-rounded-md focus:tw-ring-[#303350] tw-bg-white">
                                      {PRESET_BANK_ACCOUNTS.map(preset => <option key={preset.id} value={preset.id}>{preset.name}</option>)}
                                      <option value="custom">Custom</option>
                                  </select>
                              </div>
                              <textarea rows="4" className="tw-w-full tw-p-2 tw-border tw-border-slate-300 tw-rounded-md focus:tw-ring-[#303350]" value={bankDetails} onChange={(e) => {setBankDetails(e.target.value); setSelectedBankPreset('custom');}} placeholder="Bank details here..." />
                          </div>
                      </ControlCard>

                      <button onClick={downloadPdf} disabled={isExporting} className="tw-w-full tw-bg-[#0b0e2c] tw-text-white tw-py-4 tw-rounded-xl tw-font-semibold hover:tw-opacity-90 tw-transition-opacity tw-text-lg tw-shadow-md disabled:tw-opacity-50">
                          {isExporting ? 'Generating PDF...' : 'Export as PDF'}
                      </button>
                  </div>

                  {/* Right Preview - purely visual now, not used for the PDF export */}
                  <div className="lg:tw-col-span-3">
                      <div className="tw-sticky tw-top-8">
                          <div className="tw-bg-white tw-rounded-2xl tw-shadow-[0_8px_30px_rgb(0,0,0,0.04)] tw-border tw-border-slate-100 tw-p-8 sm:tw-p-12 tw-block">
                              
                              <div className="tw-mb-8">
                                  {companyLogoUrl && <img src={companyLogoUrl} alt="Logo" className="tw-w-[120px] tw-h-auto tw-mb-6" crossOrigin="anonymous" />}
                                  <div className="tw-flex tw-justify-between tw-items-end">
                                      <div>
                                          <h1 className="tw-text-4xl tw-font-bold tw-text-slate-900">Payment Request</h1>
                                          <p className="tw-text-slate-500 tw-mt-2"># {quoteInfo.number}</p>
                                      </div>
                                  </div>
                              </div>

                              <div className="tw-flex tw-justify-between tw-items-end tw-border-b tw-border-slate-100 tw-pb-8 tw-mb-8"> 
                                  <div>
                                      <p className="tw-font-semibold tw-text-slate-400 tw-text-xs tw-uppercase tw-tracking-wider tw-mb-2">Billed To</p> 
                                      <p className="tw-font-bold tw-text-slate-900 tw-text-xl">{setupData.clientDetails.name}</p> 
                                      {setupData.clientDetails.company && <p className="tw-text-slate-600 tw-mt-1">{setupData.clientDetails.company}</p>}
                                  </div>
                                  <div className="tw-text-right tw-text-sm tw-text-slate-600 tw-space-y-1">
                                      <p><span className="tw-font-semibold">Invoice Date:</span> {quoteInfo.date}</p>
                                      {quoteInfo.dueDate && <p><span className="tw-font-semibold">Due Date:</span> {quoteInfo.dueDate}</p>}
                                  </div>
                              </div>

                              <div className="tw-mt-10">
                                  <table className="tw-w-full tw-text-left">
                                      <thead>
                                          <tr className="tw-bg-slate-50 tw-text-slate-700 tw-text-sm">
                                              <th className="tw-p-4 tw-font-semibold tw-rounded-l-xl">Description</th>
                                              <th className="tw-p-4 tw-font-semibold tw-text-right">Qty</th>
                                              <th className="tw-p-4 tw-font-semibold tw-text-right">Price</th>
                                              <th className="tw-p-4 tw-font-semibold tw-text-right tw-rounded-r-xl">Total</th>
                                          </tr>
                                      </thead>
                                      <tbody>
                                          {invoiceView === 'detailed' ? (
                                              items.map((it) => {
                                                  const itemPriceBase = (Number(it.nettUnitCost) * (1 + (Number(it.markup)/100)));
                                                  const itemPriceClient = itemPriceBase * calculations.rate;
                                                  const itemTotalClient = itemPriceClient * Number(it.quantity);
                                                  const catIcon = CATEGORIES[it.category];

                                                  return (
                                                      <tr key={it.id} className="tw-border-b tw-border-slate-100 last:tw-border-0">
                                                          <td className="tw-p-4">
                                                              <div className="tw-flex tw-items-center tw-gap-3">
                                                                  {catIcon && <img src={catIcon} alt="" className="tw-w-6 tw-h-6 tw-object-contain" crossOrigin="anonymous" />}
                                                                  <div>
                                                                      <div className="tw-text-slate-900 tw-font-medium">{it.description || "—"}</div>
                                                                      {it.supplierId && <div className="tw-text-sm tw-text-slate-500 tw-mt-1">Supplier: {suppliers.find(s => String(s.id) === String(it.supplierId))?.name}</div>}
                                                                  </div>
                                                              </div>
                                                          </td>
                                                          <td className="tw-p-4 tw-text-right tw-text-slate-700 tw-align-middle">{it.quantity}</td>
                                                          <td className="tw-p-4 tw-text-right tw-text-slate-700 tw-align-middle">{moneyClient(itemPriceClient)}</td>
                                                          <td className="tw-p-4 tw-text-right tw-font-semibold tw-text-slate-900 tw-align-middle">{moneyClient(itemTotalClient)}</td>
                                                      </tr>
                                                  )
                                              })
                                          ) : (
                                              <tr className="tw-border-b tw-border-slate-100">
                                                  <td colSpan="3" className="tw-p-4 tw-text-slate-600 tw-whitespace-pre-wrap">{summaryNotes}</td>
                                                  <td className="tw-p-4 tw-text-right tw-font-semibold tw-text-slate-900 tw-align-middle">{moneyClient(calculations.grandTotal)}</td>
                                              </tr>
                                          )}
                                          
                                          {/* Fees rendering in preview */}
                                          {fees.otherFees > 0 && <tr><td colSpan="3" className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-600">Other Fees</td><td className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-900">{moneyClient(calculations.otherFees)}</td></tr>}
                                          {fees.isUKPackage && <tr><td colSpan="3" className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-600 tw-italic">FFI Fee (1%)</td><td className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-900">{moneyClient(calculations.ffiFee)}</td></tr>}
                                          {creditCardFeeInclusion === 'included' && fees.creditCardFee > 0 && <tr><td colSpan="3" className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-600">Credit Card Fee ({fees.creditCardFee}%)</td><td className="tw-p-3 tw-text-right tw-text-sm tw-text-slate-900">{moneyClient(calculations.ccFee)}</td></tr>}
                                      </tbody>
                                      <tfoot>
                                          <tr className="tw-border-t-2 tw-border-slate-200">
                                              <td className="tw-p-4 tw-font-bold tw-text-slate-900 tw-text-xl tw-text-right" colSpan="3">Grand Total</td>
                                              <td className="tw-p-4 tw-text-right tw-font-bold tw-text-slate-900 tw-text-xl">{moneyClient(calculations.grandTotal)}</td>
                                          </tr>
                                          {calculatedDepositAmount > 0 && (
                                              <>
                                                  <tr>
                                                      <td colSpan="3" className="tw-pt-4 tw-px-4 tw-text-right tw-text-sm tw-font-medium tw-text-slate-600">Deposit Due</td>
                                                      <td className="tw-pt-4 tw-px-4 tw-text-right tw-text-lg tw-font-bold tw-text-slate-900">{moneyClient(calculatedDepositAmount)}</td>
                                                  </tr>
                                                  <tr>
                                                      <td colSpan="3" className="tw-pb-4 tw-px-4 tw-text-right tw-text-sm tw-font-medium tw-text-slate-600">Balance Due</td>
                                                      <td className="tw-pb-4 tw-px-4 tw-text-right tw-text-lg tw-font-bold tw-text-slate-900">{moneyClient(calculations.grandTotal - calculatedDepositAmount)}</td>
                                                  </tr>
                                              </>
                                          )}
                                      </tfoot>
                                  </table>
                              </div>

                              {bankDetails && (
                                  <div className="tw-mt-12 tw-pt-6 tw-border-t tw-border-slate-100">
                                      <h3 className="tw-font-semibold tw-text-slate-800 tw-mb-2">Payment Details</h3>
                                      <p className="tw-text-slate-600 tw-text-sm tw-whitespace-pre-wrap tw-leading-relaxed">{bankDetails}</p>
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
      const [loading, setLoading] = useState(true);
      const [dbData, setDbData] = useState({ clients: [], suppliers: [] });

      useEffect(() => {
          (async () => {
              try {
                  await waitForWizedReady();
                  const [clientData, supplierData] = await Promise.all([
                      execWizedRequestAndWait(WIZED_REQ.clients),
                      execWizedRequestAndWait(WIZED_REQ.suppliers),
                  ]);
                  setDbData({ 
                      clients: Array.isArray(clientData) ? clientData : [], 
                      suppliers: Array.isArray(supplierData) ? supplierData : [] 
                  });
              } catch (e) {
                  console.error("Failed to load Wized data:", e);
              } finally {
                  setLoading(false);
              }
          })();
      }, []);

      if (loading) return (
        <div className="tw-min-h-[70vh] tw-flex tw-items-center tw-justify-center">
          <lottie-player 
            src="https://cdn.prod.website-files.com/656cafcf92ee678d635ab3dd/65afedc751a231c6ae634164_Animation%20-%201706028438496.json" 
            background="transparent" 
            speed="1" 
            style={{ width: '450px', height: '450px' }} 
            loop 
            autoplay>
          </lottie-player>
        </div>
      );

      if (view === 'setup') {
          return <SetupScreen clients={dbData.clients} onComplete={(data) => { setSetupData(data); setView('invoice'); }} />;
      }
      
      return (
          <ErrorBoundary>
              <InvoiceGenerator setupData={setupData} suppliers={dbData.suppliers} />
          </ErrorBoundary>
      );
  }

  // Mount App
  const el = document.getElementById("quote-app");
  if (el) {
      const root = ReactDOM.createRoot(el);
      root.render(<App />);
  }
})();
