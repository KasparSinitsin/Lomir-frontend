import React, { useState, useRef, useCallback } from "react";
import { Upload, X, ImagePlus, Trash2 } from "lucide-react";

/**
 * ImageUploader Component
 *
 * A reusable drag & drop image upload component for avatars and other images.
 * Supports both drag & drop and click-to-select functionality.
 *
 * @param {string} currentImage - URL of the currently uploaded image (if any)
 * @param {Function} onImageSelect - Callback when a new image is selected. Receives (file, previewUrl)
 * @param {Function} onImageRemove - Callback when the current image should be removed
 * @param {string} fallbackText - Text to display when no image (e.g., initials)
 * @param {string} shape - Shape of the preview: "circle" | "square" | "rounded"
 * @param {string} size - Size preset: "sm" | "md" | "lg" | "xl"
 * @param {number} maxSizeMB - Maximum file size in MB (default: 5)
 * @param {string[]} acceptedTypes - Accepted MIME types (default: image/*)
 * @param {boolean} disabled - Whether the uploader is disabled
 * @param {boolean} loading - Whether an upload is in progress
 * @param {string} label - Label text for the uploader
 * @param {string} helpText - Helper text displayed below the uploader
 * @param {string} className - Additional CSS classes for the container
 * @param {boolean} showRemoveButton - Whether to show the remove button when an image exists
 * @param {string} removeButtonText - Text for the remove button
 */
const ImageUploader = ({
  currentImage = null,
  onImageSelect,
  onImageRemove,
  fallbackText = "?",
  shape = "circle",
  size = "lg",
  maxSizeMB = 5,
  acceptedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"],
  disabled = false,
  loading = false,
  label = "",
  helpText = "",
  className = "",
  showRemoveButton = true,
  removeButtonText = "Remove",
  previewShape,
  previewSize,
}) => {
  // ============ State ============
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [imageError, setImageError] = useState(false);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);
  const finalShape = previewShape ?? shape;
  const finalSize = previewSize ?? size;

  // ============ Size & Shape Classes ============
  const sizeClasses = {
    sm: "w-16 h-16",
    md: "w-20 h-20",
    mdPlus: "w-32 h-32",
    lg: "w-24 h-24",
    xl: "w-48 h-48",
  };

  const shapeClasses = {
    circle: "rounded-full",
    square: "rounded-none",
    rounded: "rounded-lg",
  };

  const textSizeClasses = {
    sm: "text-lg",
    md: "text-xl",
    mdPlus: "text-3xl",
    lg: "text-2xl",
    xl: "text-3xl",
  };

  const iconSizeClasses = {
    sm: 16,
    md: 20,
    mdPlus: 28,
    lg: 24,
    xl: 32,
  };

  // ============ Validation ============
  const validateFile = useCallback(
    (file) => {
      // Check file type
      if (!file.type.startsWith("image/")) {
        return "Please select an image file";
      }

      if (acceptedTypes.length > 0 && !acceptedTypes.includes(file.type)) {
        const typeNames = acceptedTypes
          .map((t) => t.replace("image/", "").toUpperCase())
          .join(", ");
        return `Accepted formats: ${typeNames}`;
      }

      // Check file size
      const maxSizeBytes = maxSizeMB * 1024 * 1024;
      if (file.size > maxSizeBytes) {
        return `Image must be less than ${maxSizeMB}MB`;
      }

      return null;
    },
    [acceptedTypes, maxSizeMB],
  );

  // ============ File Handling ============
  const handleFile = useCallback(
    (file) => {
      if (!file) return;

      setError(null);
      setImageError(false);

      const validationError = validateFile(file);
      if (validationError) {
        setError(validationError);
        return;
      }

      // Create preview URL
      const preview = URL.createObjectURL(file);
      setPreviewUrl(preview);

      // Notify parent component
      if (onImageSelect) {
        onImageSelect(file, preview);
      }
    },
    [validateFile, onImageSelect],
  );

  // ============ Drag & Drop Handlers ============
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;

    if (e.dataTransfer.items && e.dataTransfer.items.length > 0) {
      setIsDragging(true);
    }
  }, []);

  const handleDragLeave = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current--;

    if (dragCounter.current === 0) {
      setIsDragging(false);
    }
  }, []);

  const handleDragOver = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(
    (e) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      dragCounter.current = 0;

      if (disabled || loading) return;

      const files = e.dataTransfer.files;
      if (files && files.length > 0) {
        handleFile(files[0]);
      }
    },
    [disabled, loading, handleFile],
  );

  // ============ Click Handler ============
  const handleClick = useCallback(() => {
    if (disabled || loading) return;
    fileInputRef.current?.click();
  }, [disabled, loading]);

  const handleFileInputChange = useCallback(
    (e) => {
      const file = e.target.files?.[0];
      if (file) {
        handleFile(file);
      }
      // Reset input so the same file can be selected again
      e.target.value = "";
    },
    [handleFile],
  );

  // ============ Remove Handler ============
  const handleRemove = useCallback(
    (e) => {
      e.stopPropagation();
      setPreviewUrl(null);
      setError(null);
      setImageError(false);

      if (onImageRemove) {
        onImageRemove();
      }
    },
    [onImageRemove],
  );

  // ============ Get Display Image ============
  const getDisplayImage = () => {
    // Priority: new preview > current image
    if (previewUrl) return previewUrl;
    if (currentImage && !imageError) return currentImage;
    return null;
  };

  const displayImage = getDisplayImage();
  const hasImage = !!displayImage;
  const hasNewImage = !!previewUrl;

  // ============ Render ============
  return (
    <div className={`image-uploader ${className}`}>
      {/* Label */}
      {label && (
        <label className="label">
          <span className="label-text">{label}</span>
        </label>
      )}

      <div className="flex items-center gap-6">
        {/* Drop Zone / Preview */}
        <div
          role="button"
          tabIndex={disabled ? -1 : 0}
          aria-label={hasImage ? "Change image" : "Upload image"}
          aria-disabled={disabled}
          onClick={handleClick}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              handleClick();
            }
          }}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          className={`
            relative cursor-pointer transition-all duration-200
            ${sizeClasses[finalSize]}
            ${shapeClasses[finalShape]}
            ${disabled ? "opacity-50 cursor-not-allowed" : ""}
            ${
              isDragging
                ? "ring-4 ring-primary ring-offset-2 scale-105 bg-primary/10"
                : "hover:ring-2 hover:ring-primary/50"
            }
            ${!hasImage ? "border-2 border-dashed border-base-300 hover:border-primary" : ""}
            focus:outline-none focus:ring-2 focus:ring-primary focus:ring-offset-2
          `}
        >
          {/* Image Preview or Placeholder */}
          <div
            className={`
              w-full h-full flex items-center justify-center overflow-hidden
              ${shapeClasses[finalShape]}
              ${hasImage ? "" : "bg-primary text-primary-content"}
            `}
          >
            {loading ? (
              <span className="loading loading-spinner loading-md text-primary"></span>
            ) : hasImage ? (
              <img
                src={displayImage}
                alt="Preview"
                className={`w-full h-full object-cover ${shapeClasses[finalShape]}`}
                onError={() => setImageError(true)}
              />
            ) : (
              <div className="flex flex-col items-center justify-center">
                {isDragging ? (
                  <ImagePlus
                    size={iconSizeClasses[finalSize]}
                    className="opacity-80"
                  />
                ) : fallbackText ? (
                  <span className={textSizeClasses[finalSize]}>
                    {fallbackText}
                  </span>
                ) : (
                  <Upload
                    size={iconSizeClasses[finalSize]}
                    className="opacity-60"
                  />
                )}
              </div>
            )}
          </div>

          {/* Drag Overlay */}
          {isDragging && !disabled && (
            <div
              className={`
                absolute inset-0 flex items-center justify-center
                bg-primary/20 backdrop-blur-sm
                ${shapeClasses[finalShape]}
              `}
            >
              <ImagePlus
                size={iconSizeClasses[finalSize]}
                className="text-primary"
              />
            </div>
          )}

          {/* Edit Badge (shows on hover when image exists) */}
          {hasImage && !loading && !disabled && (
            <div
              className={`
                absolute inset-0 flex items-center justify-center
                bg-black/40 opacity-0 hover:opacity-100 transition-opacity
                ${shapeClasses[finalShape]}
              `}
            >
              <Upload
                size={iconSizeClasses[finalSize]}
                className="text-white"
              />
            </div>
          )}
        </div>

        {/* Right Side: Instructions & Remove Button */}
        <div className="flex-1 space-y-2">
          {/* Upload Instructions */}
          <div className="text-sm text-base-content/70">
            {isDragging ? (
              <span className="text-primary font-medium">Drop image here</span>
            ) : (
              <span>
                Drag & drop or{" "}
                <button
                  type="button"
                  onClick={handleClick}
                  disabled={disabled || loading}
                  className="text-primary hover:underline focus:outline-none focus:underline disabled:opacity-50"
                >
                  click to upload
                </button>
              </span>
            )}
          </div>

          {/* Help Text */}
          {helpText && !error && <p className="form-helper-text">{helpText}</p>}

          {/* Auto-generated Help Text */}
          {!helpText && !error && (
            <p className="form-helper-text">
              {hasNewImage
                ? "New image selected. Save to upload."
                : `Max ${maxSizeMB}MB. Square images recommended.`}
            </p>
          )}

          {/* Error Message */}
          {error && <p className="text-xs text-error">{error}</p>}

          {/* Remove Button */}
          {showRemoveButton && (currentImage || previewUrl) && !loading && (
            <button
              type="button"
              onClick={handleRemove}
              disabled={disabled}
              className="btn btn-outline btn-error btn-sm gap-1"
            >
              <Trash2 size={14} />
              {removeButtonText}
            </button>
          )}
        </div>
      </div>

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={handleFileInputChange}
        className="hidden"
        disabled={disabled}
        aria-hidden="true"
      />
    </div>
  );
};

export default ImageUploader;
