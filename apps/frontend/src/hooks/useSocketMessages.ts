import { useEffect } from 'react';
import { useSocketStore } from '../store/socketStore';
import { useMessagesStore } from '../store/messagesStore';
import type { Message } from '@woxly/shared';

export function useSocketMessages() {
  const { socket } = useSocketStore();
  const { messages, fetchMessages } = useMessagesStore();

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      useMessagesStore.setState((state) => {
        const roomMessages = state.messages[message.roomId] || [];
        
        // Проверяем, есть ли уже это сообщение (по ID или по временному ID)
        // Временные сообщения имеют ID > 1000000000000 (timestamp)
        const existingIndex = roomMessages.findIndex(
          (msg) => {
            // Если ID совпадает - это то же сообщение
            if (msg.id === message.id) return true;
            
            // Если это временное сообщение с таким же содержимым и временем
            if (msg.id > 1000000000000 && msg.content === message.content) {
              const timeDiff = Math.abs(
                new Date(msg.createdAt).getTime() - new Date(message.createdAt).getTime()
              );
              // Если разница во времени меньше 5 секунд - это то же сообщение
              if (timeDiff < 5000) return true;
            }
            
            return false;
          }
        );

        if (existingIndex >= 0) {
          // Заменяем временное сообщение на реальное
          const newMessages = [...roomMessages];
          newMessages[existingIndex] = message;
          return {
            messages: {
              ...state.messages,
              [message.roomId]: newMessages,
            },
          };
        } else {
          // Добавляем новое сообщение
          return {
            messages: {
              ...state.messages,
              [message.roomId]: [...roomMessages, message],
            },
          };
        }
      });
    };

    socket.on('new-message', handleNewMessage);

    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket]);

  return { messages, fetchMessages };
}

