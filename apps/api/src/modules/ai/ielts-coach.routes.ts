/**
 * IELTS Coach — Writing Task 1 & 2, Speaking Tasks
 * Routes mới, không sửa bất kỳ route hiện tại.
 */

import { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { requireAuth } from '../../middleware/auth';
import { aiChatOnce } from '../../services/ai-provider';
import { trackLearningEvent } from '../../services/learning-analytics';
import { recordActiveDay } from '../../services/streak';

const IELTS_SYSTEM = `You are an expert IELTS examiner and coach. Provide detailed, constructive feedback following official IELTS scoring criteria. Always return valid JSON only, no markdown wrapping.`;

async function fireAndForget(userId: string, event: 'chat') {
  try {
    await trackLearningEvent(userId, event);
    await recordActiveDay(userId);
  } catch { /* noop */ }
}

export async function ieltsCoachRoutes(app: FastifyInstance) {
  // ─── Writing Task 1 ─────────────────────────────────────────────────────────
  // Describe a chart, graph, table, process, or map
  app.post('/ielts/writing1', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      prompt: z.string().min(10).max(500).optional(),
      essay: z.string().min(20).max(3000),
      type: z.enum(['chart', 'graph', 'table', 'process', 'map', 'diagram']).default('chart'),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { prompt, essay, type } = body.data;
    const { sub } = req.user as { sub: string };
    const wordCount = essay.trim().split(/\s+/).length;

    const evalPrompt = `Evaluate this IELTS Writing Task 1 (${type} description) and return JSON:
{
  "bandScore": <number 1-9, can be 0.5 increments>,
  "taskAchievement": {"score": <1-9>, "feedback": "<2-3 sentences>"},
  "coherenceCohesion": {"score": <1-9>, "feedback": "<2-3 sentences>"},
  "lexicalResource": {"score": <1-9>, "feedback": "<2-3 sentences>", "betterWords": [{"original": "<word>", "better": "<word>", "why": "<reason>"}]},
  "grammaticalRange": {"score": <1-9>, "feedback": "<2-3 sentences>", "errors": [{"error": "<original>", "fix": "<corrected>"}]},
  "wordCount": ${wordCount},
  "minWordsMet": ${wordCount >= 150},
  "overview": "<did they include an overview sentence?>",
  "keyFeatures": "<did they cover key features/trends?>",
  "improvements": ["<specific actionable improvement>"],
  "modelSentence": "<show one improved sentence from their essay>",
  "encouragement": "<motivating IELTS tip>"
}

${prompt ? `Task prompt: ${prompt}\n\n` : ''}Student essay (${wordCount} words):
${essay}`;

    try {
      const raw = await aiChatOnce([
        { role: 'system', content: IELTS_SYSTEM },
        { role: 'user', content: evalPrompt },
      ]);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return reply.send({
          bandScore: 5.5, wordCount, minWordsMet: wordCount >= 150,
          taskAchievement: { score: 5, feedback: raw },
          improvements: [], encouragement: 'Keep practicing!',
        });
      }
      const result = { ...JSON.parse(jsonMatch[0]), wordCount };
      void fireAndForget(sub, 'chat');
      return reply.send(result);
    } catch {
      return reply.status(503).send({ error: 'AI không khả dụng' });
    }
  });

  // ─── Writing Task 2 ─────────────────────────────────────────────────────────
  // Argumentative / discussion / problem-solution essay
  app.post('/ielts/writing2', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      prompt: z.string().min(10).max(500).optional(),
      essay: z.string().min(50).max(4000),
      type: z.enum(['opinion', 'discussion', 'problem_solution', 'advantages_disadvantages', 'two_part']).default('opinion'),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { prompt, essay, type } = body.data;
    const { sub } = req.user as { sub: string };
    const wordCount = essay.trim().split(/\s+/).length;

    const evalPrompt = `Evaluate this IELTS Writing Task 2 (${type.replace('_', '-')} essay) and return JSON:
{
  "bandScore": <number 1-9, can be 0.5 increments>,
  "taskResponse": {"score": <1-9>, "feedback": "<2-3 sentences>", "thesis": "<did they answer the question directly?>"},
  "coherenceCohesion": {"score": <1-9>, "feedback": "<2-3 sentences>", "structure": "<intro/body/conclusion assessment>"},
  "lexicalResource": {"score": <1-9>, "feedback": "<2-3 sentences>", "advanced": ["<good vocabulary used>"], "betterWords": [{"original": "<word>", "better": "<word>"}]},
  "grammaticalRange": {"score": <1-9>, "feedback": "<2-3 sentences>", "errors": [{"error": "<original>", "fix": "<corrected>"}]},
  "wordCount": ${wordCount},
  "minWordsMet": ${wordCount >= 250},
  "paragraphStructure": {"intro": "<feedback>", "body": "<feedback>", "conclusion": "<feedback>"},
  "improvements": ["<specific actionable improvement>"],
  "sampleThesis": "<improved thesis statement for this topic>",
  "encouragement": "<motivating IELTS band score tip>"
}

${prompt ? `Task prompt: ${prompt}\n\n` : ''}Student essay (${wordCount} words):
${essay}`;

    try {
      const raw = await aiChatOnce([
        { role: 'system', content: IELTS_SYSTEM },
        { role: 'user', content: evalPrompt },
      ]);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return reply.send({
          bandScore: 5.5, wordCount, minWordsMet: wordCount >= 250,
          taskResponse: { score: 5, feedback: raw },
          improvements: [], encouragement: 'Keep writing!',
        });
      }
      const result = { ...JSON.parse(jsonMatch[0]), wordCount };
      void fireAndForget(sub, 'chat');
      return reply.send(result);
    } catch {
      return reply.status(503).send({ error: 'AI không khả dụng' });
    }
  });

  // ─── Speaking Evaluation ─────────────────────────────────────────────────────
  // Evaluate speaking from transcript (Part 1/2/3)
  app.post('/ielts/speaking', { preHandler: requireAuth }, async (req, reply) => {
    const body = z.object({
      part: z.enum(['1', '2', '3']).default('1'),
      question: z.string().min(5).max(500).optional(),
      transcript: z.string().min(10).max(3000),
    }).safeParse(req.body);
    if (!body.success) return reply.status(400).send({ error: 'Dữ liệu không hợp lệ' });

    const { part, question, transcript } = body.data;
    const { sub } = req.user as { sub: string };

    const partDesc = {
      '1': 'Part 1 (personal questions)',
      '2': 'Part 2 (long turn / cue card)',
      '3': 'Part 3 (abstract discussion)',
    }[part];

    const evalPrompt = `Evaluate this IELTS Speaking ${partDesc} response and return JSON:
{
  "bandScore": <number 1-9, can be 0.5 increments>,
  "fluencyCoherence": {"score": <1-9>, "feedback": "<2 sentences>"},
  "lexicalResource": {"score": <1-9>, "feedback": "<2 sentences>", "goodPhrases": ["<phrase used well>"], "suggestions": ["<better expression>"]},
  "grammaticalRange": {"score": <1-9>, "feedback": "<2 sentences>", "errors": [{"original": "<phrase>", "better": "<corrected phrase>"}]},
  "pronunciation": {"score": <1-9>, "feedback": "<1-2 sentences>"},
  "responseLength": "<too short / adequate / good>",
  "topicRelevance": "<did they answer the question?>",
  "improvements": ["<specific actionable improvement>"],
  "modelAnswer": "<show 2-3 sentences of what a Band 7+ response might say>",
  "encouragement": "<motivating IELTS speaking tip>"
}

${question ? `Question: ${question}\n\n` : ''}Candidate response:
${transcript}`;

    try {
      const raw = await aiChatOnce([
        { role: 'system', content: IELTS_SYSTEM },
        { role: 'user', content: evalPrompt },
      ]);
      const jsonMatch = raw.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        return reply.send({
          bandScore: 5.5,
          fluencyCoherence: { score: 5, feedback: raw },
          improvements: [], encouragement: 'Keep practicing your speaking!',
        });
      }
      const result = JSON.parse(jsonMatch[0]);
      void fireAndForget(sub, 'chat');
      return reply.send(result);
    } catch {
      return reply.status(503).send({ error: 'AI không khả dụng' });
    }
  });

  // ─── Generate random IELTS prompt ───────────────────────────────────────────
  app.get('/ielts/prompt', { preHandler: requireAuth }, async (req, reply) => {
    const q = req.query as { task?: string; topic?: string };
    const task = (q.task === '2' ? 2 : q.task === 'speaking' ? 'speaking' : 1) as 1 | 2 | 'speaking';

    // Curated prompts (no AI call needed)
    const w1Prompts = [
      { type: 'chart', prompt: 'The bar chart below shows the percentage of people in different age groups who used the internet in 2010 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.' },
      { type: 'graph', prompt: 'The line graph below shows changes in the number of books published annually in four countries between 1990 and 2020. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.' },
      { type: 'table', prompt: 'The table below shows the proportion of household expenditure spent on different items in five countries in 2015. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.' },
      { type: 'process', prompt: 'The diagram below illustrates the process of recycling plastic bottles. Summarise the information by selecting and reporting the main features.' },
      { type: 'map', prompt: 'The maps below show the changes to a town centre between 1980 and the present day. Summarise the information by selecting and reporting the main features, and make comparisons where relevant.' },
    ];
    const w2Prompts = [
      { type: 'opinion', prompt: 'Some people believe that technology has made our lives more complicated. To what extent do you agree or disagree? Give reasons for your answer and include any relevant examples from your own knowledge or experience.' },
      { type: 'discussion', prompt: 'Some people think that studying at university should be free for all students. Others believe that students should pay for their own education. Discuss both views and give your own opinion.' },
      { type: 'problem_solution', prompt: 'In many cities, traffic congestion is increasing. What are the causes of this problem, and what measures could be taken to reduce traffic in urban areas?' },
      { type: 'advantages_disadvantages', prompt: 'More and more people are choosing to work from home. What are the advantages and disadvantages of this trend?' },
      { type: 'two_part', prompt: 'Many people today prefer to get news from social media rather than traditional newspapers. Why is this? Is this a positive or negative development?' },
    ];
    const speakingPrompts = [
      { part: '1', question: 'Do you prefer cooking at home or eating out? Why?' },
      { part: '1', question: 'How do you usually spend your weekends?' },
      { part: '2', question: 'Describe a book you have read recently that you found interesting. You should say: what the book was about, why you decided to read it, what you found most interesting about it, and explain why you would or would not recommend it to others.' },
      { part: '2', question: 'Describe a place you have visited that made a strong impression on you. You should say: where it was, when you went there, what you saw or did, and explain why it made such an impression on you.' },
      { part: '3', question: 'Do you think the government should invest more in public libraries? Why or why not?' },
      { part: '3', question: 'How has technology changed the way people communicate? Is this change mostly positive or negative?' },
    ];

    if (task === 1) {
      const p = w1Prompts[Math.floor(Math.random() * w1Prompts.length)];
      return reply.send({ task: 1, ...p });
    } else if (task === 2) {
      const p = w2Prompts[Math.floor(Math.random() * w2Prompts.length)];
      return reply.send({ task: 2, ...p });
    } else {
      const p = speakingPrompts[Math.floor(Math.random() * speakingPrompts.length)];
      return reply.send({ task: 'speaking', ...p });
    }
  });
}
