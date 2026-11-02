"use client";
import {
  ArrowUpRight,
  FolderOpen,
  ImagePlus,
  LoaderCircle,
  Plus,
  RefreshCw,
  Upload,
} from "lucide-react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useCallback, useEffect, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { CreateCharacter } from "./create-character";
import { artworkUrl, type CharacterSummary } from "./document";
export function Library() {
  const [items, setItems] = useState<CharacterSummary[]>([]),
    [loading, setLoading] = useState(true),
    [error, setError] = useState(""),
    [creating, setCreating] = useState(false),
    [importing, setImporting] = useState(false);
  const input = useRef<HTMLInputElement>(null),
    router = useRouter();
  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const response = await fetch("/api/characters"),
        data = await response.json();
      if (!response.ok) throw new Error(data.error);
      setItems(data);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not load the character library.");
    } finally {
      setLoading(false);
    }
  }, []);
  useEffect(() => {
    void load();
  }, [load]);
  async function importFile(file?: File) {
    if (!file) return;
    if (file.size > 24 * 1024 * 1024) {
      setError("Character archives must be smaller than 24 MB.");
      return;
    }
    setImporting(true);
    setError("");
    try {
      const response = await fetch("/api/characters", {
          method: "POST",
          headers: { "Content-Type": "application/x-avatar-studio" },
          body: file,
        }),
        data = await response.json();
      if (!response.ok) throw new Error(data.error);
      router.push(`/characters/${data.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Import failed.");
    } finally {
      setImporting(false);
    }
  }
  return (
    <>
      <div className="page-heading">
        <div>
          <span className="eyebrow">YOUR CREATIVE SPACE</span>
          <h1>
            Library<span className="heading-dot">.</span>
          </h1>
          <p>Give your favorite illustrations a little personality.</p>
        </div>
        <div className="heading-actions">
          <Button variant="outline" onClick={() => input.current?.click()} disabled={importing}>
            {importing ? <LoaderCircle className="animate-spin" /> : <Upload />}Import archive
          </Button>
          <Button onClick={() => setCreating(true)}>
            <Plus />
            New character
          </Button>
          <input
            hidden
            type="file"
            ref={input}
            accept=".avatarstudio"
            aria-label="Import character archive file"
            onChange={(e) => {
              void importFile(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
        </div>
      </div>
      <section className="intro-card">
        <div>
          <Badge variant="secondary">From artwork to character</Badge>
          <h2>One illustration. A new companion.</h2>
          <p>
            Choose artwork, trace the eyes, and place a few landmarks.
            <br />
            Then preview and refine the movement at your own pace.
          </p>
          <Button variant="outline" onClick={() => setCreating(true)}>
            Start creating
            <ArrowUpRight />
          </Button>
        </div>
        <div className="intro-art" aria-hidden="true">
          <div className="art-orbit orbit-one" />
          <div className="art-orbit orbit-two" />
          <div className="art-sheet">
            <span className="art-spark">✦</span>
            <div className="art-face">
              <span />
              <span />
              <i />
            </div>
            <div className="art-body" />
            <div className="art-tag">HELLO, CHARACTER</div>
          </div>
          <div className="art-chip">
            <span />
            100% Local workspace
          </div>
        </div>
      </section>
      <div className="section-heading">
        <h2>
          <FolderOpen size={18} />
          My characters <span>{items.length}</span>
        </h2>
        <Button variant="ghost" size="sm" onClick={() => void load()} disabled={loading}>
          <RefreshCw className={loading ? "animate-spin" : ""} size={14} />
          Refresh
        </Button>
      </div>
      {error && (
        <div className="error-message" role="alert">
          {error}
          <Button size="sm" variant="ghost" onClick={() => void load()}>
            Retry
          </Button>
        </div>
      )}
      {loading ? (
        <div className="library-loading">
          <LoaderCircle className="animate-spin" />
          Loading local characters…
        </div>
      ) : (
        <div className="character-grid">
          {items.map((item) => (
            <Link key={item.id} href={`/characters/${item.id}`} className="character-link">
              <Card className="character-card">
                <div className="character-thumbnail checker">
                  <img src={artworkUrl(item.id)} alt={item.name} />
                  <span className="card-open">
                    <ArrowUpRight size={18} />
                  </span>
                </div>
                <CardContent className="character-meta">
                  <div>
                    <h3>{item.name}</h3>
                    <p>
                      Updated{" "}
                      {new Intl.DateTimeFormat("en-US", { month: "long", day: "numeric" }).format(
                        new Date(item.updatedAt),
                      )}
                    </p>
                  </div>
                  <Badge variant="outline">Local</Badge>
                </CardContent>
              </Card>
            </Link>
          ))}
          <button type="button" className="new-card" onClick={() => setCreating(true)}>
            <span>
              <ImagePlus size={26} />
            </span>
            <strong>Create a character</strong>
            <small>Start with a transparent PNG</small>
          </button>
        </div>
      )}
      <div className="library-foot">
        <span className="status-dot" />
        Your work stays on this computer. Artwork and project data are never sent to external
        services.
      </div>
      <CreateCharacter open={creating} onOpenChange={setCreating} />
    </>
  );
}
