import React, { useState, useRef, useCallback, useEffect } from "react";
import { Upload, X, FileText, File, FileSpreadsheet, FileImage } from "lucide-react";

const ChatFileUploader = ({ onFileSelect, onClose }) => {
  const [isDragging, setIsDragging] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [error, setError] = useState(null);
  const fileInputRef = useRef(null);
  const dragCounter = useRef(0);

  const maxSizeMB = 25;
  
  // Accepted file types
  const acceptedTypes = {
    // Documents
    'application/pdf': { icon: FileText, label: 'PDF' },
    'application/msword': { icon: FileText, label: 'DOC' },
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': { icon: FileText, label: 'DOCX' },
    // Spreadsheets
    'application/vnd.ms-excel': { icon: FileSpreadsheet, label: 'XLS' },
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': { icon: FileSpreadsheet, label: 'XLSX' },
    'text/csv': { icon: FileSpreadsheet, label: 'CSV' },
    // Presentations
    'application/vnd.ms-powerpoint': { icon: File, label: 'PPT' },
    'application/vnd.openxmlformats-officedocument.presentationml.presentation': { icon: File, label: 'PPTX' },
    // Text
    'text/plain': { icon: FileText, label: 'TXT' },
    // Archives
    'application/zip': { icon: File, label: 'ZIP' },
    'application/x-rar-compressed': { icon: File, label: 'RAR' },
  };

  const acceptedExtensions = '.pdf,.doc,.docx,.xls,.xlsx,.csv,.ppt,.pptx,.txt,.zip,.rar';

  const validateFile = useCallback((file) => {
    const maxSizeBytes = maxSizeMB * 1024 * 1024;
    
    if (file.size > maxSizeBytes) {
      return `File must be less than ${maxSizeMB}MB`;
    }

    // Check if file type is accepted
    const isAcceptedType = Object.keys(acceptedTypes).includes(file.type);
    const extension = '.' + file.name.split('.').pop().toLowerCase();
    const isAcceptedExtension = acceptedExtensions.includes(extension);

    if (!isAcceptedType && !isAcceptedExtension) {
      return "File type not supported. Accepted: PDF, Word, Excel, PowerPoint, TXT, ZIP";
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

  const handleConfirm = () => {
    if (selectedFile) {
      onFileSelect(selectedFile);
    }
  };

  const handleClear = () => {
    setSelectedFile(null);
    setError(null);
  };

  const getFileIcon = (file) => {
    const typeInfo = acceptedTypes[file.type];
    if (typeInfo) {
      const IconComponent = typeInfo.icon;
      return <IconComponent size={32} className="text-primary" />;
    }
    return <File size={32} className="text-primary" />;
  };

  const formatFileSize = (bytes) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  return (
    <div className="absolute bottom-full mb-2 left-0 p-4 bg-base-100 rounded-lg shadow-lg border border-base-300 z-50 w-72">
      {/* Header */}
      <div className="flex justify-between items-center mb-3">
        <span className="font-medium text-sm">Share File</span>
        <button
          type="button"
          onClick={onClose}
          className="btn btn-ghost btn-xs btn-circle"
        >
          <X size={14} />
        </button>
      </div>

      {/* Drop Zone or File Preview */}
      {!selectedFile ? (
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
              <File size={32} className="text-primary" />
            ) : (
              <Upload size={32} className="text-base-content/50" />
            )}
            <p className="text-sm text-base-content/70">
              {isDragging ? "Drop file here" : "Drag & drop or click to select"}
            </p>
            <p className="text-xs text-base-content/50">
              Max {maxSizeMB}MB • PDF, Word, Excel, PPT, TXT, ZIP
            </p>
          </div>
        </div>
      ) : (
        <div className="bg-base-200 rounded-lg p-4">
          <div className="flex items-center gap-3">
            {getFileIcon(selectedFile)}
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium truncate">{selectedFile.name}</p>
              <p className="text-xs text-base-content/60">
                {formatFileSize(selectedFile.size)}
              </p>
            </div>
            <button
              type="button"
              onClick={handleClear}
              className="btn btn-ghost btn-xs btn-circle"
            >
              <X size={14} />
            </button>
          </div>
        </div>
      )}

      {/* Error Message */}
      {error && (
        <p className="text-xs text-error mt-2">{error}</p>
      )}

      {/* Action Buttons */}
      {selectedFile && (
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
        accept={acceptedExtensions}
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

export default ChatFileUploader;