"use client";
import { Button } from "@/components/ui/button";
export default function ErrorPage({ reset }: { reset: () => void }) {
  return (
    <div className="loading-page">
      <h1>This page could not be opened</h1>
      <p>Your project files are still stored on this computer.</p>
      <Button onClick={reset}>Reopen</Button>
    </div>
  );
}
