import fs from 'fs/promises';
import path from 'path';
import sharp from 'sharp';
import { v4 as uuidv4 } from 'uuid';

export class FileStorageService {
  private uploadsDir: string;
  private resultsDir: string;
  private thumbnailsDir: string;
  private exportsDir: string;

  constructor() {
    this.uploadsDir = path.resolve(process.env.UPLOAD_DIR || '../storage/uploads');
    this.resultsDir = path.resolve(process.env.RESULTS_DIR || '../storage/results');
    this.thumbnailsDir = path.resolve(process.env.THUMBNAILS_DIR || '../storage/thumbnails');
    this.exportsDir = path.resolve(process.env.EXPORTS_DIR || '../storage/exports');
  }

  async init(): Promise<void> {
    await Promise.all([
      this.ensureDirectory(this.uploadsDir),
      this.ensureDirectory(this.resultsDir),
      this.ensureDirectory(this.thumbnailsDir),
      this.ensureDirectory(this.exportsDir),
    ]);
  }

  private async ensureDirectory(dirPath: string): Promise<void> {
    try {
      await fs.access(dirPath);
    } catch {
      await fs.mkdir(dirPath, { recursive: true });
    }
  }

  async saveUploadedFile(file: Express.Multer.File): Promise<{
    filePath: string;
    filename: string;
    width: number;
    height: number;
    size: number;
  }> {
    // Process and validate the image (includes EXIF stripping and resizing)
    const processed = await this.processAndValidateImage(file);
    
    if (!processed.success || !processed.processedBuffer || !processed.metadata) {
      throw new Error(processed.error || 'Failed to process image');
    }

    // Generate filename with appropriate extension
    const extension = processed.metadata.format === 'jpeg' ? 'jpg' : 
                     processed.metadata.format || this.getFileExtension(file.originalname);
    const filename = `${uuidv4()}.${extension}`;
    const filePath = path.join(this.uploadsDir, filename);
    
    // Save the processed image buffer
    await fs.writeFile(filePath, processed.processedBuffer);
    
    return {
      filePath: filePath.replace(path.resolve('../storage'), ''),
      filename,
      width: processed.metadata.width,
      height: processed.metadata.height,
      size: processed.metadata.size
    };
  }

  async saveResultImage(imageBuffer: Buffer, originalFilename: string): Promise<{
    filePath: string;
    filename: string;
    width: number;
    height: number;
  }> {
    const filename = `${uuidv4()}.${this.getFileExtension(originalFilename)}`;
    const filePath = path.join(this.resultsDir, filename);
    
    await fs.writeFile(filePath, imageBuffer);
    
    const metadata = await sharp(filePath).metadata();
    
    return {
      filePath: filePath.replace(path.resolve('../storage'), ''),
      filename,
      width: metadata.width || 0,
      height: metadata.height || 0
    };
  }

  async generateThumbnail(imagePath: string, maxWidth: number = 300, maxHeight: number = 300): Promise<string> {
    const fullPath = path.resolve('../storage', imagePath.replace(/^\//, ''));
    const filename = `thumb_${uuidv4()}.jpg`;
    const thumbnailPath = path.join(this.thumbnailsDir, filename);
    
    await sharp(fullPath)
      .resize(maxWidth, maxHeight, {
        fit: 'inside',
        withoutEnlargement: true
      })
      .jpeg({ quality: 80 })
      .toFile(thumbnailPath);
    
    return thumbnailPath.replace(path.resolve('../storage'), '');
  }

  async exportImage(imagePath: string, format: 'jpg' | 'png' | 'webp' = 'jpg', width?: number, height?: number): Promise<string> {
    const fullPath = path.resolve('../storage', imagePath.replace(/^\//, ''));
    const filename = `export_${uuidv4()}.${format}`;
    const exportPath = path.join(this.exportsDir, filename);
    
    let pipeline = sharp(fullPath);
    
    if (width || height) {
      pipeline = pipeline.resize(width, height, {
        fit: 'cover',
        position: 'center'
      });
    }
    
    switch (format) {
      case 'jpg':
        pipeline = pipeline.jpeg({ quality: 95 });
        break;
      case 'png':
        pipeline = pipeline.png({ quality: 95 });
        break;
      case 'webp':
        pipeline = pipeline.webp({ quality: 95 });
        break;
    }
    
    await pipeline.toFile(exportPath);
    
    return exportPath.replace(path.resolve('../storage'), '');
  }

  async deleteFile(filePath: string): Promise<void> {
    const fullPath = path.resolve('../storage', filePath.replace(/^\//, ''));
    try {
      await fs.unlink(fullPath);
    } catch (error) {
      console.error(`Failed to delete file ${fullPath}:`, error);
    }
  }

  async cleanupExpiredFiles(directory: 'exports', maxAgeHours: number = 24): Promise<void> {
    const dirPath = directory === 'exports' ? this.exportsDir : '';
    if (!dirPath) return;
    
    try {
      const files = await fs.readdir(dirPath);
      const now = new Date();
      
      for (const file of files) {
        const filePath = path.join(dirPath, file);
        const stat = await fs.stat(filePath);
        const ageHours = (now.getTime() - stat.mtime.getTime()) / (1000 * 60 * 60);
        
        if (ageHours > maxAgeHours) {
          await fs.unlink(filePath);
          console.log(`Cleaned up expired file: ${file}`);
        }
      }
    } catch (error) {
      console.error(`Failed to cleanup ${directory}:`, error);
    }
  }

  private getFileExtension(filename: string): string {
    return filename.split('.').pop()?.toLowerCase() || 'jpg';
  }

  getFullPath(relativePath: string): string {
    return path.resolve('../storage', relativePath.replace(/^\//, ''));
  }

  validateImageFile(file: Express.Multer.File): { valid: boolean; error?: string } {
    // Check MIME type
    const allowedMimeTypes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowedMimeTypes.includes(file.mimetype.toLowerCase())) {
      return {
        valid: false,
        error: `Invalid file type: ${file.mimetype}. Allowed types: ${allowedMimeTypes.join(', ')}`
      };
    }

    // Check file size
    const maxSize = parseInt(process.env.MAX_FILE_SIZE || '10485760'); // 10MB default
    if (file.size > maxSize) {
      return {
        valid: false,
        error: `File size ${Math.round(file.size / 1024 / 1024)}MB exceeds maximum allowed size ${Math.round(maxSize / 1024 / 1024)}MB`
      };
    }

    // Check file extension matches MIME type
    const extension = this.getFileExtension(file.originalname);
    const expectedExtensions: Record<string, string[]> = {
      'image/jpeg': ['jpg', 'jpeg'],
      'image/jpg': ['jpg', 'jpeg'],
      'image/png': ['png'],
      'image/webp': ['webp'],
      'image/gif': ['gif']
    };

    const validExtensions = expectedExtensions[file.mimetype.toLowerCase()];
    if (!validExtensions?.includes(extension)) {
      return {
        valid: false,
        error: `File extension '${extension}' does not match MIME type '${file.mimetype}'`
      };
    }

    // Basic malicious file detection by filename
    const suspiciousPatterns = [
      /\.php$/i, /\.js$/i, /\.html$/i, /\.htm$/i, /\.asp$/i, /\.aspx$/i,
      /\.jsp$/i, /\.py$/i, /\.rb$/i, /\.exe$/i, /\.bat$/i, /\.sh$/i,
      /\.scr$/i, /\.com$/i, /\.pif$/i, /\.vbs$/i, /\.jar$/i
    ];

    for (const pattern of suspiciousPatterns) {
      if (pattern.test(file.originalname)) {
        return {
          valid: false,
          error: `Suspicious file extension detected in filename: ${file.originalname}`
        };
      }
    }

    // Check for null bytes in filename (path traversal attempt)
    if (file.originalname.includes('\0') || file.originalname.includes('..')) {
      return {
        valid: false,
        error: 'Invalid characters detected in filename'
      };
    }

    return { valid: true };
  }

  // Enhanced file processing with EXIF stripping and size limits
  async processAndValidateImage(file: Express.Multer.File): Promise<{
    success: boolean;
    processedBuffer?: Buffer;
    metadata?: {
      width: number;
      height: number;
      format: string;
      size: number;
    };
    error?: string;
  }> {
    try {
      // Create sharp instance from buffer
      const image = sharp(file.buffer);
      const metadata = await image.metadata();

      if (!metadata.width || !metadata.height) {
        return {
          success: false,
          error: 'Invalid image: Could not read image dimensions'
        };
      }

      // Check image dimensions
      const maxDimension = parseInt(process.env.MAX_IMAGE_DIMENSION || '4096');
      if (metadata.width > maxDimension || metadata.height > maxDimension) {
        // Auto-resize large images
        const aspectRatio = metadata.width / metadata.height;
        let newWidth: number;
        let newHeight: number;

        if (metadata.width > metadata.height) {
          newWidth = maxDimension;
          newHeight = Math.round(maxDimension / aspectRatio);
        } else {
          newHeight = maxDimension;
          newWidth = Math.round(maxDimension * aspectRatio);
        }

        console.log(`Resizing image from ${metadata.width}x${metadata.height} to ${newWidth}x${newHeight}`);

        const processedBuffer = await image
          .resize(newWidth, newHeight, {
            fit: 'inside',
            withoutEnlargement: false
          })
          .withMetadata({}) // Strip EXIF data
          .jpeg({ quality: 85 }) // Convert to JPEG for consistency
          .toBuffer();

        return {
          success: true,
          processedBuffer,
          metadata: {
            width: newWidth,
            height: newHeight,
            format: 'jpeg',
            size: processedBuffer.length
          }
        };
      }

      // For normal-sized images, just strip EXIF and standardize
      const processedBuffer = await image
        .withMetadata({}) // Strip EXIF data and other metadata
        .toBuffer();

      return {
        success: true,
        processedBuffer,
        metadata: {
          width: metadata.width,
          height: metadata.height,
          format: metadata.format || 'unknown',
          size: processedBuffer.length
        }
      };
    } catch (error) {
      return {
        success: false,
        error: `Failed to process image: ${error instanceof Error ? error.message : 'Unknown error'}`
      };
    }
  }
}

export const fileStorage = new FileStorageService();