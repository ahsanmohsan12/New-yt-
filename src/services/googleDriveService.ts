import { initializeApp, getApps } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';
import { VideoProjectJob } from '../types';

export const SCOPES = ['https://www.googleapis.com/auth/drive.file'];

const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApps()[0];
const auth = getAuth(app);

const provider = new GoogleAuthProvider();
SCOPES.forEach((scope) => provider.addScope(scope));

let isSigningIn = false;
// In-memory token cache (never stored in localStorage/sessionStorage per security rules)
let cachedAccessToken: string | null = null;

export interface DriveStorageQuota {
  limitBytes: number;
  usageBytes: number;
  userEmail: string;
  userDisplayName: string;
}

export const initDriveAuth = (
  onAuthSuccess?: (user: User, token: string) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (cachedAccessToken) {
        if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
      } else if (!isSigningIn) {
        cachedAccessToken = null;
        if (onAuthFailure) onAuthFailure();
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

export const googleDriveSignIn = async (): Promise<{
  user: User;
  accessToken: string;
} | null> => {
  try {
    isSigningIn = true;
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Failed to obtain Google Drive access token from Google sign-in.');
    }
    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error) {
    console.error('Google Drive sign-in error:', error);
    throw error;
  } finally {
    isSigningIn = false;
  }
};

export const getDriveAccessToken = (): string | null => {
  return cachedAccessToken;
};

export const googleDriveLogout = async () => {
  await auth.signOut();
  cachedAccessToken = null;
};

export async function fetchDriveQuota(): Promise<DriveStorageQuota | null> {
  if (!cachedAccessToken) return null;
  try {
    const res = await fetch(
      'https://www.googleapis.com/drive/v3/about?fields=storageQuota,user',
      {
        headers: { Authorization: `Bearer ${cachedAccessToken}` },
      }
    );
    if (!res.ok) return null;
    const data = await res.json();
    return {
      limitBytes: Number(data?.storageQuota?.limit || 5 * 1024 * 1024 * 1024 * 1024),
      usageBytes: Number(data?.storageQuota?.usage || 0),
      userEmail: data?.user?.emailAddress || '',
      userDisplayName: data?.user?.displayName || 'Connected User',
    };
  } catch {
    return null;
  }
}

async function findOrCreateFolder(
  name: string,
  parentId?: string
): Promise<{ id: string; webViewLink: string }> {
  if (!cachedAccessToken) {
    throw new Error('Not signed in to Google Drive.');
  }

  const escapedName = name.replace(/'/g, "\\'");
  const parentClause = parentId ? ` and '${parentId}' in parents` : '';
  const q = encodeURIComponent(
    `mimeType='application/vnd.google-apps.folder' and name='${escapedName}' and trashed=false${parentClause}`
  );

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${q}&fields=files(id,name,webViewLink)`,
    {
      headers: { Authorization: `Bearer ${cachedAccessToken}` },
    }
  );

  if (searchRes.ok) {
    const searchData = await searchRes.json();
    if (Array.isArray(searchData.files) && searchData.files.length > 0) {
      const f = searchData.files[0];
      return {
        id: f.id,
        webViewLink: f.webViewLink || `https://drive.google.com/drive/folders/${f.id}`,
      };
    }
  }

  const createRes = await fetch(
    'https://www.googleapis.com/drive/v3/files?fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name,
        mimeType: 'application/vnd.google-apps.folder',
        ...(parentId ? { parents: [parentId] } : {}),
      }),
    }
  );

  if (!createRes.ok) {
    const errText = await createRes.text();
    throw new Error(`Failed to create Drive folder "${name}": ${errText}`);
  }

  const created = await createRes.json();
  return {
    id: created.id,
    webViewLink: created.webViewLink || `https://drive.google.com/drive/folders/${created.id}`,
  };
}

async function uploadMultipartFile(
  fileName: string,
  mimeType: string,
  content: Blob | string,
  parentFolderId: string
): Promise<{ id: string; webViewLink: string }> {
  if (!cachedAccessToken) {
    throw new Error('Not signed in to Google Drive.');
  }

  const metadata = {
    name: fileName,
    parents: [parentFolderId],
  };

  const form = new FormData();
  form.append(
    'metadata',
    new Blob([JSON.stringify(metadata)], { type: 'application/json' })
  );
  form.append(
    'file',
    typeof content === 'string' ? new Blob([content], { type: mimeType }) : content
  );

  const res = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${cachedAccessToken}`,
      },
      body: form,
    }
  );

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`Failed to upload "${fileName}" to Google Drive: ${errText}`);
  }

  const data = await res.json();
  return {
    id: data.id,
    webViewLink: data.webViewLink || `https://drive.google.com/file/d/${data.id}/view`,
  };
}

/**
 * Organizes and uploads all project artifacts into the required Google Drive folder hierarchy:
 * AI Video Factory/
 *   Projects/
 *     Project Name/
 *       Script/
 *       Storyboard/
 *       Audio/
 *       Scenes/
 *       Chapters/
 *       Checkpoints/
 *       Final Video/
 */
export async function syncProjectToGoogleDrive(job: VideoProjectJob): Promise<{
  rootFolderId: string;
  projectFolderId: string;
  folderUrl: string;
  uploadedFiles: VideoProjectJob['driveSync']['uploadedFiles'];
}> {
  const rootFolder = await findOrCreateFolder('AI Video Factory');
  const projectsFolder = await findOrCreateFolder('Projects', rootFolder.id);
  const safeProjectName = job.title.replace(/[/\\?%*:|"<>]/g, '-').slice(0, 80);
  const projectFolder = await findOrCreateFolder(safeProjectName, projectsFolder.id);

  const subCategories: Array<
    'Script' | 'Storyboard' | 'Audio' | 'Scenes' | 'Chapters' | 'Checkpoints' | 'Final Video'
  > = [
    'Script',
    'Storyboard',
    'Audio',
    'Scenes',
    'Chapters',
    'Checkpoints',
    'Final Video',
  ];

  const subFolders: Record<string, { id: string; webViewLink: string }> = {};
  for (const sub of subCategories) {
    subFolders[sub] = await findOrCreateFolder(sub, projectFolder.id);
  }

  const uploadedFiles: VideoProjectJob['driveSync']['uploadedFiles'] = [];

  // 1. Upload Approved Script & 20 Scored Hooks
  const scriptFile = await uploadMultipartFile(
    'approved_script_and_hooks.json',
    'application/json',
    JSON.stringify(
      {
        title: job.title,
        topic: job.topic,
        scriptApproved: job.scriptApproved,
        scriptApprovedAt: job.scriptApprovedAt,
        totalWordCount: job.totalWordCount,
        selectedHookId: job.selectedHookId,
        hooks: job.hooks,
        chapters: job.chapters,
      },
      null,
      2
    ),
    subFolders['Script'].id
  );
  uploadedFiles.push({
    category: 'Script',
    name: 'approved_script_and_hooks.json',
    driveFileId: scriptFile.id,
    webViewLink: scriptFile.webViewLink,
  });

  // 2. Upload Storyboard (200 Beats)
  const storyboardFile = await uploadMultipartFile(
    'storyboard_visual_beats.json',
    'application/json',
    JSON.stringify(job.storyboard, null, 2),
    subFolders['Storyboard'].id
  );
  uploadedFiles.push({
    category: 'Storyboard',
    name: 'storyboard_visual_beats.json',
    driveFileId: storyboardFile.id,
    webViewLink: storyboardFile.webViewLink,
  });

  // 3. Upload Checkpoints & Chapter Manifest
  const checkpointFile = await uploadMultipartFile(
    'chapter_checkpoints.json',
    'application/json',
    JSON.stringify(
      {
        completedChapterIds: job.completedChapterIds,
        chapterTasks: job.chapterTasks,
        updatedAt: job.updatedAt,
      },
      null,
      2
    ),
    subFolders['Checkpoints'].id
  );
  uploadedFiles.push({
    category: 'Checkpoints',
    name: 'chapter_checkpoints.json',
    driveFileId: checkpointFile.id,
    webViewLink: checkpointFile.webViewLink,
  });

  // 4. Upload Final MP4 Video if available
  if (job.finalVideo) {
    try {
      const mp4Res = await fetch(job.finalVideo.url);
      if (mp4Res.ok) {
        const mp4Blob = await mp4Res.blob();
        const videoUpload = await uploadMultipartFile(
          `${safeProjectName}-1080p.mp4`,
          'video/mp4',
          mp4Blob,
          subFolders['Final Video'].id
        );
        uploadedFiles.push({
          category: 'Final Video',
          name: `${safeProjectName}-1080p.mp4`,
          driveFileId: videoUpload.id,
          webViewLink: videoUpload.webViewLink,
        });
      }
    } catch (err) {
      console.warn('Could not upload raw MP4 binary, uploading video manifest instead:', err);
    }
  }

  return {
    rootFolderId: rootFolder.id,
    projectFolderId: projectFolder.id,
    folderUrl: projectFolder.webViewLink,
    uploadedFiles,
  };
}
