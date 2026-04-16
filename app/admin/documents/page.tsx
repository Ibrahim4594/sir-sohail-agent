'use client';
import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';

export default function AdminDocs() {
  const [status, setStatus] = useState<string>('');
  const [uploading, setUploading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setUploading(true);
    setStatus('Uploading\u2026');
    const form = new FormData(e.currentTarget);
    const res = await fetch('/api/ingest', { method: 'POST', body: form });
    if (res.ok) {
      const d = await res.json();
      setStatus(`Ingested: ${d.chunkCount} chunks`);
    } else {
      setStatus(`Failed: ${await res.text()}`);
    }
    setUploading(false);
  }

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Admin \u2014 Documents</h1>
      <form onSubmit={onSubmit} className="space-y-3 rounded-lg border p-4">
        <Input type="file" name="file" accept="application/pdf" required />
        <Button type="submit" disabled={uploading}>
          {uploading ? 'Uploading\u2026' : 'Upload & Ingest'}
        </Button>
      </form>
      {status && <p className="text-sm">{status}</p>}
    </div>
  );
}
