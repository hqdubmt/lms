db = db.getSiblingDB('mongo_du');

db.createCollection('messages');
db.createCollection('notifications');
db.createCollection('activity_logs');
db.createCollection('ai_memory');
db.createCollection('video_analytics');

db.messages.createIndex({ roomId: 1, createdAt: -1 });
db.notifications.createIndex({ userId: 1, createdAt: -1 });
db.activity_logs.createIndex({ userId: 1, createdAt: -1 });
db.ai_memory.createIndex({ userId: 1 });
db.video_analytics.createIndex({ lessonId: 1, userId: 1 });
