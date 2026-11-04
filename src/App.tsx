import React, { useEffect, useState, useCallback } from 'react';
import {
  VideoProjectJob,
  GPUWorker,
  ScriptChapter,
  StoryboardBeat,
} from './types';
import { createSeedRelativityProject } from './utils/seedProject';
import {
  initDriveAuth,
  googleDriveSignIn,
  fetchDriveQuota,
  syncProjectToGoogleDrive,
  DriveStorageQuota,
} from './services/googleDriveService';
import {
  HomeDashboardView,
  CreateVideoView,
  ScriptStudioView,
} from './components/StudioViewsPart1';
import {
  VoiceStudioView,
  StoryboardStudioView,
  ProductionMonitorView,
  FinalVideosView,
} from './components/StudioViewsPart2';
import {
  LayoutDashboard,
  PlusCircle,
  FileText,
  Volume2,
  Clapperboard,
  Activity,
  Film,
  AlertCircle,
} from 'lucide-react';

export type NavTab =
  | 'home'
  | 'create'
  | 'script'
  | 'voice'
  | 'storyboard'
  | 'monitor'
  | 'videos';

export default function App() {
  const [activeTab, setActiveTab] = useState<NavTab>('home');
  const [projects, setProjects] = useState<VideoProjectJob[]>(() => [
    createSeedRelativityProject(),
  ]);
  const [workers, setWorkers] = useState<GPUWorker[]>([]);
  const [activeProjectId, setActiveProjectId] = useState<string>('job-relativity-demo');
  const [workerTokenHint, setWorkerTokenHint] = useState<string>(
    'aivf-colab-worker-token-2026'
  );
  const [isBusy, setIsBusy] = useState<boolean>(false);
  const [bannerMessage, setBannerMessage] = useState<{
    type: 'info' | 'error' | 'success';
    text: string;
  } | null>(null);

  // Google Drive Auth & Quota State
  const [driveConnected, setDriveConnected] = useState<boolean>(false);
  const [driveQuota, setDriveQuota] = useState<DriveStorageQuota | null>(null);
  const [isConnectingDrive, setIsConnectingDrive] = useState<boolean>(false);
  const [isSyncingDrive, setIsSyncingDrive] = useState<boolean>(false);

  const loadBackendState = useCallback(async () => {
    try {
      const res = await fetch('/api/state');
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.projects) && data.projects.length > 0) {
        setProjects(data.projects);
      }
      if (Array.isArray(data.workers)) {
        setWorkers(data.workers);
      }
      if (data.capabilities?.workerTokenHint) {
        setWorkerTokenHint(data.capabilities.workerTokenHint);
      }
    } catch {
      // Offline or initial boot fallback uses deterministic seed state
    }
  }, []);

  useEffect(() => {
    loadBackendState();
    const timer = window.setInterval(loadBackendState, 8000);
    return () => window.clearInterval(timer);
  }, [loadBackendState]);

  useEffect(() => {
    const unsub = initDriveAuth(
      async () => {
        setDriveConnected(true);
        const q = await fetchDriveQuota();
        if (q) setDriveQuota(q);
      },
      () => {
        setDriveConnected(false);
        setDriveQuota(null);
      }
    );
    return () => unsub();
  }, []);

  const activeProject =
    projects.find((p) => p.id === activeProjectId) || projects[0];

  const updateProjectInList = (updated: VideoProjectJob) => {
    setProjects((prev) => {
      const exists = prev.some((p) => p.id === updated.id);
      if (!exists) return [updated, ...prev];
      return prev.map((p) => (p.id === updated.id ? updated : p));
    });
    setActiveProjectId(updated.id);
  };

  // Handlers
  const handleConnectDrive = async () => {
    setIsConnectingDrive(true);
    setBannerMessage(null);
    try {
      const res = await googleDriveSignIn();
      if (res) {
        setDriveConnected(true);
        const quota = await fetchDriveQuota();
        if (quota) setDriveQuota(quota);
        setBannerMessage({
          type: 'success',
          text: `Connected Google Drive (${res.user.email || 'Authorized'}). Ready to sync projects to 5TB storage.`,
        });
      }
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err?.message || 'Google Drive sign-in was cancelled or failed.',
      });
    } finally {
      setIsConnectingDrive(false);
    }
  };

  const handleCreateProject = async (payload: {
    topic: string;
    instructions: string;
    targetDurationMinutes: number;
    audienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'general';
    language: string;
    narratorVoice: 'af_bella' | 'af_sarah' | 'am_adam' | 'am_michael';
    visualTheme: 'classic_chalkboard' | 'modern_dark_tech' | 'blueprint_lab' | 'warm_paper';
  }) => {
    setIsBusy(true);
    setBannerMessage(null);
    try {
      const res = await fetch('/api/projects', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to create project');
      updateProjectInList(data.project);
      setActiveTab('script');
      setBannerMessage({
        type: 'success',
        text: 'Generated 20 scored hooks & 10-chapter script. Review and approve below before voiceover.',
      });
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err?.message || 'Error creating video project.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleApproveScript = async (
    selectedHookId: string,
    chapters: ScriptChapter[]
  ) => {
    if (!activeProject) return;
    setIsBusy(true);
    setBannerMessage(null);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/approve-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ selectedHookId, chapters }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to approve script');
      updateProjectInList(data.project);
      setBannerMessage({
        type: 'success',
        text: 'Script approved! You can now proceed to Voice Studio and Storyboard Studio.',
      });
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err?.message || 'Error approving script.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRegenerateScript = async (customPrompt?: string) => {
    if (!activeProject) return;
    setIsBusy(true);
    setBannerMessage(null);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/regenerate-script`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ customPrompt }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to regenerate script');
      updateProjectInList(data.project);
      setBannerMessage({
        type: 'info',
        text: 'Hooks and script chapters regenerated. Please review and approve.',
      });
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err?.message || 'Error regenerating script.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleGenerateNarration = async (
    narratorVoice: VideoProjectJob['narratorVoice']
  ) => {
    if (!activeProject) return;
    setIsBusy(true);
    setBannerMessage(null);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/generate-narration`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ narratorVoice }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate narration');
      updateProjectInList(data.project);
      setBannerMessage({
        type: 'success',
        text: `Synthesized ${data.project.chapters.length} chapter WAV files (${data.project.actualTotalAudioDurationSec}s actual duration) and aligned word timestamps.`,
      });
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err?.message || 'Error generating narration audio.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleGenerateStoryboard = async () => {
    if (!activeProject) return;
    setIsBusy(true);
    setBannerMessage(null);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/generate-storyboard`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to generate storyboard');
      updateProjectInList(data.project);
      setBannerMessage({
        type: 'success',
        text: `Generated and synchronized ${data.project.storyboard.length} visual beats across 10 chapters.`,
      });
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err?.message || 'Error generating storyboard.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRegenerateScene = async (
    scene_id: string,
    updates?: Partial<
      Pick<
        StoryboardBeat,
        'character_pose' | 'camera_movement' | 'diagram_type' | 'approved'
      >
    >
  ) => {
    if (!activeProject) return;
    setIsBusy(true);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/regenerate-scene`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ scene_id, ...updates }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update scene');
      updateProjectInList(data.project);
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err?.message || 'Error updating scene.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handleRunLocalRender = async () => {
    if (!activeProject) return;
    setIsBusy(true);
    setBannerMessage(null);
    try {
      const res = await fetch(`/api/projects/${activeProject.id}/render-local`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Render failed');
      updateProjectInList(data.project);
      setBannerMessage({
        type: 'success',
        text: 'FFmpeg assembled 1920x1080 16:9 H.264 MP4 with synchronized narration! Ready in Final Videos.',
      });
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err?.message || 'Error rendering MP4 video.',
      });
    } finally {
      setIsBusy(false);
    }
  };

  const handlePauseJob = async () => {
    if (!activeProject) return;
    const res = await fetch(`/api/projects/${activeProject.id}/pause`, {
      method: 'POST',
    });
    const data = await res.json();
    if (res.ok && data.project) updateProjectInList(data.project);
  };

  const handleResumeJob = async () => {
    if (!activeProject) return;
    const res = await fetch(`/api/projects/${activeProject.id}/resume`, {
      method: 'POST',
    });
    const data = await res.json();
    if (res.ok && data.project) updateProjectInList(data.project);
  };

  const handleRetryJob = async () => {
    if (!activeProject) return;
    const res = await fetch(`/api/projects/${activeProject.id}/retry`, {
      method: 'POST',
    });
    const data = await res.json();
    if (res.ok && data.project) updateProjectInList(data.project);
  };

  const handleRegisterColabWorker = async (name: string, gpuModel: string) => {
    const res = await fetch('/api/workers/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        internalUiTrigger: true,
        name: name || 'Colab-Tesla-T4',
        gpuModel,
        vramTotalGb: 15.0,
        vramUsedGb: 2.1,
        environment: 'google_colab',
      }),
    });
    const data = await res.json();
    if (res.ok && data.worker) {
      setWorkers((prev) => [...prev.filter((w) => w.workerId !== data.worker.workerId), data.worker]);
      setBannerMessage({
        type: 'success',
        text: `Registered worker "${data.worker.name}" (${data.worker.gpuModel}).`,
      });
    }
  };

  const handleRemoveWorker = async (workerId: string) => {
    const res = await fetch(`/api/workers/${workerId}`, { method: 'DELETE' });
    const data = await res.json();
    if (res.ok && Array.isArray(data.workers)) {
      setWorkers(data.workers);
    }
  };

  const handleSyncProjectToDrive = async (job: VideoProjectJob) => {
    setIsSyncingDrive(true);
    setBannerMessage(null);
    try {
      const syncResult = await syncProjectToGoogleDrive(job);
      const res = await fetch(`/api/projects/${job.id}/drive-sync`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(syncResult),
      });
      const data = await res.json();
      if (res.ok && data.project) {
        updateProjectInList(data.project);
      }
      setBannerMessage({
        type: 'success',
        text: `Saved project folders and files to Google Drive (AI Video Factory/Projects/${job.title}).`,
      });
    } catch (err: any) {
      setBannerMessage({
        type: 'error',
        text: err?.message || 'Failed to sync project to Google Drive.',
      });
    } finally {
      setIsSyncingDrive(false);
    }
  };

  const workflowTabs: Array<{ id: NavTab; label: string; icon: React.ReactNode }> = [
    { id: 'home', label: 'Dashboard', icon: <LayoutDashboard className="w-4 h-4" /> },
    { id: 'create', label: 'Create Video', icon: <PlusCircle className="w-4 h-4" /> },
    { id: 'script', label: 'Script Studio', icon: <FileText className="w-4 h-4" /> },
    { id: 'voice', label: 'Voice Studio', icon: <Volume2 className="w-4 h-4" /> },
    { id: 'storyboard', label: 'Storyboard', icon: <Clapperboard className="w-4 h-4" /> },
    { id: 'monitor', label: 'Monitor & GPU', icon: <Activity className="w-4 h-4" /> },
    { id: 'videos', label: 'Final Videos', icon: <Film className="w-4 h-4" /> },
  ];

  return (
    <div className="min-h-screen bg-[#090d16] text-slate-100 flex flex-col pb-20 md:pb-8">
      {/* Top Bar Contract: Zone 1 (Single Brand Wordmark) — Zone 2 (5 Concise Links) — Zone 3 (1 Primary Action) */}
      <header className="sticky top-0 z-30 bg-[#090d16]/95 border-b border-slate-800 px-4 sm:px-6 h-14 flex items-center justify-between gap-8">
        <a
          href="#top"
          onClick={(e) => {
            e.preventDefault();
            setActiveTab('home');
          }}
          className="text-lg font-bold tracking-tight text-slate-50 whitespace-nowrap shrink-0 font-['Outfit']"
        >
          AI Video Factory
        </a>

        <nav
          aria-label="Primary Navigation"
          className="hidden md:flex items-center gap-6 text-sm font-medium text-slate-300"
        >
          <button
            type="button"
            onClick={() => setActiveTab('home')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'home' ? 'text-sky-400 font-semibold' : ''
            }`}
          >
            Dashboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('script')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'script' ? 'text-sky-400 font-semibold' : ''
            }`}
          >
            Script Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('voice')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'voice' ? 'text-sky-400 font-semibold' : ''
            }`}
          >
            Voice Studio
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('storyboard')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'storyboard' ? 'text-sky-400 font-semibold' : ''
            }`}
          >
            Storyboard
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('monitor')}
            className={`hover:text-white transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
              activeTab === 'monitor' ? 'text-sky-400 font-semibold' : ''
            }`}
          >
            Monitor
          </button>
        </nav>

        <div className="flex items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={() => setActiveTab('create')}
            className="px-4 py-2 text-xs font-semibold text-slate-950 bg-sky-500 rounded-lg hover:bg-sky-400 transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            Create Video
          </button>
        </div>
      </header>

      {/* Main Content Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 pt-5 space-y-6">
        {/* Pipeline Stage Stepper & Active Project Switcher */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-3 pb-4 border-b border-slate-800/80">
          <div
            role="tablist"
            aria-label="Production Pipeline Stages"
            className="flex items-center gap-1.5 overflow-x-auto pb-1 sm:pb-0"
          >
            {workflowTabs.map((tab) => {
              const isActive = activeTab === tab.id;
              return (
                <button
                  key={tab.id}
                  role="tab"
                  aria-selected={isActive}
                  type="button"
                  onClick={() => setActiveTab(tab.id)}
                  className={`px-3 min-h-[40px] rounded-lg text-xs font-medium flex items-center gap-1.5 whitespace-nowrap shrink-0 transition-colors cursor-pointer ${
                    isActive
                      ? 'bg-slate-800 text-sky-400 font-semibold border border-slate-700'
                      : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900'
                  }`}
                >
                  {tab.icon}
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </div>

          <div className="flex items-center gap-2 text-xs shrink-0">
            <label htmlFor="active-project-select" className="text-slate-400 whitespace-nowrap">
              Active Project:
            </label>
            <select
              id="active-project-select"
              value={activeProject?.id || ''}
              onChange={(e) => setActiveProjectId(e.target.value)}
              className="min-h-[38px] px-3 rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs max-w-[260px] truncate"
            >
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.title} ({p.status})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Status Notification Banner */}
        {bannerMessage && (
          <div
            role="status"
            className={`p-3.5 rounded-xl border text-xs flex items-center justify-between gap-3 ${
              bannerMessage.type === 'error'
                ? 'bg-rose-950/50 border-rose-800 text-rose-200'
                : bannerMessage.type === 'success'
                  ? 'bg-emerald-950/40 border-emerald-800 text-emerald-200'
                  : 'bg-sky-950/40 border-sky-800 text-sky-200'
            }`}
          >
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{bannerMessage.text}</span>
            </div>
            <button
              type="button"
              onClick={() => setBannerMessage(null)}
              className="text-xs underline cursor-pointer shrink-0"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Active View Switcher */}
        {activeTab === 'home' && (
          <HomeDashboardView
            projects={projects}
            workers={workers}
            activeProjectId={activeProject.id}
            onSelectProject={(id, targetTab) => {
              setActiveProjectId(id);
              if (targetTab) setActiveTab(targetTab as NavTab);
            }}
            onNavigateCreate={() => setActiveTab('create')}
            driveConnected={driveConnected}
            driveQuota={driveQuota}
            onConnectDrive={handleConnectDrive}
            isConnectingDrive={isConnectingDrive}
          />
        )}

        {activeTab === 'create' && (
          <CreateVideoView
            onCreateProject={handleCreateProject}
            isSubmitting={isBusy}
          />
        )}

        {activeTab === 'script' && activeProject && (
          <ScriptStudioView
            project={activeProject}
            onApproveScript={handleApproveScript}
            onRegenerateScript={handleRegenerateScript}
            onProceedToVoice={() => setActiveTab('voice')}
            isBusy={isBusy}
          />
        )}

        {activeTab === 'voice' && activeProject && (
          <VoiceStudioView
            project={activeProject}
            onGenerateNarration={handleGenerateNarration}
            onProceedToStoryboard={() => setActiveTab('storyboard')}
            isBusy={isBusy}
          />
        )}

        {activeTab === 'storyboard' && activeProject && (
          <StoryboardStudioView
            project={activeProject}
            onGenerateStoryboard={handleGenerateStoryboard}
            onRegenerateScene={handleRegenerateScene}
            onProceedToMonitor={() => setActiveTab('monitor')}
            isBusy={isBusy}
          />
        )}

        {activeTab === 'monitor' && activeProject && (
          <ProductionMonitorView
            project={activeProject}
            workers={workers}
            workerTokenHint={workerTokenHint}
            onRunLocalRender={handleRunLocalRender}
            onPauseJob={handlePauseJob}
            onResumeJob={handleResumeJob}
            onRetryJob={handleRetryJob}
            onRegisterColabWorker={handleRegisterColabWorker}
            onRemoveWorker={handleRemoveWorker}
            onRegenerateScene={(sceneId) => handleRegenerateScene(sceneId)}
            onOpenFinalVideos={() => setActiveTab('videos')}
            isBusy={isBusy}
          />
        )}

        {activeTab === 'videos' && activeProject && (
          <FinalVideosView
            projects={projects}
            activeProject={activeProject}
            onSelectProject={(id) => setActiveProjectId(id)}
            driveConnected={driveConnected}
            onConnectDrive={handleConnectDrive}
            onSyncProjectToDrive={handleSyncProjectToDrive}
            isSyncingDrive={isSyncingDrive}
          />
        )}
      </main>

      {/* Mobile Bottom Navigation Bar (5 Primary Tabs, >=44px touch targets, <15% viewport height) */}
      <nav
        aria-label="Mobile Bottom Navigation"
        className="md:hidden fixed bottom-0 left-0 right-0 z-30 h-14 bg-[#090d16]/95 border-t border-slate-800 grid grid-cols-5 items-center px-1"
      >
        {(
          [
            { id: 'home', label: 'Home', icon: <LayoutDashboard className="w-4 h-4" /> },
            { id: 'create', label: 'Create', icon: <PlusCircle className="w-4 h-4" /> },
            { id: 'script', label: 'Script', icon: <FileText className="w-4 h-4" /> },
            { id: 'storyboard', label: 'Scenes', icon: <Clapperboard className="w-4 h-4" /> },
            { id: 'videos', label: 'Videos', icon: <Film className="w-4 h-4" /> },
          ] as const
        ).map((item) => {
          const isCurrent = activeTab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setActiveTab(item.id)}
              className={`min-h-[44px] flex flex-col items-center justify-center gap-0.5 text-[10px] font-medium cursor-pointer ${
                isCurrent ? 'text-sky-400 font-semibold' : 'text-slate-400'
              }`}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          );
        })}
      </nav>
    </div>
  );
}
