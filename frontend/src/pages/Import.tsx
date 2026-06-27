import React, { useState, useRef, useEffect } from 'react';
import {
  saveImportedData,
  clearImportedData,
} from '../lib/data';
import { Decision } from '../types';
import { 
  Upload, 
  Trash2, 
  FileText, 
  CheckCircle, 
  AlertTriangle, 
  Copy, 
  Check, 
  Download, 
  FileSpreadsheet, 
  Database, 
  RefreshCcw,
  Info
} from 'lucide-react';

type DataType = 'sku_sales' | 'pods_sales' | 'sales_spends' | 'survey_responses' | 'decisions';

interface DataTypeMeta {
  id: DataType;
  label: string;
  description: string;
  requiredFields: string[];
  sampleCsv: string;
  sampleJson: any[];
}

const DATA_TYPES: DataTypeMeta[] = [
  {
    id: 'sku_sales',
    label: 'SKU Sales',
    description: 'Track revenue and sales volume of snacks across cities and platforms.',
    requiredFields: ['sku', 'line', 'city', 'platform', 'salesMrp'],
    sampleCsv: `sku,line,city,platform,salesMrp\nBBQ Blast Millet Bhujia,Baked Millet Bhujia,Bangalore,Instamart,14500\nAloo Sev Millet Bhujia,Baked Millet Bhujia,Mumbai,Big Basket,28900\nPudina Picnic Bhujia,Baked Millet Bhujia,Ahmedabad,Amazon,8200`,
    sampleJson: [
      { sku: 'BBQ Blast Millet Bhujia', line: 'Baked Millet Bhujia', city: 'Bangalore', platform: 'Instamart', salesMrp: 14500 },
      { sku: 'Aloo Sev Millet Bhujia', line: 'Baked Millet Bhujia', city: 'Mumbai', platform: 'Big Basket', salesMrp: 28900 }
    ]
  },
  {
    id: 'pods_sales',
    label: 'PODs Sales',
    description: 'City-level Points of Distribution sales MRP (rupees) per platform per month.',
    requiredFields: ['city', 'platform', 'month', 'salesMrp'],
    sampleCsv: `city,platform,month,salesMrp\nBangalore,Big Basket,Apr 2026,40900\nAhmedabad,Instamart,May 2026,4825\nMumbai,Big Basket,May 2026,38240`,
    sampleJson: [
      { city: 'Bangalore', platform: 'Big Basket', month: 'Apr 2026', salesMrp: 40900 },
      { city: 'Ahmedabad', platform: 'Instamart', month: 'May 2026', salesMrp: 4825 },
    ],
  },
  {
    id: 'sales_spends',
    label: 'Sales & Spends',
    description: 'Analyze Ad Spends vs actual Sales to track return on investment (A2S).',
    requiredFields: ['date', 'platform', 'spend', 'sales', 'a2s'],
    sampleCsv: `date,platform,spend,sales,a2s\n2026-04-01,Instamart,2500,12000,0.208\n2026-04-02,Big Basket,1800,9500,0.189\n2026-04-03,Instamart,3100,10500,0.295`,
    sampleJson: [
      { date: '2026-04-01', platform: 'Instamart', spend: 2500, sales: 12000, a2s: 0.208 },
      { date: '2026-04-02', platform: 'Big Basket', spend: 1800, sales: 9500, a2s: 0.189 }
    ]
  },
  {
    id: ‘survey_responses’,
    label: ‘Customer Surveys’,
    description: ‘Availability and platform preference feedback from MadMix customer survey.’,
    requiredFields: [‘id’, ‘submittedAt’, ‘ageGroup’, ‘location’, ‘consumptionFrequency’, ‘skippedDueToUnavailability’, ‘platform’, ‘pincodeAvailability’],
    sampleCsv: `id,submittedAt,ageGroup,location,consumptionFrequency,skippedDueToUnavailability,platform,pincodeAvailability\nMX4A7,2026-06-01T10:00:00Z,25-34,Bangalore,Few times a week,false,Blinkit,true\nKR8T2,2026-06-02T14:30:00Z,18-24,Mumbai,Daily,true,Zepto,false`,
    sampleJson: [
      {
        id: ‘MX4A7’,
        submittedAt: ‘2026-06-01T10:00:00Z’,
        ageGroup: ‘25-34’,
        location: ‘Bangalore’,
        consumptionFrequency: ‘Few times a week’,
        skippedDueToUnavailability: false,
        platform: ‘Blinkit’,
        pincodeAvailability: true,
      },
    ],
  },
  {
    id: 'decisions',
    label: 'Recommended Actions',
    description: 'Update the business decision list with pre-calculated actionable goals.',
    requiredFields: ['id', 'action', 'type', 'severity', 'confidence', 'reasoning', 'createdAt'],
    sampleCsv: `id,action,type,severity,confidence,flavour,city,state,platform,reasoning,createdAt\nDEC-901,Double spends on Aloo Sev in Bangalore,grow,high,95,Aloo Sev Millet Bhujia,Bangalore,Karnataka,Big Basket,Strong demand and zero complaints in the region.,2026-06-25T12:00:00Z\nDEC-902,Formulate spicy reduction in West India,reduce,medium,80,BBQ Blast Millet Bhujia,Ahmedabad,Gujarat,,High spice complaints are driving negative sentiment.,2026-06-24T15:00:00Z`,
    sampleJson: [
      {
        id: 'DEC-901',
        action: 'Double spends on Aloo Sev in Bangalore',
        type: 'grow',
        severity: 'high',
        confidence: 95,
        flavour: 'Aloo Sev Millet Bhujia',
        city: 'Bangalore',
        state: 'Karnataka',
        platform: 'Big Basket',
        reasoning: 'Strong demand and zero complaints in the region.',
        evidence: [{ label: 'Promoters', detail: '100% promoter score', source: 'Customer Survey' }],
        rawDataRefs: [{ source: 'Customer Survey', rows: [] }],
        createdAt: '2026-06-25T12:00:00Z'
      }
    ]
  }
];

export default function Import() {
  const [activeType, setActiveType] = useState<DataType>('sku_sales');
  const [inputText, setInputText] = useState<string>('');
  const [dragActive, setDragActive] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  
  // Validation States
  const [parsedData, setParsedData] = useState<any[] | null>(null);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [validationSuccess, setValidationSuccess] = useState<boolean>(false);
  
  // Database Stats
  const [stats, setStats] = useState<Record<string, { custom: number; total: number }>>({});
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [notification, setNotification] = useState<{ type: 'success' | 'error'; message: string } | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);
  const activeMeta = DATA_TYPES.find(d => d.id === activeType)!;

  const loadStats = () => {
    // Data is now server-side; show empty stats — the API does not expose row counts
    setStats({
      sku_sales: { custom: 0, total: 0 },
      pods_sales: { custom: 0, total: 0 },
      sales_spends: { custom: 0, total: 0 },
      survey_responses: { custom: 0, total: 0 },
      decisions: { custom: 0, total: 0 },
    });
  };

  useEffect(() => {
    loadStats();
  }, []);

  const handleCopyTemplate = () => {
    navigator.clipboard.writeText(activeMeta.sampleCsv);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const parseCSV = (text: string): any[] => {
    const lines = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return [];

    // Simple robust CSV parser handling potential quotes
    const parseCSVLine = (line: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuotes = false;
      for (let i = 0; i < line.length; i++) {
        const char = line[i];
        if (char === '"') {
          inQuotes = !inQuotes;
        } else if (char === ',' && !inQuotes) {
          result.push(current.trim());
          current = '';
        } else {
          current += char;
        }
      }
      result.push(current.trim());
      return result;
    };

    const headers = parseCSVLine(lines[0]).map(h => h.replace(/^"|"$/g, '').trim());
    
    return lines.slice(1).map(line => {
      const values = parseCSVLine(line).map(v => v.replace(/^"|"$/g, '').trim());
      const row: any = {};
      headers.forEach((header, index) => {
        let val: any = values[index] || '';
        // Convert numbers if numeric
        if (val !== '' && !isNaN(val as any)) {
          val = Number(val);
        }
        row[header] = val;
      });
      return row;
    });
  };

  const handleValidate = (textToValidate?: string) => {
    const text = textToValidate !== undefined ? textToValidate : inputText;
    setValidationError(null);
    setValidationSuccess(false);
    setParsedData(null);

    if (!text.trim()) {
      setValidationError('Please paste or upload some data first.');
      return;
    }

    try {
      let rows: any[] = [];
      if (text.trim().startsWith('[') || text.trim().startsWith('{')) {
        // Parse as JSON
        const parsed = JSON.parse(text);
        rows = Array.isArray(parsed) ? parsed : [parsed];
      } else {
        // Parse as CSV
        rows = parseCSV(text);
      }

      if (rows.length === 0) {
        setValidationError('No rows could be parsed from the provided input.');
        return;
      }

      // Check required fields
      const missingFields: string[] = [];
      const firstRowKeys = Object.keys(rows[0]);
      
      activeMeta.requiredFields.forEach(field => {
        if (!firstRowKeys.includes(field)) {
          missingFields.push(field);
        }
      });

      if (missingFields.length > 0) {
        setValidationError(`Missing required column headers: ${missingFields.join(', ')}. Expected: ${activeMeta.requiredFields.join(', ')}`);
        return;
      }

      // If it's a decision, ensure evidence & rawDataRefs arrays are initialized even if empty
      if (activeType === 'decisions') {
        rows = rows.map(r => ({
          ...r,
          evidence: r.evidence ? (typeof r.evidence === 'string' ? JSON.parse(r.evidence) : r.evidence) : [],
          rawDataRefs: r.rawDataRefs ? (typeof r.rawDataRefs === 'string' ? JSON.parse(r.rawDataRefs) : r.rawDataRefs) : []
        }));
      }

      setParsedData(rows);
      setValidationSuccess(true);
    } catch (err: any) {
      setValidationError(`Failed to parse data: ${err.message || err}`);
    }
  };

  const handleTextChange = (val: string) => {
    setInputText(val);
    if (val.trim()) {
      handleValidate(val);
    } else {
      setParsedData(null);
      setValidationError(null);
      setValidationSuccess(false);
    }
  };

  // Drag and Drop handlers
  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const processFile = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      const text = e.target?.result as string;
      setInputText(text);
      handleValidate(text);
    };
    reader.readAsText(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  const handleCommitImport = async () => {
    if (!parsedData || parsedData.length === 0) return;
    setIsSaving(true);
    try {
      await saveImportedData(activeType, parsedData);
      loadStats();
      setNotification({
        type: 'success',
        message: `Successfully imported ${parsedData.length} records into the ${activeMeta.label} database!`
      });
      setInputText('');
      setParsedData(null);
      setValidationSuccess(false);
    } catch (err) {
      setNotification({
        type: 'error',
        message: 'Failed to write data to local database.'
      });
    } finally {
      setIsSaving(false);
      setTimeout(() => setNotification(null), 5000);
    }
  };

  const handleClear = async (type: DataType) => {
    if (confirm(`Are you sure you want to delete all imported records for ${type === 'sku_sales' ? 'SKU Sales' : type === 'pods_sales' ? 'PODs Sales' : type === 'sales_spends' ? 'Sales & Spends' : type === 'survey_responses' ? 'Customer Surveys' : 'Recommended Actions'}? This will remove the data from the server.`)) {
      await clearImportedData(type);
      loadStats();
      setNotification({
        type: 'success',
        message: 'Successfully reverted database to original seed state.'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  const handleResetAll = async () => {
    if (confirm('Revert all 5 databases back to original seed datasets? All your custom imports will be deleted.')) {
      await clearImportedData('all');
      loadStats();
      setNotification({
        type: 'success',
        message: 'All databases have been successfully reset to default system seeds.'
      });
      setTimeout(() => setNotification(null), 3000);
    }
  };

  return (
    <div className="space-y-8 animate-fade-in text-brand-near-black">
      
      {/* 1. Header Banner */}
      <div className="border-b border-brand-lavender/30 pb-5 flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="font-fredoka font-bold text-2xl tracking-tight text-brand-purple flex items-center gap-2">
            <Database className="w-6 h-6 text-brand-purple" />
            Insights Data Workshop
          </h1>
          <p className="font-display text-[11px] uppercase tracking-wider text-brand-near-black/60 mt-1">
            Import Excel or CSV data spreadsheets and view raw data records.
          </p>
        </div>
        <button
          onClick={handleResetAll}
          className="px-4 py-2 bg-brand-white hover:bg-brand-white/80 border border-brand-red/30 text-brand-red text-xs font-mono font-bold uppercase tracking-wider rounded-2xl flex items-center gap-1.5 transition-all cursor-pointer shadow-xs"
        >
          <RefreshCcw className="w-3.5 h-3.5" />
          Reset All Seeds
        </button>
      </div>

      {/* Notification toast */}
      {notification && (
        <div className={`p-4 rounded-2xl border flex items-start gap-3 shadow-md animate-bounce ${
          notification.type === 'success' 
            ? 'bg-emerald-50 border-emerald-200 text-emerald-800' 
            : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          {notification.type === 'success' ? (
            <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
          ) : (
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
          )}
          <div className="text-xs font-display font-medium leading-relaxed">
            {notification.message}
          </div>
        </div>
      )}

      {/* 2. Database Status Bento Grid */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
        {DATA_TYPES.map(m => {
          const type = m.id;
          const stat = stats[type] || { custom: 0, total: 0 };
          const isActive = activeType === type;
          return (
            <button
              key={type}
              onClick={() => {
                setActiveType(type);
                setParsedData(null);
                setValidationError(null);
                setValidationSuccess(false);
                setInputText('');
              }}
              className={`text-left p-4 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between h-32 ${
                isActive 
                  ? 'bg-brand-purple text-white border-brand-purple shadow-md scale-102' 
                  : 'bg-brand-white text-brand-near-black border-brand-lavender/30 hover:border-brand-purple/30 shadow-xs'
              }`}
            >
              <div>
                <p className={`font-mono text-[9px] uppercase tracking-wider ${isActive ? 'text-brand-lavender-tint' : 'text-brand-purple/60'}`}>
                  DATABASE
                </p>
                <h4 className="font-display font-extrabold text-xs uppercase mt-0.5 truncate">{m.label}</h4>
              </div>
              
              <div className="flex items-end justify-between mt-4">
                <div>
                  <span className="font-fredoka text-2xl font-bold">{stat.total}</span>
                  <span className={`font-mono text-[9px] ml-1 ${isActive ? 'text-brand-lavender-tint' : 'text-brand-near-black/50'}`}>
                    rows
                  </span>
                </div>
                {stat.custom > 0 && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleClear(type);
                      }}
                      title="Revert to seed"
                      className={`p-1 rounded-lg transition-colors ${
                        isActive ? 'hover:bg-brand-white/10 text-white' : 'hover:bg-brand-purple/10 text-brand-red'
                      }`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </button>
          );
        })}
      </div>

      {/* 3. Main Import Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left Column: Instructions and Template Preview */}
        <div className="space-y-6 lg:col-span-1">
          <div className="bg-brand-white p-6 rounded-3xl border border-brand-lavender/30 shadow-xs space-y-4">
            <div>
              <span className="pill text-[9px]">TEMPLATE SCHEMAS</span>
              <h3 className="font-display font-black text-sm uppercase text-brand-purple mt-2">{activeMeta.label} Template</h3>
              <p className="text-xs text-brand-near-black/70 mt-1 leading-relaxed">
                {activeMeta.description} Make sure your Excel sheets are saved as <b>CSV</b> format or use <b>JSON</b> arrays.
              </p>
            </div>

            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-near-black/50 block">Required Columns:</span>
              <div className="flex flex-wrap gap-1.5">
                {activeMeta.requiredFields.map(f => (
                  <span key={f} className="font-mono text-[10px] bg-brand-purple/5 text-brand-purple border border-brand-purple/10 px-2 py-0.5 rounded-lg">
                    {f}
                  </span>
                ))}
              </div>
            </div>

            <div className="space-y-2 pt-2">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-mono uppercase tracking-wider text-brand-near-black/50">Raw CSV Preview:</span>
                <button
                  onClick={handleCopyTemplate}
                  className="text-[10px] font-display font-bold text-brand-purple flex items-center gap-1 hover:underline cursor-pointer"
                >
                  {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
                  {copied ? 'Copied' : 'Copy Template'}
                </button>
              </div>
              <pre className="text-[10px] font-mono bg-brand-purple/5 p-3 rounded-2xl border border-brand-purple/10 overflow-x-auto text-brand-purple max-h-32 hide-scrollbar">
                {activeMeta.sampleCsv}
              </pre>
            </div>
          </div>


        </div>

        {/* Right Column: Upload Form and Live Validation */}
        <div className="lg:col-span-2 space-y-6">
          
          <div className="bg-brand-white p-6 rounded-3xl border border-brand-lavender/30 shadow-xs space-y-6">
            
            {/* Drag & Drop Area */}
            <div
              onDragEnter={handleDrag}
              onDragOver={handleDrag}
              onDragLeave={handleDrag}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-3xl p-8 text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-3 ${
                dragActive 
                  ? 'border-brand-purple bg-brand-purple/5' 
                  : 'border-brand-lavender hover:border-brand-purple bg-brand-purple/2'
              }`}
            >
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                accept=".csv,.json"
                className="hidden"
              />
              <div className="w-12 h-12 rounded-2xl bg-brand-purple/10 flex items-center justify-center text-brand-purple">
                <Upload className="w-6 h-6" />
              </div>
              <div>
                <p className="font-display font-extrabold text-xs uppercase text-brand-near-black">
                  Drag & Drop spreadsheet files
                </p>
                <p className="text-[10px] font-mono text-brand-near-black/50 mt-1">
                  Supports .CSV and .JSON formats
                </p>
              </div>
              <button
                type="button"
                className="px-4 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white text-[10px] font-mono font-bold uppercase tracking-wider rounded-xl transition-all shadow-xs pointer-events-none"
              >
                Or Browse Files
              </button>
            </div>

            {/* Paste Data Title */}
            <div className="space-y-2">
              <span className="text-[10px] font-mono uppercase tracking-wider text-brand-near-black/50 block">
                Or Paste CSV / JSON Spreadsheet Content:
              </span>
              <textarea
                value={inputText}
                onChange={(e) => handleTextChange(e.target.value)}
                placeholder={`Paste spreadsheet text data here. \nExample:\nsku,line,city,platform,salesMrp\nBBQ Blast Millet Bhujia,Baked Millet Bhujia,Ahmedabad,Instamart,4500`}
                className="w-full h-44 p-4 rounded-2xl border border-brand-lavender/30 bg-brand-purple/1 font-mono text-[11px] text-brand-near-black placeholder:text-brand-near-black/30 focus:border-brand-purple/50 focus:ring-0 outline-none resize-none"
              />
            </div>

            {/* Live Validator Response Bar */}
            {(validationError || validationSuccess) && (
              <div className={`p-4 rounded-2xl border flex items-start gap-3 text-xs ${
                validationError 
                  ? 'bg-rose-50 border-rose-200 text-rose-800' 
                  : 'bg-emerald-50 border-emerald-200 text-emerald-800'
              }`}>
                {validationError ? (
                  <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600 mt-0.5" />
                ) : (
                  <CheckCircle className="w-5 h-5 shrink-0 text-emerald-600 mt-0.5" />
                )}
                <div>
                  <p className="font-display font-extrabold uppercase text-[10px] tracking-wider">
                    {validationError ? 'Spreadsheet Validation Error' : 'Spreadsheet Check Success'}
                  </p>
                  <p className="mt-1 leading-relaxed text-[11px]">
                    {validationError || `Parsed ${parsedData?.length} valid records from pasted content. Ready to commit into active database.`}
                  </p>
                </div>
              </div>
            )}

            {/* Committer Area */}
            {validationSuccess && parsedData && parsedData.length > 0 && (
              <div className="space-y-4 border-t border-brand-lavender/20 pt-4 animate-fade-in">
                <div className="flex items-center justify-between">
                  <h4 className="font-display font-extrabold text-xs uppercase text-brand-purple">
                    Parsed Spreadsheet Records Preview ({parsedData.length} lines)
                  </h4>
                  <button
                    onClick={handleCommitImport}
                    disabled={isSaving}
                    className="px-5 py-2.5 bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-mono font-bold uppercase tracking-wider rounded-2xl transition-all shadow-md flex items-center gap-2 cursor-pointer disabled:opacity-50"
                  >
                    {isSaving ? <RefreshCcw className="w-3.5 h-3.5 animate-spin" /> : <FileSpreadsheet className="w-3.5 h-3.5" />}
                    Commit Data to Database
                  </button>
                </div>

                <div className="border border-brand-lavender/20 rounded-2xl overflow-x-auto bg-brand-purple/2 max-h-48 hide-scrollbar">
                  <table className="w-full text-left font-mono text-[10px]">
                    <thead className="bg-brand-purple/5 text-brand-purple sticky top-0 border-b border-brand-lavender/20">
                      <tr>
                        {Object.keys(parsedData[0]).map(key => (
                          <th key={key} className="px-4 py-2 font-bold uppercase tracking-wider">{key}</th>
                        ))}
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-brand-lavender/10">
                      {parsedData.slice(0, 5).map((row, index) => (
                        <tr key={index} className="hover:bg-brand-purple/5">
                          {Object.values(row).map((val: any, vIdx) => (
                            <td key={vIdx} className="px-4 py-2 text-brand-near-black/85 truncate max-w-xs">
                              {typeof val === 'object' ? JSON.stringify(val) : String(val)}
                            </td>
                          ))}
                        </tr>
                      ))}
                      {parsedData.length > 5 && (
                        <tr>
                          <td colSpan={Object.keys(parsedData[0]).length} className="px-4 py-2 text-center text-brand-near-black/50 italic bg-brand-purple/3">
                            ... and {parsedData.length - 5} more rows
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

          </div>

          {/* Quick Info Box */}
          <div className="bg-brand-white p-5 rounded-3xl border border-brand-lavender/30 shadow-xs flex gap-3.5 items-start">
            <Info className="w-5 h-5 text-brand-purple shrink-0 mt-0.5" />
            <div className="text-xs text-brand-near-black/75 leading-relaxed">
              <p className="font-display font-extrabold uppercase tracking-wider text-brand-purple text-[10px]">
                Persistent Local Storage
              </p>
              <p className="mt-1">
                All custom spreadsheets imported on this tab are saved locally inside your secure web browser. The standard analytical widgets, charts, and recommendations in the <b>Dashboard</b>, <b>Explore</b>, and <b>Decisions</b> workspaces will dynamically adapt to reflect your newly loaded databases.
              </p>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
