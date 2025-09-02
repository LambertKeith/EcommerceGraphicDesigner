import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';
import { AppError, ErrorCode, ErrorUtils } from '../utils/errorSystem';

export const errorHandler = (
  error: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  // Convert to AppError if not already
  let appError: AppError;
  
  if (error instanceof AppError) {
    appError = error;
  } else {
    // Map common multer errors
    if (error.code === 'LIMIT_FILE_SIZE') {
      appError = ErrorUtils.createError(ErrorCode.E_INPUT_TOO_LARGE, {
        requestId: req.headers['x-request-id'],
        url: req.url,
        method: req.method
      });
    } else if (error.code === 'LIMIT_UNEXPECTED_FILE') {
      appError = ErrorUtils.createError(ErrorCode.E_BAD_REQUEST, {
        requestId: req.headers['x-request-id'],
        url: req.url,
        method: req.method,
        details: 'Unexpected file field'
      });
    } else {
      // Convert unknown errors with request context
      const requestContext = {
        requestId: req.headers['x-request-id'],
        url: req.url,
        method: req.method,
        userAgent: req.headers['user-agent']
      };
      
      appError = ErrorUtils.fromUnknown(error);
      
      // Create new AppError instance with combined context to avoid modifying readonly property
      appError = ErrorUtils.createError(appError.code, {
        ...appError.context,
        ...requestContext
      }, error instanceof Error ? error : undefined);
    }
  }

  // Log error with structured information
  const logInfo = appError.getLogInfo();
  console.error('Application Error:', {
    ...logInfo,
    request: {
      id: req.headers['x-request-id'],
      method: req.method,
      url: req.url,
      userAgent: req.headers['user-agent'],
      ip: req.ip
    }
  });

  // Create API response
  const response: ApiResponse = {
    success: false,
    error: appError.userMessage,
    data: {
      code: appError.code,
      actions: appError.actions,
      retryable: appError.retryable,
      timestamp: appError.timestamp.toISOString()
    }
  };

  // Set appropriate HTTP status and send response
  res.status(appError.httpStatus).json(response);
};

/**
 * Async error wrapper utility
 */
export const asyncHandler = (fn: Function) => {
  return (req: Request, res: Response, next: NextFunction) => {
    Promise.resolve(fn(req, res, next)).catch(next);
  };
};

/**
 * Create error response utility
 */
export const createErrorResponse = (
  code: ErrorCode, 
  context?: Record<string, any>
): ApiResponse => {
  const error = ErrorUtils.createError(code, context);
  return {
    success: false,
    error: error.userMessage,
    data: {
      code: error.code,
      actions: error.actions,
      retryable: error.retryable,
      timestamp: error.timestamp.toISOString()
    }
  };
};