// Centralized ImageKit configuration for Lomir

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:5001";

export const IMAGEKIT_CONFIG = {
  publicKey: import.meta.env.VITE_IMAGEKIT_PUBLIC_KEY,
  urlEndpoint: import.meta.env.VITE_IMAGEKIT_URL_ENDPOINT,
  authEndpoint: `${API_URL}/api/imagekit/auth`,
};

// File size limits (in bytes) - keep in sync with backend
export const FILE_LIMITS = {
  avatars: 5 * 1024 * 1024, // 5MB
  teamAvatars: 5 * 1024 * 1024, // 5MB
  chatImages: 10 * 1024 * 1024, // 10MB
  chatFiles: 25 * 1024 * 1024, // 25MB
};

// Map upload types to ImageKit folders
const FOLDERS = {
  avatars: "lomir/avatars",
  teamAvatars: "lomir/team-avatars",
  chatImages: "lomir/chat-images",
  chatFiles: "lomir/chat-files",
};

/**
 * Upload a file to ImageKit via client-side upload.
 * 1. Fetches short-lived auth params from the backend
 * 2. Uploads directly to ImageKit's upload API
 *
 * @param {File} file - The file to upload
 * @param {'avatars' | 'teamAvatars' | 'chatImages' | 'chatFiles'} type - Upload type
 * @returns {Promise<{success: boolean, url?: string, fileId?: string, error?: string}>}
 */
export const uploadToImageKit = async (file, type) => {
  // Check file size before uploading
  const sizeLimit = FILE_LIMITS[type];
  if (sizeLimit && file.size > sizeLimit) {
    const limitMB = Math.round(sizeLimit / (1024 * 1024));
    const actualMB = (file.size / (1024 * 1024)).toFixed(1);
    return {
      success: false,
      error: `File too large (${actualMB}MB). Maximum allowed: ${limitMB}MB`,
    };
  }

  try {
    // 1. Get auth params from backend (requires JWT)
    const token = localStorage.getItem("token");
    const authRes = await fetch(IMAGEKIT_CONFIG.authEndpoint, {
      headers: { Authorization: `Bearer ${token}` },
    });

    if (!authRes.ok) {
      const errBody = await authRes.json().catch(() => ({}));
      console.error("ImageKit auth error:", errBody);
      return { success: false, error: "Failed to get upload credentials" };
    }

    const authParams = await authRes.json();

    // 2. Build the upload form
    const formData = new FormData();
    formData.append("file", file);
    formData.append("fileName", file.name);
    formData.append("folder", FOLDERS[type] || "lomir/uploads");
    formData.append("publicKey", IMAGEKIT_CONFIG.publicKey);
    formData.append("token", authParams.token);
    formData.append("signature", authParams.signature);
    formData.append("expire", authParams.expire);

    // 3. Upload directly to ImageKit
    const uploadRes = await fetch(
      "https://upload.imagekit.io/api/v1/files/upload",
      {
        method: "POST",
        body: formData,
      },
    );

    if (!uploadRes.ok) {
      const errorData = await uploadRes.json().catch(() => ({}));
      console.error("ImageKit upload error:", errorData);
      return {
        success: false,
        error: errorData.message || "Upload failed",
      };
    }

    const data = await uploadRes.json();
    return {
      success: true,
      url: data.url,
      fileId: data.fileId,
    };
  } catch (error) {
    console.error("ImageKit upload error:", error);
    return { success: false, error: error.message };
  }
};
