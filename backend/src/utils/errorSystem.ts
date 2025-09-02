/**
 * Standardized Error Codes and User-Friendly Error Mapping
 * 
 * This module provides a centralized error handling system with:
 * - Standardized error codes
 * - User-friendly error messages
 * - Logging and monitoring support
 * - Multi-language support preparation
 */

export enum ErrorCode {
  // AI Model Errors
  E_AI_MODEL_UNAVAILABLE = 'E_AI_MODEL_UNAVAILABLE',
  E_AI_MODEL_RATE_LIMITED = 'E_AI_MODEL_RATE_LIMITED',
  E_AI_MODEL_TIMEOUT = 'E_AI_MODEL_TIMEOUT',
  E_AI_MODEL_INVALID_RESPONSE = 'E_AI_MODEL_INVALID_RESPONSE',
  E_AI_ALL_MODELS_FAILED = 'E_AI_ALL_MODELS_FAILED',

  // Input Validation Errors
  E_INPUT_TOO_LARGE = 'E_INPUT_TOO_LARGE',
  E_INPUT_INVALID_FORMAT = 'E_INPUT_INVALID_FORMAT',
  E_INPUT_CORRUPTED = 'E_INPUT_CORRUPTED',
  E_PROMPT_INVALID = 'E_PROMPT_INVALID',
  E_PROMPT_TOO_LONG = 'E_PROMPT_TOO_LONG',

  // File and Storage Errors
  E_STORAGE_IO = 'E_STORAGE_IO',
  E_STORAGE_QUOTA_EXCEEDED = 'E_STORAGE_QUOTA_EXCEEDED',
  E_FILE_NOT_FOUND = 'E_FILE_NOT_FOUND',
  E_INVALID_FILE_TYPE = 'E_INVALID_FILE_TYPE',
  E_FILE_CORRUPTED = 'E_FILE_CORRUPTED',
  E_MALICIOUS_FILE_DETECTED = 'E_MALICIOUS_FILE_DETECTED',

  // Processing Errors
  E_PROCESSING_FAILED = 'E_PROCESSING_FAILED',
  E_PROCESSING_TIMEOUT = 'E_PROCESSING_TIMEOUT',
  E_PROCESSING_CANCELLED = 'E_PROCESSING_CANCELLED',
  E_IMAGE_PROCESSING_FAILED = 'E_IMAGE_PROCESSING_FAILED',

  // Resource Errors
  E_SESSION_NOT_FOUND = 'E_SESSION_NOT_FOUND',
  E_SESSION_EXPIRED = 'E_SESSION_EXPIRED',
  E_PROJECT_NOT_FOUND = 'E_PROJECT_NOT_FOUND',
  E_IMAGE_NOT_FOUND = 'E_IMAGE_NOT_FOUND',
  E_JOB_NOT_FOUND = 'E_JOB_NOT_FOUND',
  E_VARIANT_NOT_FOUND = 'E_VARIANT_NOT_FOUND',

  // Rate Limiting and Quota
  E_RATE_LIMITED = 'E_RATE_LIMITED',
  E_QUOTA_EXCEEDED = 'E_QUOTA_EXCEEDED',
  E_CONCURRENT_LIMIT = 'E_CONCURRENT_LIMIT',

  // Authentication and Authorization
  E_AUTH_REQUIRED = 'E_AUTH_REQUIRED',
  E_AUTH_INVALID = 'E_AUTH_INVALID',
  E_PERMISSION_DENIED = 'E_PERMISSION_DENIED',

  // System Errors
  E_INTERNAL_ERROR = 'E_INTERNAL_ERROR',
  E_DATABASE_ERROR = 'E_DATABASE_ERROR',
  E_NETWORK_ERROR = 'E_NETWORK_ERROR',
  E_SERVICE_UNAVAILABLE = 'E_SERVICE_UNAVAILABLE',

  // Request Errors
  E_BAD_REQUEST = 'E_BAD_REQUEST',
  E_INVALID_PARAMETER = 'E_INVALID_PARAMETER',
  E_MISSING_PARAMETER = 'E_MISSING_PARAMETER',
  E_IDEMPOTENCY_CONFLICT = 'E_IDEMPOTENCY_CONFLICT',
}

export interface ErrorDetails {
  code: ErrorCode;
  message: string;
  userMessage: string;
  httpStatus: number;
  retryable: boolean;
  category: 'user' | 'system' | 'external' | 'temporary';
  actions?: string[];
}

/**
 * Error definitions with user-friendly messages and metadata
 */
export const ERROR_DEFINITIONS: Record<ErrorCode, ErrorDetails> = {
  // AI Model Errors
  [ErrorCode.E_AI_MODEL_UNAVAILABLE]: {
    code: ErrorCode.E_AI_MODEL_UNAVAILABLE,
    message: 'The requested AI model is currently unavailable',
    userMessage: '所选AI模型暂时不可用，系统正在尝试其他模型处理您的请求',
    httpStatus: 503,
    retryable: true,
    category: 'external',
    actions: ['使用其他AI模型', '稍后重试']
  },

  [ErrorCode.E_AI_MODEL_RATE_LIMITED]: {
    code: ErrorCode.E_AI_MODEL_RATE_LIMITED,
    message: 'AI model rate limit exceeded',
    userMessage: 'AI模型使用频率超限，已自动切换到其他可用模型',
    httpStatus: 429,
    retryable: true,
    category: 'external',
    actions: ['稍后重试', '使用其他模型']
  },

  [ErrorCode.E_AI_MODEL_TIMEOUT]: {
    code: ErrorCode.E_AI_MODEL_TIMEOUT,
    message: 'AI model processing timeout',
    userMessage: 'AI处理超时，请尝试简化图片或重新处理',
    httpStatus: 408,
    retryable: true,
    category: 'external',
    actions: ['减小图片尺寸', '重新上传', '简化处理要求']
  },

  [ErrorCode.E_AI_ALL_MODELS_FAILED]: {
    code: ErrorCode.E_AI_ALL_MODELS_FAILED,
    message: 'All AI models failed to process the request',
    userMessage: '所有AI模型都无法处理此请求，请检查图片格式或稍后重试',
    httpStatus: 503,
    retryable: true,
    category: 'external',
    actions: ['检查图片格式', '稍后重试', '联系技术支持']
  },

  // Input Validation Errors
  [ErrorCode.E_INPUT_TOO_LARGE]: {
    code: ErrorCode.E_INPUT_TOO_LARGE,
    message: 'Input file size exceeds maximum allowed limit',
    userMessage: '图片过大，请压缩后再试。最大支持10MB',
    httpStatus: 413,
    retryable: false,
    category: 'user',
    actions: ['压缩图片', '选择更小的文件']
  },

  [ErrorCode.E_INPUT_INVALID_FORMAT]: {
    code: ErrorCode.E_INPUT_INVALID_FORMAT,
    message: 'Invalid input file format',
    userMessage: '图片格式不支持，请使用JPG、PNG、WebP格式',
    httpStatus: 400,
    retryable: false,
    category: 'user',
    actions: ['转换为JPG/PNG格式', '选择其他图片']
  },

  [ErrorCode.E_INPUT_CORRUPTED]: {
    code: ErrorCode.E_INPUT_CORRUPTED,
    message: 'Input file is corrupted or unreadable',
    userMessage: '图片文件损坏或无法读取，请重新上传',
    httpStatus: 400,
    retryable: false,
    category: 'user',
    actions: ['重新上传', '选择其他图片']
  },

  [ErrorCode.E_PROMPT_INVALID]: {
    code: ErrorCode.E_PROMPT_INVALID,
    message: 'Invalid or inappropriate prompt content',
    userMessage: '提示内容不合规，请调整后重试',
    httpStatus: 400,
    retryable: false,
    category: 'user',
    actions: ['修改提示内容', '使用预设模板']
  },

  // File and Storage Errors
  [ErrorCode.E_STORAGE_IO]: {
    code: ErrorCode.E_STORAGE_IO,
    message: 'Storage input/output error',
    userMessage: '文件存储出现问题，请稍后重试',
    httpStatus: 500,
    retryable: true,
    category: 'system',
    actions: ['稍后重试', '联系技术支持']
  },

  [ErrorCode.E_INVALID_FILE_TYPE]: {
    code: ErrorCode.E_INVALID_FILE_TYPE,
    message: 'Invalid file type uploaded',
    userMessage: '文件类型不正确，仅支持图片文件',
    httpStatus: 400,
    retryable: false,
    category: 'user',
    actions: ['上传图片文件', '检查文件格式']
  },

  [ErrorCode.E_MALICIOUS_FILE_DETECTED]: {
    code: ErrorCode.E_MALICIOUS_FILE_DETECTED,
    message: 'Potentially malicious file detected',
    userMessage: '检测到可疑文件，上传被拒绝',
    httpStatus: 400,
    retryable: false,
    category: 'user',
    actions: ['上传正常图片文件', '检查文件来源']
  },

  // Processing Errors
  [ErrorCode.E_PROCESSING_FAILED]: {
    code: ErrorCode.E_PROCESSING_FAILED,
    message: 'Image processing failed',
    userMessage: '图片处理失败，请重试或选择其他图片',
    httpStatus: 500,
    retryable: true,
    category: 'system',
    actions: ['重试处理', '简化处理要求', '选择其他图片']
  },

  [ErrorCode.E_PROCESSING_TIMEOUT]: {
    code: ErrorCode.E_PROCESSING_TIMEOUT,
    message: 'Processing timeout exceeded',
    userMessage: '处理超时，图片可能过于复杂，请尝试简化',
    httpStatus: 408,
    retryable: true,
    category: 'temporary',
    actions: ['减小图片尺寸', '简化处理要求', '稍后重试']
  },

  // Resource Errors
  [ErrorCode.E_SESSION_NOT_FOUND]: {
    code: ErrorCode.E_SESSION_NOT_FOUND,
    message: 'Session not found or expired',
    userMessage: '会话已过期，请重新开始',
    httpStatus: 404,
    retryable: false,
    category: 'user',
    actions: ['重新上传图片', '创建新项目']
  },

  [ErrorCode.E_PROJECT_NOT_FOUND]: {
    code: ErrorCode.E_PROJECT_NOT_FOUND,
    message: 'Project not found',
    userMessage: '项目不存在或已被删除',
    httpStatus: 404,
    retryable: false,
    category: 'user',
    actions: ['检查项目ID', '返回项目列表']
  },

  [ErrorCode.E_IMAGE_NOT_FOUND]: {
    code: ErrorCode.E_IMAGE_NOT_FOUND,
    message: 'Image not found',
    userMessage: '图片不存在或已被删除',
    httpStatus: 404,
    retryable: false,
    category: 'user',
    actions: ['重新上传图片', '检查图片ID']
  },

  [ErrorCode.E_JOB_NOT_FOUND]: {
    code: ErrorCode.E_JOB_NOT_FOUND,
    message: 'Job not found',
    userMessage: '处理任务不存在',
    httpStatus: 404,
    retryable: false,
    category: 'user',
    actions: ['检查任务ID', '重新开始处理']
  },

  // Rate Limiting
  [ErrorCode.E_RATE_LIMITED]: {
    code: ErrorCode.E_RATE_LIMITED,
    message: 'Rate limit exceeded',
    userMessage: '操作过于频繁，请稍后再试',
    httpStatus: 429,
    retryable: true,
    category: 'user',
    actions: ['等待一段时间', '减少操作频率']
  },

  [ErrorCode.E_CONCURRENT_LIMIT]: {
    code: ErrorCode.E_CONCURRENT_LIMIT,
    message: 'Concurrent processing limit exceeded',
    userMessage: '同时处理的任务过多，请等待其他任务完成',
    httpStatus: 429,
    retryable: true,
    category: 'user',
    actions: ['等待任务完成', '减少同时处理数量']
  },

  // System Errors
  [ErrorCode.E_INTERNAL_ERROR]: {
    code: ErrorCode.E_INTERNAL_ERROR,
    message: 'Internal server error',
    userMessage: '服务器内部错误，我们正在修复中',
    httpStatus: 500,
    retryable: true,
    category: 'system',
    actions: ['稍后重试', '联系技术支持']
  },

  [ErrorCode.E_DATABASE_ERROR]: {
    code: ErrorCode.E_DATABASE_ERROR,
    message: 'Database operation failed',
    userMessage: '数据库连接异常，请稍后重试',
    httpStatus: 500,
    retryable: true,
    category: 'system',
    actions: ['稍后重试', '联系技术支持']
  },

  [ErrorCode.E_SERVICE_UNAVAILABLE]: {
    code: ErrorCode.E_SERVICE_UNAVAILABLE,
    message: 'Service temporarily unavailable',
    userMessage: '服务暂时不可用，请稍后重试',
    httpStatus: 503,
    retryable: true,
    category: 'system',
    actions: ['稍后重试', '检查系统状态']
  },

  // Request Errors
  [ErrorCode.E_BAD_REQUEST]: {
    code: ErrorCode.E_BAD_REQUEST,
    message: 'Bad request format or parameters',
    userMessage: '请求格式错误，请检查输入信息',
    httpStatus: 400,
    retryable: false,
    category: 'user',
    actions: ['检查输入格式', '参考API文档']
  },

  [ErrorCode.E_MISSING_PARAMETER]: {
    code: ErrorCode.E_MISSING_PARAMETER,
    message: 'Required parameter is missing',
    userMessage: '缺少必要参数，请补充完整信息',
    httpStatus: 400,
    retryable: false,
    category: 'user',
    actions: ['补充必要信息', '检查输入完整性']
  },

  // Default fallbacks for any missing definitions
  [ErrorCode.E_AUTH_REQUIRED]: {
    code: ErrorCode.E_AUTH_REQUIRED,
    message: 'Authentication required',
    userMessage: '需要登录认证',
    httpStatus: 401,
    retryable: false,
    category: 'user',
    actions: ['登录账户']
  },

  [ErrorCode.E_AUTH_INVALID]: {
    code: ErrorCode.E_AUTH_INVALID,
    message: 'Invalid authentication credentials',
    userMessage: '认证信息无效',
    httpStatus: 401,
    retryable: false,
    category: 'user',
    actions: ['重新登录']
  },

  [ErrorCode.E_PERMISSION_DENIED]: {
    code: ErrorCode.E_PERMISSION_DENIED,
    message: 'Permission denied',
    userMessage: '权限不足',
    httpStatus: 403,
    retryable: false,
    category: 'user',
    actions: ['联系管理员']
  },

  [ErrorCode.E_STORAGE_QUOTA_EXCEEDED]: {
    code: ErrorCode.E_STORAGE_QUOTA_EXCEEDED,
    message: 'Storage quota exceeded',
    userMessage: '存储空间不足',
    httpStatus: 413,
    retryable: false,
    category: 'user',
    actions: ['清理存储空间', '升级套餐']
  },

  [ErrorCode.E_QUOTA_EXCEEDED]: {
    code: ErrorCode.E_QUOTA_EXCEEDED,
    message: 'Usage quota exceeded',
    userMessage: '使用额度已用完',
    httpStatus: 429,
    retryable: false,
    category: 'user',
    actions: ['升级套餐', '等待额度重置']
  },

  [ErrorCode.E_NETWORK_ERROR]: {
    code: ErrorCode.E_NETWORK_ERROR,
    message: 'Network error occurred',
    userMessage: '网络连接异常',
    httpStatus: 502,
    retryable: true,
    category: 'temporary',
    actions: ['检查网络连接', '稍后重试']
  },

  [ErrorCode.E_PROMPT_TOO_LONG]: {
    code: ErrorCode.E_PROMPT_TOO_LONG,
    message: 'Prompt text is too long',
    userMessage: '提示文本过长，请简化描述',
    httpStatus: 400,
    retryable: false,
    category: 'user',
    actions: ['缩短提示文本', '使用简洁表达']
  },

  [ErrorCode.E_FILE_NOT_FOUND]: {
    code: ErrorCode.E_FILE_NOT_FOUND,
    message: 'File not found',
    userMessage: '文件不存在',
    httpStatus: 404,
    retryable: false,
    category: 'user',
    actions: ['检查文件路径', '重新上传']
  },

  [ErrorCode.E_FILE_CORRUPTED]: {
    code: ErrorCode.E_FILE_CORRUPTED,
    message: 'File is corrupted',
    userMessage: '文件已损坏',
    httpStatus: 400,
    retryable: false,
    category: 'user',
    actions: ['重新上传', '选择其他文件']
  },

  [ErrorCode.E_PROCESSING_CANCELLED]: {
    code: ErrorCode.E_PROCESSING_CANCELLED,
    message: 'Processing was cancelled',
    userMessage: '处理已取消',
    httpStatus: 409,
    retryable: true,
    category: 'user',
    actions: ['重新开始处理']
  },

  [ErrorCode.E_IMAGE_PROCESSING_FAILED]: {
    code: ErrorCode.E_IMAGE_PROCESSING_FAILED,
    message: 'Image processing operation failed',
    userMessage: '图片处理操作失败',
    httpStatus: 500,
    retryable: true,
    category: 'system',
    actions: ['重试处理', '选择其他图片']
  },

  [ErrorCode.E_SESSION_EXPIRED]: {
    code: ErrorCode.E_SESSION_EXPIRED,
    message: 'Session has expired',
    userMessage: '会话已过期',
    httpStatus: 401,
    retryable: false,
    category: 'user',
    actions: ['重新开始', '刷新页面']
  },

  [ErrorCode.E_VARIANT_NOT_FOUND]: {
    code: ErrorCode.E_VARIANT_NOT_FOUND,
    message: 'Variant not found',
    userMessage: '图片变体不存在',
    httpStatus: 404,
    retryable: false,
    category: 'user',
    actions: ['检查变体ID', '重新生成']
  },

  [ErrorCode.E_INVALID_PARAMETER]: {
    code: ErrorCode.E_INVALID_PARAMETER,
    message: 'Invalid parameter value',
    userMessage: '参数值无效',
    httpStatus: 400,
    retryable: false,
    category: 'user',
    actions: ['检查参数格式', '使用有效值']
  },

  [ErrorCode.E_IDEMPOTENCY_CONFLICT]: {
    code: ErrorCode.E_IDEMPOTENCY_CONFLICT,
    message: 'Idempotency key conflict',
    userMessage: '重复操作检测冲突',
    httpStatus: 409,
    retryable: false,
    category: 'user',
    actions: ['使用新的操作', '检查请求状态']
  },

  [ErrorCode.E_AI_MODEL_INVALID_RESPONSE]: {
    code: ErrorCode.E_AI_MODEL_INVALID_RESPONSE,
    message: 'AI model returned invalid response',
    userMessage: 'AI模型响应异常，正在重试',
    httpStatus: 502,
    retryable: true,
    category: 'external',
    actions: ['稍后重试', '使用其他模型']
  }
};

/**
 * Application Error class for structured error handling
 */
export class AppError extends Error {
  public readonly code: ErrorCode;
  public readonly userMessage: string;
  public readonly httpStatus: number;
  public readonly retryable: boolean;
  public readonly category: string;
  public readonly actions: string[];
  public readonly context?: Record<string, any>;
  public readonly timestamp: Date;
  public readonly originalError?: Error;

  constructor(
    code: ErrorCode,
    context?: Record<string, any>,
    originalError?: Error
  ) {
    const errorDef = ERROR_DEFINITIONS[code];
    super(errorDef.message);
    
    this.name = 'AppError';
    this.code = code;
    this.userMessage = errorDef.userMessage;
    this.httpStatus = errorDef.httpStatus;
    this.retryable = errorDef.retryable;
    this.category = errorDef.category;
    this.actions = errorDef.actions || [];
    this.context = context;
    this.timestamp = new Date();
    this.originalError = originalError;

    if (originalError) {
      this.stack = originalError.stack;
    }

    // Capture stack trace
    Error.captureStackTrace(this, AppError);
  }

  /**
   * Convert error to JSON for API responses
   */
  toJSON() {
    return {
      success: false,
      error: {
        code: this.code,
        message: this.userMessage,
        actions: this.actions,
        retryable: this.retryable,
        timestamp: this.timestamp.toISOString(),
        context: this.context
      }
    };
  }

  /**
   * Get logging information
   */
  getLogInfo() {
    return {
      code: this.code,
      message: this.message,
      userMessage: this.userMessage,
      httpStatus: this.httpStatus,
      category: this.category,
      retryable: this.retryable,
      context: this.context,
      timestamp: this.timestamp.toISOString(),
      stack: this.stack
    };
  }
}

/**
 * Error utilities
 */
export class ErrorUtils {
  /**
   * Create an AppError from an error code
   */
  static createError(code: ErrorCode, context?: Record<string, any>, originalError?: Error): AppError {
    return new AppError(code, context, originalError);
  }

  /**
   * Convert unknown error to AppError
   */
  static fromUnknown(error: unknown, fallbackCode: ErrorCode = ErrorCode.E_INTERNAL_ERROR): AppError {
    if (error instanceof AppError) {
      return error;
    }

    if (error instanceof Error) {
      // Try to map common errors
      if (error.message.includes('timeout')) {
        return new AppError(ErrorCode.E_PROCESSING_TIMEOUT, { originalError: error.message }, error);
      }
      if (error.message.includes('rate limit')) {
        return new AppError(ErrorCode.E_RATE_LIMITED, { originalError: error.message }, error);
      }
      if (error.message.includes('not found')) {
        return new AppError(ErrorCode.E_FILE_NOT_FOUND, { originalError: error.message }, error);
      }

      return new AppError(fallbackCode, { originalError: error.message }, error);
    }

    return new AppError(fallbackCode, { originalError: String(error) });
  }

  /**
   * Get user-friendly error message
   */
  static getUserMessage(code: ErrorCode): string {
    return ERROR_DEFINITIONS[code]?.userMessage || '发生未知错误，请稍后重试';
  }

  /**
   * Check if error is retryable
   */
  static isRetryable(error: AppError | ErrorCode): boolean {
    if (error instanceof AppError) {
      return error.retryable;
    }
    return ERROR_DEFINITIONS[error]?.retryable || false;
  }

  /**
   * Get suggested actions for an error
   */
  static getActions(code: ErrorCode): string[] {
    return ERROR_DEFINITIONS[code]?.actions || ['稍后重试', '联系技术支持'];
  }
}

export default {
  ErrorCode,
  ERROR_DEFINITIONS,
  AppError,
  ErrorUtils
};