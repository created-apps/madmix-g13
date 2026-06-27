import { useState, useEffect } from 'react';
import { Filter, X, MapPin, ShoppingBag, Tag, SlidersHorizontal } from 'lucide-react';
import { STATE_CITY_MAPPING, CITY_PINCODES, SKUS } from '../../lib/data/constants';
import { AnalysisFilters } from '../../lib/data';

interface FilterBarProps {
  filters: AnalysisFilters;
  onFilterChange: (filters: AnalysisFilters) => void;
  onApply: (updatedFilters: AnalysisFilters) => void;
  onClear: () => void;
}

export default function FilterBar({ filters, onFilterChange, onApply, onClear }: FilterBarProps) {
  const [isMobileSheetOpen, setIsMobileSheetOpen] = useState(false);
  const [localFilters, setLocalFilters] = useState<AnalysisFilters>({ ...filters });

  // Sync local filters with parent state changes
  useEffect(() => {
    setLocalFilters({ ...filters });
  }, [filters]);

  const handleFieldChange = (key: keyof AnalysisFilters, value: string) => {
    const updated = { ...localFilters, [key]: value };
    
    // Dependent drop-down cascading logic:
    if (key === 'state') {
      updated.city = '';
      updated.pincode = '';
    } else if (key === 'city') {
      updated.pincode = '';
    }
    
    setLocalFilters(updated);
    
    // Auto-apply immediately for desktop (when mobile sheet is not open)
    if (!isMobileSheetOpen) {
      onFilterChange(updated);
      onApply(updated);
    }
  };

  const handleApplyLocal = () => {
    onFilterChange(localFilters);
    onApply(localFilters);
    setIsMobileSheetOpen(false);
  };

  const handleClearLocal = () => {
    const cleared = { state: '', city: '', pincode: '', platform: '', flavour: '' };
    setLocalFilters(cleared);
    onFilterChange(cleared);
    onClear();
    setIsMobileSheetOpen(false);
  };

  // Derive cascading dropdown arrays
  const states = Object.keys(STATE_CITY_MAPPING);
  const cities = localFilters.state ? STATE_CITY_MAPPING[localFilters.state] : Object.values(STATE_CITY_MAPPING).flat();
  const platforms = ['Big Basket', 'Instamart', 'Amazon'];

  return (
    <div className="w-full">
      {/* 1. DESKTOP FILTERS BAR (Inline card) */}
      <div className="hidden lg:flex flex-wrap items-center justify-between gap-4 bg-brand-white p-4 rounded-2xl border border-brand-lavender/30 shadow-xs">
        <div className="flex items-center gap-2 font-mono font-bold text-xs text-brand-purple uppercase tracking-wider">
          <Filter className="w-4 h-4 text-brand-purple" />
          <span>Filters:</span>
        </div>

        <div className="flex-1 grid grid-cols-4 gap-3">
          {/* State */}
          <div className="relative">
            <select
               value={localFilters.state}
               onChange={(e) => handleFieldChange('state', e.target.value)}
               className="w-full pl-3 pr-8 py-2 bg-brand-lavender-tint/20 border border-brand-lavender/25 text-[11px] font-mono font-bold uppercase tracking-wider text-brand-near-black rounded-full hover:border-brand-lavender/40 focus:outline-none focus:ring-1 focus:ring-brand-purple cursor-pointer appearance-none"
             >
              <option value="">All States</option>
              {states.map(s => <option key={s} value={s}>{s}</option>)}
            </select>
          </div>

          {/* City */}
          <div className="relative">
            <select
               value={localFilters.city}
               onChange={(e) => handleFieldChange('city', e.target.value)}
               className="w-full pl-3 pr-8 py-2 bg-brand-lavender-tint/20 border border-brand-lavender/25 text-[11px] font-mono font-bold uppercase tracking-wider text-brand-near-black rounded-full hover:border-brand-lavender/40 focus:outline-none focus:ring-1 focus:ring-brand-purple cursor-pointer appearance-none"
             >
              <option value="">All Cities</option>
              {cities.map(c => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>

          {/* Commerce Platform */}
          <div className="relative">
            <select
               value={localFilters.platform}
               onChange={(e) => handleFieldChange('platform', e.target.value)}
               className="w-full pl-3 pr-8 py-2 bg-brand-lavender-tint/20 border border-brand-lavender/25 text-[11px] font-mono font-bold uppercase tracking-wider text-brand-near-black rounded-full hover:border-brand-lavender/40 focus:outline-none focus:ring-1 focus:ring-brand-purple cursor-pointer appearance-none"
             >
              <option value="">All Platforms</option>
              {platforms.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </div>

          {/* SKU / Flavor */}
          <div className="relative">
            <select
               value={localFilters.flavour}
               onChange={(e) => handleFieldChange('flavour', e.target.value)}
               className="w-full pl-3 pr-8 py-2 bg-brand-lavender-tint/20 border border-brand-lavender/25 text-[11px] font-mono font-bold uppercase tracking-wider text-brand-near-black rounded-full hover:border-brand-lavender/40 focus:outline-none focus:ring-1 focus:ring-brand-purple cursor-pointer appearance-none truncate"
             >
              <option value="">All Flavors</option>
              {SKUS.map(f => <option key={f} value={f}>{f}</option>)}
            </select>
          </div>
        </div>

        {/* Action Affordance */}
        <div className="flex items-center gap-2 shrink-0">
          <button
            id="desktop-apply-filters-btn"
            onClick={handleApplyLocal}
            className="px-5 py-2 bg-brand-purple hover:bg-brand-purple/90 text-white text-[11px] font-mono uppercase tracking-wider font-bold rounded-full transition-all shadow-md cursor-pointer"
          >
            Apply
          </button>
          
          {(localFilters.state || localFilters.city || localFilters.platform || localFilters.flavour) && (
            <button
              id="desktop-clear-filters-btn"
              onClick={handleClearLocal}
              className="p-2 bg-brand-lavender-tint/30 hover:bg-brand-lavender-tint/50 text-brand-near-black/70 rounded-full transition-all cursor-pointer border border-brand-lavender/25"
              title="Clear Filters"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* 2. MOBILE & TABLET COMPACT TOGGLE BUTTON */}
      <div className="lg:hidden flex items-center justify-between bg-brand-white p-3.5 rounded-2xl border border-brand-lavender/30 shadow-xs">
        <div className="flex items-center gap-2">
          <SlidersHorizontal className="w-4 h-4 text-brand-purple" />
          <span className="font-mono font-bold text-xs uppercase tracking-wider text-brand-near-black">Filters</span>
          
          {/* Active indicator bubble */}
          {Object.values(filters).some(x => x !== '') && (
            <span className="w-2.5 h-2.5 bg-brand-purple rounded-full animate-pulse" />
          )}
        </div>
        
        <button
          id="mobile-filter-toggle-btn"
          onClick={() => setIsMobileSheetOpen(true)}
          className="px-4 py-1.5 bg-brand-lavender-tint/30 text-brand-purple text-[10px] font-mono uppercase tracking-wider font-bold rounded-full border border-brand-lavender/25"
        >
          Adjust Filters
        </button>
      </div>

      {/* 3. MOBILE BOTTOM SHEET OVERLAY */}
      {isMobileSheetOpen && (
        <div className="fixed inset-0 bg-brand-near-black/75 backdrop-blur-xs flex justify-end flex-col z-50 animate-fade-in text-brand-near-black">
          {/* Backdrop Click */}
          <div className="flex-1" onClick={() => setIsMobileSheetOpen(false)} />

          {/* Bottom Sheet Card */}
          <div className="bg-brand-white rounded-t-2xl max-h-[85vh] overflow-y-auto p-6 space-y-6 shadow-2xl border-t border-brand-lavender/30 transition-transform transform translate-y-0 duration-300">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-brand-lavender-tint/30 pb-3">
              <div className="flex items-center gap-2">
                <SlidersHorizontal className="w-5 h-5 text-brand-purple" />
                <h3 className="font-fredoka font-bold text-sm uppercase tracking-wider text-brand-purple">Filter Metrics</h3>
              </div>
              <button 
                id="close-mobile-filters-btn"
                onClick={() => setIsMobileSheetOpen(false)}
                className="p-1.5 bg-brand-lavender-tint/30 rounded-full hover:bg-brand-lavender-tint/50 border border-brand-lavender/25 transition-colors"
              >
                <X className="w-4 h-4 text-brand-near-black/70" />
              </button>
            </div>

            {/* Selectors list */}
            <div className="space-y-4">
              {/* State */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-near-black/50 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-purple" /> State
                </label>
                <select
                  value={localFilters.state}
                  onChange={(e) => handleFieldChange('state', e.target.value)}
                  className="w-full px-3.5 py-3 bg-brand-lavender-tint/20 border border-brand-lavender/25 text-xs font-mono font-bold uppercase tracking-wider text-brand-near-black rounded-2xl focus:ring-1 focus:ring-brand-purple"
                >
                  <option value="">All States</option>
                  {states.map(s => <option key={s} value={s}>{s}</option>)}
                </select>
              </div>

              {/* City */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-near-black/50 flex items-center gap-1.5">
                  <MapPin className="w-3.5 h-3.5 text-brand-purple" /> City
                </label>
                <select
                  value={localFilters.city}
                  onChange={(e) => handleFieldChange('city', e.target.value)}
                  className="w-full px-3.5 py-3 bg-brand-lavender-tint/20 border border-brand-lavender/25 text-xs font-mono font-bold uppercase tracking-wider text-brand-near-black rounded-2xl focus:ring-1 focus:ring-brand-purple"
                >
                  <option value="">All Cities</option>
                  {cities.map(c => <option key={c} value={c}>{c}</option>)}
                </select>
              </div>

              {/* Platform */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-near-black/50 flex items-center gap-1.5">
                  <ShoppingBag className="w-3.5 h-3.5 text-brand-purple" /> Platform
                </label>
                <select
                  value={localFilters.platform}
                  onChange={(e) => handleFieldChange('platform', e.target.value)}
                  className="w-full px-3.5 py-3 bg-brand-lavender-tint/20 border border-brand-lavender/25 text-xs font-mono font-bold uppercase tracking-wider text-brand-near-black rounded-2xl focus:ring-1 focus:ring-brand-purple"
                >
                  <option value="">All Platforms</option>
                  {platforms.map(p => <option key={p} value={p}>{p}</option>)}
                </select>
              </div>

              {/* Flavor */}
              <div className="space-y-1.5">
                <label className="text-[10px] font-mono font-bold uppercase tracking-wider text-brand-near-black/50 flex items-center gap-1.5">
                  <Tag className="w-3.5 h-3.5 text-brand-purple" /> Flavor SKU
                </label>
                <select
                  value={localFilters.flavour}
                  onChange={(e) => handleFieldChange('flavour', e.target.value)}
                  className="w-full px-3.5 py-3 bg-brand-lavender-tint/20 border border-brand-lavender/25 text-xs font-mono font-bold uppercase tracking-wider text-brand-near-black rounded-2xl focus:ring-1 focus:ring-brand-purple"
                >
                  <option value="">All Flavors</option>
                  {SKUS.map(f => <option key={f} value={f}>{f}</option>)}
                </select>
              </div>
            </div>

            {/* Bottom Actions */}
            <div className="flex gap-3 pt-3 border-t border-brand-lavender-tint/30">
              <button
                id="mobile-clear-filters-btn"
                onClick={handleClearLocal}
                className="flex-1 py-3 bg-brand-lavender-tint/35 hover:bg-brand-lavender-tint/50 text-brand-near-black/75 text-xs font-mono uppercase tracking-wider font-bold rounded-full border border-brand-lavender/25 transition-all cursor-pointer"
              >
                Clear All
              </button>
              <button
                id="mobile-apply-filters-btn"
                onClick={handleApplyLocal}
                className="flex-1 py-3 bg-brand-purple hover:bg-brand-purple/90 text-white text-xs font-mono uppercase tracking-wider font-extrabold rounded-full transition-all shadow-md cursor-pointer"
              >
                Apply Filters
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
