import React from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import rehypeRaw from 'rehype-raw';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
    content: string;
    className?: string;
}

const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content, className = '' }) => {
    return (
        <div className={`markdown-content ${className}`}>
            <ReactMarkdown
                remarkPlugins={[remarkMath]}
                rehypePlugins={[rehypeKatex, rehypeRaw]}
                components={{
                    // Custom styles for specific elements if needed
                    h1: ({ node, ...props }) => <h1 className="text-2xl font-bold mb-4" {...props} />,
                    h2: ({ node, ...props }) => <h2 className="text-xl font-semibold mb-3 mt-6" {...props} />,
                    h3: ({ node, ...props }) => <h3 className="text-lg font-medium mb-2 mt-4" {...props} />,
                    p: ({ node, ...props }) => <p className="mb-4 leading-relaxed" {...props} />,
                    ul: ({ node, ...props }) => <ul className="list-disc pl-6 mb-4 space-y-1" {...props} />,
                    ol: ({ node, ...props }) => <ol className="list-decimal pl-6 mb-4 space-y-1" {...props} />,
                    li: ({ node, ...props }) => <li className="" {...props} />,
                    blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-blue-500 pl-4 py-1 my-4 bg-blue-50 dark:bg-blue-900/20 italic" {...props} />,
                    code: ({ node, inline, className, children, ...props }: any) => {
                        const match = /language-(\w+)/.exec(className || '')
                        return !inline && match ? (
                            <pre className="bg-slate-900 text-slate-50 p-4 rounded-lg overflow-x-auto my-4 text-sm">
                                <code className={className} {...props}>
                                    {children}
                                </code>
                            </pre>
                        ) : (
                            <code className="bg-slate-200 dark:bg-slate-700 px-1.5 py-0.5 rounded text-sm font-mono text-red-500 dark:text-red-400" {...props}>
                                {children}
                            </code>
                        )
                    }
                }}
            >
                {content}
            </ReactMarkdown>
        </div>
    );
};

export default MarkdownRenderer;
