import { create } from 'zustand';

// API配置相关类型
export interface ApiConfiguration {
  id: string;
  name: string;
  description?: string;
  is_active: boolean;
  base_url: string;
  gemini_model: string;
  chatgpt_model: string;
  sora_model: string;
  gemini_enabled: boolean;
  chatgpt_enabled: boolean;
  sora_enabled: boolean;
  api_key_masked: string;
  connection_status: Record<string, {
    connected: boolean;
    last_tested?: Date;
    error?: string;
  }>;
  last_tested_at?: Date;
  created_at: Date;
  updated_at: Date;
  created_by: string;
}

export interface CreateApiConfigRequest {
  name: string;
  description?: string;
  api_key: string;
  base_url?: string;
  gemini_model?: string;
  chatgpt_model?: string;
  sora_model?: string;
  gemini_enabled?: boolean;
  chatgpt_enabled?: boolean;
  sora_enabled?: boolean;
}

export interface UpdateApiConfigRequest extends Partial<CreateApiConfigRequest> {
  is_active?: boolean;
}

export interface PurchaseInfo {
  provider: {
    name: string;
    website: string;
    description: string;
  };
  models: Array<{
    name: string;
    tier: string;
    description: string;
    features: string[];
    recommended_for: string[];
  }>;
  purchase_links: {
    main: string;
    pricing: string;
    register: string;
    docs: string;
  };
  support: {
    email: string;
    qq: string;
    wechat: string;
  };
}

export interface SystemStatus {
  needs_initial_setup: boolean;
  has_active_config: boolean;
  encryption_test: boolean;
}

export interface ConnectionTestResult {
  success: boolean;
  data?: Record<string, { success: boolean; error?: string }>;
  message?: string;
}

interface ApiConfigState {
  // 状态数据
  configurations: ApiConfiguration[];
  activeConfiguration: ApiConfiguration | null;
  systemStatus: SystemStatus | null;
  purchaseInfo: PurchaseInfo | null;
  
  // UI状态
  isLoading: boolean;
  isTesting: boolean;
  isInitialSetup: boolean;
  error: string | null;
  
  // 操作状态
  operationInProgress: {
    create: boolean;
    update: boolean;
    delete: boolean;
    activate: boolean;
  };
  
  // 动作
  fetchSystemStatus: () => Promise<void>;
  fetchConfigurations: () => Promise<void>;
  fetchActiveConfiguration: () => Promise<void>;
  fetchPurchaseInfo: () => Promise<void>;
  createConfiguration: (config: CreateApiConfigRequest) => Promise<ApiConfiguration | null>;
  updateConfiguration: (id: string, updates: UpdateApiConfigRequest) => Promise<boolean>;
  activateConfiguration: (id: string) => Promise<boolean>;
  deleteConfiguration: (id: string) => Promise<boolean>;
  testConfiguration: (id: string) => Promise<ConnectionTestResult>;
  
  // 工具方法
  clearError: () => void;
  setError: (error: string) => void;
  getConfigurationById: (id: string) => ApiConfiguration | null;
  getModelStatus: (modelName: string) => { connected: boolean; error?: string };
  reset: () => void;
}

// API基础URL
const API_BASE_URL = '/api/config';

// HTTP请求工具函数
const apiRequest = async <T>(endpoint: string, options?: RequestInit): Promise<T> => {
  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    headers: {
      'Content-Type': 'application/json',
      ...options?.headers,
    },
    ...options,
  });

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({ error: 'Network error' }));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  const data = await response.json();
  if (!data.success) {
    throw new Error(data.error || 'Request failed');
  }

  return data.data || data;
};

export const useApiConfigStore = create<ApiConfigState>((set, get) => ({
  // 初始状态
  configurations: [],
  activeConfiguration: null,
  systemStatus: null,
  purchaseInfo: null,
  isLoading: false,
  isTesting: false,
  isInitialSetup: false,
  error: null,
  operationInProgress: {
    create: false,
    update: false,
    delete: false,
    activate: false,
  },

  // 获取系统状态
  fetchSystemStatus: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const status = await apiRequest<SystemStatus>('/status');
      
      set({ 
        systemStatus: status,
        isInitialSetup: status.needs_initial_setup,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch system status:', error);
      set({ 
        error: error instanceof Error ? error.message : '获取系统状态失败',
        isLoading: false 
      });
    }
  },

  // 获取所有配置
  fetchConfigurations: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const configurations = await apiRequest<ApiConfiguration[]>('/configurations');
      
      set({ 
        configurations,
        isLoading: false 
      });
    } catch (error) {
      console.error('Failed to fetch configurations:', error);
      set({ 
        error: error instanceof Error ? error.message : '获取配置列表失败',
        isLoading: false 
      });
    }
  },

  // 获取活动配置
  fetchActiveConfiguration: async () => {
    try {
      set({ isLoading: true, error: null });
      
      const activeConfig = await apiRequest<ApiConfiguration>('/active');
      
      set({ 
        activeConfiguration: activeConfig,
        isLoading: false 
      });
    } catch (error) {
      // 如果没有活动配置，这是正常的
      console.warn('No active configuration found:', error);
      set({ 
        activeConfiguration: null,
        isLoading: false 
      });
    }
  },

  // 获取购买信息
  fetchPurchaseInfo: async () => {
    try {
      const purchaseInfo = await apiRequest<PurchaseInfo>('/purchase-info');
      set({ purchaseInfo });
    } catch (error) {
      console.error('Failed to fetch purchase info:', error);
      // 购买信息获取失败不影响主要功能
    }
  },

  // 创建配置
  createConfiguration: async (config: CreateApiConfigRequest) => {
    try {
      set({ 
        operationInProgress: { ...get().operationInProgress, create: true },
        error: null 
      });

      const newConfig = await apiRequest<ApiConfiguration>('/configurations', {
        method: 'POST',
        body: JSON.stringify(config),
      });

      // 更新配置列表
      const currentConfigs = get().configurations;
      set({ 
        configurations: [...currentConfigs, newConfig],
        operationInProgress: { ...get().operationInProgress, create: false }
      });

      return newConfig;
    } catch (error) {
      console.error('Failed to create configuration:', error);
      set({ 
        error: error instanceof Error ? error.message : '创建配置失败',
        operationInProgress: { ...get().operationInProgress, create: false }
      });
      return null;
    }
  },

  // 更新配置
  updateConfiguration: async (id: string, updates: UpdateApiConfigRequest) => {
    try {
      set({ 
        operationInProgress: { ...get().operationInProgress, update: true },
        error: null 
      });

      const updatedConfig = await apiRequest<ApiConfiguration>(`/configurations/${id}`, {
        method: 'PUT',
        body: JSON.stringify(updates),
      });

      // 更新配置列表
      const currentConfigs = get().configurations;
      const updatedConfigs = currentConfigs.map(config => 
        config.id === id ? updatedConfig : config
      );

      set({ 
        configurations: updatedConfigs,
        operationInProgress: { ...get().operationInProgress, update: false }
      });

      // 如果更新的是活动配置，也更新活动配置状态
      if (updatedConfig.is_active) {
        set({ activeConfiguration: updatedConfig });
      }

      return true;
    } catch (error) {
      console.error('Failed to update configuration:', error);
      set({ 
        error: error instanceof Error ? error.message : '更新配置失败',
        operationInProgress: { ...get().operationInProgress, update: false }
      });
      return false;
    }
  },

  // 激活配置
  activateConfiguration: async (id: string) => {
    try {
      set({ 
        operationInProgress: { ...get().operationInProgress, activate: true },
        error: null 
      });

      await apiRequest(`/configurations/${id}/activate`, {
        method: 'POST',
      });

      // 刷新配置列表和活动配置
      await get().fetchConfigurations();
      await get().fetchActiveConfiguration();

      set({ 
        operationInProgress: { ...get().operationInProgress, activate: false }
      });

      return true;
    } catch (error) {
      console.error('Failed to activate configuration:', error);
      set({ 
        error: error instanceof Error ? error.message : '激活配置失败',
        operationInProgress: { ...get().operationInProgress, activate: false }
      });
      return false;
    }
  },

  // 删除配置
  deleteConfiguration: async (id: string) => {
    try {
      set({ 
        operationInProgress: { ...get().operationInProgress, delete: true },
        error: null 
      });

      await apiRequest(`/configurations/${id}`, {
        method: 'DELETE',
      });

      // 从列表中移除
      const currentConfigs = get().configurations;
      const filteredConfigs = currentConfigs.filter(config => config.id !== id);

      set({ 
        configurations: filteredConfigs,
        operationInProgress: { ...get().operationInProgress, delete: false }
      });

      return true;
    } catch (error) {
      console.error('Failed to delete configuration:', error);
      set({ 
        error: error instanceof Error ? error.message : '删除配置失败',
        operationInProgress: { ...get().operationInProgress, delete: false }
      });
      return false;
    }
  },

  // 测试配置连接
  testConfiguration: async (id: string) => {
    try {
      set({ isTesting: true, error: null });

      const result = await apiRequest<ConnectionTestResult>(`/configurations/${id}/test`, {
        method: 'POST',
      });

      // 更新配置的测试结果
      await get().fetchConfigurations();

      set({ isTesting: false });
      return result;
    } catch (error) {
      console.error('Failed to test configuration:', error);
      set({ 
        error: error instanceof Error ? error.message : '连接测试失败',
        isTesting: false 
      });
      return {
        success: false,
        message: error instanceof Error ? error.message : '连接测试失败'
      };
    }
  },

  // 工具方法
  clearError: () => set({ error: null }),
  
  setError: (error: string) => set({ error }),
  
  getConfigurationById: (id: string) => {
    return get().configurations.find(config => config.id === id) || null;
  },
  
  getModelStatus: (modelName: string) => {
    const activeConfig = get().activeConfiguration;
    if (!activeConfig || !activeConfig.connection_status) {
      return { connected: false, error: '无活动配置' };
    }
    
    return activeConfig.connection_status[modelName] || { 
      connected: false, 
      error: '模型状态未知' 
    };
  },
  
  reset: () => set({
    configurations: [],
    activeConfiguration: null,
    systemStatus: null,
    purchaseInfo: null,
    isLoading: false,
    isTesting: false,
    isInitialSetup: false,
    error: null,
    operationInProgress: {
      create: false,
      update: false,
      delete: false,
      activate: false,
    },
  }),
}));