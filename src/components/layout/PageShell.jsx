// Panneau gris fixe ; seul son contenu défile.
export default function PageShell({ children }) {
  return (
    <section className="h-full overflow-hidden rounded-[28px] bg-surface">
      <div className="h-full overflow-y-auto p-7">{children}</div>
    </section>
  )
}
