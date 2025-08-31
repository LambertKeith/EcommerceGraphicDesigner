import { create } from 'zustand';
import { Image, Session, Job, Variant, JobStatus } from '../types';

interface AppState {
  // Current state
  currentImage: Image | null;
  currentSession: Session | null;
  currentJob: Job | null;
  jobStatus: JobStatus | null;
  variants: Variant[];
  
  // UI state
  isUploading: boolean;
  isProcessing: boolean;
  uploadProgress: number;
  processingProgress: number;
  
  // Actions
  setCurrentImage: (image: Image | null) => void;
  setCurrentSession: (session: Session | null) => void;
  setCurrentJob: (job: Job | null) => void;
  setJobStatus: (status: JobStatus | null) => void;
  setVariants: (variants: Variant[]) => void;
  setIsUploading: (uploading: boolean) => void;
  setIsProcessing: (processing: boolean) => void;
  setUploadProgress: (progress: number) => void;
  setProcessingProgress: (progress: number) => void;
  reset: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentImage: null,
  currentSession: null,
  currentJob: null,
  jobStatus: null,
  variants: [],
  isUploading: false,
  isProcessing: false,
  uploadProgress: 0,
  processingProgress: 0,
  
  // Actions
  setCurrentImage: (image) => set({ currentImage: image }),
  setCurrentSession: (session) => set({ currentSession: session }),
  setCurrentJob: (job) => set({ currentJob: job }),
  setJobStatus: (status) => set({ jobStatus: status }),
  setVariants: (variants) => set({ variants }),
  setIsUploading: (uploading) => set({ isUploading: uploading }),
  setIsProcessing: (processing) => set({ isProcessing: processing }),
  setUploadProgress: (progress) => set({ uploadProgress: progress }),
  setProcessingProgress: (progress) => set({ processingProgress: progress }),
  
  reset: () => set({
    currentImage: null,
    currentSession: null,
    currentJob: null,
    jobStatus: null,
    variants: [],
    isUploading: false,
    isProcessing: false,
    uploadProgress: 0,
    processingProgress: 0,
  }),
}));