import { useState, useRef, useEffect } from 'react';
import { generateDiscussionResearch, generateDiscussionFinal, ResearchResult } from '../services/geminiService';
import { SavedDiscussion } from '../types';

export type Step = 0 | 1 | 2 | 3 | 4;

export const useDiscussion = (courseName: string, userName: string = "Mahasiswa") => {
    const [step, setStep] = useState<Step>(0); // Start at 0 for session selection
    const [isLoading, setIsLoading] = useState(false);

    // Session Info
    const [sessionNumber, setSessionNumber] = useState<number>(1);

    // Data States
    const [question, setQuestion] = useState("");
    const [researchData, setResearchData] = useState<ResearchResult | null>(null);
    const [userPoints, setUserPoints] = useState("");
    const [finalAnswer, setFinalAnswer] = useState("");

    // Saved Discussions
    const [savedDiscussions, setSavedDiscussions] = useState<SavedDiscussion[]>([]);

    // Custom Modal States
    const [alert, setAlert] = useState<{ isOpen: boolean; title: string; message: string; type: 'success' | 'error' | 'info' }>({
        isOpen: false,
        title: '',
        message: '',
        type: 'info'
    });
    const [confirm, setConfirm] = useState<{ isOpen: boolean; title: string; message: string; onConfirm: () => void }>({
        isOpen: false,
        title: '',
        message: '',
        onConfirm: () => { }
    });

    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Load saved discussions from localStorage
    useEffect(() => {
        const saved = localStorage.getItem(`discussions_${courseName}`);
        if (saved) {
            setSavedDiscussions(JSON.parse(saved));
        }
    }, [courseName]);

    const scrollToBottom = () => {
        setTimeout(() => {
            messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
        }, 100);
    };

    const saveDiscussion = () => {
        const newDiscussion: SavedDiscussion = {
            id: Date.now().toString(),
            sessionNumber,
            courseName,
            question,
            researchData,
            userPoints,
            finalAnswer,
            createdAt: new Date().toISOString()
        };

        const updated = [...savedDiscussions, newDiscussion];
        setSavedDiscussions(updated);
        localStorage.setItem(`discussions_${courseName}`, JSON.stringify(updated));
        setAlert({
            isOpen: true,
            title: 'Berhasil Disimpan!',
            message: `Diskusi Sesi ${sessionNumber} berhasil disimpan ke localStorage.`,
            type: 'success'
        });
    };

    const loadDiscussion = (discussion: SavedDiscussion) => {
        setSessionNumber(discussion.sessionNumber);
        setQuestion(discussion.question);
        setResearchData(discussion.researchData);
        setUserPoints(discussion.userPoints);
        setFinalAnswer(discussion.finalAnswer);
        setStep(4);
    };

    const deleteDiscussion = (id: string) => {
        setConfirm({
            isOpen: true,
            title: 'Hapus Diskusi?',
            message: 'Yakin mau hapus diskusi ini? Data yang sudah dihapus tidak bisa dikembalikan.',
            onConfirm: () => {
                const updated = savedDiscussions.filter(d => d.id !== id);
                setSavedDiscussions(updated);
                localStorage.setItem(`discussions_${courseName}`, JSON.stringify(updated));
                setAlert({
                    isOpen: true,
                    title: 'Berhasil Dihapus',
                    message: 'Diskusi berhasil dihapus dari localStorage.',
                    type: 'success'
                });
            }
        });
    };

    const handleResearch = async () => {
        if (!question.trim()) return;
        setIsLoading(true);
        setStep(2);
        scrollToBottom();

        try {
            const result = await generateDiscussionResearch(question, userName);
            setResearchData(result);
        } catch (e) {
            setAlert({
                isOpen: true,
                title: 'Riset Gagal',
                message: 'Mas Aldi gagal melakukan riset. Coba lagi ya.',
                type: 'error'
            });
            setStep(1);
        } finally {
            setIsLoading(false);
        }
    };

    const handleFinalize = async () => {
        if (!userPoints.trim() || !researchData) return;
        setIsLoading(true);
        setStep(4);
        scrollToBottom();

        try {
            const result = await generateDiscussionFinal(question, researchData.text, userPoints, userName);
            setFinalAnswer(result);
        } catch (e) {
            setAlert({
                isOpen: true,
                title: 'Gagal Meracik',
                message: 'Mas Aldi gagal meracik jawaban. Coba lagi ya.',
                type: 'error'
            });
            setStep(3);
        } finally {
            setIsLoading(false);
        }
    };

    const startNewDiscussion = () => {
        setStep(1);
        scrollToBottom();
    };

    const resetAll = () => {
        setStep(0);
        setSessionNumber(1);
        setQuestion("");
        setResearchData(null);
        setUserPoints("");
        setFinalAnswer("");
    };

    return {
        step, setStep,
        isLoading,
        sessionNumber, setSessionNumber,
        question, setQuestion,
        researchData,
        userPoints, setUserPoints,
        finalAnswer,
        savedDiscussions,
        alert, setAlert,
        confirm, setConfirm,
        messagesEndRef,
        saveDiscussion,
        loadDiscussion,
        deleteDiscussion,
        handleResearch,
        handleFinalize,
        startNewDiscussion,
        resetAll
    };
};
