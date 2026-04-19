import Link from 'next/link';
import { redirect } from 'next/navigation';
import { FeedbackCard } from '@/components/settings/feedback-card';
import { SignOutButton } from '@/components/settings/sign-out-button';
import { ThemeCard } from '@/components/settings/theme-card';
import { createServerSupabase } from '@/lib/supabase/server';

export const metadata = { title: 'Settings' };

export default async function SettingsPage() {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/sign-in?returnTo=/settings');

  const { data: profile } = await supabase
    .from('profiles')
    .select('display_name, role')
    .eq('id', user.id)
    .maybeSingle();

  const displayName = profile?.display_name ?? user.email ?? 'User';
  const role = profile?.role ?? 'student';
  const email = user.email ?? '';
  const avatarUrl =
    (user.user_metadata as { avatar_url?: string; picture?: string } | null)?.avatar_url ??
    (user.user_metadata as { picture?: string } | null)?.picture ??
    null;

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-rule">
        <div className="mx-auto max-w-3xl px-8 py-14">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="font-display text-[56px] font-[600] leading-[1.02] tracking-[-0.035em] text-foreground sm:text-[64px]">
                Settings.
              </h1>
            </div>
            <Link
              href="/chat"
              className="label link shrink-0 pt-2 transition hover:text-foreground"
            >
              ← Back to chat
            </Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-8 py-12">
        <div className="space-y-14">
          {/* Account section */}
          <Section title="Who's signed in">
            <div className="flex items-center gap-4 py-1">
              {avatarUrl ? (
                // biome-ignore lint/performance/noImgElement: OAuth avatar sizes vary
                <img
                  src={avatarUrl}
                  alt=""
                  className="h-12 w-12 shrink-0 rounded-[6px] object-cover"
                  referrerPolicy="no-referrer"
                />
              ) : (
                <span
                  aria-hidden
                  className="grid h-12 w-12 shrink-0 place-items-center rounded-[6px] bg-foreground text-[14px] font-[600] tracking-[0.04em] text-background"
                >
                  {displayName.slice(0, 2).toUpperCase()}
                </span>
              )}
              <div className="min-w-0 flex-1">
                <p className="truncate text-[16px] font-[500] leading-tight text-foreground">
                  {displayName}
                </p>
                <p className="mt-1 truncate text-[13px] text-muted-foreground">{email}</p>
                {role !== 'student' && (
                  <p className="label mt-2 inline-block border border-foreground px-2 py-[2px] text-foreground">
                    {role}
                  </p>
                )}
              </div>
            </div>
          </Section>

          {/* Appearance */}
          <Section title="Theme">
            <ThemeCard />
          </Section>

          {/* Feedback */}
          <Section title="Tell us what's working">
            <FeedbackCard />
          </Section>

          {/* Sign out */}
          <Section title="Sign out of Sir Sohail Agent">
            <div className="pt-2">
              <SignOutButton />
            </div>
          </Section>
        </div>

        <p className="label mt-16 text-muted-foreground/70">Sir Sohail Agent · EMU</p>
      </main>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section>
      <h2 className="mb-5 font-display text-[22px] font-[600] leading-[1.2] tracking-[-0.015em] text-foreground">
        {title}
      </h2>
      {children}
    </section>
  );
}
