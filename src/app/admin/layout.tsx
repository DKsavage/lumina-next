// AdminLayout — applique la classe admin-grain pour le grain texture (scoped admin-only).
// Le grain est défini dans globals.css via .admin-grain::before.
export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return <div className="admin-grain">{children}</div>
}
