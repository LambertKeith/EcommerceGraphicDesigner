import { Request, Response, NextFunction } from 'express';
import { ApiResponse } from '../types';

export const errorHandler = (
  error: any, 
  req: Request, 
  res: Response, 
  next: NextFunction
): void => {
  console.error('Error:', error);

  const response: ApiResponse = {
    success: false,
    error: error.message || 'Internal server error'
  };

  if (error.code === 'LIMIT_FILE_SIZE') {
    response.error = 'File size too large';
    res.status(413).json(response);
    return;
  }

  if (error.code === 'LIMIT_UNEXPECTED_FILE') {
    response.error = 'Unexpected file field';
    res.status(400).json(response);
    return;
  }

  const statusCode = error.statusCode || error.status || 500;
  res.status(statusCode).json(response);
};