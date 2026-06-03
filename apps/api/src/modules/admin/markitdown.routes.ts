import { FastifyInstance } from 'fastify';
import { requireAdmin } from '../../middleware/auth';
import * as path from 'path';
import { convertToMarkdown, detectSubject, qualityCheck } from '../../services/document-ingestion';

const SUPPORTED_EXTS: Record<string, string> = {
  '.docx': 'Word Document', '.doc': 'Word Document (legacy)',
  '.pdf': 'PDF', '.pptx': 'PowerPoint',
  '.xlsx': 'Excel', '.xls': 'Excel (legacy)', '.csv': 'CSV',
  '.html': 'HTML', '.htm': 'HTML',
  '.txt': 'Plain Text', '.md': 'Markdown',
};

export async function markitdownRoutes(app: FastifyInstance) {
  app.get('/convert/formats', { preHandler: requireAdmin }, async (_req, reply) => {
    return reply.send(
      Object.entries(SUPPORTED_EXTS).map(([ext, label]) => ({ ext, label }))
    );
  });

  app.post('/convert/file', { preHandler: requireAdmin }, async (req, reply) => {
    const data = await req.file();
    if (!data) return reply.status(400).send({ error: 'Không có file' });

    const origName = data.filename || 'file';
    const ext = path.extname(origName).toLowerCase();

    if (!SUPPORTED_EXTS[ext]) {
      return reply.status(400).send({
        error: `Định dạng "${ext || '(không rõ)'}" chưa được hỗ trợ`,
        supported: Object.keys(SUPPORTED_EXTS),
      });
    }

    const chunks: Buffer[] = [];
    for await (const chunk of data.file) chunks.push(chunk);
    const buffer = Buffer.concat(chunks);

    const { markdown, sourceType } = await convertToMarkdown(buffer, origName, data.mimetype);
    const subject = detectSubject(markdown);
    const quality = qualityCheck(markdown);

    return reply.send({
      markdown,
      filename: origName,
      format: SUPPORTED_EXTS[ext] ?? sourceType,
      subject,
      qualityScore: quality.score,
      chars: markdown.length,
      lines: markdown.split('\n').length,
    });
  });
}
