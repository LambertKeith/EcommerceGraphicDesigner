import { create } from 'zustand';
import { Image, Session, Job, Variant, JobStatus } from '../types';

interface GenerateJobStatus {
  id: string;
  status: 'pending' | 'running' | 'done' | 'error';
  prompt: string;
  style: string;
  size: string;
  model_used?: string;
  error_msg?: string;
  image_url?: string;
  created_at: string;
}

interface AppState {
  // Current state
  currentImage: Image | null;
  currentSession: Session | null;
  currentJob: Job | null;
  jobStatus: JobStatus | null;
  variants: Variant[];
  
  // Text-to-image generation state
  currentPrompt: string;
  selectedStyle: string;
  selectedSize: string;
  isGenerating: boolean;
  generationProgress: number;
  generatedImage: GenerateJobStatus | null;
  currentGenerateJob: string | null;
  
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
  
  // Text-to-image actions
  setCurrentPrompt: (prompt: string) => void;
  setSelectedStyle: (style: string) => void;
  setSelectedSize: (size: string) => void;
  setIsGenerating: (generating: boolean) => void;
  setGenerationProgress: (progress: number) => void;
  setGeneratedImage: (image: GenerateJobStatus | null) => void;
  setCurrentGenerateJob: (jobId: string | null) => void;
  
  reset: () => void;
  resetGeneration: () => void;
}

export const useAppStore = create<AppState>((set, get) => ({
  // Initial state
  currentImage: null,
  currentSession: null,
  currentJob: null,
  jobStatus: null,
  variants: [],
  
  // Text-to-image initial state
  currentPrompt: '',
  selectedStyle: 'commercial',
  selectedSize: '1024x1024',
  isGenerating: false,
  generationProgress: 0,
  generatedImage: null,
  currentGenerateJob: null,
  
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
  
  // Text-to-image actions
  setCurrentPrompt: (prompt) => set({ currentPrompt: prompt }),
  setSelectedStyle: (style) => set({ selectedStyle: style }),
  setSelectedSize: (size) => set({ selectedSize: size }),
  setIsGenerating: (generating) => set({ isGenerating: generating }),
  setGenerationProgress: (progress) => set({ generationProgress: progress }),
  setGeneratedImage: (image) => set({ generatedImage: image }),
  setCurrentGenerateJob: (jobId) => set({ currentGenerateJob: jobId }),
  
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
  
  resetGeneration: () => set({
    currentPrompt: '',
    selectedStyle: 'commercial',
    selectedSize: '1024x1024',
    isGenerating: false,
    generationProgress: 0,
    generatedImage: null,
    currentGenerateJob: null,
  }),
}));