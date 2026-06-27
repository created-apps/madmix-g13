import { supabase } from '../supabase';
import { apiFetch } from '../api';
import {
  Decision,
  SharedAnalysis,
  UserProfile,
  AnalysisResponse,
} from '../../types';

export { STATE_CITY_MAPPING, CITY_PINCODES, FLAVOUR_LINE_MAPPING, SKUS } from './constants';

export interface AnalysisFilters {
  state: string;
  city: string;
  pincode: string;
  platform: string;
  flavour: string;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function filtersToParams(filters?: Partial<AnalysisFilters>): string {
  if (!filters) return '';
  const q = new URLSearchParams();
  if (filters.state) q.set('state', filters.state);
  if (filters.city) q.set('city', filters.city);
  if (filters.pincode) q.set('pincode', filters.pincode);
  if (filters.platform) q.set('platform', filters.platform);
  if (filters.flavour) q.set('flavour', filters.flavour);
  const s = q.toString();
  return s ? `?${s}` : '';
}

async function currentUserId(): Promise<string> {
  const { data } = await supabase.auth.getSession();
  const uid = data.session?.user.id;
  if (!uid) throw new Error('Not authenticated');
  return uid;
}

// ---------------------------------------------------------------------------
// Hot Cities — FastAPI
// ---------------------------------------------------------------------------

export async function getHotCities() {
  return apiFetch<{
    city: string;
    state: string;
    sparkline: number[];
    whyItIsHot: string;
    severity: 'high' | 'grow' | 'monitor';
    trend: 'up' | 'down' | 'flat';
  }[]>('/api/v1/hot-cities');
}

// ---------------------------------------------------------------------------
// Decisions — FastAPI
// ---------------------------------------------------------------------------

export async function getDecisions(filters?: Partial<AnalysisFilters>): Promise<Decision[]> {
  return apiFetch<Decision[]>(`/api/v1/decisions${filtersToParams(filters)}`);
}

export async function getDecisionById(id: string): Promise<Decision | undefined> {
  try {
    return await apiFetch<Decision>(`/api/v1/decisions/${id}`);
  } catch {
    return undefined;
  }
}

// ---------------------------------------------------------------------------
// Analysis — FastAPI
// ---------------------------------------------------------------------------

export async function getAnalysis(filters: AnalysisFilters): Promise<AnalysisResponse> {
  return apiFetch<AnalysisResponse>(`/api/v1/analysis${filtersToParams(filters)}`);
}

// ---------------------------------------------------------------------------
// Shared Analyses — Supabase direct
// ---------------------------------------------------------------------------

function mapSharedRow(r: any): SharedAnalysis {
  return {
    id: r.id,
    sharedBy: r.shared_by,
    sharedAt: r.shared_at,
    note: r.note,
    title: r.title,
    filterScope: r.filter_scope ?? { state: '', city: '', pincode: '', platform: '', flavour: '' },
    previewType: r.preview_type,
    previewData: r.preview_data,
    decisionId: r.decision_id ?? undefined,
  };
}

export async function getSharedAnalyses(): Promise<SharedAnalysis[]> {
  const { data, error } = await supabase
    .from('shared_analyses')
    .select('*')
    .order('shared_at', { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(mapSharedRow);
}

export async function shareAnalysis(
  title: string,
  note: string,
  filterScope: SharedAnalysis['filterScope'],
  previewType: SharedAnalysis['previewType'],
  previewData?: any,
  decisionId?: string,
): Promise<SharedAnalysis> {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) throw new Error('Not authenticated');

  let displayName = session.user.email?.split('@')[0] || 'Team Member';
  try {
    const profile = await getUserProfile();
    displayName = profile.name || displayName;
  } catch { /* profile may not exist yet */ }

  const row = {
    shared_by: displayName,
    created_by: session.user.id,
    note,
    title,
    filter_scope: filterScope,
    preview_type: previewType,
    preview_data: previewData ?? {},
    decision_id: decisionId ?? null,
  };

  const { data, error } = await supabase.from('shared_analyses').insert(row).select().single();
  if (error) throw new Error(error.message);
  return mapSharedRow(data);
}

// ---------------------------------------------------------------------------
// Bookmarks (saved_items) — Supabase direct
// ---------------------------------------------------------------------------

export async function getBookmarkedDecisionIds(): Promise<string[]> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('saved_items')
    .select('decision_id')
    .eq('user_id', uid);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => r.decision_id as string);
}

export async function toggleBookmarkDecision(id: string): Promise<boolean> {
  const uid = await currentUserId();
  const { data: existing } = await supabase
    .from('saved_items')
    .select('id')
    .eq('user_id', uid)
    .eq('decision_id', id)
    .maybeSingle();

  if (existing) {
    await supabase.from('saved_items').delete().eq('user_id', uid).eq('decision_id', id);
    return false;
  } else {
    await supabase.from('saved_items').insert({ user_id: uid, decision_id: id });
    return true;
  }
}

// ---------------------------------------------------------------------------
// Completed (completed_items) — Supabase direct
// ---------------------------------------------------------------------------

export async function getCompletedDecisionIds(): Promise<string[]> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('completed_items')
    .select('decision_id')
    .eq('user_id', uid);
  if (error) throw new Error(error.message);
  return (data ?? []).map((r: any) => r.decision_id as string);
}

export async function toggleCompletedDecision(id: string): Promise<boolean> {
  const uid = await currentUserId();
  const { data: existing } = await supabase
    .from('completed_items')
    .select('id')
    .eq('user_id', uid)
    .eq('decision_id', id)
    .maybeSingle();

  if (existing) {
    await supabase.from('completed_items').delete().eq('user_id', uid).eq('decision_id', id);
    return false;
  } else {
    await supabase.from('completed_items').insert({ user_id: uid, decision_id: id });
    return true;
  }
}

// ---------------------------------------------------------------------------
// User Profile — Supabase direct
// ---------------------------------------------------------------------------

export async function getUserProfile(): Promise<UserProfile> {
  const uid = await currentUserId();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', uid)
    .single();
  if (error) throw new Error(error.message);
  return {
    name: data.name,
    email: data.email,
    avatar: data.avatar_url ?? '',
    watchedCities: data.watched_cities ?? [],
    watchedFlavours: data.watched_flavours ?? [],
  };
}

export async function updateUserProfile(profile: UserProfile): Promise<UserProfile> {
  const uid = await currentUserId();
  const { error } = await supabase.from('profiles').update({
    name: profile.name,
    avatar_url: profile.avatar,
    watched_cities: profile.watchedCities,
    watched_flavours: profile.watchedFlavours,
    updated_at: new Date().toISOString(),
  }).eq('id', uid);
  if (error) throw new Error(error.message);
  return profile;
}

// ---------------------------------------------------------------------------
// Import helpers — FastAPI
// ---------------------------------------------------------------------------

type ImportDataType = 'sku_sales' | 'pods_sales' | 'sales_spends' | 'survey_responses' | 'decisions';

export async function saveImportedData(type: ImportDataType, data: any[]): Promise<void> {
  await apiFetch(`/api/v1/import/${type}`, {
    method: 'POST',
    body: JSON.stringify({ data }),
  });
}

export async function clearImportedData(type: ImportDataType | 'all'): Promise<void> {
  if (type === 'all') {
    const types: ImportDataType[] = ['sku_sales', 'pods_sales', 'sales_spends', 'survey_responses', 'decisions'];
    await Promise.all(types.map(t => apiFetch(`/api/v1/import/${t}`, { method: 'DELETE' })));
  } else {
    await apiFetch(`/api/v1/import/${type}`, { method: 'DELETE' });
  }
}

// Legacy key constants kept for any pages still referencing them (no-ops now)
export const IMPORTED_AVAILABILITY_KEY = 'madmix_imported_pods_availability';
export const IMPORTED_SKU_SALES_KEY = 'madmix_imported_sku_sales';
export const IMPORTED_SALES_SPENDS_KEY = 'madmix_imported_sales_spends';
export const IMPORTED_SURVEY_RESPONSES_KEY = 'madmix_imported_survey_responses';
export const IMPORTED_DECISIONS_KEY = 'madmix_imported_decisions';
