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
        'relative border-2 border-dashed bg-background px-6 py-10 transition',
        isDragOver ? 'border-foreground bg-muted' : 'border-rule',
      )}
    >
      {/* biome-ignore-end lint/a11y/useAriaPropsSupportedByRole: end region */}
      {/* biome-ignore-end lint/a11y/noStaticElementInteractions: end region */}
      <div className="flex flex-col items-start gap-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex-1 min-w-0">
          {file ? (
            <div>
              <p className="font-display text-[22px] leading-[1.2] tracking-[-0.01em] text-foreground">
                {file.name}
              </p>
              <p className="label mt-2">
                {(file.size / 1024 / 1024).toFixed(2)} MB · Ready to ingest
              </p>
            </div>
          ) : (
            <div>
              <p className="font-display text-[22px] leading-[1.2] tracking-[-0.01em] text-foreground">
                Drop a PDF, or{' '}
                <button
                  type="button"
                  onClick={onPick}
                  className="italic font-[400] underline decoration-foreground decoration-1 underline-offset-4 hover:no-underline"
                >
                  pick a file
                </button>
                .
              </p>
              <p className="label mt-2">Academic papers only · up to ~15 MB each</p>
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          {file && !busy && phase !== 'done' && (
            <button
              type="button"
              onClick={() => setFile(null)}
              className="border border-rule px-3 py-2 font-mono text-[10px] uppercase tracking-[0.22em] transition hover:border-foreground"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            onClick={file ? submit : onPick}
            disabled={busy}
            className={cn(
              'border border-foreground bg-foreground px-5 py-2 font-mono text-[10px] uppercase tracking-[0.22em] text-background transition',
              'hover:bg-background hover:text-foreground',
              'disabled:pointer-events-none disabled:border-rule disabled:bg-background disabled:text-muted-foreground',
            )}
          >
            {phase === 'uploading' && 'Uploading'}
            {phase === 'processing' && 'Parsing & embedding'}
            {phase === 'done' && 'Done'}
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
        <div className="mt-6">
          <Progress value={progress} className="h-[2px]" />
          <p className="label mt-2">
            {phase === 'uploading' ? 'Transferring bytes' : 'Chunking & embedding passages'}
          </p>
        </div>
      )}
      {phase === 'error' && message && (
        <p className="mt-5 border border-destructive/40 bg-destructive/[0.03] px-3 py-2 text-xs text-destructive">
          {message}
        </p>
      )}
      {phase === 'done' && message && (
        <p className="mt-5 border border-foreground bg-muted px-3 py-2 text-xs text-foreground">
          {message}
        </p>
      )}
    </div>
  );
}
