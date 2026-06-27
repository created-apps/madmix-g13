import { useState, useEffect } from 'react';
import {
  AnalysisFilters,
  getUserProfile,
  updateUserProfile,
  getBookmarkedDecisionIds,
  toggleBookmarkDecision,
  shareAnalysis,
  getCompletedDecisionIds,
  toggleCompletedDecision,
} from './lib/data';
import { supabase } from './lib/supabase';
import { UserProfile, Decision, SharedAnalysis } from './types';
import AppShell from './components/layout/AppShell';
import Dashboard from './pages/Dashboard';
import Explore from './pages/Explore';
import Shared from './pages/Shared';
import Saved from './pages/Saved';
import Completed from './pages/Completed';
import Profile from './pages/Profile';
import Import from './pages/Import';
import DecisionDetail from './pages/DecisionDetail';
import Auth from './pages/Auth';
import ShareDialog from './components/ui/ShareDialog';

export default function App() {
  // 1. Session / Auth State — driven by Supabase onAuthStateChange
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [authChecked, setAuthChecked] = useState<boolean>(false);

  // 2. Profile & Bookmark States
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [bookmarks, setBookmarks] = useState<string[]>([]);
  const [completedDecisions, setCompletedDecisions] = useState<string[]>([]);

  // 3. Navigation Routing State
  const [activeTab, setActiveTab] = useState<string>('home');
  const [previousTab, setPreviousTab] = useState<string>('home');
  const [activeDecisionId, setActiveDecisionId] = useState<string>('');

  // 4. Shared Filter Scope States
  const [exploreFilters, setExploreFilters] = useState<AnalysisFilters>({
    state: '',
    city: '',
    pincode: '',
    platform: '',
    flavour: '',
  });

  // 5. Global Sharing Overlays State
  const [shareTarget, setShareTarget] = useState<Decision | null>(null);
  const [isShareOpen, setIsShareOpen] = useState(false);

  // Subscribe to Supabase auth state once on mount
  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setIsAuthenticated(!!session);
      setAuthChecked(true);
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setIsAuthenticated(!!session);
      if (!session) {
        setUserProfile(null);
        setBookmarks([]);
        setCompletedDecisions([]);
        setActiveTab('home');
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Load user data after auth confirmed
  useEffect(() => {
    if (!isAuthenticated) return;
    async function syncUserData() {
      try {
        const [profile, savedIds, completedIds] = await Promise.all([
          getUserProfile(),
          getBookmarkedDecisionIds(),
          getCompletedDecisionIds(),
        ]);
        setUserProfile(profile);
        setBookmarks(savedIds);
        setCompletedDecisions(completedIds);
      } catch {
        // Profile may not exist yet if email not yet confirmed; stay on Auth
      }
    }
    syncUserData();
  }, [isAuthenticated]);

  const handleLoginSuccess = () => {
    // Session change fires onAuthStateChange; useEffect above handles the rest.
  };

  const handleLogout = async () => {
    await supabase.auth.signOut();
    // onAuthStateChange listener resets all state
  };

  const handleUpdateProfile = async (updated: UserProfile) => {
    const fresh = await updateUserProfile(updated);
    setUserProfile(fresh);
  };

  const handleToggleBookmark = async (id: string) => {
    await toggleBookmarkDecision(id);
    const freshIds = await getBookmarkedDecisionIds();
    setBookmarks(freshIds);
  };

  const handleToggleCompleted = async (id: string) => {
    await toggleCompletedDecision(id);
    const freshIds = await getCompletedDecisionIds();
    setCompletedDecisions(freshIds);
  };

  const handleNavigateToExplore = (filters: Partial<AnalysisFilters>) => {
    setExploreFilters({
      state: filters.state || '',
      city: filters.city || '',
      pincode: filters.pincode || '',
      platform: filters.platform || '',
      flavour: filters.flavour || '',
    });
    setPreviousTab(activeTab);
    setActiveTab('explore');
  };

  const handleLoadSharedScope = (filterScope: SharedAnalysis['filterScope'], decisionId?: string) => {
    setExploreFilters({
      state: filterScope.state || '',
      city: filterScope.city || '',
      pincode: filterScope.pincode || '',
      platform: filterScope.platform || '',
      flavour: filterScope.flavour || '',
    });

    if (decisionId) {
      setActiveDecisionId(decisionId);
      setPreviousTab('shared');
      setActiveTab('decision-detail');
    } else {
      setPreviousTab('shared');
      setActiveTab('explore');
    }
  };

  const handleViewDecisionDetails = (id: string) => {
    setActiveDecisionId(id);
    setPreviousTab(activeTab);
    setActiveTab('decision-detail');
  };

  const handleTriggerShare = (decision: Decision) => {
    setShareTarget(decision);
    setIsShareOpen(true);
  };

  const handleConfirmShare = async (title: string, note: string) => {
    if (!shareTarget) return;

    await shareAnalysis(
      title,
      note,
      {
        state: shareTarget.state || '',
        city: shareTarget.city || '',
        pincode: '',
        platform: shareTarget.platform || '',
        flavour: shareTarget.flavour || '',
      },
      'decision',
      null,
      shareTarget.id,
    );

    setIsShareOpen(false);
    setShareTarget(null);
    setActiveTab('shared');
  };

  // Show nothing until Supabase has resolved the initial session check
  if (!authChecked) return null;

  if (!isAuthenticated || !userProfile) {
    return <Auth onLoginSuccess={handleLoginSuccess} />;
  }

  return (
    <div className="w-full">
      <AppShell
        activeTab={activeTab === 'decision-detail' ? previousTab : activeTab}
        setActiveTab={(tab) => {
          setActiveTab(tab);
          if (tab !== 'decision-detail') setPreviousTab(tab);
        }}
        userProfile={userProfile}
        onLogout={handleLogout}
        savedCount={bookmarks.length}
        completedCount={completedDecisions.length}
      >
        {activeTab === 'home' && (
          <Dashboard
            onNavigateToExplore={handleNavigateToExplore}
            onShare={handleTriggerShare}
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
            onViewDecision={handleViewDecisionDetails}
            userProfileName={userProfile.name}
            completedDecisions={completedDecisions}
            onToggleCompleted={handleToggleCompleted}
          />
        )}

        {activeTab === 'explore' && (
          <Explore
            initialFilters={exploreFilters}
            onShare={handleTriggerShare}
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
            onViewDecision={handleViewDecisionDetails}
            completedDecisions={completedDecisions}
            onToggleCompleted={handleToggleCompleted}
          />
        )}

        {activeTab === 'shared' && (
          <Shared onLoadSharedScope={handleLoadSharedScope} />
        )}

        {activeTab === 'saved' && (
          <Saved
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
            onShare={handleTriggerShare}
            onViewDecision={handleViewDecisionDetails}
            onNavigateToExplore={() => setActiveTab('explore')}
          />
        )}

        {activeTab === 'completed' && (
          <Completed
            completedIds={completedDecisions}
            bookmarks={bookmarks}
            onToggleBookmark={handleToggleBookmark}
            onToggleCompleted={handleToggleCompleted}
            onShare={handleTriggerShare}
            onViewDecision={handleViewDecisionDetails}
            onNavigateToExplore={() => setActiveTab('explore')}
          />
        )}

        {activeTab === 'import' && <Import />}

        {activeTab === 'profile' && (
          <Profile
            userProfile={userProfile}
            onUpdateProfile={handleUpdateProfile}
            onLogout={handleLogout}
          />
        )}

        {activeTab === 'decision-detail' && (
          <DecisionDetail
            decisionId={activeDecisionId}
            onBack={() => setActiveTab(previousTab)}
            isBookmarked={bookmarks.includes(activeDecisionId)}
            onToggleBookmark={handleToggleBookmark}
            onShare={handleTriggerShare}
            onNavigateToExplore={handleNavigateToExplore}
            isCompleted={completedDecisions.includes(activeDecisionId)}
            onToggleCompleted={handleToggleCompleted}
          />
        )}
      </AppShell>

      {shareTarget && (
        <ShareDialog
          isOpen={isShareOpen}
          onClose={() => {
            setIsShareOpen(false);
            setShareTarget(null);
          }}
          onConfirm={handleConfirmShare}
          itemName={shareTarget.action}
        />
      )}
    </div>
  );
}
