import { Fragment, type ReactNode } from "react";

/* Инлайн-разметка: [текст](url) -> ссылка */
function renderInline(text: string): ReactNode[] {
  const regex = /\[([^\]]+)\]\(([^)]+)\)/g;
  const parts: ReactNode[] = [];
  let lastIndex = 0;
  let match: RegExpExecArray | null;
  let key = 0;

  while ((match = regex.exec(text))) {
    if (match.index > lastIndex) parts.push(<Fragment key={key++}>{text.slice(lastIndex, match.index)}</Fragment>);
    parts.push(
      <a
        key={key++}
        href={match[2]}
        target="_blank"
        rel="noreferrer"
        className="text-blue underline decoration-blue/40 underline-offset-2 transition-colors hover:text-red hover:decoration-red/40"
      >
        {match[1]}
      </a>
    );
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) parts.push(<Fragment key={key++}>{text.slice(lastIndex)}</Fragment>);
  return parts;
}

/* Рендер текста статьи: абзацы через пустую строку, "## " — подзаголовок,
   строки "* ..." подряд — маркированный список, короткая строка на ":" — жирная подпись-лейбл */
export default function ArticleBody({ text }: { text: string }) {
  const blocks = text.split(/\n\n+/);

  return (
    <div className="space-y-5">
      {blocks.map((block, i) => {
        if (block.startsWith("## ")) {
          return (
            <h2 key={i} className="pt-2 font-display text-[22px] font-bold leading-snug text-ink sm:text-[26px]">
              {block.slice(3)}
            </h2>
          );
        }

        const lines = block.split("\n");

        if (lines.length > 1 && lines.every((l) => l.startsWith("* "))) {
          return (
            <ul key={i} className="list-disc space-y-2 pl-5 text-[15.5px] leading-relaxed text-ink/80">
              {lines.map((l, j) => (
                <li key={j}>{renderInline(l.slice(2))}</li>
              ))}
            </ul>
          );
        }

        if (lines.length === 1 && lines[0].endsWith(":") && lines[0].length < 60) {
          return (
            <p key={i} className="font-bold text-ink">
              {lines[0]}
            </p>
          );
        }

        return (
          <p key={i} className="text-[15.5px] leading-relaxed text-ink/80">
            {renderInline(block)}
          </p>
        );
      })}
    </div>
  );
}
