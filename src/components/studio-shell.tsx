import { HardDrive, LayoutGrid, Sparkles } from "lucide-react";
import Link from "next/link";
export function StudioShell({ children }: { children: React.ReactNode }) {
  return (
    <>
      <header className="site-header">
        <Link href="/" className="brand">
          <span className="brand-icon">
            <Sparkles size={20} />
          </span>
          <div>
            Sovia<span>AVATAR STUDIO</span>
          </div>
        </Link>
        <nav>
          <Link href="/" className="nav-link">
            <LayoutGrid size={15} />
            Library
          </Link>
        </nav>
        <div className="local-badge">
          <HardDrive size={14} />
          <span>Local workspace</span>
          <i />
        </div>
      </header>
      <main className="app-main">{children}</main>
      <footer className="site-footer">
        <span>Sovia Avatar Studio</span>
        <span>A little more room to create.</span>
      </footer>
    </>
  );
}
