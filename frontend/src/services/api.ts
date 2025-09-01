import axios from 'axios';
import { ApiResponse, UploadResult, Session, JobStatus, AIModelsResponse, AIModelType } from '../types';

const API_BASE_URL = '/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000,
});

export const apiService = {
  async uploadImage(file: File, projectName?: string, ownerId?: string): Promise<UploadResult> {
    const formData = new FormData();
    formData.append('image', file);
    if (projectName) formData.append('project_name', projectName);
    if (ownerId) formData.append('owner_id', ownerId);

    const response = await api.post<ApiResponse<UploadResult>>('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Upload failed');
    }

    return response.data.data!;
  },

  async createSession(projectId: string, context?: Record<string, any>): Promise<{ session_id: string }> {
    const response = await api.post<ApiResponse<{ session_id: string }>>('/session', {
      project_id: projectId,
      context,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to create session');
    }

    return response.data.data!;
  },

  async getSession(sessionId: string): Promise<Session> {
    const response = await api.get<ApiResponse<Session>>(`/session/${sessionId}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get session');
    }

    return response.data.data!;
  },

  async editImage(
    sessionId: string,
    imageId: string,
    type: 'optimize' | 'edit' | 'refine',
    prompt?: string,
    model?: AIModelType
  ): Promise<{ job_id: string; model: AIModelType }> {
    const response = await api.post<ApiResponse<{ job_id: string; model: AIModelType }>>('/edit', {
      session_id: sessionId,
      image_id: imageId,
      type,
      prompt,
      model,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start edit job');
    }

    return response.data.data!;
  },

  async refineImage(
    sessionId: string,
    variantId: string,
    instructions: string
  ): Promise<{ job_id: string }> {
    const response = await api.post<ApiResponse<{ job_id: string }>>('/edit/refine', {
      session_id: sessionId,
      variant_id: variantId,
      instructions,
    });

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to start refine job');
    }

    return response.data.data!;
  },

  async getJobStatus(jobId: string): Promise<JobStatus> {
    const response = await api.get<ApiResponse<JobStatus>>(`/job/${jobId}`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get job status');
    }

    return response.data.data!;
  },

  async exportImage(
    imageId: string,
    format: 'jpg' | 'png' | 'webp' = 'jpg',
    width?: number,
    height?: number
  ): Promise<{ download_url: string; expires_at: string }> {
    const response = await api.post<ApiResponse<{ download_url: string; expires_at: string }>>(
      `/image/${imageId}/export`,
      { format, width, height }
    );

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to export image');
    }

    return response.data.data!;
  },

  createEventSource(jobId: string): EventSource {
    return new EventSource(`${API_BASE_URL}/job/stream/${jobId}`);
  },

  async getAvailableModels(): Promise<AIModelsResponse> {
    const response = await api.get<ApiResponse<AIModelsResponse>>('/edit/models');

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to get available models');
    }

    return response.data.data!;
  },

  async testModelConnection(model: AIModelType): Promise<{ success: boolean; error?: string }> {
    const response = await api.post<ApiResponse<{ connection: { success: boolean; error?: string } }>>(`/edit/models/${model}/test`);

    if (!response.data.success) {
      throw new Error(response.data.error || 'Failed to test model connection');
    }

    return response.data.data!.connection;
  },
};