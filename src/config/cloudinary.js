// Centralized Cloudinary configuration for Lomir

export const CLOUDINARY_CONFIG = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME,

  presets: {
    avatars: import.meta.env.VITE_CLOUDINARY_PRESET_AVATARS,
    teamAvatars: import.meta.env.VITE_CLOUDINARY_PRESET_TEAM_AVATARS,
    chatImages: import.meta.env.VITE_CLOUDINARY_PRESET_CHAT_IMAGES,
    chatFiles: import.meta.env.VITE_CLOUDINARY_PRESET_CHAT_FILES,
  },

  urls: {
    image: `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/image/upload`,
    raw: `https://api.cloudinary.com/v1_1/${import.meta.env.VITE_CLOUDINARY_CLOUD_NAME}/raw/upload`,
  },
};

// File size limits (in bytes) - keep in sync with backend
export const FILE_LIMITS = {
  avatars: 5 * 1024 * 1024, // 5MB
  teamAvatars: 5 * 1024 * 1024, // 5MB
  chatImages: 10 * 1024 * 1024, // 10MB
  chatFiles: 25 * 1024 * 1024, // 25MB
};

/**
 * Upload a file to Cloudinary
 * @param {File} file - The file to upload
 * @param {'avatars' | 'teamAvatars' | 'chatImages' | 'chatFiles'} type - Upload type
 * @returns {Promise<{success: boolean, url?: string, publicId?: string, error?: string}>}
 */
export const uploadToCloudinary = async (file, type) => {
  const preset = CLOUDINARY_CONFIG.presets[type];

  if (!preset) {
    console.error(`Unknown upload type: ${type}`);
    return { success: false, error: `Unknown upload type: ${type}` };
  }

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

  // Use 'raw' endpoint for non-image files (documents, etc.)
  const isRawFile = type === "chatFiles";
  const uploadUrl = isRawFile
    ? CLOUDINARY_CONFIG.urls.raw
    : CLOUDINARY_CONFIG.urls.image;

  const formData = new FormData();
  formData.append("file", file);
  formData.append("upload_preset", preset);

  try {
    const response = await fetch(uploadUrl, {
      method: "POST",
      body: formData,
    });

    if (!response.ok) {
      const errorData = await response.json();
      console.error("Cloudinary upload error:", errorData);
      return {
        success: false,
        error: errorData.error?.message || "Upload failed",
      };
    }

    const data = await response.json();
    return {
      success: true,
      url: data.secure_url,
      publicId: data.public_id,
    };
  } catch (error) {
    console.error("Cloudinary upload error:", error);
    return { success: false, error: error.message };
  }
};
