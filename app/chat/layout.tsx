import Link from 'next/link';
import { redirect } from 'next/navigation';
import { AccountMenu } from '@/components/sidebar/account-menu';
import { ConversationList } from '@/components/sidebar/conversation-list';
import { buttonVariants } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { createServerSupabase } from '@/lib/supabase/server';
import { cn } from '@/lib/utils';

export default async function ChatLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createServerSupabase();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect('/');

  const email = user.email ?? 'user';
  const initials = email.slice(0, 2).toUpperCase();

  return (
    <div className="grid h-screen grid-cols-[280px_1fr]">
      <aside className="flex flex-col border-r bg-muted/30">
        <div className="p-3">
          <Link href="/chat" className={cn(buttonVariants(), 'w-full')}>
            + New chat
          </Link>
        </div>
        <Separator />
        <ConversationList />
        <Separator />
        <div className="p-3 space-y-1">
          <Link
            href="/overview"
            className={cn(buttonVariants({ variant: 'ghost' }), 'w-full justify-start text-sm')}
          >
            Corpus Overview
          </Link>
          <AccountMenu email={email} initials={initials} />
        </div>
      </aside>
      <main className="relative overflow-hidden">{children}</main>
    </div>
  );
}
