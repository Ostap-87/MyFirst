/* Простой рендер текста статьи: абзацы через пустую строку, "## " — подзаголовок */
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
        return (
          <p key={i} className="text-[15.5px] leading-relaxed text-ink/80">
            {block}
          </p>
        );
      })}
    </div>
  );
}
