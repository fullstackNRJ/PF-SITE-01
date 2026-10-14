export interface MarkdownBodyProps {
  /** Build-time HTML from the Markdown pipeline; see `src/lib/markdown/`. */
  readonly html: string;
}

/**
 * Renders a post body. Presentation lives in the `.markdown` rules in
 * `src/styles/global.css`, so this component knows nothing about the content.
 *
 * This is the only place HTML is injected. The string is not user input: it is
 * generated at build time from files in the repository, and
 * `src/lib/markdown/safe-markdown.ts` has already dropped raw HTML and vetted
 * every link and image.
 */
export function MarkdownBody({ html }: MarkdownBodyProps) {
  // eslint-disable-next-line react/no-danger -- trusted, build-time, sanitised by the Markdown pipeline
  return <div className="markdown" dangerouslySetInnerHTML={{ __html: html }} />;
}
