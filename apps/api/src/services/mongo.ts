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

// AI Feedback schema — Phase 14
const aiFeedbackSchema = new mongoose.Schema({
  userId: { type: String, required: true, index: true },
  messageId: { type: String, required: true },
  subject: { type: String, default: 'general' },
  mode: { type: String, default: 'tutor' },
  vote: { type: String, enum: ['up', 'down'], required: true },
  comment: { type: String, default: '' },
  provider: { type: String, default: '' },
  createdAt: { type: Date, default: Date.now, index: true },
});
aiFeedbackSchema.index({ userId: 1, messageId: 1 }, { unique: true });

// Learning DNA schema — V1 (bna.md)
const learningDnaSchema = new mongoose.Schema({
  userId: { type: String, required: true, unique: true },
  // V1 fields
  topicScores: [{
    topic: { type: String, required: true },
    subject: { type: String, required: true },
    score: { type: Number, default: 0 },
    interactions: { type: Number, default: 0 },
    _id: false,
  }],
  langCount: { type: Number, default: 0 },
  mathCount: { type: Number, default: 0 },
  vietCount: { type: Number, default: 0 },
  quizTotal: { type: Number, default: 0 },
  quizCorrect: { type: Number, default: 0 },
  // Legacy fields (kept for backward compat)
  style: { type: String, enum: ['visual', 'reading', 'practice', 'mixed'], default: 'mixed' },
  preferDetail: { type: Boolean, default: false },
  preferExamples: { type: Boolean, default: true },
  preferExercises: { type: Boolean, default: false },
  avgSessionMinutes: { type: Number, default: 0 },
  topSubject: { type: String, default: '' },
  interactionCount: { type: Number, default: 0 },
  updatedAt: { type: Date, default: Date.now },
});

export const Message = mongoose.model('Message', messageSchema);
export const ActivityLog = mongoose.model('ActivityLog', activityLogSchema);
export const AiMemory = mongoose.model('AiMemory', aiMemorySchema);
export const VideoAnalytics = mongoose.model('VideoAnalytics', videoAnalyticsSchema);
export const AiFeedback = mongoose.model('AiFeedback', aiFeedbackSchema);
export const LearningDna = mongoose.model('LearningDna', learningDnaSchema);
