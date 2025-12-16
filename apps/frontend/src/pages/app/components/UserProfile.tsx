import { Card, Avatar, Button, StatusDot } from '@woxly/ui';
import { Trash2, Ban } from 'lucide-react';
import type { User } from '@woxly/shared';

interface UserProfileProps {
  user: User;
  onDelete?: () => void;
  onBlock?: () => void;
}

export default function UserProfile({ user, onDelete, onBlock }: UserProfileProps) {
  return (
    <Card className="p-6">
      <div className="flex flex-col items-center mb-6">
        <div className="relative mb-4">
          <Avatar
            src={user.avatarUrl}
            fallback={user.username[0].toUpperCase()}
            size="xl"
          />
          <div className="absolute -bottom-1 -right-1">
            <StatusDot status={user.status} size="lg" />
          </div>
        </div>
        <h2 className="text-2xl font-bold text-foreground mb-1">{user.username}</h2>
        <p className="text-muted-foreground mb-2">{user.woxlyId}</p>
        <p className="text-sm text-muted-foreground">{user.bio || 'Нет описания'}</p>
      </div>

      <div className="space-y-2">
        <Button
          variant="destructive"
          className="w-full"
          onClick={onDelete}
        >
          <Trash2 className="mr-2 h-4 w-4" />
          Удалить
        </Button>
        <Button
          variant="destructive"
          className="w-full"
          onClick={onBlock}
        >
          <Ban className="mr-2 h-4 w-4" />
          Заблокировать
        </Button>
      </div>
    </Card>
  );
}

