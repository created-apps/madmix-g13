import { useState, useEffect } from 'react';
import { AnalysisFilters, getAnalysis, getDecisions } from '../lib/data';
import { Decision } from '../types';
import FilterBar from '../components/filters/FilterBar';
import DecisionCard from '../components/decisions/DecisionCard';
import CityBreakdown from '../components/decisions/CityBreakdown';
import {
  SalesByFlavourChart,
  A2SOverTimeChart,
} from '../components/charts/DashboardCharts';
import {
  Sparkles,
  AlertCircle,
  Loader2,
  CheckCircle2,
  MapPin,
} from 'lucide-react';

interface ExploreProps {
  initialFilters: AnalysisFilters;
  onShare: (decision: Decision) => void;
  bookmarks: string[];
  onToggleBookmark: (id: string) => void;
  onViewDecision: (id: string) => void;
  completedDecisions: string[];
  onToggleCompleted: (id: string) => void;
}

const ENGINE_MESSAGES = [
  'Querying database for local sales metrics...',
  'Compiling packet scans & customer survey scores...',
  'Assessing Daily Ad-to-Sales (A2S) ratios against limits...',
  'Scanning city-level PODs availability dropouts...',
  'Invoking rules pipeline for grow, reduce, and remove triggers...',
  'Formatting decision evidence & database rows...'
];

export default function Explore({ 
  initialFilters, 
  onShare, 
  bookmarks, 
  onToggleBookmark,
  onViewDecision,
  completedDecisions,
  onToggleCompleted
}: ExploreProps) {
  const [filters, setFilters] = useState<AnalysisFilters>({ ...initialFilters });
  const [decisions, setDecisions] = useState<Decision[]>([]);
  const [analytics, setAnalytics] = useState<any>(null);
  const [isGenerating, setIsGenerating] = useState(false);
  const [genStep, setGenStep] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  // Load analytical and decisions dataset
  const fetchDashboardAnalysis = async (activeFilters: AnalysisFilters) => {
    setIsLoading(true);
    try {
      const [analysisResult, decisionsResult] = await Promise.all([
        getAnalysis(activeFilters),
        getDecisions(activeFilters)
      ]);
      setAnalytics(analysisResult);
      setDecisions(decisionsResult);
    } catch (e) {
      console.error(e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    setFilters({ ...initialFilters });
    fetchDashboardAnalysis(initialFilters);
  }, [initialFilters]);

  // Simulates rule scoring and LLM phrasing in the live "Generate" flow
  const handleGenerateAnalysis = () => {
    setIsGenerating(true);
    setGenStep(0);
    
    // Cycle through real-sounding metrics processing logs
    const interval = setInterval(() => {
      setGenStep(prev => {
        if (prev >= ENGINE_MESSAGES.length - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 450);

    setTimeout(async () => {
      clearInterval(interval);
      await fetchDashboardAnalysis(filters);
      setIsGenerating(false);
    }, 2800);
  };

  const getActiveFilterLabel = () => {
    const active = Object.entries(filters)
      .filter(([_, v]) => v !== '')
      .map(([k, v]) => `${k.toUpperCase()}: ${v}`);
    return active.length > 0 ? active.join(' | ') : 'ALL INDIA OPERATIONS';
  };

  return (
    <div className="space-y-6 animate-fade-in text-brand-near-black">
      
      {/* HEADER SECTION */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-brand-lavender/30 pb-5">
        <div>
          <h1 className="font-fredoka font-bold text-2xl tracking-tight text-brand-purple">Explore & Analyze</h1>
          <p className="font-display text-[11px] uppercase tracking-wider text-brand-near-black/60 mt-1">
            Query distribution metrics, cross-analyze consumer survey replies, and generate plain-English actions.
          </p>
        </div>

        <button
          id="trigger-live-generate-btn"
          disabled={isGenerating || isLoading}
          onClick={handleGenerateAnalysis}
          className="flex items-center justify-center gap-2 bg-brand-purple hover:bg-brand-purple/90 disabled:opacity-50 text-white text-[11px] font-mono uppercase tracking-wider font-extrabold px-5 py-3 rounded-full transition-all shadow-md shrink-0 cursor-pointer"
        >
          <Sparkles className="w-4 h-4 text-white shrink-0" />
          <span>Regenerate Actions</span>
        </button>
      </div>

      {/* FILTER BAR DRAWER */}
      <FilterBar 
        filters={filters} 
        onFilterChange={setFilters} 
        onApply={(updatedFilters) => fetchDashboardAnalysis(updatedFilters)}
        onClear={() => {
          const cleared = { state: '', city: '', pincode: '', platform: '', flavour: '' };
          setFilters(cleared);
          fetchDashboardAnalysis(cleared);
        }}
      />

      {/* ACTIVE SCOPE INFO BAR */}
      <div className="flex items-center gap-2.5 text-xs font-mono font-bold uppercase tracking-wider text-brand-purple bg-brand-purple/10 px-4 py-3.5 rounded-2xl border-l-4 border-l-brand-purple border border-brand-lavender/20 shadow-xs">
        <span className="w-2 h-2 rounded-full bg-brand-live animate-pulse" />
        <span>Scope:</span>
        <span className="text-brand-purple font-black truncate">{getActiveFilterLabel()}</span>
      </div>

      {/* ENGINE PROCESSING SCREEN */}
      {isGenerating ? (
        <div className="min-h-[50vh] bg-brand-white rounded-2xl border border-brand-lavender/30 shadow-md flex flex-col items-center justify-center p-8 space-y-6">
          <div className="relative flex items-center justify-center">
            {/* Spinning decorative ring */}
            <div className="w-16 h-16 border-4 border-brand-lavender/30 border-t-brand-purple rounded-full animate-spin" />
            <Sparkles className="w-6 h-6 text-brand-purple absolute animate-pulse" />
          </div>

          <div className="text-center space-y-3 max-w-sm">
            <h3 className="font-display font-black text-sm uppercase tracking-wider text-brand-purple">Processing Live Ruleset</h3>
            <p className="text-[10px] font-mono uppercase tracking-wider text-brand-near-black/70 min-h-[32px] transition-all">
              {ENGINE_MESSAGES[genStep]}
            </p>
          </div>

          {/* Progress loader bars */}
          <div className="w-48 h-2 bg-brand-lavender-tint/50 border border-brand-lavender/30 rounded-full overflow-hidden">
            <div 
              className="h-full bg-brand-purple rounded-full transition-all duration-300"
              style={{ width: `${((genStep + 1) / ENGINE_MESSAGES.length) * 100}%` }}
            />
          </div>
        </div>
      ) : isLoading ? (
        // Standard loading skeleton
        <div className="min-h-[40vh] flex flex-col items-center justify-center space-y-3">
          <Loader2 className="w-8 h-8 animate-spin text-brand-purple" />
          <p className="text-[10px] font-mono uppercase tracking-wider text-brand-near-black/60">Fetching latest metrics database...</p>
        </div>
      ) : (
        // PRIMARY METRICS & DECISION PANELS
        <div className="space-y-8">
          
          {/* CITY DETAILED BREAKDOWN IF SELECTED */}
          {filters.city && (
            <div className="animate-fade-in">
              <CityBreakdown cityName={filters.city} />
            </div>
          )}
          
          {/* 1. DECISION REC CARD WRAPPER */}
          <div className="space-y-4">
            <h2 className="font-display font-extrabold text-xs md:text-sm uppercase tracking-wider text-brand-purple/85">
              Recommended Decisions for this Scope
            </h2>
            
            {decisions.length === 0 ? (
              <div className="bg-brand-white p-6 rounded-2xl border border-brand-lavender/30 shadow-xs flex items-center gap-4">
                <CheckCircle2 className="w-6 h-6 text-brand-green shrink-0" />
                <div>
                  <h4 className="font-display font-extrabold text-sm text-brand-near-black uppercase">All Metrics Within Limits</h4>
                  <p className="text-xs text-brand-near-black/75 font-sans mt-1">
                    No critical drops or supply issues identified in this region. Operations are executing at optimum yield.
                  </p>
                </div>
              </div>
            ) : (
              <div className="grid gap-4 md:grid-cols-2">
                {decisions.map((decision) => (
                  <DecisionCard
                    key={decision.id}
                    decision={decision}
                    isBookmarked={bookmarks.includes(decision.id)}
                    onToggleBookmark={onToggleBookmark}
                    onShare={onShare}
                    onViewDetails={onViewDecision}
                    isCompleted={completedDecisions.includes(decision.id)}
                    onToggleCompleted={onToggleCompleted}
                  />
                ))}
              </div>
            )}
          </div>

          {/* 2. ANALYTICS METRICS ROW */}
          <div className="grid gap-6 md:grid-cols-12">
            
            {/* Left Column: Charts Grid (Col span 8) */}
            <div className="md:col-span-8 space-y-6">
              
              {/* Sales by Flavour */}
              <div className="bg-brand-white p-6 rounded-2xl border border-brand-lavender/30 shadow-xs space-y-4">
                <div>
                  <h3 className="font-display font-extrabold text-sm text-brand-purple uppercase tracking-tight">Sales Revenue by SKU</h3>
                  <p className="text-[10px] font-mono text-brand-near-black/50 uppercase tracking-wider">Financial output rankings across product lines</p>
                </div>
                {analytics?.salesByFlavour && (
                  <SalesByFlavourChart data={analytics.salesByFlavour} />
                )}
              </div>

              {/* Ad Spend vs Spends (A2S) */}
              <div className="bg-brand-white p-6 rounded-2xl border border-brand-lavender/30 shadow-xs space-y-4">
                <div>
                  <h3 className="font-display font-extrabold text-sm text-brand-purple uppercase tracking-tight">Advertising to Sales Elasticity (A2S)</h3>
                  <p className="text-[10px] font-mono text-brand-near-black/50 uppercase tracking-wider">Cross-comparing daily marketing spends with revenue spikes</p>
                </div>
                {analytics?.a2sOverTime && (
                  <A2SOverTimeChart data={analytics.a2sOverTime} />
                )}
              </div>

            </div>

            {/* Right Column: Survey Signals (Col span 4) */}
            <div className="md:col-span-4 space-y-6">

              {/* Platform Gap */}
              <div className="bg-brand-white p-6 rounded-2xl border border-brand-lavender/30 shadow-xs space-y-4">
                <div>
                  <h3 className="font-display font-extrabold text-sm text-brand-purple uppercase tracking-tight">Platform Gap</h3>
                  <p className="text-[10px] font-mono text-brand-near-black/50 uppercase tracking-wider">Where customers shop vs where MadMix sells</p>
                </div>
                {analytics?.platformGap && (
                  <div className="space-y-3">
                    <div className="h-3 w-full bg-brand-lavender-tint rounded-full overflow-hidden flex border border-brand-lavender/20">
                      <div className="bg-brand-green h-full" style={{ width: `${analytics.platformGap.blinkitPct}%` }} title={`Blinkit: ${analytics.platformGap.blinkitPct}%`} />
                      <div className="bg-brand-purple h-full" style={{ width: `${analytics.platformGap.zeptoPct}%` }} title={`Zepto: ${analytics.platformGap.zeptoPct}%`} />
                      <div className="bg-brand-lavender h-full" style={{ width: `${analytics.platformGap.otherPct}%` }} title={`Other: ${analytics.platformGap.otherPct}%`} />
                    </div>
                    <div className="flex flex-col gap-1.5 text-[10px] font-mono font-bold uppercase tracking-wider">
                      <span className="text-brand-green flex items-center justify-between">
                        <span>Blinkit</span><span>{analytics.platformGap.blinkitPct.toFixed(0)}%</span>
                      </span>
                      <span className="text-brand-purple flex items-center justify-between border-t border-brand-lavender-tint/40 pt-1">
                        <span>Zepto</span><span>{analytics.platformGap.zeptoPct.toFixed(0)}%</span>
                      </span>
                      <span className="text-brand-near-black/60 flex items-center justify-between border-t border-brand-lavender-tint/40 pt-1">
                        <span>Other</span><span>{analytics.platformGap.otherPct.toFixed(0)}%</span>
                      </span>
                    </div>
                    <p className="text-[10px] font-sans text-brand-near-black/60 leading-relaxed border-t border-brand-lavender-tint/40 pt-2">
                      {analytics.platformGap.insight}
                    </p>
                  </div>
                )}
              </div>

              {/* Survey Stats Cards */}
              <div className="space-y-4">
                <h3 className="font-display font-extrabold text-xs md:text-sm uppercase tracking-wider text-brand-purple/85">Survey Statistics</h3>

                {/* Skip Rate */}
                <div className="bg-brand-white p-5 rounded-2xl border border-brand-lavender/30 shadow-xs space-y-3 stat-box">
                  <span className="text-[10px] font-mono font-bold text-brand-near-black/50 uppercase tracking-widest block">
                    Skipped Due to Unavailability
                  </span>
                  <div className="flex items-start gap-2.5 mt-2">
                    <AlertCircle className="w-4 h-4 text-brand-red shrink-0 mt-0.5" />
                    <div className="w-full space-y-1.5">
                      {analytics?.skipRateByCity?.slice(0, 3).map((item: any) => (
                        <div key={item.city} className="flex items-center justify-between text-[10px] font-mono font-bold uppercase tracking-wider">
                          <span className="text-brand-near-black/70">{item.city}</span>
                          <span className={item.skipRate > 0.3 ? 'text-brand-red' : 'text-brand-green'}>
                            {(item.skipRate * 100).toFixed(0)}%
                          </span>
                        </div>
                      ))}
                      {!analytics?.skipRateByCity?.length && (
                        <span className="text-brand-near-black/50 text-[10px] font-mono">No city data in scope</span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Pincode Availability */}
                <div className="bg-brand-white p-5 rounded-2xl border border-brand-lavender/30 shadow-xs flex flex-col justify-between stat-box">
                  <span className="text-[10px] font-mono font-bold text-brand-near-black/50 uppercase tracking-widest block">
                    Pincode Coverage Rate
                  </span>
                  <div className="mt-3 flex items-start gap-2.5">
                    <MapPin className="w-4 h-4 text-brand-purple shrink-0 mt-0.5" />
                    <div>
                      <p className="font-display font-extrabold text-lg text-brand-purple uppercase tracking-tight">
                        {analytics?.pincodeAvailabilityRate != null
                          ? `${(analytics.pincodeAvailabilityRate * 100).toFixed(0)}%`
                          : '—'}
                      </p>
                      <p className="text-[10px] font-sans text-brand-near-black/60 mt-1 leading-relaxed">
                        Respondents who found MadMix available in their pincode.
                      </p>
                    </div>
                  </div>
                </div>

              </div>

            </div>

          </div>

        </div>
      )}

    </div>
  );
}
