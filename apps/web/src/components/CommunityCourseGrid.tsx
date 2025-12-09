import React, { useState } from 'react';
import { Course } from '../types';
import { Download, BookOpen, User, Clock, Loader2, CheckCircle2 } from 'lucide-react';
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface CommunityCourseGridProps {
    courses: Course[];
    myCourses: Course[]; // Added finding prop
    onCopyCourse: (course: Course) => Promise<void>;
    isLoading: boolean;
}

const CommunityCourseGrid: React.FC<CommunityCourseGridProps> = ({ courses, myCourses, onCopyCourse, isLoading }) => {
    const [copyingId, setCopyingId] = useState<string | null>(null);

    const handleCopy = async (course: Course) => {
        setCopyingId(course.id);
        await onCopyCourse(course);
        setCopyingId(null);
    };

    if (isLoading) {
        return (
            <div className="flex flex-col justify-center items-center py-20 space-y-4">
                <Loader2 className="w-10 h-10 text-primary animate-spin" />
                <span className="text-muted-foreground animate-pulse">Memuat modul komunitas...</span>
            </div>
        );
    }

    if (courses.length === 0) {
        return (
            <div className="text-center py-20 border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50">
                <BookOpen className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                <h3 className="text-lg font-medium text-foreground">Belum ada modul publik</h3>
                <p className="text-muted-foreground">Jadilah yang pertama membagikan modul Anda!</p>
            </div>
        );
    }

    // Helper to check ownership/enrollment
    const isEnrolled = (communityCourseId: string) => {
        // Enrolled if I have a course with the SAME ID (since we now link to the original course)
        return myCourses.some(c => c.id === communityCourseId);
    };

    return (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6 animate-in fade-in slide-in-from-bottom-4">
            {courses.map((course) => {
                const enrolled = isEnrolled(course.id);

                return (
                    <Card
                        key={course.id}
                        className="hover:shadow-lg transition-all hover:-translate-y-1 group bg-card overflow-hidden flex flex-col h-full border-slate-200 dark:border-slate-800"
                    >
                        <div className="h-1.5 w-full bg-purple-500"></div>
                        <CardHeader className="pb-3">
                            <div className="flex justify-between items-start mb-2">
                                <Badge variant="outline" className="font-mono text-xs border-purple-200 text-purple-700 bg-purple-50 dark:bg-purple-900/20 dark:border-purple-800 dark:text-purple-300">
                                    {course.code}
                                </Badge>
                                {course.authorName && (
                                    <Badge variant="secondary" className="text-[10px] px-2 py-0.5 h-5">
                                        <User className="w-3 h-3 mr-1" />
                                        {course.authorName}
                                    </Badge>
                                )}
                            </div>
                            <CardTitle className="leading-tight line-clamp-2 min-h-[3rem] text-lg">
                                {course.title}
                            </CardTitle>
                        </CardHeader>

                        <CardContent className="flex-grow">
                            <div className="flex items-center text-xs text-muted-foreground">
                                <Clock className="w-3 h-3 mr-1" />
                                Diupload: {new Date(course.createdAt).toLocaleDateString('id-ID')}
                            </div>
                        </CardContent>

                        <CardFooter className="pt-0 pb-6">
                            <Button
                                onClick={() => handleCopy(course)}
                                disabled={copyingId === course.id || enrolled}
                                variant={enrolled ? "outline" : "secondary"}
                                className="w-full"
                            >
                                {copyingId === course.id ? (
                                    <>
                                        <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Menyalin...
                                    </>
                                ) : enrolled ? (
                                    <>
                                        <CheckCircle2 className="w-4 h-4 mr-2 text-green-500" /> Sudah Diambil
                                    </>
                                ) : (
                                    <>
                                        <Download className="w-4 h-4 mr-2" /> Daftar Kelas
                                    </>
                                )}
                            </Button>
                        </CardFooter>
                    </Card>
                )
            })}
        </div>
    );
};

export default CommunityCourseGrid;
