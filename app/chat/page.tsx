import { ChatShell } from '@/components/chat/chat-shell';

export const metadata = { title: 'New conversation' };

export default function NewChatPage() {
  return <ChatShell initialMessages={[]} />;
}
