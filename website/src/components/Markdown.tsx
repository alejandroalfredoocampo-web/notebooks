import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import rehypeSanitize from "rehype-sanitize";

/**
 * Render de Markdown sanitizado (el cuerpo lo escribe el admin, pero igual se
 * sanitiza: un <script> en el texto no se ejecuta). GFM = tablas, listas, etc.
 * Estilado con @tailwindcss/typography (`prose`). Usado por blog e intros de marca.
 */
export default function Markdown({ children, className = "" }: { children: string; className?: string }) {
  return (
    <div className={`prose prose-slate max-w-none prose-a:text-brand-blue prose-headings:font-extrabold ${className}`}>
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeSanitize]}>
        {children}
      </ReactMarkdown>
    </div>
  );
}
