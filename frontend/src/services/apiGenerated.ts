import axios from 'axios';
import type { paths, components } from '../types/api';

// Extract types from the generated schema
type ApiResponse<T = any> = components['schemas']['ApiResponse'] & {
  data?: T;
};

type AIModelType = components['schemas']['AIModelType'];

// Path operation types
type UploadResponse = paths['/upload']['post']['responses']['200']['content']['application/json'];
type SessionCreateResponse = paths['/session']['post']['responses']['200']['content']['application/json'];
type SessionGetResponse = paths['/session/{id}']['get']['responses']['200']['content']['application/json'];
type EditResponse = paths['/edit']['post']['responses']['200']['content']['application/json'];
type RefineResponse = paths['/edit/refine']['post']['responses']['200']['content']['application/json'];
type JobStatusResponse = paths['/job/{id}']['get']['responses']['200']['content']['application/json'];
type ExportResponse = paths['/image/{id}/export']['post']['responses']['200']['content']['application/json'];
type ModelsResponse = paths['/edit/models']['get']['responses']['200']['content']['application/json'];
type ModelTestResponse = paths['/edit/models/{model}/test']['post']['responses']['200']['content']['application/json'];

// Request body types
type UploadRequest = paths['/upload']['post']['requestBody']['content']['multipart/form-data'];
type SessionCreateRequest = paths['/session']['post']['requestBody']['content']['application/json'];
type EditRequest = paths['/edit']['post']['requestBody']['content']['application/json'];
type RefineRequest = paths['/edit/refine']['post']['requestBody']['content']['application/json'];
type ExportRequest = paths['/image/{id}/export']['post']['requestBody']['content']['application/json'];

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

// Request/response interceptors for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.data?.error) {
      throw new Error(error.response.data.error);
    }
    throw error;
  }
);

export const apiService = {
  /**
   * Upload an image and create a project
   */
  async uploadImage(
    file: File, 
    projectName?: string, 
    ownerId?: string
  ): Promise<UploadResponse['data']> {
    const formData = new FormData();
    formData.append('image', file);
    if (projectName) formData.append('project_name', projectName);
    if (ownerId) formData.append('owner_id', ownerId);

    const response = await api.post<UploadResponse>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Upload failed');
    }

    return response.data.data!;
  },

  /**
   * Create a new editing session
   */
  async createSession(
    projectId: string, 
    context?: Record<string, any>
  ): Promise<SessionCreateResponse['data']> {
    const requestBody: SessionCreateRequest = {
      project_id: projectId,
      context,
    };

    const response = await api.post<SessionCreateResponse>('/session', requestBody);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create session');
    }

    return response.data.data!;
  },

  /**
   * Get session information
   */
  async getSession(sessionId: string): Promise<SessionGetResponse['data']> {
    const response = await api.get<SessionGetResponse>(`/session/${sessionId}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get session');
    }

    return response.data.data!;
  },

  /**
   * Create image processing job
   */
  async editImage(
    sessionId: string,
    imageId: string,
    type: 'optimize' | 'edit' | 'refine',
    prompt?: string,
    model?: AIModelType,
    idempotencyKey?: string
  ): Promise<EditResponse['data']> {
    const requestBody: EditRequest = {
      session_id: sessionId,
      image_id: imageId,
      type,
      prompt,
      model,
    };

    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }

    const response = await api.post<EditResponse>('/edit', requestBody, { headers });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start edit job');
    }

    return response.data.data!;
  },

  /**
   * Refine an existing variant
   */
  async refineImage(
    sessionId: string,
    variantId: string,
    instructions: string,
    idempotencyKey?: string
  ): Promise<RefineResponse['data']> {
    const requestBody: RefineRequest = {
      session_id: sessionId,
      variant_id: variantId,
      instructions,
    };

    const headers: Record<string, string> = {};
    if (idempotencyKey) {
      headers['idempotency-key'] = idempotencyKey;
    }

    const response = await api.post<RefineResponse>('/edit/refine', requestBody, { headers });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start refine job');
    }

    return response.data.data!;
  },

  /**
   * Get job status and results
   */
  async getJobStatus(jobId: string): Promise<JobStatusResponse['data']> {
    const response = await api.get<JobStatusResponse>(`/job/${jobId}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get job status');
    }

    return response.data.data!;
  },

  /**
   * Export image in specified format
   */
  async exportImage(
    imageId: string,
    options: {
      format?: 'jpg' | 'png' | 'webp';
      width?: number;
      height?: number;
    } = {}
  ): Promise<ExportResponse['data']> {
    const requestBody: ExportRequest = {
      format: options.format || 'jpg',
      width: options.width,
      height: options.height,
    };

    const response = await api.post<ExportResponse>(`/image/${imageId}/export`, requestBody);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to export image');
    }

    return response.data.data!;
  },

  /**
   * Create Server-Sent Events connection for job progress
   */
  createEventSource(jobId: string, lastEventId?: string): EventSource {
    const url = `${API_BASE_URL}/job/stream/${jobId}`;
    const eventSource = new EventSource(url);
    
    if (lastEventId) {
      // Note: EventSource constructor doesn't support custom headers directly
      // This would need to be handled differently for reconnection with Last-Event-ID
      console.warn('Last-Event-ID reconnection not implemented in this basic EventSource setup');
    }
    
    return eventSource;
  },

  /**
   * Get available AI models
   */
  async getAvailableModels(): Promise<ModelsResponse['data']> {
    const response = await api.get<ModelsResponse>('/edit/models');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get available models');
    }

    return response.data.data!;
  },

  /**
   * Test AI model connection
   */
  async testModelConnection(model: AIModelType): Promise<ModelTestResponse['data']['connection']> {
    const response = await api.post<ModelTestResponse>(`/edit/models/${model}/test`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to test model connection');
    }

    return response.data.data!.connection;
  },

  /**
   * Get system health status
   */
  async getHealth(): Promise<{ status: string; timestamp: string }> {
    const response = await api.get('/health');
    return response.data;
  },

  /**
   * Get API version information
   */
  async getVersion(): Promise<{ version: string; build: string; environment: string }> {
    const response = await api.get('/version');
    return response.data;
  },
};

// Export types for use in components
export type { 
  ApiResponse,
  AIModelType,
  UploadResponse,
  SessionCreateResponse,
  SessionGetResponse,
  EditResponse,
  RefineResponse,
  JobStatusResponse,
  ExportResponse,
  ModelsResponse,
  ModelTestResponse,
};

export default apiService;