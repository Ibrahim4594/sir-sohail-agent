'use client';
import { useRouter } from 'next/navigation';
import { useRef, useState } from 'react';
import { toast } from 'sonner';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/lib/utils';

type Phase = 'idle' | 'uploading' | 'processing' | 'done' | 'error';

export function AdminUploader() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [phase, setPhase] = useState<Phase>('idle');
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState<string | null>(null);
  const [isDragOver, setIsDragOver] = useState(false);

  const onPick = () => inputRef.current?.click();

  const onFile = (f: File | null) => {
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.pdf')) {
      toast.error('Only PDF files are supported.');
      return;
    }
    setFile(f);
    setPhase('idle');
    setMessage(null);
    setProgress(0);
  };

  const submit = async () => {
    if (!file) return;
    setPhase('uploading');
    setProgress(10);

    const form = new FormData();
    form.append('file', file);

    setPhase('processing');
    setProgress(45);

    const res = await fetch('/api/ingest', { method: 'POST', body: form });

    if (res.ok) {
      const data = (await res.json()) as { chunkCount?: number };
      setPhase('done');
      setProgress(100);
      setMessage(`Ingested ${data.chunkCount ?? 0} chunks`);
      toast.success(`Added “${file.name}” to the corpus`);
      setTimeout(() => {
        router.refresh();
        setFile(null);
        setPhase('idle');
        setProgress(0);
        setMessage(null);
      }, 1400);
    } else {
      setPhase('error');
      const text = await res.text().catch(() => 'Unknown error');
      setMessage(text);
      toast.error('Ingest failed');
    }
  };

  const busy = phase === 'uploading' || phase === 'processing';

  return (
    // biome-ignore-start lint/a11y/noStaticElementInteractions: drag-drop target wraps an accessible file input + button fallback
    // biome-ignore-start lint/a11y/useAriaPropsSupportedByRole: aria-label explains the region
    <div
      aria-label="PDF drop zone"
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragOver(true);
      }}
      onDragLeave={() => setIsDragOver(false)}
      onDrop={(e) => {
        e.preventDefault();
        setIsDragOver(false);
        const f = e.dataTransfer.files?.[0];
        if (f) onFile(f);
      }}
      className={cn(
        'relative rounded-lg border-2 border-dashed bg-card/50 px-6 py-8 transition',
        isDragOver ? 'border-[var(--oxblood)] bg-[var(--oxblood)]/[0.05]' : 'border-foreground/20',
      )}
    >
      {/* biome-ignore-end lint/a11y/useAriaPropsSupportedByRole: end region */}
      {/* biome-ignore-end lint/a11y/noStaticElementInteractions: end region */}
      <div className="flex flex-col items-start gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1">
          {file ? (
            <div>
              <p className="font-display text-lg italic tracking-tight">{file.name}</p>
              <p className="label mt-1">
                {(file.size / 1024 / 1024).toFixed(2)} MB · Ready to ingest
              </p>
            </div>
          ) : (
            <div>
              <p className="font-display text-lg italic tracking-tight">
                Drop a PDF <span className="text-muted-foreground not-italic">·</span>{' '}
                <button
                  type="button"
                  onClick={onPick}
                  className="underline decoration-[var(--oxblood)] decoration-1 underline-offset-4 hover:text-[var(--oxblood)]"
                >
                  or pick a file
                </button>
              </p>
              <p className="label mt-1">Academic papers only · up to ~15 MB each</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {file && !busy && phase !== 'done' && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="rounded-md border border-foreground/15 px-3 py-1.5 text-xs transition hover:border-foreground/40"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={file ? submit : onPick}
            disabled={busy}
            className={cn(
              'rounded-md border border-[var(--oxblood)]/50 bg-[var(--oxblood)] px-4 py-2 text-sm font-medium text-[var(--parchment)] transition',
              'hover:bg-[var(--oxblood)]/90 disabled:opacity-70',
            )}
          >
            {phase === 'uploading' && 'Uploading…'}
            {phase === 'processing' && 'Parsing & embedding…'}
            {phase === 'done' && 'Done ✓'}
            {phase === 'error' && 'Retry'}
            {phase === 'idle' && (file ? 'Upload & ingest' : 'Select a file')}
          </button>
        </div>
      </div>

      <input
        ref={inputRef}
        type="file"
        accept="application/pdf"
        hidden
        onChange={(e) => onFile(e.target.files?.[0] ?? null)}
      />

      {busy && (
        <div className="mt-5">
          <Progress value={progress} className="h-1" />
          <p className="label mt-2">
            {phase === 'uploading' ? 'Transferring bytes' : 'Chunking & embedding passages'}
          </p>
        </div>
      )}
      {phase === 'error' && message && (
        <p className="mt-4 rounded border border-destructive/30 bg-destructive/5 px-3 py-2 text-xs text-destructive">
          {message}
        </p>
      )}
      {phase === 'done' && message && (
        <p className="mt-4 rounded border border-foreground/15 bg-card px-3 py-2 text-xs text-[var(--oxblood)]">
          {message}
        </p>
      )}
    </div>
  );
}
