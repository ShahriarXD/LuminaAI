import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { CodeBlock } from "./CodeBlock";

interface MarkdownRendererProps {
  content: string;
}

export const MarkdownRenderer = ({ content }: MarkdownRendererProps) => {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h1: ({ children }) => (
          <h1 className="text-lg font-bold text-foreground mt-5 mb-2 first:mt-0">{children}</h1>
        ),
        h2: ({ children }) => (
          <h2 className="text-base font-semibold text-foreground mt-4 mb-2 first:mt-0">{children}</h2>
        ),
        h3: ({ children }) => (
          <h3 className="text-sm font-semibold text-foreground mt-3 mb-1.5 first:mt-0">{children}</h3>
        ),
        p: ({ children }) => (
          <p className="text-sm leading-relaxed text-foreground/90 mb-2.5 last:mb-0">{children}</p>
        ),
        ul: ({ children }) => (
          <ul className="text-sm space-y-1 mb-3 ml-1 list-none">{children}</ul>
        ),
        ol: ({ children }) => (
          <ol className="text-sm space-y-1 mb-3 ml-1 list-decimal list-inside">{children}</ol>
        ),
        li: ({ children, ...props }) => {
          const isOrdered = (props as any).node?.parentNode?.tagName === "ol";
          return (
            <li className="flex gap-2 leading-relaxed text-foreground/90">
              {!isOrdered && <span className="text-primary mt-1.5 text-[6px]">●</span>}
              <span className="flex-1">{children}</span>
            </li>
          );
        },
        strong: ({ children }) => (
          <strong className="font-semibold text-foreground">{children}</strong>
        ),
        em: ({ children }) => (
          <em className="italic text-foreground/80">{children}</em>
        ),
        a: ({ href, children }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary/80 underline underline-offset-2 transition-colors"
          >
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-primary/40 pl-3 my-3 text-sm text-muted-foreground italic">
            {children}
          </blockquote>
        ),
        code: ({ className, children, ...props }) => {
          const match = /language-(\w+)/.exec(className || "");
          const isInline = !match && !className;
          const text = String(children).replace(/\n$/, "");

          if (isInline) {
            return (
              <code className="px-1.5 py-0.5 rounded-md text-[13px] bg-muted text-foreground font-mono">
                {children}
              </code>
            );
          }

          return <CodeBlock language={match?.[1]} className={className}>{text}</CodeBlock>;
        },
        pre: ({ children }) => <>{children}</>,
        table: ({ children }) => (
          <div className="overflow-x-auto my-3 rounded-lg border border-border/50">
            <table className="w-full text-sm">{children}</table>
          </div>
        ),
        thead: ({ children }) => (
          <thead className="bg-muted/50 border-b border-border/50">{children}</thead>
        ),
        th: ({ children }) => (
          <th className="px-3 py-2 text-left text-xs font-semibold text-foreground">{children}</th>
        ),
        td: ({ children }) => (
          <td className="px-3 py-2 text-foreground/80 border-t border-border/30">{children}</td>
        ),
        hr: () => <hr className="my-4 border-border/40" />,
      }}
    >
      {content}
    </ReactMarkdown>
  );
};
