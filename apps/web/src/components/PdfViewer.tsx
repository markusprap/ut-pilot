
import React, { useEffect, useRef, useState } from 'react';
import { AlertCircle, ChevronLeft, ChevronRight, ZoomIn, ZoomOut, RotateCw, Loader2, StickyNote, X, Save, List, ChevronDown } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';

// Configure PDF.js worker
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@4.0.379/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
    pdfUrl: string | null;
    fileName: string;
    userNotes?: string;
    onSaveNotes?: (notes: string) => void;
    initialPage?: number;
    onPageChange?: (page: number) => void;
    initialScale?: number;
    onScaleChange?: (scale: number) => void;
}

interface PdfOutlineItem {
    title: string;
    pageNumber: number | null;
    items?: PdfOutlineItem[]; // For nested items if needed in future
}

const PdfViewer: React.FC<PdfViewerProps> = ({ pdfUrl, fileName, userNotes, onSaveNotes, initialPage = 1, onPageChange, initialScale, onScaleChange }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const containerRef = useRef<HTMLDivElement>(null);

    const [pdfDoc, setPdfDoc] = useState<any>(null);
    const [currentPage, setCurrentPage] = useState(initialPage);
    const [numPages, setNumPages] = useState(0);
    const [scale, setScale] = useState(initialScale || 1.2); // Default zoom 120% or persisted
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [rotation, setRotation] = useState(0);

    // Features State
    const [showNotes, setShowNotes] = useState(false);
    const [showOutline, setShowOutline] = useState(false);
    const [outline, setOutline] = useState<PdfOutlineItem[]>([]);

    // Notes Data State
    const [localNotes, setLocalNotes] = useState(userNotes || "");
    const [isSaving, setIsSaving] = useState(false);

    // Sync local notes if prop changes
    useEffect(() => {
        if (userNotes !== undefined) {
            setLocalNotes(userNotes);
        }
    }, [userNotes]);

    // Debounced Save Logic
    useEffect(() => {
        if (!onSaveNotes) return;

        const timeoutId = setTimeout(() => {
            if (localNotes !== userNotes) {
                setIsSaving(true);
                onSaveNotes(localNotes);
                setTimeout(() => setIsSaving(false), 800);
            }
        }, 1000);

        return () => clearTimeout(timeoutId);
    }, [localNotes, onSaveNotes, userNotes]);

    // Load Document & Extract Outline
    useEffect(() => {
        if (!pdfUrl) return;

        const loadPdf = async () => {
            setLoading(true);
            setError(null);
            setOutline([]); // Reset outline

            try {
                const loadingTask = pdfjsLib.getDocument(pdfUrl);
                const doc = await loadingTask.promise;
                setPdfDoc(doc);
                setNumPages(doc.numPages);
                setCurrentPage(initialPage || 1);

                // Extract Outline (Table of Contents)
                try {
                    const rawOutline = await doc.getOutline();
                    if (rawOutline && rawOutline.length > 0) {
                        const processedOutline: PdfOutlineItem[] = [];

                        // Helper to resolve destination to page number
                        const resolveDest = async (dest: any): Promise<number | null> => {
                            if (!dest) return null;
                            try {
                                let explicitDest = dest;
                                if (typeof dest === 'string') {
                                    explicitDest = await doc.getDestination(dest);
                                }
                                if (!explicitDest) return null;

                                const ref = explicitDest[0];
                                // getPageIndex returns 0-based index
                                const pageIndex = await doc.getPageIndex(ref);
                                return pageIndex + 1;
                            } catch (e) {
                                return null;
                            }
                        };

                        // Process top-level items (flattening for simplicity in this version)
                        for (const item of rawOutline) {
                            const pageNum = await resolveDest(item.dest);
                            processedOutline.push({
                                title: item.title,
                                pageNumber: pageNum,
                                // Recursion for children could be added here
                            });
                        }

                        // Filter items that successfully resolved to a page number
                        setOutline(processedOutline.filter(i => i.pageNumber !== null));
                    }
                } catch (outlineErr) {
                    console.warn("Failed to load PDF outline", outlineErr);
                }

            } catch (err: any) {
                console.error("Error loading PDF:", err);
                setError("Gagal memuat file PDF. File mungkin rusak atau tidak didukung.");
            } finally {
                setLoading(false);
            }
        };

        loadPdf();
    }, [pdfUrl]);

    // Render Page
    useEffect(() => {
        if (!pdfDoc || !canvasRef.current) return;

        let renderTask: any = null;

        const renderPage = async () => {
            try {
                const page = await pdfDoc.getPage(currentPage);
                const viewport = page.getViewport({ scale: scale, rotation: rotation });
                const canvas = canvasRef.current;
                if (!canvas) return;

                const context = canvas.getContext('2d');
                if (!context) return;

                canvas.height = viewport.height;
                canvas.width = viewport.width;

                const renderContext = {
                    canvasContext: context,
                    viewport: viewport,
                };

                if (renderTask) {
                    renderTask.cancel();
                }

                renderTask = page.render(renderContext);
                await renderTask.promise;

            } catch (err: any) {
                if (err.name !== 'RenderingCancelledException') {
                    console.error("Page render error:", err);
                }
            }
        };

        renderPage();

        return () => {
            if (renderTask) renderTask.cancel();
        };
    }, [pdfDoc, currentPage, scale, rotation]);

    // Sync initialPage from props if it changes (e.g. parent resetting it)
    useEffect(() => {
        if (initialPage) {
            setCurrentPage(initialPage);
        }
    }, [initialPage]);

    const changePage = (offset: number) => {
        const newPage = currentPage + offset;
        if (newPage >= 1 && newPage <= numPages) {
            setCurrentPage(newPage);
            if (onPageChange) onPageChange(newPage);
            if (containerRef.current) containerRef.current.scrollTop = 0;
        }
    };

    const jumpToPage = (pageNum: number) => {
        if (pageNum >= 1 && pageNum <= numPages) {
            setCurrentPage(pageNum);
            if (onPageChange) onPageChange(pageNum);
            if (containerRef.current) containerRef.current.scrollTop = 0;
            // Close outline on mobile after selection for better UX
            if (window.innerWidth < 768) setShowOutline(false);
        }
    }

    // Optimize initial zoom for mobile (Only if no persisted scale)
    useEffect(() => {
        if (initialScale) return; // Respect persisted scale if exists

        const isMobile = window.innerWidth < 768;
        if (isMobile) {
            const mobileScale = 0.6;
            setScale(mobileScale);
            if (onScaleChange) onScaleChange(mobileScale);
        }
    }, [initialScale, onScaleChange]);

    const handleZoom = (delta: number) => {
        const newScale = Math.max(0.2, Math.min(3.0, scale + delta));
        setScale(newScale);
        if (onScaleChange) onScaleChange(newScale);
    };

    if (!pdfUrl) {
        return (
            <div className="flex flex-col items-center justify-center h-full min-h-[500px] bg-slate-100 dark:bg-slate-900 border-2 border-dashed border-slate-300 dark:border-slate-700 rounded-xl p-8 text-center">
                <AlertCircle className="w-12 h-12 text-slate-400 mb-4" />
                <h3 className="text-lg font-bold text-slate-700 dark:text-slate-300 mb-2">File PDF Tidak Ditemukan</h3>
                <p className="text-slate-500 dark:text-slate-400 max-w-md">
                    Mohon kembali ke dashboard dan pilih kelas lagi.
                </p>
            </div>
        );
    }

    return (
        <div className="flex gap-4 h-[calc(100vh-200px)] min-h-[600px] relative">

            {/* OUTLINE SIDEBAR (LEFT) */}
            {showOutline && (
                <div className="absolute left-0 top-0 bottom-0 z-30 w-72 bg-white dark:bg-slate-800 rounded-l-xl shadow-2xl border-r border-slate-200 dark:border-slate-700 flex flex-col animate-in slide-in-from-left duration-300">
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-900/50 rounded-tl-xl">
                        <div className="flex items-center gap-2 font-bold text-slate-800 dark:text-white">
                            <List className="w-5 h-5" />
                            Daftar Isi
                        </div>
                        <button onClick={() => setShowOutline(false)} className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors">
                            <X className="w-5 h-5" />
                        </button>
                    </div>
                    <div className="flex-1 overflow-y-auto p-2">
                        {outline.length > 0 ? (
                            <div className="space-y-1">
                                {outline.map((item, idx) => (
                                    <button
                                        key={idx}
                                        onClick={() => item.pageNumber && jumpToPage(item.pageNumber)}
                                        className={`w-full text-left px-3 py-2.5 rounded-lg text-sm transition-colors flex items-start gap-2 ${currentPage === item.pageNumber ? 'bg-blue-50 dark:bg-blue-900/30 text-blue-700 dark:text-blue-300 font-medium' : 'text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-700'}`}
                                    >
                                        <span className="mt-0.5 text-xs text-slate-400 min-w-[20px]">{item.pageNumber}</span>
                                        <span className="truncate">{item.title}</span>
                                    </button>
                                ))}
                            </div>
                        ) : (
                            <div className="flex flex-col items-center justify-center h-40 text-slate-400 text-center px-4">
                                <AlertCircle className="w-8 h-8 mb-2 opacity-50" />
                                <p className="text-sm">Tidak ada daftar isi di PDF ini.</p>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* MAIN VIEWER CONTAINER */}
            <div className={`flex-1 flex flex-col bg-slate-200 dark:bg-slate-900 rounded-xl overflow-hidden shadow-2xl border border-slate-300 dark:border-slate-700 transition-all duration-300 ${showOutline ? 'ml-0 md:ml-4' : ''}`}>

                {/* Top Toolbar */}
                <div className="bg-slate-800 text-white px-4 py-3 flex flex-wrap items-center justify-between gap-3 shadow-md z-20">
                    <div className="flex items-center gap-3 min-w-0">
                        {/* Outline Toggle */}
                        <button
                            onClick={() => { setShowOutline(!showOutline); setShowNotes(false); }}
                            className={`p-2 rounded-lg transition-colors ${showOutline ? 'bg-slate-600 text-white' : 'hover:bg-slate-700 text-slate-300'}`}
                            title="Daftar Isi"
                        >
                            <List className="w-5 h-5" />
                        </button>

                        <div className="w-px h-6 bg-slate-600 mx-1"></div>

                        <div className="text-sm font-medium truncate max-w-[120px] sm:max-w-xs" title={fileName}>
                            {fileName}
                        </div>
                        {loading && <span className="text-xs text-slate-400 flex items-center"><Loader2 className="w-3 h-3 animate-spin mr-1" /> Memuat...</span>}
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Notes Toggle */}
                        <button
                            onClick={() => { setShowNotes(!showNotes); setShowOutline(false); }}
                            className={`hidden sm:flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors mr-2 ${showNotes ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300 hover:bg-slate-600'}`}
                        >
                            <StickyNote className="w-4 h-4" />
                            {showNotes ? 'Tutup Catatan' : 'Catatan Saya'}
                        </button>

                        <div className="flex items-center gap-2 bg-slate-700 rounded-lg p-1">
                            <button
                                onClick={() => handleZoom(-0.2)}
                                className="p-1.5 hover:bg-slate-600 rounded-md transition-colors"
                                title="Zoom Out"
                            >
                                <ZoomOut className="w-4 h-4" />
                            </button>
                            <span className="text-xs font-mono w-12 text-center">{Math.round(scale * 100)}%</span>
                            <button
                                onClick={() => handleZoom(0.2)}
                                className="p-1.5 hover:bg-slate-600 rounded-md transition-colors"
                                title="Zoom In"
                            >
                                <ZoomIn className="w-4 h-4" />
                            </button>
                            <div className="w-px h-4 bg-slate-600 mx-1"></div>
                            <button
                                onClick={() => setRotation(r => (r + 90) % 360)}
                                className="p-1.5 hover:bg-slate-600 rounded-md transition-colors"
                                title="Rotate"
                            >
                                <RotateCw className="w-4 h-4" />
                            </button>
                        </div>

                        {/* Mobile Note Toggle (Icon Only) */}
                        <button
                            onClick={() => { setShowNotes(!showNotes); setShowOutline(false); }}
                            className={`sm:hidden p-2 rounded-lg transition-colors ml-2 ${showNotes ? 'bg-orange-600 text-white' : 'bg-slate-700 text-slate-300'}`}
                        >
                            <StickyNote className="w-4 h-4" />
                        </button>
                    </div>
                </div>

                {/* Main Content (Canvas) */}
                <div
                    ref={containerRef}
                    className="flex-1 overflow-auto bg-slate-500/10 dark:bg-black/20 flex justify-center p-4 sm:p-8 relative"
                >
                    {error ? (
                        <div className="flex flex-col items-center justify-center text-red-500">
                            <AlertCircle className="w-10 h-10 mb-2" />
                            <p>{error}</p>
                        </div>
                    ) : (
                        <div className="relative shadow-xl transition-transform duration-200 ease-out" style={{ width: 'fit-content', height: 'fit-content' }}>
                            <canvas
                                ref={canvasRef}
                                className="bg-white block mx-auto rounded-sm"
                            />
                        </div>
                    )}
                </div>

                {/* Bottom Toolbar (Pagination) */}
                <div className="bg-white dark:bg-slate-800 border-t border-slate-200 dark:border-slate-700 px-4 py-3 flex items-center justify-center gap-6 shadow-[0_-4px_6px_-1px_rgba(0,0,0,0.1)] z-10">
                    <button
                        onClick={() => changePage(-1)}
                        disabled={currentPage <= 1 || loading}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-200 hover:bg-slate-200 dark:hover:bg-slate-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm"
                    >
                        <ChevronLeft className="w-4 h-4" />
                        Prev
                    </button>

                    <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                        Halaman {currentPage} <span className="text-slate-400 font-normal">dari {numPages}</span>
                    </span>

                    <button
                        onClick={() => changePage(1)}
                        disabled={currentPage >= numPages || loading}
                        className="flex items-center gap-1 px-4 py-2 rounded-lg bg-slate-900 dark:bg-blue-600 text-white hover:bg-slate-800 dark:hover:bg-blue-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors font-medium text-sm shadow-sm"
                    >
                        Next
                        <ChevronRight className="w-4 h-4" />
                    </button>
                </div>
            </div>

            {/* NOTES SIDEBAR (RIGHT) */}
            {showNotes && (
                <div className="absolute right-0 top-0 bottom-0 z-30 w-80 md:w-96 flex flex-col bg-white dark:bg-slate-800 rounded-r-xl shadow-xl border-l border-slate-200 dark:border-slate-700 animate-in slide-in-from-right duration-300">
                    <div className="flex items-center justify-between p-4 border-b border-slate-200 dark:border-slate-700 bg-orange-50 dark:bg-orange-900/10 rounded-tr-xl">
                        <div className="flex items-center gap-2 text-orange-700 dark:text-orange-400 font-bold">
                            <StickyNote className="w-5 h-5" />
                            Catatan Pribadi
                        </div>
                        <div className="flex items-center gap-2">
                            {isSaving && <span className="text-xs text-slate-400 italic flex items-center"><Save className="w-3 h-3 mr-1" /> Menyimpan...</span>}
                            <button
                                onClick={() => setShowNotes(false)}
                                className="p-1 hover:bg-slate-200 dark:hover:bg-slate-700 rounded-full text-slate-400 transition-colors"
                            >
                                <X className="w-5 h-5" />
                            </button>
                        </div>
                    </div>
                    <div className="flex-1 p-4 flex flex-col">
                        <textarea
                            className="flex-1 w-full bg-transparent border-0 resize-none focus:ring-0 text-slate-700 dark:text-slate-300 placeholder:text-slate-400 leading-relaxed text-sm outline-none"
                            placeholder="Tulis catatan Anda di sini..."
                            value={localNotes}
                            onChange={(e) => setLocalNotes(e.target.value)}
                        ></textarea>
                    </div>
                    <div className="p-3 bg-slate-50 dark:bg-slate-900/50 border-t border-slate-200 dark:border-slate-700 text-xs text-slate-400 text-center rounded-br-xl">
                        Catatan tersimpan otomatis
                    </div>
                </div>
            )}
        </div>
    );
};

export default PdfViewer;
