import React, { useState, useEffect, useRef } from 'react';
import { HealthResponse } from '../../types/api';
import { BackendStatusModal } from '../common/BackendStatusModal';

export type PageId = 'overview' | 'analyze' | 'segments' | 'evaluation' | 'system';

interface NavbarProps {
  currentPage: PageId;
  onPageChange: (page: PageId) => void;
  health: HealthResponse | null;
  latency: number;
  isConnected: boolean;
  onRefreshHealth: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentPage,
  onPageChange,
  health,
  latency,
  isConnected,
  onRefreshHealth,
}) => {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const lastScrollY = useRef(0);

  // Intelligent auto-disappear / reappear on scroll
  useEffect(() => {
    const handleScroll = () => {
      const currentScrollY = window.scrollY;
      const delta = currentScrollY - lastScrollY.current;

      if (currentScrollY < 60) {
        setIsVisible(true);
      } else if (delta > 8 && currentScrollY > 100) {
        // Scrolling down -> tuck away
        setIsVisible(false);
      } else if (delta < -6) {
        // Scrolling up -> reveal
        setIsVisible(true);
      }

      lastScrollY.current = currentScrollY;
    };

    window.addEventListener('scroll', handleScroll, { passive: true });
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  const navItems: { id: PageId; label: string }[] = [
    { id: 'overview', label: 'Overview' },
    { id: 'analyze', label: 'Analyze' },
    { id: 'segments', label: 'Segments' },
    { id: 'evaluation', label: 'Evaluation' },
    { id: 'system', label: 'System' },
  ];

  return (
    <>
      <div
        className={`fixed top-4 inset-x-0 mx-auto max-w-5xl z-50 px-3 sm:px-6 pointer-events-none transition-all duration-300 ${
          isVisible ? 'translate-y-0 opacity-100' : '-translate-y-16 opacity-0'
        }`}
      >
        <header className="pointer-events-auto flex items-center justify-between px-4 sm:px-6 py-2.5 rounded-full bg-[#060A14]/90 border border-white/10 backdrop-blur-2xl shadow-2xl">
          {/* Brand */}
          <button
            onClick={() => onPageChange('overview')}
            className="flex items-center space-x-2.5 text-left group"
          >
            <span className="relative flex h-2.5 w-2.5">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-sky-400 opacity-60"></span>
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-sky-400"></span>
            </span>
            <span className="font-extrabold tracking-widest text-xs sm:text-sm text-slate-100 font-mono uppercase group-hover:text-white transition">
              AUDIENCE SEGMENTATION
            </span>
          </button>

          {/* Minimal Nav Tabs */}
          <nav className="flex items-center space-x-1 sm:space-x-1.5">
            {navItems.map((item) => {
              const isActive = currentPage === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => onPageChange(item.id)}
                  className={`relative px-2.5 sm:px-3.5 py-1 text-xs font-mono uppercase tracking-wider transition-all duration-150 rounded-full focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sky-400 ${
                    isActive
                      ? 'text-white font-bold bg-white/10'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-white/[0.04]'
                  }`}
                >
                  <span>{item.label}</span>
                  {isActive && (
                    <span className="absolute bottom-0 left-2 right-2 h-[2px] bg-sky-400 rounded-full" />
                  )}
                </button>
              );
            })}
          </nav>

          {/* Minimal Telemetry Signal */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => setIsModalOpen(true)}
              title="Click to view microservice diagnostics"
              className="flex items-center space-x-1.5 px-2.5 py-1 rounded-full bg-white/[0.03] hover:bg-white/[0.07] border border-white/10 text-[11px] font-mono text-slate-300 transition"
            >
              <span
                className={`w-1.5 h-1.5 rounded-full ${
                  isConnected && health?.model_loaded ? 'bg-sky-400' : 'bg-rose-400'
                }`}
              />
              <span className="hidden sm:inline text-slate-400">
                {isConnected ? `${latency}ms` : 'OFFLINE'}
              </span>
            </button>
          </div>
        </header>
      </div>

      <BackendStatusModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        health={health}
        latency={latency}
        isConnected={isConnected}
        onRefresh={onRefreshHealth}
      />
    </>
  );
};
