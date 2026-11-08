import { linkify } from "@/server/community/rules";

/**
 * Renders community text safely: React escapes everything, so no HTML from a
 * post ever reaches the page. Only http(s) links become links, and they are
 * marked as user content (nofollow ugc) and open without access to this page.
 */
export function PostBody({ text }: { text: string }) {
  return (
    <div className="flex flex-col gap-3 break-words">
      {text.split(/\n{2,}/).map((para, i) => (
        <p key={i} className="whitespace-pre-line">
          {linkify(para).map((part, j) =>
            part.href ? (
              <a
                key={j}
                href={part.href}
                target="_blank"
                rel="nofollow ugc noopener noreferrer"
                className="text-primary underline underline-offset-2"
              >
                {part.text}
              </a>
            ) : (
              <span key={j}>{part.text}</span>
            ),
          )}
        </p>
      ))}
    </div>
  );
}
