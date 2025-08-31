import { Router } from 'express';
import { ImageModel } from '../models';
import { fileStorage } from '../services/fileStorage';
import { ApiResponse } from '../types';
import { getFileUrl } from '../utils/fileUtils';

const router = Router();
const imageModel = new ImageModel();

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const image = await imageModel.findById(id);
    
    if (!image) {
      const response: ApiResponse = {
        success: false,
        error: 'Image not found'
      };
      return res.status(404).json(response);
    }
    
    const response: ApiResponse = {
      success: true,
      data: {
        ...image,
        url: getFileUrl(req, image.path)
      }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.post('/:id/export', async (req, res, next) => {
  try {
    const { id } = req.params;
    const { format = 'jpg', width, height } = req.body;
    
    const image = await imageModel.findById(id);
    if (!image) {
      const response: ApiResponse = {
        success: false,
        error: 'Image not found'
      };
      return res.status(404).json(response);
    }

    const exportPath = await fileStorage.exportImage(
      image.path, 
      format, 
      width ? parseInt(width) : undefined, 
      height ? parseInt(height) : undefined
    );
    
    const response: ApiResponse = {
      success: true,
      data: {
        download_url: getFileUrl(req, exportPath),
        expires_at: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString() // 24 hours
      }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;