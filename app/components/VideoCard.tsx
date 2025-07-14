'use client';

import Image from "next/image";
import Link from "next/link";
import type { VideoCardProps } from '@/types/components';

export default function VideoCard({ videoInfo }: VideoCardProps) {
  if (!videoInfo) return null;

  const {
    id,
    title,
    thumbnailUrl,
    channel,
    description,
    duration,
  } = videoInfo;

  // YouTube thumbnails are typically 16:9 ratio
  const width = 1280;
  const height = 720;

  return (
    <Link href={`https://www.youtube.com/watch?v=${id}`} target="_blank">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
        <div className="group flex md:flex-nowrap flex-wrap items-center h-full rounded-xl border border-gray-200 bg-white shadow-sm dark:border-gray-700 dark:bg-slate-900 dark:shadow-slate-700/[.7]">
          <div className="flex aspect-video object-cover w-full h-full flex-col items-center justify-center rounded-xl bg-blue-600">
            {thumbnailUrl && thumbnailUrl.trim() !== '' ? (
              <Image
                src={thumbnailUrl}
                alt={title}
                width={width}
                height={height}
                className="rounded-xl w-full h-full"
              />
            ) : (
              <div className="flex items-center justify-center w-full h-full text-white text-lg font-semibold">
                No Thumbnail Available
              </div>
            )}
          </div>
          <div className="p-4 md:p-6">
            <h3 className="text-xl font-semibold text-gray-800 dark:text-gray-300 dark:hover:text-white">
              {title || "No title"}
            </h3>
            <span className="mt-1 block text-xs font-semibold uppercase text-blue-600 dark:text-blue-500">
              by {channel || "unknown"}
            </span>
            <p className="mt-3 text-gray-500">
              {description || "No description"}
            </p>
            <span className="mt-2 block text-sm text-gray-500">
              Duration: {formatDuration(duration)}
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}

function formatDuration(seconds: number): string {
  const hours = Math.floor(seconds / 3600);
  const minutes = Math.floor((seconds % 3600) / 60);
  const remainingSeconds = seconds % 60;

  if (hours > 0) {
    return `${hours}:${minutes.toString().padStart(2, '0')}:${remainingSeconds.toString().padStart(2, '0')}`;
  }
  return `${minutes}:${remainingSeconds.toString().padStart(2, '0')}`;
}
