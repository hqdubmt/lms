import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import { parseQuiz } from '@/services/chat/quizParser';
import { QuizRenderer } from './QuizRenderer';
import type { AnyQuizQ } from './types';

export function MessageContent({ content }: { content: string }) {
  const questions: AnyQuizQ[] = parseQuiz(content);
  if (questions.length > 0) return <QuizRenderer questions={questions} />;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath] as any}
      rehypePlugins={[rehypeKatex] as any}
      components={{
        pre({ children }) {
          return (
            <pre className="bg-gray-800 rounded-lg p-3 overflow-x-auto my-2 text-left">
              {children}
            </pre>
          );
        },
        code({ className, children }) {
          const isBlock = !!className;
          if (isBlock) return <code className="text-green-300 text-xs font-mono">{children}</code>;
          return <code className="bg-gray-200 dark:bg-gray-700 rounded px-1 py-0.5 text-xs font-mono">{children}</code>;
        },
        p({ children }) { return <p className="mb-2 last:mb-0">{children}</p>; },
        ul({ children }) { return <ul className="list-disc ml-4 mb-2 space-y-0.5">{children}</ul>; },
        ol({ children }) { return <ol className="list-decimal ml-4 mb-2 space-y-0.5">{children}</ol>; },
        li({ children }) { return <li>{children}</li>; },
        strong({ children }) { return <strong className="font-semibold">{children}</strong>; },
        h1({ children }) { return <h1 className="text-base font-bold mb-2">{children}</h1>; },
        h2({ children }) { return <h2 className="text-sm font-bold mb-1.5">{children}</h2>; },
        h3({ children }) { return <h3 className="text-sm font-semibold mb-1">{children}</h3>; },
        blockquote({ children }) {
          return <blockquote className="border-l-2 border-gray-300 pl-3 italic text-gray-500 my-2">{children}</blockquote>;
        },
      }}
      className="text-sm leading-relaxed"
    >
      {content}
    </ReactMarkdown>
  );
}
