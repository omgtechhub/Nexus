import { Router } from 'express';
import { getPlans, getPlanByCode } from '../controllers/plans.controller.js';

export const plansRouter = Router();

plansRouter.get('/', getPlans);
plansRouter.get('/:code', getPlanByCode);
