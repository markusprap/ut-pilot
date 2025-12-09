import React, { useState } from 'react';
import { Course } from '../types';
import { Book, MoreVertical, Trash2, Clock, ArrowRight, Plus, Rocket, BarChart2, Lock } from 'lucide-react';
import { CustomConfirm } from './CustomModal';
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User } from '@supabase/supabase-js';

// Access Control
const ADMIN_EMAILS = [
  "prapkurniawanmarkus@gmail.com",
  ...((import.meta as any).env.VITE_ADMIN_EMAILS || "").split(',').map((e: string) => e.trim())
].filter(Boolean);

interface CourseGridProps {
  courses: Course[];
  user: User | null; // Pass user for auth check
  onSelectCourse: (course: Course) => void;
  onDeleteCourse: (courseId: string) => void;
  onAddCourse: () => void;
}

const CourseGrid: React.FC<CourseGridProps> = ({ courses, user, onSelectCourse, onDeleteCourse, onAddCourse }) => {
  const [confirmState, setConfirmState] = useState<{ isOpen: boolean; courseId: string | null; courseTitle: string }>({
    isOpen: false,
    courseId: null,
    courseTitle: ''
  });

  const handleDeleteClick = (e: React.MouseEvent, course: Course) => {
    e.stopPropagation();
    setConfirmState({
      isOpen: true,
      courseId: course.id,
      courseTitle: course.title
    });
  };

  const handleConfirmDelete = () => {
    if (confirmState.courseId) {
      onDeleteCourse(confirmState.courseId);
    }
    setConfirmState({ isOpen: false, courseId: null, courseTitle: '' });
  };

  const isPremiumUser = user?.email && ADMIN_EMAILS.includes(user.email);

  return (
    <div className="w-full mt-4 mb-20">
      <CustomConfirm
        isOpen={confirmState.isOpen}
        onClose={() => setConfirmState({ isOpen: false, courseId: null, courseTitle: '' })}
        onConfirm={handleConfirmDelete}
        title="Hapus Kelas?"
        message={`Apakah Anda yakin ingin menghapus kelas "${confirmState.courseTitle}"? Semua data catatan dan riwayat kuis akan hilang permanen.`}
        confirmText="Ya, Hapus"
        cancelText="Batal"
        type="danger"
      />

      {/* Hero / Stats Section */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-10">
        <Card className="bg-gradient-to-br from-blue-500 to-indigo-600 border-none text-white shadow-lg relative overflow-hidden">
          <div className="absolute top-0 right-0 p-4 opacity-10">
            <Rocket className="w-24 h-24" />
          </div>
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-blue-100">Total Modul</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{courses.length}</div>
            <p className="text-blue-100 text-sm mt-1">Kelas Aktif</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-muted-foreground">Total SKS</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-foreground">{(courses.length * 3)}</div>
            <p className="text-muted-foreground text-sm mt-1">Estimasi Kredit (3 SKS/Modul)</p>
          </CardContent>
        </Card>

        <Card className="bg-card border-slate-200 dark:border-slate-800 shadow-sm relative overflow-hidden">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-medium text-muted-foreground">Status Akun</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Badge variant={isPremiumUser ? "default" : "secondary"} className={isPremiumUser ? "bg-amber-500 hover:bg-amber-600" : ""}>
                {isPremiumUser ? "PREMIUM" : "BASIC"}
              </Badge>
            </div>
            <p className="text-muted-foreground text-sm mt-2">
              {isPremiumUser ? "Akses Penuh: Buat Kelas & Komunitas" : "Akses Terbatas: Hanya Baca & Komunitas"}
            </p>
          </CardContent>
        </Card>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Add Course Card - RESTRICTED */}
        {isPremiumUser ? (
          <button
            onClick={onAddCourse}
            className="flex flex-col items-center justify-center min-h-[280px] border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-2xl hover:border-primary hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all group bg-card/50"
          >
            <div className="w-16 h-16 bg-primary/10 text-primary rounded-full flex items-center justify-center mb-4 group-hover:scale-110 group-hover:bg-primary group-hover:text-primary-foreground transition-all duration-300 shadow-sm">
              <Plus className="w-8 h-8" />
            </div>
            <span className="font-semibold text-lg text-slate-900 dark:text-slate-200">Buat Kelas Baru</span>
            <span className="text-sm text-slate-500 dark:text-slate-400 mt-1 max-w-[200px] text-center">Upload modul PDF untuk mulai belajar dengan AI</span>
          </button>
        ) : (
          <div className="flex flex-col items-center justify-center min-h-[280px] border border-slate-200 dark:border-slate-800 rounded-2xl bg-slate-50/50 dark:bg-slate-900/50 relative overflow-hidden">
            <div className="absolute inset-0 bg-stripe-pattern opacity-5"></div>
            <div className="w-14 h-14 bg-slate-200 dark:bg-slate-800 text-slate-400 rounded-full flex items-center justify-center mb-4">
              <Lock className="w-6 h-6" />
            </div>
            <span className="font-medium text-slate-500 dark:text-slate-400">Buat Kelas Baru</span>
            <span className="text-xs text-slate-400 mt-1 text-center px-6">Fitur ini khusus untuk akun Premium (Admin).</span>
          </div>
        )}

        {/* Course Cards */}
        {courses.map((course) => (
          <Card
            key={course.id}
            onClick={() => onSelectCourse(course)}
            className="cursor-pointer hover:shadow-xl transition-all duration-300 hover:-translate-y-1 group border-slate-200 dark:border-slate-800 bg-card overflow-hidden flex flex-col h-full rounded-2xl"
          >
            <div className="h-2 w-full bg-gradient-to-r from-blue-500 to-indigo-600"></div>
            <CardHeader className="pb-3 pt-5">
              <div className="flex justify-between items-start mb-3">
                <Badge variant="outline" className="font-mono text-xs border-indigo-200 text-indigo-700 bg-indigo-50 dark:bg-indigo-900/20 dark:border-indigo-800 dark:text-indigo-300 px-2 py-0.5 rounded-md">
                  {course.code}
                </Badge>

                {/* Delete Button (Only Show if it's MY course and I am Premium OR if it's local?) 
                    Actually, user can delete anything in their dashboard. 
                */}
                <div role="button" onClick={(e) => e.stopPropagation()}>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
                    onClick={(e) => handleDeleteClick(e, course)}
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
              <CardTitle className="leading-snug line-clamp-2 min-h-[3.5rem] text-lg font-bold text-slate-800 dark:text-slate-100 group-hover:text-primary transition-colors">
                {course.title}
              </CardTitle>
            </CardHeader>
            <CardContent className="flex-grow">
              <div className="space-y-2">
                <div className="flex items-center text-xs text-slate-500 dark:text-slate-400">
                  <Clock className="w-3.5 h-3.5 mr-2" />
                  <span className="truncate">Terakhir: {new Date(course.lastAccessed || course.createdAt).toLocaleDateString('id-ID', { day: 'numeric', month: 'short', year: 'numeric' })}</span>
                </div>
                {/* Progress Bar Placeholder */}
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div className="bg-primary h-full rounded-full w-[0%]"></div>
                </div>
              </div>
            </CardContent>
            <CardFooter className="pt-0 pb-5">
              <div className="w-full flex items-center justify-between text-sm font-semibold text-primary">
                <span>Lanjutkan Belajar</span>
                <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  <ArrowRight className="w-4 h-4" />
                </div>
              </div>
            </CardFooter>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default CourseGrid;