import { Worker } from 'bullmq';
import { createBullMQConnection } from '../services/redis';
import { sendMail } from '../services/mail';

export const emailWorker = new Worker(
  'email',
  async (job) => {
    const { to, subject, html } = job.data;
    await sendMail({ to, subject, html });
    console.log(`Email sent to ${to}`);
  },
  { connection: createBullMQConnection() },
);

emailWorker.on('failed', (job, err) => {
  console.error(`Email job ${job?.id} failed:`, err.message);
});
