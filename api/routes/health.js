// api/routes/health.js
import express from 'express';
import { dbHealth } from '../controllers/healthController.js';

const router = express.Router();

router.get('/db', dbHealth);

export default router;
