/**
 * Renders a JSON-LD structured-data script tag.
 * Server-safe: emits a static <script> so search engines read it in the
 * initial HTML (no client hydration required).
 */
export function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      // Structured data is developer-authored, not user input.
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
