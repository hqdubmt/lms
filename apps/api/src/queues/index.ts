import { Queue } from 'bullmq';
import { createBullMQConnection } from '../services/redis';

const connection = createBullMQConnection();

export const emailQueue = new Queue('email', { connection });
export const videoQueue = new Queue('video', { connection });
export const notificationQueue = new Queue('notification', { connection });
export const aiQueue = new Queue('ai', { connection });
export const analyticsQueue = new Queue('analytics', { connection });
