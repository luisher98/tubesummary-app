"use client";

import { useState } from "react";
import type { FormEvent } from "react";
import { useVideoContext } from "../context/VideoContext";
import type { VideoContextState, SummaryProcessingUpdate } from "../../types";
import Heading from "./Heading";
import getSummary from "../../lib/getVideoSummary";
import getInfo from "@/lib/getVideoInfo";
import Form from "./Form";
import getVideoStatus from "@/lib/getVideoStatus";
import { getApiUrl } from "@/lib/env";
import { analyzeNetworkError } from "@/lib/utils/networkError";
import { validateConnection } from "@/lib/utils/connectionChecker";

export default function InputField() {
  const [url, setUrl] = useState("");
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploadProgress, setUploadProgress] = useState(0);

  const {
    isInputEmpty,
    setIsInputEmpty,
    setIsVideoUnavailable,
    isVideoUnavailable,
    setSummary,
    setVideoInfo,
    isLoading,
    setIsLoading,
    numberOfWords,
    setNumberOfWords,
  } = useVideoContext() as VideoContextState;

  const handleFileUpload = async (file: File) => {
    try {
      setIsLoading(true);
      setSummary([]);
      setVideoInfo(null);
      setIsInputEmpty(false);
      setIsVideoUnavailable(false);
      setSelectedFile(file);
      setUploadProgress(0);

      // Create FormData with the file
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
            setIsVideoUnavailable(true);
            setIsLoading(false);
            setSelectedFile(null);
            setUploadProgress(0);
            return;
          }
          
          if (update.status === 'done') {
            setIsLoading(false);
            setSelectedFile(null);
            setUploadProgress(100);
            break;
          }
        } catch (parseError) {
          console.error('Error parsing SSE data:', parseError, 'Line:', line);
          // Continue processing other lines
        }
      }
    } catch (error) {
      console.error('File upload error:', error);
      setIsVideoUnavailable(true);
      setIsLoading(false);
      setSelectedFile(null);
      setUploadProgress(0);
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    
    // Reset states
    setIsLoading(true);
    setSummary([]);
    setVideoInfo(null);
    setIsInputEmpty(false);
    setIsVideoUnavailable(false);

    if (!url) {
      setIsInputEmpty(true);
      setIsLoading(false);
      return;
    }

    try {
      // First check if backend is available
      await validateConnection();
      
      // Check video status
      const status = await getVideoStatus(url);
      
      if (!status) {
        setIsVideoUnavailable(true);
        setIsLoading(false);
        return;
      }

      // Get video info
      const info = await getInfo(url);
      
      if (!info) {
        setIsVideoUnavailable(true);
        setIsLoading(false);
        return;
      }
      
      setVideoInfo(info);

      // Get summary
      for await (const update of getSummary(url, numberOfWords)) {
        setSummary((prev: SummaryProcessingUpdate[]) => [...prev, update]);
        
        if (update.status === 'error') {
          setIsVideoUnavailable(true);
          break;
        }
      }
    } catch (error) {
      const networkError = analyzeNetworkError(error);
      console.error('Error:', networkError.technicalMessage);
      
      // Add the error message to summary so user sees it
      setSummary((prev: SummaryProcessingUpdate[]) => [...prev, {
        status: 'error',
        message: networkError.userMessage,
        type: 'error',
        progress: 0,
        timestamp: Date.now()
      }]);
      
      setIsVideoUnavailable(true);
    } finally {
      setIsLoading(false);
      setUrl("");
    }
  };

  return (
    <div className="relative overflow-x-hidden">
      <div className="mx-auto max-w-[85rem] px-4 py-10 sm:px-6 sm:py-24 lg:px-8">
        <div className="text-center">
          <Heading />
          <Form
            isInputEmpty={isInputEmpty}
            isVideoUnavailable={isVideoUnavailable}
            isLoading={isLoading}
            numberOfWords={numberOfWords}
            setNumberOfWords={setNumberOfWords}
            url={url}
            setUrl={setUrl}
            handleSubmit={handleSubmit}
            onFileSelect={handleFileUpload}
            uploadProgress={uploadProgress}
          />
        </div>
      </div>
    </div>
  );
}
