"use client";

import React from "react";
import { InlineMath, BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

interface MathContentProps {
  content: string;
  className?: string;
}

// Convert simple markdown (**bold**, *italic*, `code`) and newlines to HTML
function renderMarkdown(text: string): string {
  return (
    text
      // bold
      .replace(/\*\*(.+?)\*\*/g, "<strong>$1</strong>")
      // italic (avoid **)
      .replace(/(^|[^*])\*(?!\*)([^*]+?)\*(?!\*)/g, "$1<em>$2</em>")
      // inline code
      .replace(/`([^`]+?)`/g, "<code>$1</code>")
      // handle literal \n sequences first
      .replace(/\\n/g, "<br />")
      // then handle actual newline characters
      .replace(/\n/g, "<br />")
  );
}

export function MathContent({ content, className }: MathContentProps) {
  if (!content) {
    return <div className={className}>No content provided</div>;
  }

  const parts: React.ReactNode[] = [];
  // Match $$...$$, $...$, \( ... \), and \[ ... \]
  const regex =
    /(\$\$[\s\S]*?\$\$|\$[^\$\n]+\$|\\\([\s\S]*?\\\)|\\\[[\s\S]*?\\\])/g;
  let last = 0;
  let key = 0;
  let m: RegExpExecArray | null;

  while ((m = regex.exec(content)) !== null) {
    if (m.index > last) {
      const textSeg = content.slice(last, m.index);
      parts.push(
        <span
          key={`txt-${key++}`}
          dangerouslySetInnerHTML={{ __html: renderMarkdown(textSeg) }}
        />,
      );
    }

    const token = m[0];
    let isBlock = false;
    let latex = "";
    if (token.startsWith("$$")) {
      isBlock = true;
      latex = token.slice(2, -2).trim();
    } else if (token.startsWith("$")) {
      latex = token.slice(1, -1).trim();
    } else if (token.startsWith("\\(") && token.endsWith("\\)")) {
      latex = token.slice(2, -2).trim();
    } else if (token.startsWith("\\[") && token.endsWith("\\]")) {
      isBlock = true;
      latex = token.slice(2, -2).trim();
    }

    try {
      parts.push(
        isBlock ? (
          <BlockMath key={`blk-${key++}`} math={latex} />
        ) : (
          <InlineMath key={`inl-${key++}`} math={latex} />
        ),
      );
    } catch {
      parts.push(
        <span key={`err-${key++}`} className="text-red-500">
          {token}
        </span>,
      );
    }

    last = m.index + token.length;
  }

  // Previously had a fallback that treated the entire string as LaTeX if certain symbols were present.
  // It caused large text blocks to render in math mode. We now rely on the model to wrap
  // explicit math with $ ... $ and render plain text normally.

  if (last < content.length) {
    const rest = content.slice(last);
    parts.push(
      <span
        key={`txt-${key++}`}
        dangerouslySetInnerHTML={{ __html: renderMarkdown(rest) }}
      />,
    );
  }

  return <div className={className}>{parts}</div>;
}
