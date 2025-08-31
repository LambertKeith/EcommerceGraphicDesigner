import path from 'path';

export const createStaticPath = (relativePath: string): string => {
  return `/static${relativePath}`;
};

export const validateFilePath = (filePath: string): boolean => {
  const normalizedPath = path.normalize(filePath);
  return !normalizedPath.includes('..');
};

export const getFileUrl = (req: any, relativePath: string): string => {
  const protocol = req.protocol;
  const host = req.get('host');
  return `${protocol}://${host}/static${relativePath}`;
};