import React from 'react';

interface SkeletonProps {
  className?: string;
}

export const Skeleton: React.FC<SkeletonProps> = ({ className = "" }) => {
  return (
    <div className={`animate-pulse bg-slate-200 dark:bg-slate-700 rounded-md ${className}`} />
  );
};

export const TextSkeleton: React.FC<{ lines?: number, className?: string }> = ({ lines = 3, className = "" }) => {
  return (
    <div className={`space-y-3 ${className}`}>
      {Array.from({ length: lines }).map((_, i) => (
        <Skeleton 
            key={i} 
            className={`h-4 ${i === lines - 1 ? 'w-4/5' : 'w-full'}`} 
        />
      ))}
    </div>
  );
};

export const NotesSkeleton: React.FC = () => {
    return (
        <div className="animate-in fade-in duration-500">
            {/* Title Block */}
            <Skeleton className="h-10 w-3/4 mb-6 border-b-2 border-slate-200 dark:border-slate-700 pb-2" />
            
            {/* Section 1 */}
            <Skeleton className="h-7 w-1/3 mb-4 mt-8" />
            <TextSkeleton lines={4} className="mb-6" />
            
            {/* List Block */}
            <div className="pl-6 space-y-3 mb-6">
                <div className="flex items-center gap-3">
                    <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
                    <Skeleton className="h-4 w-11/12" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
                    <Skeleton className="h-4 w-10/12" />
                </div>
                <div className="flex items-center gap-3">
                    <Skeleton className="w-2 h-2 rounded-full flex-shrink-0" />
                    <Skeleton className="h-4 w-full" />
                </div>
            </div>

            {/* Section 2 */}
            <Skeleton className="h-7 w-1/4 mb-4 mt-8" />
            <div className="border-l-4 border-slate-200 dark:border-slate-700 pl-4 py-2 mb-6">
                <TextSkeleton lines={2} />
            </div>
            <TextSkeleton lines={3} />
        </div>
    )
}
