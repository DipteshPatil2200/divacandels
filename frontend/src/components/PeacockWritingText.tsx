type PeacockWritingTextProps = {
  text: string;
  duration?: number;
};

export function PeacockWritingText({ text, duration = 10000 }: PeacockWritingTextProps) {
  return (
    <div
      className="peacock-writing"
      style={{ "--writing-duration": `${duration}ms` } as React.CSSProperties}
      lang="sa"
    >
      <span className="peacock-writing__text">{text}</span>
      <span className="peacock-writing__pen" aria-hidden="true">
        <img src="/diva-peacock-feather.png" alt="" />
        <span className="peacock-writing__glow" />
      </span>
    </div>
  );
}
