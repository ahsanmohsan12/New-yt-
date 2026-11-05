import React, { useState } from 'react';
import {
  VideoProjectJob,
  GPUWorker,
  StoryboardBeat,
} from '../types';
import { calculateBenchmarkEta } from '../utils/pipelineLogic';
import { StickmanCanvas2D } from './StickmanCanvas2D';
import { StickmanStage3D } from './StickmanStage3D';
import { GoogleSignInButton } from './StudioViewsPart1';
import {
  Volume2,
  RefreshCw,
  ArrowRight,
  Layers,
  CheckCircle2,
  AlertTriangle,
  Play,
  Pause,
  RotateCcw,
  Cpu,
  Download,
  HardDrive,
  ExternalLink,
  Terminal,
  Box,
  MonitorPlay,
  Check,
} from 'lucide-react';

// ============================================================================
// D. VOICE STUDIO VIEW (Kokoro TTS + Audio-First Forced Alignment)
// ============================================================================
interface VoiceStudioProps {
  project: VideoProjectJob;
  onGenerateNarration: (voice: VideoProjectJob['narratorVoice']) => Promise<void>;
  onProceedToStoryboard: () => void;
  isBusy: boolean;
}

export const VoiceStudioView: React.FC<VoiceStudioProps> = ({
  project,
  onGenerateNarration,
  onProceedToStoryboard,
  isBusy,
}) => {
  const [selectedVoice, setSelectedVoice] = useState<VideoProjectJob['narratorVoice']>(
    project.narratorVoice || 'af_bella'
  );
  const [inspectChapterId, setInspectChapterId] = useState<string>(
    project.chapters[0]?.id || 'ch-1'
  );

  const inspectedChapter =
    project.chapters.find((c) => c.id === inspectChapterId) || project.chapters[0];

  const completedAudioChapters = project.chapters.filter(
    (c) => typeof c.actualAudioDurationSec === 'number' && c.actualAudioDurationSec > 0
  ).length;

  return (
    <div className="space-y-8">
      {/* Top Bar */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
            <span className="text-sky-400 font-semibold">Voice Studio (Kokoro TTS)</span>
            <span>·</span>
            <span>
              Chapters Synthesized: {completedAudioChapters} / {project.chapters.length}
            </span>
            <span>·</span>
            <span>
              Est. Script Duration: {Math.round(project.estimatedTotalDurationSec)}s
            </span>
            <span>·</span>
            <span className="text-emerald-400">
              Actual Recorded Audio:{' '}
              {project.actualTotalAudioDurationSec
                ? `${project.actualTotalAudioDurationSec}s (Source of Truth)`
                : 'Not synthesized yet'}
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-50 font-['Outfit']">
            Narration Synthesis & Forced Alignment
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={isBusy || !project.scriptApproved}
            onClick={() => onGenerateNarration(selectedVoice)}
            className="px-4 min-h-[44px] rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <Volume2 className="w-4 h-4" />
            <span>
              {isBusy
                ? 'Synthesizing Chapter Audio...'
                : completedAudioChapters > 0
                  ? 'Regenerate Chapter Audio'
                  : 'Generate Chapter Narration Audio'}
            </span>
          </button>

          <button
            type="button"
            onClick={onProceedToStoryboard}
            className="px-4 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-100 font-medium text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Storyboard Studio</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {!project.scriptApproved && (
        <div className="p-4 rounded-xl bg-amber-950/40 border border-amber-800 text-amber-200 text-xs flex items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
          <span>
            Script approval is required before running voice generation. Please approve the script
            in Script Studio first.
          </span>
        </div>
      )}

      {/* Narrator Selector & Master Combined Audio Player */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
          <h2 className="text-base font-semibold text-slate-100">
            1. Consistent English Narrator Selection
          </h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {(
              [
                {
                  id: 'af_bella',
                  name: 'Kokoro af_bella',
                  desc: 'Energetic Educational Female (Default)',
                },
                {
                  id: 'am_adam',
                  name: 'Kokoro am_adam',
                  desc: 'Dynamic Explainer Male',
                },
                {
                  id: 'af_sarah',
                  name: 'Kokoro af_sarah',
                  desc: 'Clear Articulate Female',
                },
                {
                  id: 'am_michael',
                  name: 'Kokoro am_michael',
                  desc: 'Deep Documentary Male',
                },
              ] as const
            ).map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => setSelectedVoice(v.id)}
                className={`p-3 rounded-xl border text-left transition-colors cursor-pointer ${
                  selectedVoice === v.id
                    ? 'bg-slate-800 border-sky-500 text-slate-50'
                    : 'bg-slate-950 border-slate-800 text-slate-300 hover:border-slate-700'
                }`}
              >
                <p className="text-xs font-semibold font-mono">{v.name}</p>
                <p className="text-[11px] text-slate-400 mt-0.5">{v.desc}</p>
              </button>
            ))}
          </div>
        </div>

        <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4 flex flex-col justify-between">
          <div className="space-y-1">
            <h2 className="text-base font-semibold text-slate-100">
              2. Combined Master Narration Audio (WAV 24kHz)
            </h2>
            <p className="text-xs text-slate-400">
              Actual generated audio duration is used as the single source of truth for
              synchronizing all 200 storyboard scenes.
            </p>
          </div>

          {project.combinedAudioUrl ? (
            <div className="space-y-2">
              <audio
                controls
                src={project.combinedAudioUrl}
                className="w-full h-10 rounded-lg"
                aria-label="Master Combined Narration Audio Player"
              />
              <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
                <span>Format: RIFF WAV 24kHz 16-bit Mono</span>
                <span className="text-emerald-400">
                  Total Synced Duration: {project.actualTotalAudioDurationSec}s
                </span>
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 italic">
              Click "Generate Chapter Narration Audio" above to synthesize chapter audio files.
            </p>
          )}
        </div>
      </div>

      {/* Chapter-by-Chapter Audio List & Forced Alignment Word Timestamp Inspector */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-3">
          <h2 className="text-base font-semibold text-slate-100">
            Chapter-by-Chapter Audio & Measured Durations
          </h2>
          <div className="divide-y divide-slate-800 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            {project.chapters.map((ch) => (
              <div key={ch.id} className="p-4 space-y-2.5">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <button
                    type="button"
                    onClick={() => setInspectChapterId(ch.id)}
                    className="text-left text-sm font-semibold text-slate-100 hover:text-sky-400 cursor-pointer"
                  >
                    {ch.title}
                  </button>
                  <div className="text-xs font-mono tabular-nums text-slate-400">
                    <span>Est: {ch.estimatedDurationSec}s</span>
                    <span className="mx-1.5">·</span>
                    <span className="text-emerald-400">
                      Actual: {ch.actualAudioDurationSec ? `${ch.actualAudioDurationSec}s` : 'Pending'}
                    </span>
                  </div>
                </div>
                {ch.audioUrl && (
                  <div className="flex flex-col sm:flex-row sm:items-center gap-3">
                    <audio
                      controls
                      src={ch.audioUrl}
                      className="h-9 flex-1"
                      aria-label={`Audio player for ${ch.title}`}
                    />
                    <button
                      type="button"
                      onClick={() => setInspectChapterId(ch.id)}
                      className="px-3 min-h-[36px] rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-mono text-sky-400 cursor-pointer shrink-0"
                    >
                      Inspect Alignment ({ch.wordTimestamps?.length || 0} words)
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Word-Level Forced Alignment Inspector */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-100">
            Audio-First Forced Alignment Timestamps
          </h2>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-3 max-h-[540px] overflow-y-auto">
            <div className="text-xs font-mono text-slate-400 border-b border-slate-800 pb-2">
              <p className="text-slate-200 font-semibold">{inspectedChapter?.title}</p>
              <p className="mt-0.5">
                Alignment Engine: {project.alignmentMethod || 'WhisperX / Acoustic Syllable Forced Alignment'}
              </p>
            </div>

            {inspectedChapter?.wordTimestamps && inspectedChapter.wordTimestamps.length > 0 ? (
              <div className="flex flex-wrap gap-1.5">
                {inspectedChapter.wordTimestamps.slice(0, 85).map((wt, i) => (
                  <span
                    key={`${wt.word}-${i}`}
                    className="px-2 py-1 rounded bg-slate-950 border border-slate-800 text-xs font-mono tabular-nums text-slate-300"
                  >
                    {wt.word}{' '}
                    <span className="text-sky-400 text-[10px]">
                      {wt.start.toFixed(1)}s
                    </span>
                  </span>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-500">
                Synthesize narration audio to compute word-level forced alignment timestamps.
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// E. STORYBOARD STUDIO VIEW (~200 Beats + 2D Kino & 3D Three.js Stage Preview)
// ============================================================================
interface StoryboardStudioProps {
  project: VideoProjectJob;
  onGenerateStoryboard: () => Promise<void>;
  onRegenerateScene: (
    scene_id: string,
    updates?: Partial<Pick<StoryboardBeat, 'character_pose' | 'camera_movement' | 'diagram_type' | 'approved'>>
  ) => Promise<void>;
  onProceedToMonitor: () => void;
  isBusy: boolean;
}

export const StoryboardStudioView: React.FC<StoryboardStudioProps> = ({
  project,
  onGenerateStoryboard,
  onRegenerateScene,
  onProceedToMonitor,
  isBusy,
}) => {
  const [selectedChapterNum, setSelectedChapterNum] = useState<number>(1);
  const [activeBeatId, setActiveBeatId] = useState<string>(
    project.storyboard[0]?.scene_id || 'sc-1-01'
  );
  const [renderMode, setRenderMode] = useState<'2d_kino' | '3d_stage'>('2d_kino');

  const activeBeat =
    project.storyboard.find((b) => b.scene_id === activeBeatId) ||
    project.storyboard[0];

  const filteredBeats = project.storyboard.filter(
    (b) => b.chapterNumber === selectedChapterNum
  );

  return (
    <div className="space-y-8">
      {/* Header */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
            <span className="text-sky-400 font-semibold">Storyboard Studio</span>
            <span>·</span>
            <span>{project.storyboard.length} Total Visual Beats</span>
            <span>·</span>
            <span>Reusable Stickman IK Rigs & Charts</span>
            <span>·</span>
            <span>Synced to {project.actualTotalAudioDurationSec || project.estimatedTotalDurationSec}s Audio</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-50 font-['Outfit']">
            Visual Beats & Stickman Stage Preview
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-3 shrink-0">
          <button
            type="button"
            disabled={isBusy || !project.scriptApproved}
            onClick={onGenerateStoryboard}
            className="px-4 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-2 transition-colors cursor-pointer disabled:opacity-60"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${isBusy ? 'animate-spin' : ''}`} />
            <span>
              {project.storyboard.length > 0
                ? 'Regenerate & Sync 200 Beats'
                : 'Generate 200-Beat Storyboard'}
            </span>
          </button>

          <button
            type="button"
            onClick={onProceedToMonitor}
            className="px-4 min-h-[44px] rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <span>Production Monitor</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {activeBeat ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* Live Interactive 2D Stickman Kino / 3D Three.js Stage Preview */}
          <div className="lg:col-span-7 space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-xs font-mono text-slate-300">
                <span>Active Preview:</span>
                <strong className="text-sky-400">{activeBeat.scene_id}</strong>
                <span>·</span>
                <span>
                  {activeBeat.startTime.toFixed(1)}s – {activeBeat.endTime.toFixed(1)}s
                </span>
              </div>

              {/* Segmented Renderer Mode Toggle */}
              <div className="flex items-center gap-1 p-1 rounded-lg bg-slate-900 border border-slate-800">
                <button
                  type="button"
                  onClick={() => setRenderMode('2d_kino')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    renderMode === '2d_kino'
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <MonitorPlay className="w-3.5 h-3.5" />
                  <span>2D Stickman Kino</span>
                </button>
                <button
                  type="button"
                  onClick={() => setRenderMode('3d_stage')}
                  className={`px-3 py-1.5 rounded-md text-xs font-medium flex items-center gap-1.5 transition-colors cursor-pointer ${
                    renderMode === '3d_stage'
                      ? 'bg-sky-500 text-slate-950 font-semibold'
                      : 'text-slate-300 hover:text-white'
                  }`}
                >
                  <Box className="w-3.5 h-3.5" />
                  <span>3D Three.js Stage</span>
                </button>
              </div>
            </div>

            {renderMode === '2d_kino' ? (
              <StickmanCanvas2D
                beat={activeBeat}
                allBeats={project.storyboard}
                combinedAudioUrl={project.combinedAudioUrl}
                onActiveBeatChange={(b) => {
                  setActiveBeatId(b.scene_id);
                  setSelectedChapterNum(b.chapterNumber);
                }}
                visualTheme={project.visualTheme}
                isPlaying={true}
                showCaptions={true}
              />
            ) : (
              <StickmanStage3D beat={activeBeat} />
            )}
          </div>

          {/* Active Scene Inspector & Quick Pose/Diagram Editor */}
          <div className="lg:col-span-5 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <p className="text-xs font-mono text-sky-400">
                  Scene #{activeBeat.beatNumber} ({activeBeat.scene_id})
                </p>
                <h2 className="text-base font-semibold text-slate-100">
                  Scene Specification & QA
                </h2>
              </div>
              <span className="text-xs font-mono text-emerald-400">
                QA: {activeBeat.qaStatus}
              </span>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <span className="text-slate-400">Narration Segment:</span>
                <p className="text-slate-100 mt-0.5 leading-relaxed font-medium">
                  "{activeBeat.narration_segment}"
                </p>
              </div>
              <div>
                <span className="text-slate-400">Visual Description:</span>
                <p className="text-slate-300 mt-0.5 leading-relaxed">
                  {activeBeat.semantic_description}
                </p>
              </div>

              {/* Interactive Pose, Camera, and Diagram Selectors */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 pt-2">
                <div className="space-y-1">
                  <label
                    htmlFor="scene-pose-select"
                    className="block text-[11px] font-mono text-slate-400"
                  >
                    Stickman Pose
                  </label>
                  <select
                    id="scene-pose-select"
                    value={activeBeat.character_pose}
                    disabled={isBusy}
                    onChange={(e) =>
                      onRegenerateScene(activeBeat.scene_id, {
                        character_pose: e.target.value as StoryboardBeat['character_pose'],
                      })
                    }
                    className="w-full min-h-[36px] px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono"
                  >
                    {[
                      'explaining',
                      'pointing',
                      'thinking',
                      'walking',
                      'running',
                      'surprised',
                      'celebrating',
                      'writing_board',
                      'holding_prop',
                      'comparing',
                    ].map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="scene-camera-select"
                    className="block text-[11px] font-mono text-slate-400"
                  >
                    Camera Move
                  </label>
                  <select
                    id="scene-camera-select"
                    value={activeBeat.camera_movement}
                    disabled={isBusy}
                    onChange={(e) =>
                      onRegenerateScene(activeBeat.scene_id, {
                        camera_movement: e.target.value as StoryboardBeat['camera_movement'],
                      })
                    }
                    className="w-full min-h-[36px] px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono"
                  >
                    {[
                      'static_wide',
                      'slow_zoom_in',
                      'slow_zoom_out',
                      'pan_left_to_right',
                      'pan_right_to_left',
                      'focus_character',
                      'focus_diagram',
                    ].map((c) => (
                      <option key={c} value={c}>
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label
                    htmlFor="scene-diagram-select"
                    className="block text-[11px] font-mono text-slate-400"
                  >
                    Visual Diagram
                  </label>
                  <select
                    id="scene-diagram-select"
                    value={activeBeat.diagram_type}
                    disabled={isBusy}
                    onChange={(e) =>
                      onRegenerateScene(activeBeat.scene_id, {
                        diagram_type: e.target.value as StoryboardBeat['diagram_type'],
                      })
                    }
                    className="w-full min-h-[36px] px-2.5 rounded-lg bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono"
                  >
                    {['none', 'bar_chart', 'line_graph', 'pie_chart', 'comparison_split'].map(
                      (d) => (
                        <option key={d} value={d}>
                          {d}
                        </option>
                      )
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 pt-1 font-mono text-[11px] text-slate-400">
                <div>Transition: {activeBeat.transition}</div>
                <div>Duration: {activeBeat.actual_duration.toFixed(2)}s</div>
                <div>Props: {activeBeat.props.join(', ')}</div>
                <div>Asset Key: {activeBeat.assetReuseKey || 'rig_std'}</div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-800 flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={isBusy}
                onClick={() => onRegenerateScene(activeBeat.scene_id)}
                className="px-3.5 min-h-[40px] rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Regenerate Scene {activeBeat.scene_id}</span>
              </button>

              <button
                type="button"
                disabled={isBusy}
                onClick={() =>
                  onRegenerateScene(activeBeat.scene_id, {
                    approved: !activeBeat.approved,
                  })
                }
                className="px-3.5 min-h-[40px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 cursor-pointer"
              >
                <Check className="w-3.5 h-3.5 text-emerald-400" />
                <span>{activeBeat.approved ? 'Scene Approved' : 'Approve Scene'}</span>
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* Chapter Filter Bar for 200 Storyboard Beats */}
      <div className="space-y-4">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-base font-semibold text-slate-100">
            Browse Storyboard Scenes by Chapter ({filteredBeats.length} scenes in Chapter{' '}
            {selectedChapterNum})
          </h2>
          <div className="flex flex-wrap items-center gap-1.5">
            {project.chapters.map((ch) => (
              <button
                key={ch.id}
                type="button"
                onClick={() => {
                  setSelectedChapterNum(ch.chapterNumber);
                  const firstInCh = project.storyboard.find(
                    (b) => b.chapterNumber === ch.chapterNumber
                  );
                  if (firstInCh) setActiveBeatId(firstInCh.scene_id);
                }}
                className={`px-3 min-h-[38px] rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  selectedChapterNum === ch.chapterNumber
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'bg-slate-900 border border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                Ch {ch.chapterNumber}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {filteredBeats.map((beat) => {
            const isCurrent = beat.scene_id === activeBeat?.scene_id;
            return (
              <div
                key={beat.scene_id}
                className={`p-4 rounded-xl border transition-colors flex flex-col justify-between gap-3 ${
                  isCurrent
                    ? 'bg-slate-800/80 border-sky-500'
                    : 'bg-slate-900 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between text-xs font-mono tabular-nums text-slate-400">
                    <span>
                      #{beat.beatNumber} · {beat.scene_id} · {beat.character_pose} ·{' '}
                      {beat.camera_movement}
                    </span>
                    <span className="text-sky-400">
                      {beat.startTime.toFixed(1)}s – {beat.endTime.toFixed(1)}s
                    </span>
                  </div>
                  <p className="text-sm text-slate-100 font-medium">
                    "{beat.narration_segment}"
                  </p>
                  <p className="text-xs text-slate-400">
                    Action: {beat.visual_action} · Props: {beat.props.join(', ')} · QA:{' '}
                    {beat.qaStatus}
                  </p>
                </div>

                <div className="flex items-center justify-between pt-2 border-t border-slate-800/80">
                  <button
                    type="button"
                    onClick={() => setActiveBeatId(beat.scene_id)}
                    className="text-xs font-medium text-sky-400 hover:underline cursor-pointer"
                  >
                    Preview on Stage
                  </button>
                  <button
                    type="button"
                    onClick={() => onRegenerateScene(beat.scene_id)}
                    className="text-xs font-medium text-slate-300 hover:text-white cursor-pointer"
                  >
                    Regenerate Beat
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
// F. PRODUCTION MONITOR VIEW (Parallel GPU Queue + FFmpeg Assembly + Visual QA)
// ============================================================================
interface ProductionMonitorProps {
  project: VideoProjectJob;
  workers: GPUWorker[];
  workerTokenHint: string;
  onRunLocalRender: () => Promise<void>;
  onPauseJob: () => Promise<void>;
  onResumeJob: () => Promise<void>;
  onRetryJob: () => Promise<void>;
  onRegisterColabWorker: (name: string, gpuModel: string) => Promise<void>;
  onRemoveWorker: (workerId: string) => Promise<void>;
  onRegenerateScene: (sceneId: string) => Promise<void>;
  onOpenFinalVideos: () => void;
  isBusy: boolean;
}

export const ProductionMonitorView: React.FC<ProductionMonitorProps> = ({
  project,
  workers,
  workerTokenHint,
  onRunLocalRender,
  onPauseJob,
  onResumeJob,
  onRetryJob,
  onRegisterColabWorker,
  onRemoveWorker,
  onRegenerateScene,
  onOpenFinalVideos,
  isBusy,
}) => {
  const [showColabModal, setShowColabModal] = useState(false);
  const [workerNameInput, setWorkerNameInput] = useState('Colab-Tesla-T4-Alpha');
  const [qaFilter, setQaFilter] = useState<'ALL' | 'PASS' | 'REVIEW' | 'REGENERATE'>('ALL');

  const completedChapters = project.chapterTasks.filter((t) => t.status === 'COMPLETED').length;
  const pendingChapters = project.chapterTasks.filter(
    (t) => t.status === 'PENDING' || t.status === 'CLAIMED' || t.status === 'RENDERING'
  ).length;
  const failedChapters = project.chapterTasks.filter((t) => t.status === 'FAILED').length;

  const totalScenes = project.storyboard.length;
  const completedScenes =
    project.status === 'COMPLETED'
      ? totalScenes
      : Math.round((completedChapters / Math.max(1, project.chapters.length)) * totalScenes);
  const pendingScenes = Math.max(0, totalScenes - completedScenes);

  const etaInfo = calculateBenchmarkEta(project.chapterTasks, workers);

  const qaPassCount = project.storyboard.filter((b) => b.qaStatus === 'PASS').length;
  const qaReviewCount = project.storyboard.filter((b) => b.qaStatus === 'REVIEW').length;
  const qaRegenCount = project.storyboard.filter((b) => b.qaStatus === 'REGENERATE').length;

  return (
    <div className="space-y-8">
      {/* Header & Controls */}
      <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="space-y-1">
          <div className="flex flex-wrap items-center gap-2 text-xs font-mono text-slate-400 tabular-nums">
            <span className="text-sky-400 font-semibold">Status: {project.status}</span>
            <span>·</span>
            <span>
              Chapters: {completedChapters} / {project.chapters.length} Completed
            </span>
            <span>·</span>
            <span>
              Scenes: {completedScenes} Completed · {pendingScenes} Pending · {failedChapters} Failed
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-50 font-['Outfit']">
            Production Monitor & Multi-GPU Task Queue
          </h1>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          {project.status === 'RENDERING' ? (
            <button
              type="button"
              onClick={onPauseJob}
              className="px-4 min-h-[44px] rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Pause className="w-4 h-4" />
              <span>Pause Job</span>
            </button>
          ) : project.status === 'PAUSED' ? (
            <button
              type="button"
              onClick={onResumeJob}
              className="px-4 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <Play className="w-4 h-4" />
              <span>Resume Job</span>
            </button>
          ) : null}

          <button
            type="button"
            disabled={isBusy}
            onClick={onRetryJob}
            className="px-3.5 min-h-[44px] rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-medium text-xs flex items-center gap-1.5 cursor-pointer"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Retry Unfinished</span>
          </button>

          <button
            type="button"
            disabled={isBusy || !project.scriptApproved}
            onClick={onRunLocalRender}
            className="px-4 min-h-[44px] rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <Play className="w-4 h-4" />
            <span>
              {isBusy
                ? 'Rendering & Assembling 1080p MP4...'
                : 'Render & Assemble 1080p MP4 (FFmpeg)'}
            </span>
          </button>

          {project.status === 'COMPLETED' && (
            <button
              type="button"
              onClick={onOpenFinalVideos}
              className="px-4 min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center gap-1.5 cursor-pointer"
            >
              <span>Final MP4 Video</span>
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Honest Benchmark & Worker Telemetry Strip */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Benchmark Rendering Speed</p>
          <p className="mt-1.5 text-lg font-bold text-slate-100 font-mono tabular-nums">
            {etaInfo.avgChapterRenderSec !== null
              ? `${etaInfo.avgChapterRenderSec.toFixed(1)}s / chapter`
              : 'Awaiting 1st chapter benchmark'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Measured from actual completed chapter tasks
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Estimated Remaining Time</p>
          <p className="mt-1.5 text-lg font-bold text-sky-400 font-mono tabular-nums">
            {etaInfo.estimatedRemainingSec === 0
              ? '0s (All 10 Chapters Completed)'
              : etaInfo.hasBenchmarkData && etaInfo.estimatedRemainingSec !== null
                ? `${etaInfo.estimatedRemainingSec}s (${etaInfo.activeParallelWorkers} active worker${
                    etaInfo.activeParallelWorkers === 1 ? '' : 's'
                  })`
                : 'Awaiting active worker benchmark'}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Never fabricated without real hardware benchmark
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-900 border border-slate-800">
          <p className="text-xs text-slate-400">Visual & Sync Quality Control</p>
          <p className="mt-1.5 text-lg font-bold text-emerald-400 font-mono tabular-nums">
            {qaPassCount} PASS · {qaReviewCount} REVIEW · {qaRegenCount} REGEN
          </p>
          <p className="mt-1 text-xs text-slate-500">
            Audio-video sync verified within 0.01s tolerance
          </p>
        </div>
      </div>

      {/* Parallel GPU Worker Cluster & Colab T4 Setup */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Google Colab Tesla T4 GPU Worker Cluster ({workers.length} Registered)
            </h2>
            <p className="text-xs text-slate-400">
              Workers claim chapters atomically so two GPUs never render the same chapter. Completed
              checkpoints are saved immediately.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={() => setShowColabModal((prev) => !prev)}
              className="px-3.5 min-h-[40px] rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium flex items-center gap-1.5 cursor-pointer"
            >
              <Terminal className="w-3.5 h-3.5 text-sky-400" />
              <span>{showColabModal ? 'Hide Colab Setup' : 'Colab T4 Setup & Script'}</span>
            </button>
            <a
              href="/api/workers/colab-script"
              download="colab_worker.py"
              className="px-3.5 min-h-[40px] rounded-lg bg-slate-800 hover:bg-slate-700 text-sky-400 text-xs font-medium flex items-center gap-1.5"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Download colab_worker.py</span>
            </a>
          </div>
        </div>

        {showColabModal && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3 text-xs">
            <p className="font-semibold text-slate-200">
              Run in 2 Separate Google Colab GPU Notebooks (Runtime → Change runtime type → T4 GPU):
            </p>
            <pre className="p-3 rounded-lg bg-slate-900 border border-slate-800 font-mono text-[11px] text-sky-300 overflow-x-auto">
{`!pip install -q kokoro>=0.3.4 soundfile torch pillow numpy requests
!apt-get install -y ffmpeg espeak-ng
!curl -sSL ${window.location.origin}/api/workers/colab-script -o colab_worker.py
!python3 colab_worker.py --backend-url "${window.location.origin}" --worker-token "${workerTokenHint}" --worker-name "Colab-T4-Worker-1"`}
            </pre>
            <div className="flex flex-wrap items-center gap-2 pt-1">
              <input
                type="text"
                value={workerNameInput}
                onChange={(e) => setWorkerNameInput(e.target.value)}
                aria-label="Test Worker Node Name"
                className="px-3 min-h-[38px] rounded-lg bg-slate-900 border border-slate-800 text-slate-200 text-xs"
              />
              <button
                type="button"
                onClick={() => onRegisterColabWorker(workerNameInput, 'NVIDIA Tesla T4 (15GB)')}
                className="px-3.5 min-h-[38px] rounded-lg bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs cursor-pointer"
              >
                Register Worker Node
              </button>
            </div>
          </div>
        )}

        {workers.length === 0 ? (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <span>
              0 external Google Colab T4 workers currently connected. You can connect external Colab
              runtimes via <code className="text-slate-200">colab_worker.py</code> or click "Render
              & Assemble 1080p MP4 (FFmpeg)" above to render directly on the server.
            </span>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {workers.map((w) => (
              <div
                key={w.workerId}
                className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between gap-3 text-xs"
              >
                <div className="space-y-1">
                  <p className="font-semibold text-slate-100">
                    {w.name} ({w.gpuModel})
                  </p>
                  <p className="font-mono tabular-nums text-slate-400">
                    Status: {w.status} · VRAM: {w.vramUsedGb}/{w.vramTotalGb} GB · Completed:{' '}
                    {w.completedChaptersCount} ch
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => onRemoveWorker(w.workerId)}
                  className="text-xs text-rose-400 hover:underline cursor-pointer"
                >
                  Disconnect
                </button>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Parallel 10-Chapter Atomic Task Queue & Logs */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-100">
            10-Chapter Parallel Rendering Queue & Checkpoints
          </h2>
          <div className="divide-y divide-slate-800 rounded-xl bg-slate-900 border border-slate-800 overflow-hidden">
            {project.chapterTasks.map((task) => (
              <div
                key={task.taskId}
                className="p-3.5 flex items-center justify-between gap-3 text-xs font-mono tabular-nums"
              >
                <div>
                  <span className="text-slate-100 font-semibold">
                    Chapter {task.chapterNumber}
                  </span>
                  <span className="mx-2 text-slate-600">·</span>
                  <span className="text-slate-400">
                    Worker: {task.assignedWorkerId || 'Unassigned'}
                  </span>
                </div>
                <div className="flex items-center gap-3">
                  {typeof task.renderTimeSec === 'number' && (
                    <span className="text-slate-400">{task.renderTimeSec.toFixed(1)}s</span>
                  )}
                  <span
                    className={
                      task.status === 'COMPLETED'
                        ? 'text-emerald-400 font-semibold'
                        : task.status === 'FAILED'
                          ? 'text-rose-400 font-semibold'
                          : 'text-sky-400'
                    }
                  >
                    {task.status}
                    {task.checkpointSaved ? ' (Checkpoint Saved)' : ''}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Live Job Logs */}
        <div className="space-y-3">
          <h2 className="text-base font-semibold text-slate-100">Production Job Logs</h2>
          <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 space-y-2.5 max-h-[420px] overflow-y-auto font-mono text-xs">
            {project.logs.map((entry) => (
              <div
                key={entry.id}
                className="pb-2 border-b border-slate-800/70 last:border-b-0 space-y-0.5"
              >
                <div className="flex items-center justify-between text-[11px] text-slate-500 tabular-nums">
                  <span>{entry.stage}</span>
                  <span>{new Date(entry.timestamp).toLocaleTimeString()}</span>
                </div>
                <p
                  className={
                    entry.level === 'error'
                      ? 'text-rose-400'
                      : entry.level === 'warn'
                        ? 'text-amber-300'
                        : entry.level === 'success'
                          ? 'text-emerald-400'
                          : 'text-slate-200'
                  }
                >
                  {entry.message}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Visual & Sync Quality Control (QA) Audit Inspector */}
      <div className="p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-100">
              Automated Visual & Sync Quality Control ({project.storyboard.length} Beats Audited)
            </h2>
            <p className="text-xs text-slate-400">
              Checks semantic narration match, stickman pose continuity, caption legibility, and
              audio-video drift before marking output complete.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-1.5">
            {(['ALL', 'PASS', 'REVIEW', 'REGENERATE'] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => setQaFilter(status)}
                className={`px-3 min-h-[36px] rounded-lg text-xs font-mono transition-colors cursor-pointer ${
                  qaFilter === status
                    ? 'bg-sky-500 text-slate-950 font-semibold'
                    : 'bg-slate-950 border border-slate-800 text-slate-300 hover:bg-slate-800'
                }`}
              >
                {status}
              </button>
            ))}
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 max-h-[280px] overflow-y-auto pr-1">
          {project.storyboard
            .filter((b) => qaFilter === 'ALL' || b.qaStatus === qaFilter)
            .slice(0, 12)
            .map((beat) => (
              <div
                key={beat.scene_id}
                className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-col justify-between gap-2 text-xs"
              >
                <div className="space-y-1">
                  <div className="flex items-center justify-between font-mono tabular-nums">
                    <span className="text-slate-200 font-semibold">{beat.scene_id}</span>
                    <span
                      className={
                        beat.qaStatus === 'PASS'
                          ? 'text-emerald-400'
                          : beat.qaStatus === 'REVIEW'
                            ? 'text-amber-400'
                            : 'text-rose-400'
                      }
                    >
                      {beat.qaStatus}
                    </span>
                  </div>
                  <p className="text-slate-400 line-clamp-1">"{beat.narration_segment}"</p>
                  <p className="text-[11px] text-slate-500">{beat.qaNotes}</p>
                </div>
                <button
                  type="button"
                  disabled={isBusy}
                  onClick={() => onRegenerateScene(beat.scene_id)}
                  className="self-start text-[11px] font-mono text-sky-400 hover:underline cursor-pointer"
                >
                  Re-render & Verify {beat.scene_id}
                </button>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// G. FINAL VIDEOS VIEW (1080p MP4 Player, Download & Google Drive Sync)
// ============================================================================
interface FinalVideosProps {
  projects: VideoProjectJob[];
  activeProject: VideoProjectJob;
  onSelectProject: (id: string) => void;
  driveConnected: boolean;
  onConnectDrive: () => Promise<void>;
  onSyncProjectToDrive: (job: VideoProjectJob) => Promise<void>;
  isSyncingDrive: boolean;
}

export const FinalVideosView: React.FC<FinalVideosProps> = ({
  projects,
  activeProject,
  onSelectProject,
  driveConnected,
  onConnectDrive,
  onSyncProjectToDrive,
  isSyncingDrive,
}) => {
  const [confirmOverwriteModal, setConfirmOverwriteModal] = useState(false);

  const completedProjects = projects.filter((p) => p.finalVideo !== null);
  const displayJob = activeProject.finalVideo
    ? activeProject
    : completedProjects[0] || activeProject;

  const handleDriveSyncClick = async () => {
    if (displayJob.driveSync.synced) {
      setConfirmOverwriteModal(true);
      return;
    }
    await onSyncProjectToDrive(displayJob);
  };

  return (
    <div className="space-y-8">
      <div className="space-y-1">
        <p className="text-xs font-mono text-sky-400">
          Final Output Gallery · 1920x1080 · H.264 MP4 · Google Drive 5TB Sync
        </p>
        <h1 className="text-2xl font-bold text-slate-50 font-['Outfit']">
          Final Produced Videos
        </h1>
      </div>

      {displayJob.finalVideo ? (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {/* HTML5 1080p Video Player */}
          <div className="lg:col-span-7 space-y-3">
            <div className="rounded-2xl overflow-hidden bg-slate-950 border border-slate-800 aspect-video">
              <video
                key={displayJob.finalVideo.url}
                controls
                preload="metadata"
                src={displayJob.finalVideo.url}
                className="w-full h-full object-contain"
                aria-label={`Final 1080p MP4 video player for ${displayJob.title}`}
              />
            </div>

            <div className="flex flex-wrap items-center justify-between gap-3 p-4 rounded-xl bg-slate-900 border border-slate-800">
              <div className="text-xs font-mono tabular-nums text-slate-300">
                <span>Resolution: {displayJob.finalVideo.resolution} (16:9)</span>
                <span className="mx-2 text-slate-600">·</span>
                <span>Codec: {displayJob.finalVideo.codec}</span>
                <span className="mx-2 text-slate-600">·</span>
                <span>
                  Size: {(displayJob.finalVideo.fileSizeBytes / 1024).toFixed(1)} KB
                </span>
                <span className="mx-2 text-slate-600">·</span>
                <span>Duration: {Math.round(displayJob.finalVideo.durationSec)}s</span>
              </div>

              <a
                href={`${displayJob.finalVideo.url}?download=1`}
                download={`${displayJob.id}-1080p.mp4`}
                className="px-4 min-h-[42px] rounded-xl bg-sky-500 hover:bg-sky-400 text-slate-950 font-semibold text-xs flex items-center gap-2 transition-colors"
              >
                <Download className="w-4 h-4" />
                <span>Download 1080p MP4</span>
              </a>
            </div>
          </div>

          {/* Video Metadata & Google Drive Hierarchy Sync */}
          <div className="lg:col-span-5 p-5 rounded-xl bg-slate-900 border border-slate-800 space-y-5">
            <div className="space-y-1">
              <p className="text-xs font-mono text-emerald-400">
                QA & Audio-Video Synchronization Verified
              </p>
              <h2 className="text-lg font-bold text-slate-100">{displayJob.title}</h2>
              <p className="text-xs text-slate-400 font-mono tabular-nums">
                Created: {new Date(displayJob.finalVideo.createdAt).toLocaleString()}
              </p>
            </div>

            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-2.5 text-xs">
              <div className="flex items-center gap-2 text-slate-200 font-semibold">
                <HardDrive className="w-4 h-4 text-sky-400" />
                <span>Google Drive Folder Hierarchy</span>
              </div>
              <pre className="font-mono text-[11px] text-slate-400 leading-relaxed">
{`AI Video Factory/
  Projects/
    ${displayJob.title.slice(0, 34)}/
      Script/
      Storyboard/
      Audio/
      Scenes/
      Chapters/
      Checkpoints/
      Final Video/`}
              </pre>

              {!driveConnected ? (
                <div className="pt-2">
                  <GoogleSignInButton
                    onClick={onConnectDrive}
                    label="Sign in with Google to Save to Drive"
                  />
                </div>
              ) : (
                <div className="pt-2 space-y-2">
                  <button
                    type="button"
                    disabled={isSyncingDrive}
                    onClick={handleDriveSyncClick}
                    className="w-full min-h-[44px] rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                  >
                    <HardDrive className="w-4 h-4" />
                    <span>
                      {isSyncingDrive
                        ? 'Uploading Project & MP4 to Google Drive...'
                        : displayJob.driveSync.synced
                          ? 'Update Files in Google Drive'
                          : 'Save Project & MP4 to Google Drive'}
                    </span>
                  </button>

                  {displayJob.driveSync.folderUrl && (
                    <a
                      href={displayJob.driveSync.folderUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 text-xs text-sky-400 hover:underline"
                    >
                      <span>Open Project Folder in Google Drive</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : null}

      {/* Confirmation Modal for Overwriting Existing Google Drive Project Files */}
      {confirmOverwriteModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="drive-overwrite-title"
          className="fixed inset-0 z-50 bg-black/75 flex items-center justify-center p-4"
        >
          <div className="max-w-md w-full p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
            <h3 id="drive-overwrite-title" className="text-base font-bold text-slate-100">
              Update Existing Files in Google Drive?
            </h3>
            <p className="text-xs text-slate-300 leading-relaxed">
              This will upload updated versions of the approved script, 200-beat storyboard,
              checkpoints, and 1080p MP4 video into{' '}
              <strong className="text-slate-100">
                AI Video Factory/Projects/{displayJob.title}
              </strong>{' '}
              on your Google Drive.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmOverwriteModal(false)}
                className="px-4 min-h-[40px] rounded-lg bg-slate-800 text-slate-200 text-xs font-medium cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={async () => {
                  setConfirmOverwriteModal(false);
                  await onSyncProjectToDrive(displayJob);
                }}
                className="px-4 min-h-[40px] rounded-lg bg-emerald-500 text-slate-950 text-xs font-semibold cursor-pointer"
              >
                Confirm Upload
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
