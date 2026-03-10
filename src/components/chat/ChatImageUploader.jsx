import React, { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, ImagePlus } from "lucide-react";

const ChatImageUploader = ({ onImageSelect, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [error, setError] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const maxSizeMB = 10;
  const acceptedTypes = ["image/jpeg", "image/png", "image/gif", "image/webp"];

  const validateFile = useCallback((file) => {
    if (!file.type.startsWith("image/")) {
      return "Please select an image file";
    }
    if (!acceptedTypes.includes(file.type)) {
      return "Accepted formats: JPEG, PNG, GIF, WebP";
    }
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    if (file.size > maxSizeBytes) {
      return `Image must be less than ${maxSizeMB}MB`;
    }
    return null;
  }, []);

  const handleFile = useCallback((file) => {
    if (!file) return;

    setError(null);
    const validationError = validateFile(file);
    if (validationError) {
      setError(validationError);
      return;
    }

    const preview = URL.createObjectURL(file);
    setPreviewUrl(preview);
    setSelectedFile(file);
  }, [validateFile]);

  // Drag & Drop handlers
  const handleDragEnter = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounter.current++;
    if (e.dataTransfer.items?.length > 0) {
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

  const handleDrop = useCallback((e) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    dragCounter.current = 0;

    const files = e.dataTransfer.files;
    if (files?.length > 0) {
      handleFile(files[0]);
    }
  }, [handleFile]);

  // Clipboard paste handler
  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items;
    if (items) {
      for (let i = 0; i < items.length; i++) {
        if (items[i].type.startsWith("image/")) {
          const file = items[i].getAsFile();
          if (file) {
            handleFile(file);
            break;
          }
        }
      }
    }
  }, [handleFile]);

  // Add paste listener on mount
  useEffect(() => {
    document.addEventListener("paste", handlePaste);
    return () => document.removeEventListener("paste", handlePaste);
  }, [handlePaste]);

  const handleConfirm = () => {
    if (selectedFile && previewUrl) {
      onImageSelect(selectedFile, previewUrl);
    }
  };

  const handleClear = () => {
    setPreviewUrl(null);
    setSelectedFile(null);
    setError(null);
  };

  return (
    <div className="absolute bottom-full mb-2 left-0 p-4 bg-base-100 rounded-lg shadow-lg border border-base-300 z-50 w-72">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-medium text-sm">Share Image</span>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-xs btn-circle"
        >
          <X size={14} />
        </button>
      </div>

      {/* Drop Zone or Preview */}
      {!previewUrl ? (
        <div
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          onDragOver={handleDragOver}
          onDrop={handleDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`
            border-2 border-dashed rounded-lg p-6 cursor-pointer
            transition-colors duration-200 text-center
            ${isDragging 
              ? "border-primary bg-primary/10" 
              : "border-base-300 hover:border-primary/50"
            }
          `}
        >
          <div className="flex flex-col items-center gap-2">
            {isDragging ? (
              <ImagePlus size={32} className="text-primary" />
            ) : (
              <Upload size={32} className="text-base-content/50" />
            )}
            <p className="text-sm text-base-content/70">
              {isDragging ? "Drop image here" : "Drag & drop, click, or paste"}
            </p>
            <p className="text-xs text-base-content/50">
              Max {maxSizeMB}MB • JPEG, PNG, GIF, WebP
            </p>
          </div>
        </div>
      ) : (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Preview"
            className="w-full h-40 object-cover rounded-lg"
          />
          <button
            type="button"
            onClick={handleClear}
            className="absolute top-2 right-2 btn btn-circle btn-xs bg-black/50 border-0 hover:bg-black/70"
          >
            <X size={12} className="text-white" />
          </button>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-xs text-error mt-2">{error}</p>
      )}

      {/* Action Buttons */}
      {previewUrl && (
        <div className="flex gap-2 mt-3">
          <button
            type="button"
            onClick={handleClear}
            className="btn btn-ghost btn-sm flex-1"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleConfirm}
            className="btn btn-primary btn-sm flex-1"
          >
            Send
          </button>
        </div>
      )}

      {/* Hidden File Input */}
      <input
        ref={fileInputRef}
        type="file"
        accept={acceptedTypes.join(",")}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            handleFile(e.target.files[0]);
          }
          e.target.value = "";
        }}
        className="hidden"
      />
    </div>
  );
};

export default ChatImageUploader;