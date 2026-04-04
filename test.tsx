import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function MarkdownPreview({ content }: { content: string }) {
  return (
    <ReactMarkdown remarkPlugins={[remarkGfm]}>
      {content}
    </ReactMarkdown>
  );
}