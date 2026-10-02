export function SiteFooter({ planning = false }: { planning?: boolean }) {
  return <footer aria-label="Contact Ed Om" className={`px-5 pt-6 text-xs leading-relaxed text-muted-foreground sm:px-6 ${planning ? "pb-20" : "pb-5"}`}>
    <p>By Ed Om <span aria-hidden="true">·</span> <a className="rounded-sm text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring" href="mailto:edwinom.nyc@gmail.com">Email</a> <span aria-hidden="true">·</span> <a className="rounded-sm text-primary underline underline-offset-4 focus-visible:ring-2 focus-visible:ring-ring" href="https://www.linkedin.com/in/ed-om-62a57818" target="_blank" rel="noreferrer">LinkedIn</a></p>
    <p className="mt-1">Please reach out if you have any questions.</p>
  </footer>;
}
