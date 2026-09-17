import React, { useState, useEffect, useCallback } from 'react';
import { Navbar, PageId } from './components/layout/Navbar';
import { Footer } from './components/layout/Footer';
import { DashboardPage } from './pages/DashboardPage';
import { ViewerAnalysisPage } from './pages/ViewerAnalysisPage';
import { SegmentsPage } from './pages/SegmentsPage';
import { EvaluationPage } from './pages/EvaluationPage';
import { SystemStatusPage } from './pages/SystemStatusPage';
import { UniverseCanvas } from './components/common/UniverseCanvas';
import { ScrollFrameBackground } from './components/common/ScrollFrameBackground';
import { AchievementToast } from './components/common/AchievementToast';
import { CinematicIntro } from './components/common/CinematicIntro';
import { checkHealth } from './services/api';
import { HealthResponse } from './types/api';

export const App: React.FC = () => {
  const [currentPage, setCurrentPage] = useState<PageId>('overview');
  const [health, setHealth] = useState<HealthResponse | null>(null);
  const [latency, setLatency] = useState<number>(0);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [introActive, setIntroActive] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return sessionStorage.getItem('event_horizon_intro_seen') !== 'true';
    }
    return false;
  });

  const fetchHealthStatus = useCallback(async () => {
    const res = await checkHealth();
    setLatency(res.latencyMs);
    setIsConnected(res.ok);
    setHealth(res.data);
  }, []);

  // Poll health on mount and periodically
  useEffect(() => {
    fetchHealthStatus();
    const interval = setInterval(fetchHealthStatus, 10000);
    return () => clearInterval(interval);
  }, [fetchHealthStatus]);

  return (
    <div className="relative min-h-screen flex flex-col bg-[#03060C] text-slate-100 font-sans selection:bg-sky-400 selection:text-slate-950 overflow-x-hidden pt-16">
      {/* Scroll-Driven Accretion Disk Frame Sequence Hero Background */}
      <ScrollFrameBackground isIntroActive={introActive} />

      {/* Orbital Gravitational Field Canvas */}
      <UniverseCanvas interactive={true} />

      {/* Cinematic Intro Sequence (First load / fresh session) */}
      {introActive && (
        <CinematicIntro onComplete={() => setIntroActive(false)} />
      )}

      {/* Discovery Telemetry Alerts */}
      <AchievementToast />

      {/* Minimal Floating Navigation */}
      <Navbar
        currentPage={currentPage}
        onPageChange={setCurrentPage}
        health={health}
        latency={latency}
        isConnected={isConnected}
        onRefreshHealth={fetchHealthStatus}
      />

      {/* Main Content Area */}
      <main className="relative z-10 flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-6">
        {currentPage === 'overview' && (
          <DashboardPage
            onNavigate={setCurrentPage}
            health={health}
            isConnected={isConnected}
            latency={latency}
          />
        )}

        {currentPage === 'analyze' && <ViewerAnalysisPage />}

        {currentPage === 'segments' && <SegmentsPage onNavigate={setCurrentPage} />}

        {currentPage === 'evaluation' && <EvaluationPage />}

        {currentPage === 'system' && (
          <SystemStatusPage
            health={health}
            isConnected={isConnected}
            latency={latency}
            onRefresh={fetchHealthStatus}
          />
        )}
      </main>

      {/* Sleek Footer */}
      <Footer />
    </div>
  );
};

export default App;
