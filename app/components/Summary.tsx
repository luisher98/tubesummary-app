"use client";

import { useVideoContext } from "@/app/context/VideoContext";
import SummaryContent from "./SummaryContent";
import VideoCard from "./VideoCard";
import LoadingSpinner from "./LoadingSpinner";

export default function Summary() {
  const { summary, videoInfo, isLoading, resetStates } = useVideoContext();

  const lastSummaryItem = summary[summary.length - 1];
  const loadingMessage = lastSummaryItem?.message ?? "Sending information...";

  if (lastSummaryItem?.status === "done") {
    return (
      <div className="space-y-8">
        {videoInfo && <VideoCard videoInfo={videoInfo} />}
        <SummaryContent info={videoInfo} summary={lastSummaryItem} />
        <div className="flex justify-center pb-8">
          <button
            onClick={resetStates}
            className="rounded-md bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Generate Another Summary
          </button>
        </div>
      </div>
    );
  }

  if (lastSummaryItem?.status === "error") {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <div className="max-w-md text-center">
          <div className="mb-4 rounded-lg bg-red-50 p-4 dark:bg-red-900/10">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.28 7.22a.75.75 0 00-1.06 1.06L8.94 10l-1.72 1.72a.75.75 0 101.06 1.06L10 11.06l1.72 1.72a.75.75 0 101.06-1.06L11.06 10l1.72-1.72a.75.75 0 00-1.06-1.06L10 8.94 8.28 7.22z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-red-800 dark:text-red-200">
                  Error occurred
                </h3>
                <p className="mt-2 text-sm text-red-700 dark:text-red-300">
                  {lastSummaryItem.message}
                </p>
              </div>
            </div>
          </div>
          <button
            onClick={resetStates}
            className="rounded-md bg-blue-500 px-6 py-3 text-sm font-semibold text-white transition-all hover:bg-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 dark:focus:ring-offset-gray-800"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const isProcessing = isLoading || (
    lastSummaryItem?.status && 
    ["pending", "processing", "uploading"].includes(lastSummaryItem.status)
  );

  if (isProcessing) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <LoadingSpinner message={loadingMessage} />
      </div>
    );
  }

  return null;
}
