export type JobStatus =
  | 'CREATED'
  | 'SCRIPT_GENERATION'
  | 'AWAITING_APPROVAL'
  | 'VOICE_GENERATION'
  | 'STORYBOARD_GENERATION'
  | 'RENDERING'
  | 'ASSEMBLING'
  | 'QUALITY_CHECK'
  | 'COMPLETED'
  | 'FAILED'
  | 'PAUSED';

export type StickmanPose =
  | 'explaining'
  | 'pointing'
  | 'thinking'
  | 'walking'
  | 'running'
  | 'surprised'
  | 'celebrating'
  | 'writing_board'
  | 'holding_prop'
  | 'comparing';

export type VisualDiagramType =
  | 'none'
  | 'bar_chart'
  | 'pie_chart'
  | 'line_graph'
  | 'flowchart'
  | 'comparison_split'
  | 'timeline';

export type CameraMovement =
  | 'static_wide'
  | 'slow_zoom_in'
  | 'slow_zoom_out'
  | 'pan_left_to_right'
  | 'pan_right_to_left'
  | 'focus_character'
  | 'focus_diagram';

export type QAStatus = 'PASS' | 'REVIEW' | 'REGENERATE';

export interface ViralHook {
  id: string;
  text: string;
  technique: string;
  curiosityScore: number; // 0-100
  clarityScore: number; // 0-100
  emotionalScore: number; // 0-100
  retentionScore: number; // 0-100
  totalScore: number; // weighted average
  rank?: number;
  recommended?: boolean;
}

export interface ScriptChapter {
  id: string;
  chapterNumber: number;
  title: string;
  narrationText: string;
  wordCount: number;
  estimatedDurationSec: number;
  actualAudioDurationSec?: number;
  audioUrl?: string;
  audioFormat?: string;
  ttsEngineUsed?: string;
  alignmentStatus?: 'pending' | 'aligned';
  wordTimestamps?: Array<{
    word: string;
    start: number;
    end: number;
  }>;
}

export interface StoryboardBeat {
  scene_id: string;
  beatNumber: number;
  chapter_id: string;
  chapterNumber: number;
  narration_segment: string;
  semantic_description: string;
  visual_action: string;
  character_pose: StickmanPose;
  props: string[];
  background: string;
  diagram_type: VisualDiagramType;
  diagram_data?: {
    labels: string[];
    values: number[];
    unit?: string;
  };
  animation_type: string;
  camera_movement: CameraMovement;
  transition: 'cut' | 'fade' | 'slide_left' | 'zoom_transition' | 'wipe';
  estimated_duration: number;
  startTime: number;
  endTime: number;
  actual_duration: number;
  approved: boolean;
  qaStatus: QAStatus;
  qaNotes?: string;
  renderedFrameCount?: number;
  assetReuseKey?: string;
}

export interface ChapterTask {
  taskId: string;
  jobId: string;
  chapterId: string;
  chapterNumber: number;
  status: 'PENDING' | 'CLAIMED' | 'RENDERING' | 'COMPLETED' | 'FAILED';
  assignedWorkerId: string | null;
  claimedAt: string | null;
  completedAt: string | null;
  renderTimeSec: number | null;
  outputUrl: string | null;
  checkpointSaved: boolean;
  retryCount: number;
  errorMessage: string | null;
}

export interface GPUWorker {
  workerId: string;
  name: string;
  gpuModel: string;
  vramTotalGb: number;
  vramUsedGb: number;
  environment: 'google_colab' | 'local_node' | 'cloud_gpu';
  status: 'IDLE' | 'BUSY' | 'OFFLINE';
  currentTaskId: string | null;
  currentJobId: string | null;
  currentChapterNumber: number | null;
  lastHeartbeat: string;
  completedChaptersCount: number;
  avgRenderSpeedFps: number | null;
  avgChapterRenderSec: number | null;
}

export interface JobLogEntry {
  id: string;
  timestamp: string;
  level: 'info' | 'warn' | 'error' | 'success';
  stage: string;
  message: string;
}

export interface DriveSyncState {
  synced: boolean;
  lastSyncedAt: string | null;
  rootFolderId?: string;
  projectFolderId?: string;
  folderUrl?: string;
  uploadedFiles: Array<{
    category: 'Script' | 'Storyboard' | 'Audio' | 'Scenes' | 'Chapters' | 'Checkpoints' | 'Final Video';
    name: string;
    driveFileId: string;
    webViewLink: string;
  }>;
}

export interface VideoProjectJob {
  id: string;
  title: string;
  topic: string;
  instructions: string;
  targetDurationMinutes: number;
  audienceLevel: 'beginner' | 'intermediate' | 'advanced' | 'general';
  language: string;
  narratorVoice: 'af_bella' | 'af_sarah' | 'am_adam' | 'am_michael';
  narratorLabel: string;
  visualTheme: 'classic_chalkboard' | 'modern_dark_tech' | 'blueprint_lab' | 'warm_paper';
  resolution: '1920x1080';
  aspectRatio: '16:9';
  status: JobStatus;
  createdAt: string;
  updatedAt: string;
  hooks: ViralHook[];
  selectedHookId: string;
  chapters: ScriptChapter[];
  scriptApproved: boolean;
  scriptApprovedAt: string | null;
  totalWordCount: number;
  estimatedTotalDurationSec: number;
  actualTotalAudioDurationSec: number | null;
  combinedAudioUrl: string | null;
  alignmentMethod: 'whisperx_forced' | 'mfa_phoneme' | 'syllable_acoustic_fallback' | null;
  storyboard: StoryboardBeat[];
  chapterTasks: ChapterTask[];
  completedChapterIds: string[];
  failedTaskIds: string[];
  finalVideo: {
    url: string;
    fileSizeBytes: number;
    durationSec: number;
    resolution: '1920x1080';
    codec: 'H.264 / AAC';
    createdAt: string;
    syncVerified: boolean;
    audioVideoDeltaSec: number;
  } | null;
  driveSync: DriveSyncState;
  logs: JobLogEntry[];
}
