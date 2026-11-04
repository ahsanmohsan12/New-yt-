import React, { useState } from 'react';
import {
  VideoProjectJob,
  GPUWorker,
  ScriptChapter,
} from '../types';
import { DriveStorageQuota } from '../services/googleDriveService';
import {
  PlusCircle,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Cpu,
  HardDrive,
  Play,
  RefreshCw,
  Check,
  Sparkles,
  FileText,
  ArrowRight,
} from 'lucide-react';

export const GoogleSignInButton: React.FC<{
  onClick: () => void;
  isLoading?: boolean;
  label?: string;
}> = ({ onClick, isLoading, label = 'Sign in with Google' }) => (
  <button
    type="button"
    onClick={onClick}
    disabled={isLoading}
    className="inline-flex items-center gap-3 px-4 min-h-[44px] rounded-lg bg-white text-slate-900 font-medium text-sm border border-slate-300 hover:bg-slate-100 transition-colors cursor-pointer shrink-0 disabled:opacity-60"
  >
    <svg
      version="1.1"
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 48 48"
      className="w-4 h-4 shrink-0 block"
    >
      <path
        fill="#EA4335"
        d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
      />
      <path
        fill="#FBBC05"
        d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
      />
      <path
        fill="#34A853"
        d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
      />
    </svg>
    <span className="whitespace-nowrap">{isLoading ? 'Connecting...' : label}</span>
  </button>
);

// ============================================================================
// A. HOME DASHBOARD VIEW
// ============================================================================
interface HomeDashboardProps {
  projects: VideoProjectJob[];
  workers: GPUWorker[];
  activeProjectId: string;
  onSelectProject: (id: string, targetTab?: string) => void;
  onNavigateCreate: () => void;
  driveConnected: boolean;
  driveQuota: DriveStorageQuota | null;
  onConnectDrive: () => void;
  isConnectingDrive: boolean;
}

export const HomeDashboardView: React.FC<HomeDashboardProps> = ({
  projects,
  workers,
  activeProjectId,
  onSelectProject,
  onNavigateCreate,
  driveConnected,
  driveQuota,
  onConnectDrive,
  isConnectingDrive,
}) => {
  const totalCreated = projects.length;
  const completedCount = projects.filter((p) => p.status === 'COMPLETED').length;
  const processingCount = projects.filter((p) =>
    [
      'SCRIPT_GENERATION',
      'VOICE_GENERATION',
      'STORYBOARD_GENERATION',
      'RENDERING',
      'ASSEMBLING',
      'QUALITY_CHECK',
    ].includes(p.status)
  ).length;
  const failedCount = projects.filter((p) => p.status === 'FAILED').length;
  const onlineWorkers = workers.filter((w) => w.status !== 'OFFLINE');

  // Check if at least 1 10-minute video was completed today
  const todayComplete = completedCount >= 1;

  return (
    <div className="space-y-8">
      {/* Hero Action Banner */}
      <div className="p-6 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row md:items-center md:justify-between gap-6">
        <div className="space-y-2 max-w-2xl">
          <p className="text-xs font-mono text-sky-400">
            Automated Educational Stickman Explainer Pipeline · 1920x1080 · 16:9 MP4
          </p>
          <h1
            style={{ textWrap: 'balance' }}
            className="text-2xl sm:text-3xl font-bold text-slate-50 tracking-tight font-['Outfit']"
          >
            Personal AI Video Factory
          </h1>
          <p className="text-sm text-slate-400 leading-relaxed">
            Produce one complete 10-minute educational stickman explainer video per day. Gemini 3.8
            scriptwriting, 20 scored viral hooks, Kokoro TTS narration, audio-first forced alignment,
            parallel Colab T4 GPU chapter rendering, and Google Drive 5TB storage.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            onClick={onNavigateCreate}
            className="px-5 min-h-[48px] rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create New Video</span>
          </button>
        </div>
      </div>

      {/* 6-Metric Production Grid (Single-Elevation, Tabular Numerals, Zero Static Pills) */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Total Videos Created</p>
          <p className="mt-2 text-2xl font-bold text-slate-50 font-mono tabular-nums">
            {totalCreated}
          </p>
          <p className="mt-1 text-xs text-slate-500">1080p 16:9 projects</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Videos Completed</p>
          <p className="mt-2 text-2xl font-bold text-emerald-400 font-mono tabular-nums">
            {completedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">QA & Sync verified</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Videos Processing</p>
          <p className="mt-2 text-2xl font-bold text-sky-400 font-mono tabular-nums">
            {processingCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Active pipeline jobs</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Failed Jobs</p>
          <p className="mt-2 text-2xl font-bold text-rose-400 font-mono tabular-nums">
            {failedCount}
          </p>
          <p className="mt-1 text-xs text-slate-500">Resumable from checkpoint</p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">GPU Workers Connected</p>
          <p className="mt-2 text-2xl font-bold text-amber-400 font-mono tabular-nums">
            {onlineWorkers.length}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            {onlineWorkers.length === 0 ? 'No external Colab T4 active' : 'Colab T4 nodes online'}
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Daily Production Target</p>
          <p className="mt-2 text-lg font-bold text-slate-50 font-mono tabular-nums">
            {todayComplete ? '1 / 1 Met' : '0 / 1 Pending'}
          </p>
          <p className="mt-1 text-xs text-slate-500">Goal: 10-min video / day</p>
        </div>
      </div>

      {/* Google Drive & Storage Status Row */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <HardDrive className="w-4 h-4 text-sky-400" />
                <h2 className="text-base font-semibold text-slate-100">
                  Google Drive 5TB Persistent Storage
                </h2>
              </div>
              <p className="text-xs text-slate-400">
                Path: AI Video Factory / Projects / Project Name / Script · Storyboard · Audio ·
                Scenes · Chapters · Checkpoints · Final Video
              </p>
            </div>
          </div>

          {driveConnected ? (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between text-xs text-slate-300">
                <span>
                  Connected as{' '}
                  <strong className="text-slate-100">
                    {driveQuota?.userEmail || 'Authorized Google Account'}
                  </strong>
                </span>
                <span className="font-mono tabular-nums text-emerald-400">
                  Status: Connected & Ready
                </span>
              </div>
              {driveQuota && (
                <div className="space-y-1">
                  <div className="flex justify-between text-xs text-slate-400 font-mono tabular-nums">
                    <span>
                      Used: {(driveQuota.usageBytes / (1024 * 1024 * 1024)).toFixed(2)} GB
                    </span>
                    <span>
                      Plan Limit: {(driveQuota.limitBytes / (1024 * 1024 * 1024 * 1024)).toFixed(1)}{' '}
                      TB
                    </span>
                  </div>
                  <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-sky-500"
                      style={{
                        width: `${Math.max(
                          2,
                          Math.min(100, (driveQuota.usageBytes / driveQuota.limitBytes) * 100)
                        )}%`,
                      }}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="pt-2 border-t border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <p className="text-xs text-slate-400">
                Sign in with Google to sync project checkpoints and final 1080p MP4 videos to your
                Google Drive.
              </p>
              <GoogleSignInButton
                onClick={onConnectDrive}
                isLoading={isConnectingDrive}
                label="Sign in with Google"
              />
            </div>
          )}
        </div>

        {/* GPU Workers & Local FFmpeg Engine Status */}
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 flex flex-col justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Cpu className="w-4 h-4 text-amber-400" />
              <h2 className="text-base font-semibold text-slate-100">
                Compute & Rendering Infrastructure
              </h2>
            </div>
            <p className="text-xs text-slate-400">
              Supports independent Google Colab Tesla T4 GPU workers via atomic task queue +
              built-in local FFmpeg 1080p H.264 assembler.
            </p>
          </div>

          <div className="pt-2 border-t border-slate-800 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-300">
            <div>
              <span>Colab T4 Workers Online: </span>
              <strong className="font-mono tabular-nums text-slate-100">
                {onlineWorkers.length}
              </strong>
              <span className="mx-2 text-slate-600">·</span>
              <span>Server FFmpeg H.264: </span>
              <strong className="font-mono text-emerald-400">Ready (/usr/bin/ffmpeg)</strong>
            </div>
            <button
              type="button"
              onClick={() => onSelectProject(activeProjectId, 'monitor')}
              className="px-3 min-h-[40px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs transition-colors cursor-pointer"
            >
              Manage GPU Workers
            </button>
          </div>
        </div>
      </div>

      {/* Recent Projects List */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold text-slate-100 font-['Outfit']">
            Recent Video Projects
          </h2>
          <span className="text-xs text-slate-400 font-mono tabular-nums">
            Showing {projects.length} project{projects.length === 1 ? '' : 's'}
          </span>
        </div>

        <div className="divide-y divide-slate-800 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
          {projects.map((proj) => {
            const isSelected = proj.id === activeProjectId;
            return (
              <div
                key={proj.id}
                className={`p-4 sm:p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 transition-colors ${
                  isSelected ? 'bg-slate-800/60' : 'hover:bg-slate-800/30'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400 font-mono tabular-nums">
                    <span className="text-sky-400 font-semibold">{proj.status}</span>
                    <span>·</span>
                    <span>{proj.resolution}</span>
                    <span>·</span>
                    <span>{proj.aspectRatio}</span>
                    <span>·</span>
                    <span>{proj.totalWordCount} words</span>
                    <span>·</span>
                    <span>
                      {proj.actualTotalAudioDurationSec
                        ? `${Math.round(proj.actualTotalAudioDurationSec)}s synced audio`
                        : `${Math.round(proj.estimatedTotalDurationSec)}s est.`}
                    </span>
                    <span>·</span>
                    <span>{proj.storyboard.length} visual beats</span>
                  </div>
                  <h3 className="text-base font-semibold text-slate-100">{proj.title}</h3>
                  <p className="text-xs text-slate-400 line-clamp-1">{proj.topic}</p>
                </div>

                <div className="flex flex-wrap items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => onSelectProject(proj.id, 'script')}
                    className="px-3 min-h-[42px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Script Studio
                  </button>
                  <button
                    type="button"
                    onClick={() => onSelectProject(proj.id, 'storyboard')}
                    className="px-3 min-h-[42px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition-colors cursor-pointer"
                  >
                    Storyboard ({proj.storyboard.length})
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      onSelectProject(
                        proj.id,
                        proj.status === 'COMPLETED' ? 'videos' : 'monitor'
                      )
                    }
                    className="px-3.5 min-h-[42px] rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5" />
                    <span>
                      {proj.status === 'COMPLETED' ? 'Watch Final MP4' : 'Open Pipeline'}
                    </span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// B. CREATE VIDEO VIEW
// ============================================================================
interface CreateVideoProps {
  onCreateProject: (payload: {
    topic: string;
    instructions: string;
    targetDurationMinutes: number;
    audienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'general';
    language: string;
    narratorVoice: 'af_bella' | 'af_sarah' | 'am_adam' | 'am_michael';
    visualTheme: 'classic_chalkboard' | 'modern_dark_tech' | 'blueprint_lab' | 'warm_paper';
  }) => Promise<void>;
  isSubmitting: boolean;
}

export const CreateVideoView: React.FC<CreateVideoProps> = ({
  onCreateProject,
  isSubmitting,
}) => {
  const [topic, setTopic] = useState('');
  const [instructions, setInstructions] = useState('');
  const [targetDurationMinutes, setTargetDurationMinutes] = useState(10);
  const [audienceLevel, setAudienceLevel] = useState<
    'beginner' | 'intermediate' | 'advanced' | 'general'
  >('general');
  const [language, setLanguage] = useState('English');
  const [narratorVoice, setNarratorVoice] = useState<
    'af_bella' | 'af_sarah' | 'am_adam' | 'am_michael'
  >('af_bella');
  const [visualTheme, setVisualTheme] = useState<
    'classic_chalkboard' | 'modern_dark_tech' | 'blueprint_lab' | 'warm_paper'
  >('modern_dark_tech');
  const [validationError, setValidationError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!topic || topic.trim().length < 3) {
      setValidationError('Please enter a video topic of at least 3 characters.');
      return;
    }
    setValidationError(null);
    await onCreateProject({
      topic: topic.trim(),
      instructions: instructions.trim(),
      targetDurationMinutes,
      audienceLevel,
      language,
      narratorVoice,
      visualTheme,
    });
  };

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="space-y-1">
        <p className="text-xs font-mono text-sky-400">
          Step 1 of 6 · Topic & Production Configuration
        </p>
        <h1 className="text-2xl font-bold text-slate-50 font-['Outfit']">
          Create New Educational Stickman Video
        </h1>
        <p className="text-sm text-slate-400">
          Configure your 10-minute explainer topic. The system will first generate 20 scored viral
          hooks and a 10-chapter script for your approval before running expensive voiceover or GPU
          rendering tasks.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        className="p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-5"
      >
        <div className="space-y-2">
          <label
            htmlFor="video-topic-input"
            className="block text-sm font-medium text-slate-200"
          >
            Educational Video Topic *
          </label>
          <input
            id="video-topic-input"
            type="text"
            value={topic}
            onChange={(e) => {
              setTopic(e.target.value);
              if (validationError) setValidationError(null);
            }}
            placeholder="e.g., How Quantum Computers Break RSA Encryption (Stickman Explainer)"
            className="w-full min-h-[48px] px-4 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500"
          />
          {validationError && (
            <p role="alert" className="text-xs text-rose-400 font-medium">
              {validationError}
            </p>
          )}
          <div className="flex flex-wrap items-center gap-2 pt-1">
            <span className="text-xs text-slate-500">Quick ideas:</span>
            {[
              'How Quantum Computers Break Encryption',
              'Why Airplanes Stay Aloft (Bernoulli vs Newton)',
              'How mRNA & Ribosomes Build Proteins',
            ].map((sample) => (
              <button
                key={sample}
                type="button"
                onClick={() => {
                  setTopic(sample);
                  setValidationError(null);
                }}
                className="text-xs text-sky-400 hover:underline cursor-pointer"
              >
                {sample}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <label
            htmlFor="video-instructions-input"
            className="block text-sm font-medium text-slate-200"
          >
            Optional Instructions & Visual Analogies
          </label>
          <textarea
            id="video-instructions-input"
            rows={3}
            value={instructions}
            onChange={(e) => setInstructions(e.target.value)}
            placeholder="e.g., Use stickman Bob and Alice with padlocks and prime number bar charts. Keep math intuitive."
            className="w-full p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 placeholder-slate-500 text-sm focus:outline-none focus:border-sky-500"
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label
              htmlFor="duration-select"
              className="block text-xs font-medium text-slate-300"
            >
              Target Video Duration
            </label>
            <select
              id="duration-select"
              value={targetDurationMinutes}
              onChange={(e) => setTargetDurationMinutes(Number(e.target.value))}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm"
            >
              <option value={10}>10 Minutes (Default · ~1,400 words · 200 beats)</option>
              <option value={8}>8 Minutes (~1,150 words · 160 beats)</option>
              <option value={12}>12 Minutes (~1,700 words · 240 beats)</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="audience-select"
              className="block text-xs font-medium text-slate-300"
            >
              Audience Level
            </label>
            <select
              id="audience-select"
              value={audienceLevel}
              onChange={(e) => setAudienceLevel(e.target.value as any)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm"
            >
              <option value="general">General Curious Audience (Recommended)</option>
              <option value="beginner">Beginner / High School</option>
              <option value="intermediate">Intermediate STEM</option>
              <option value="advanced">Advanced Engineering</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="narrator-select"
              className="block text-xs font-medium text-slate-300"
            >
              Kokoro TTS Narrator Voice (English)
            </label>
            <select
              id="narrator-select"
              value={narratorVoice}
              onChange={(e) => setNarratorVoice(e.target.value as any)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm"
            >
              <option value="af_bella">af_bella — Energetic Female Explainer (Default)</option>
              <option value="am_adam">am_adam — Energetic Male Explainer</option>
              <option value="af_sarah">af_sarah — Clear Narrative Female</option>
              <option value="am_michael">am_michael — Deep Documentary Male</option>
            </select>
          </div>

          <div className="space-y-1.5">
            <label
              htmlFor="theme-select"
              className="block text-xs font-medium text-slate-300"
            >
              Stickman Visual Style Theme
            </label>
            <select
              id="theme-select"
              value={visualTheme}
              onChange={(e) => setVisualTheme(e.target.value as any)}
              className="w-full min-h-[44px] px-3.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm"
            >
              <option value="modern_dark_tech">Modern Dark Tech Stickman (Default)</option>
              <option value="classic_chalkboard">Classic Green Chalkboard Stickman</option>
              <option value="blueprint_lab">Engineering Blueprint Lab</option>
              <option value="warm_paper">Warm Studio Sketchbook</option>
            </select>
          </div>
        </div>

        {/* Fixed Target Output Spec Summary */}
        <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center justify-between gap-2 text-xs text-slate-400 font-mono">
          <span>Language: {language}</span>
          <span>·</span>
          <span>Resolution: 1920x1080 (1080p)</span>
          <span>·</span>
          <span>Aspect Ratio: 16:9</span>
          <span>·</span>
          <span>Format: H.264 MP4</span>
        </div>

        <div className="pt-2 flex items-center justify-end">
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full sm:w-auto px-6 min-h-[48px] rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-sm flex items-center justify-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Sparkles className="w-4 h-4" />
            <span>
              {isSubmitting
                ? 'Generating 20 Hooks & 10-Chapter Script...'
                : 'Start Production (Generate 20 Hooks & Script)'}
            </span>
          </button>
        </div>
      </form>
    </div>
  );
};

// ============================================================================
// C. SCRIPT STUDIO VIEW
// ============================================================================
interface ScriptStudioProps {
  project: VideoProjectJob;
  onApproveScript: (selectedHookId: string, chapters: ScriptChapter[]) => Promise<void>;
  onRegenerateScript: (customPrompt?: string) => Promise<void>;
  onProceedToVoice: () => void;
  isBusy: boolean;
}

export const ScriptStudioView: React.FC<ScriptStudioProps> = ({
  project,
  onApproveScript,
  onRegenerateScript,
  onProceedToVoice,
  isBusy,
}) => {
  const [selectedHookId, setSelectedHookId] = useState(
    project.selectedHookId || project.hooks[0]?.id || ''
  );
  const [editableChapters, setEditableChapters] = useState<ScriptChapter[]>(project.chapters);
  const [showAllHooks, setShowAllHooks] = useState(false);

  React.useEffect(() => {
    setSelectedHookId(project.selectedHookId || project.hooks[0]?.id || '');
    setEditableChapters(project.chapters);
  }, [project.id, project.selectedHookId, project.chapters]);

  const liveWordCount = editableChapters.reduce(
    (sum, ch) =>
      sum +
      ch.narrationText
        .trim()
        .split(/\s+/)
        .filter(Boolean).length,
    0
  );
  const liveEstMinutes = Math.round(((liveWordCount / 145) * 10)) / 10;

  const visibleHooks = showAllHooks ? project.hooks : project.hooks.slice(0, 6);

  const handleChapterChange = (id: string, newText: string) => {
    setEditableChapters((prev) =>
      prev.map((ch) =>
        ch.id === id
          ? {
              ...ch,
              narrationText: newText,
              wordCount: newText.trim().split(/\s+/).filter(Boolean).length,
            }
          : ch
      )
    );
  };

  return (
    <div className="space-y-8">
      {/* Header & Metrics Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
            <span className="text-sky-400 font-semibold">Script Studio</span>
            <span>·</span>
            <span>{project.hooks.length} Ranked Viral Hooks</span>
            <span>·</span>
            <span>{editableChapters.length} Chapters</span>
            <span>·</span>
            <span>{liveWordCount} Words</span>
            <span>·</span>
            <span>~{liveEstMinutes} min narration</span>
            <span>·</span>
            <span className={project.scriptApproved ? 'text-emerald-400' : 'text-amber-400'}>
              {project.scriptApproved ? 'Approved for Production' : 'Awaiting User Approval'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-50 font-['Outfit']">
            {project.title}
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={isBusy}
            onClick={() => onRegenerateScript()}
            className="px-4 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            <span>Regenerate Script</span>
          </button>

          <button
            type="button"
            disabled={isBusy}
            onClick={() => onApproveScript(selectedHookId, editableChapters)}
            className="px-5 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Check className="w-4 h-4" />
            <span>{project.scriptApproved ? 'Update Approved Script' : 'Approve Script'}</span>
          </button>

          {project.scriptApproved && (
            <button
              type="button"
              onClick={onProceedToVoice}
              className="px-4 min-h-[44px] rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <span>Voice Studio</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Section 1: 20 Generated Viral Hooks with Scoring & Ranking */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 font-['Outfit']">
              20 Generated Viral Hooks (Scored & Ranked)
            </h2>
            <p className="text-xs text-slate-400">
              Ranked by Curiosity (30%), Clarity (25%), Emotional Impact (25%), and Retention
              Potential (20%).
            </p>
          </div>
          <button
            type="button"
            onClick={() => setShowAllHooks((prev) => !prev)}
            className="text-xs font-medium text-sky-400 hover:underline self-start sm:self-auto cursor-pointer"
          >
            {showAllHooks
              ? 'Show Top 6 Hooks'
              : `View All ${project.hooks.length} Ranked Hooks`}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {visibleHooks.map((hook) => {
            const isSelected = hook.id === selectedHookId;
            return (
              <button
                key={hook.id}
                type="button"
                onClick={() => setSelectedHookId(hook.id)}
                className={`text-left p-4 rounded-xl border transition-colors cursor-pointer ${
                  isSelected
                    ? 'bg-slate-800/90 border-sky-500'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="flex items-center justify-between gap-2 text-xs font-mono tabular-nums text-slate-400 mb-2">
                  <span>
                    Rank #{hook.rank} · {hook.technique}
                    {hook.recommended ? ' · Recommended' : ''}
                  </span>
                  <span className="text-sky-400 font-semibold">{hook.totalScore} / 100</span>
                </div>
                <p className="text-sm text-slate-100 leading-relaxed mb-3">"{hook.text}"</p>
                <div className="flex flex-wrap items-center gap-3 text-[11px] font-mono tabular-nums text-slate-400">
                  <span>Curiosity: {hook.curiosityScore}</span>
                  <span>·</span>
                  <span>Clarity: {hook.clarityScore}</span>
                  <span>·</span>
                  <span>Emotion: {hook.emotionalScore}</span>
                  <span>·</span>
                  <span>Retention: {hook.retentionScore}</span>
                </div>
              </button>
            );
          })}
        </div>
      </div>

      {/* Section 2: Editable 10-Chapter Script */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-lg font-semibold text-slate-100 font-['Outfit']">
              Complete 10-Chapter Educational Script (Editable)
            </h2>
            <p className="text-xs text-slate-400">
              Edit any chapter narration below before approving. Actual audio duration is recorded
              during Voice Studio synthesis.
            </p>
          </div>
          <span className="text-xs font-mono tabular-nums text-slate-300">
            Total: {liveWordCount} words (~{liveEstMinutes} min)
          </span>
        </div>

        <div className="space-y-4">
          {editableChapters.map((ch) => (
            <div
              key={ch.id}
              className="p-4 sm:p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-3"
            >
              <div className="flex flex-wrap items-center justify-between gap-2">
                <h3 className="text-sm font-semibold text-slate-100">{ch.title}</h3>
                <div className="text-xs font-mono tabular-nums text-slate-400">
                  <span>{ch.wordCount} words</span>
                  <span className="mx-1.5">·</span>
                  <span>Est. {ch.estimatedDurationSec}s</span>
                  {ch.actualAudioDurationSec && (
                    <>
                      <span className="mx-1.5">·</span>
                      <span className="text-emerald-400">
                        Actual Audio: {ch.actualAudioDurationSec}s
                      </span>
                    </>
                  )}
                </div>
              </div>
              <textarea
                rows={4}
                aria-label={`Edit narration for ${ch.title}`}
                value={ch.narrationText}
                onChange={(e) => handleChapterChange(ch.id, e.target.value)}
                className="w-full p-3 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-sm leading-relaxed focus:outline-none focus:border-sky-500"
              />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
