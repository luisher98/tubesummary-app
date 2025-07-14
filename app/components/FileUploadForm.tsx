'use client';

import { useState, useCallback } from 'react';
import { cn, validateVideoFile } from '@/lib/utils';
import { Progress } from './ui/progress';
import type { SummaryProcessingUpdate, SummaryResponse } from '@/types';
import { useVideoContext } from '@/app/context/VideoContext';
import { toast } from 'react-hot-toast';
import { useDropzone } from 'react-dropzone';
import { FiUpload } from 'react-icons/fi';

import { getApiUrl } from '@/lib/env';
import { analyzeNetworkError } from '@/lib/utils/networkError';
import { validateConnection } from '@/lib/utils/connectionChecker';

interface FileUploadFormProps {
  isLoading: boolean;
  setIsLoading: (loading: boolean) => void;
  numberOfWords: number;
  setNumberOfWords: (words: number) => void;
  setSummary: (value: SummaryProcessingUpdate[] | ((prev: SummaryProcessingUpdate[]) => SummaryProcessingUpdate[])) => void;
}

interface FileInfo {
  name: string;
  size: number;
  type: string;
}

const MAX_LOCAL_FILE_SIZE = 200 * 1024 * 1024; // 200MB to match API memory limit
const MAX_FILE_SIZE = 500 * 1024 * 1024; // 500MB absolute maximum
const ALLOWED_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];

export default function FileUploadForm({
  isLoading,
  setIsLoading,
  numberOfWords,
  setNumberOfWords,
  setSummary: _setSummary,
}: FileUploadFormProps) {
  const { setFileInfo, setSummary, summary } = useVideoContext();
  const [dragActive, setDragActive] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleError = (error: unknown) => {
    if (error instanceof TypeError) {
      setValidationError('Network error. Please check your connection.');
    } else if (error instanceof Response) {
      setValidationError(`Server error: ${error.statusText}`);
    } else {
      setValidationError('An unexpected error occurred. Please try again.');
    }
    setIsLoading(false);
    setUploadProgress(0);
  };



  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setUploadProgress(0);
      setValidationError(null); // Clear any previous errors

      // First check if backend is available
      await validateConnection();

      // Validate file size
      if (file.size > MAX_FILE_SIZE) {
        throw new Error(`File size exceeds maximum allowed size of ${MAX_FILE_SIZE / (1024 * 1024)}MB`);
      }

      // Validate file type
      if (!ALLOWED_TYPES.includes(file.type)) {
        throw new Error('Unsupported file type. Supported types: MP4, WebM, QuickTime');
      }

      // Use direct upload approach like InputField
      const formData = new FormData();
      formData.append('file', file);

      // Create upload progress tracker
      const xhr = new XMLHttpRequest();
      xhr.upload.addEventListener('progress', (event) => {
        if (event.lengthComputable) {
          const progress = Math.round((event.loaded * 100) / event.total);
          setUploadProgress(progress);
        }
      });

      // Create a promise to handle the XHR request
      const uploadPromise = new Promise<string>((resolve, reject) => {
        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });
        xhr.addEventListener('error', () => reject(new Error('Upload failed')));

        // Start the upload
        const API_URL = getApiUrl();
        xhr.open('POST', `${API_URL}/api/summary/upload/summary?words=${numberOfWords}`);
        xhr.setRequestHeader('Accept', 'text/event-stream');
        xhr.responseType = 'text';
        xhr.send(formData);
      });

      // Wait for upload to complete and process SSE response
      const responseText = await uploadPromise;

      // Parse SSE response
      const lines = responseText.split('\n');
      
      for (const line of lines) {
        if (line.trim() === '' || !line.startsWith('data: ')) continue;
        
        try {
          const jsonStr = line.slice(6); // Remove 'data: ' prefix
          const update = JSON.parse(jsonStr) as SummaryProcessingUpdate;
          setSummary((prev: SummaryProcessingUpdate[]) => [...prev, update]);

          if (update.status === 'error') {
            toast.error(update.message || 'Processing failed');
            setIsLoading(false);
            setUploadProgress(0);
            return;
          }
          
          if (update.status === 'done') {
            setIsLoading(false);
            setUploadProgress(100);
            break;
          }
        } catch (parseError) {
          console.error('Error parsing SSE data:', parseError, 'Line:', line);
          // Continue processing other lines
        }
      }

      const fileInfo: FileInfo = {
        name: file.name,
        size: file.size,
        type: file.type
      };
      setFileInfo(fileInfo);

    } catch (error) {
      const networkError = analyzeNetworkError(error);
      console.error('Upload error:', networkError.technicalMessage);
      
      setIsLoading(false);
      setUploadProgress(0);
      
      // Add the error message to summary so user sees it
      setSummary(prev => [...prev, {
        status: 'error',
        message: networkError.userMessage,
        type: 'error',
        progress: 0,
        timestamp: Date.now()
      }]);
      
      toast.error(networkError.userMessage);
    }
  };

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    if (file) {
      void handleFileUpload(file);
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      'video/mp4': ['.mp4'],
      'video/webm': ['.webm'],
      'video/quicktime': ['.mov']
    },
    maxFiles: 1
  });

  return (
    <div className="relative mx-auto mt-7 max-w-xl sm:mt-12">
      <div
        className={cn(
          "relative z-10 rounded-lg border bg-white p-3 shadow-lg shadow-gray-100 dark:border-gray-700 dark:bg-gray-800 dark:shadow-gray-900/[.2]",
          validationError && "border-red-500 dark:border-red-500",
          dragActive && "border-blue-500 dark:border-blue-500"
        )}
      >
        <div
          className="flex min-h-[200px] flex-col items-center justify-center"
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          {...getRootProps()}
        >
          <input
            type="file"
            id="video-upload"
            className="hidden"
            accept="video/mp4,video/webm,video/quicktime"
            {...getInputProps()}
            disabled={isLoading}
          />
          <label
            htmlFor="video-upload"
            className={cn(
              "flex cursor-pointer flex-col items-center gap-2",
              isLoading && "pointer-events-none opacity-50"
            )}
          >
            <FiUpload className="h-12 w-12 text-gray-400" />
            <span className="text-sm text-gray-600 dark:text-gray-400">
              {dragActive ? "Drop your video here" : "Drag & drop your video here or click to browse"}
            </span>
            <span className="text-xs text-gray-500 dark:text-gray-500">
              Supported formats: MP4, WebM, QuickTime (max 500MB)
            </span>
          </label>

          {/* Upload Progress */}
          {isLoading && uploadProgress > 0 && (
            <div className="mt-4 w-full max-w-xs">
              <Progress value={uploadProgress} className="h-1" />
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">
                {uploadProgress >= 90 ? "Processing" : "Uploading"}... {uploadProgress}%
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Display progress and summary */}
      <div className="mt-4 space-y-4">
        {isLoading && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-blue-600 h-2.5 rounded-full transition-all duration-500"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600">
              {(summary.length > 0 && summary[summary.length - 1]?.message) ?? "Uploading..."}
            </p>
          </div>
        )}

        {!isLoading && summary.length > 0 && summary[summary.length - 1]?.status === 'done' && (
          <div className="space-y-4">
            <h3 className="text-lg font-semibold">Summary:</h3>
            <p className="text-gray-700 whitespace-pre-wrap">
              {summary[summary.length - 1]?.message}
            </p>
          </div>
        )}

        {validationError && (
          <p className="text-red-500 text-sm">{validationError}</p>
        )}
      </div>

      <label
        htmlFor="minmax-Words"
        className="mt-4 block text-sm font-medium text-gray-900 dark:text-gray-400"
      >
        Words: {numberOfWords}
      </label>
      <input
        className="h-2 w-full cursor-pointer appearance-none rounded-lg bg-gray-200 dark:bg-gray-700"
        id="minmax-Words"
        type="range"
        min="100"
        max="500"
        step="100"
        value={numberOfWords}
        onChange={(e) => setNumberOfWords(Number(e.target.value))}
        disabled={isLoading}
      />
    </div>
  );
} 