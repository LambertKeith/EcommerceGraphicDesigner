import { Router } from 'express';
import { SessionModel } from '../models';
import { ApiResponse } from '../types';

const router = Router();
const sessionModel = new SessionModel();

router.post('/', async (req, res, next) => {
  try {
    const { project_id, context } = req.body;
    
    if (!project_id) {
      const response: ApiResponse = {
        success: false,
        error: 'project_id is required'
      };
      return res.status(400).json(response);
    }

    const session = await sessionModel.create(project_id, context || {});
    
    const response: ApiResponse = {
      success: true,
      data: { session_id: session.id }
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

router.get('/:id', async (req, res, next) => {
  try {
    const { id } = req.params;
    const session = await sessionModel.findById(id);
    
    if (!session) {
      const response: ApiResponse = {
        success: false,
        error: 'Session not found'
      };
      return res.status(404).json(response);
    }
    
    const response: ApiResponse = {
      success: true,
      data: session
    };
    
    res.json(response);
  } catch (error) {
    next(error);
  }
});

export default router;