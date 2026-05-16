import mongoose from 'mongoose';
import { env } from '../config/env';

export async function connectMongo() {
  await mongoose.connect(env.MONGODB_URL);
  console.log('MongoDB connected');
}

// Message schema
const messageSchema = new mongoose.Schema({
  roomId: { type: String, required: true, index: true },
  userId: { type: String, required: true },
  userName: { type: String, required: true },
  avatarUrl: String,
  content: { type: String, required: true },
  type: { type: String, enum: ['text', 'image', 'file'], default: 'text' },
  fileUrl: String,
  createdAt: { type: Date, default: Date.now },
});

// Activity log schema
const activityLogSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  action: { type: String, required: true },
  resource: String,
  resourceId: String,
  metadata: mongoose.Schema.Types.Mixed,
  createdAt: { type: Date, default: Date.now },
});

// AI memory schema
const aiMemorySchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  context: [{ role: String, content: String }],
  summary: String,
  updatedAt: { type: Date, default: Date.now },
});

// Video analytics schema
const videoAnalyticsSchema = new mongoose.Schema({
  lessonId: { type: String, required: true },
  userId: { type: String, required: true },
  watchSegments: [{ start: Number, end: Number }],
  totalWatched: { type: Number, default: 0 },
  lastPosition: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

export const Message = mongoose.model('Message', messageSchema);
export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export const AiMemory = mongoose.model('AiMemory', aiMemorySchema);
export const VideoAnalytics = mongoose.model('VideoAnalytics', videoAnalyticsSchema);
