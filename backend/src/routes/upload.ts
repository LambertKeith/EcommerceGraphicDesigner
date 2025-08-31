import { Router } from 'express';
import multer from 'multer';
import { fileStorage } from '../services/fileStorage';
import { ProjectModel, ImageModel } from '../models';
import { ApiResponse } from '../types';
import { getFileUrl } from '../utils/fileUtils';

const router = Router();
const upload = multer({ 
  storage: multer.memoryStorage(),
  limits: {
    fileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760') // 10MB
  }
});

const projectModel = new ProjectModel();
const imageModel = new ImageModel();

router.post('/', upload.single('image'), async (req, res, next) => {
  try {
    const file = req.file;
    const { project_name = 'Untitled Project', owner_id = 'anonymous' } = req.body;
    
    if (!file) {
      const response: ApiResponse = {
        success: false,
        error: 'No file provided'
      };
      return res.status(400).json(response);
    }

    if (!fileStorage.validateImageFile(file)) {
      const response: ApiResponse = {
        success: false,
        error: 'Invalid file type or size'
      };
      return res.status(400).json(response);
    }

    let project = await projectModel.create(project_name, owner_id);
    
    const savedFile = await fileStorage.saveUploadedFile(file);
    
    const image = await imageModel.create(
      project.id,
      savedFile.filePath,
      savedFile.width,
      savedFile.height,
      {
        originalName: file.originalname,
        mimeType: file.mimetype,
        size: savedFile.size
      }
    );

    const thumbnailPath = await fileStorage.generateThumbnail(savedFile.filePath);

    const response: ApiResponse = {
      success: true,
      data: {
        image_id: image.id,
        project_id: project.id,
        url: getFileUrl(req, savedFile.filePath),
        thumbnail_url: getFileUrl(req, thumbnailPath),
        width: savedFile.width,
        height: savedFile.height
      }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;