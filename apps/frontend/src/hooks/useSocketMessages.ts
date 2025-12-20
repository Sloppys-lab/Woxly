import { useEffect } from 'react';
import { useSocketStore } from '../store/socketStore';
import { useMessagesStore } from '../store/messagesStore';
import { useRoomsStore } from '../store/roomsStore';
import type { Message } from '@woxly/shared';

export function useSocketMessages() {
  const { socket } = useSocketStore();
  const { messages, fetchMessages } = useMessagesStore();
  const { fetchRooms } = useRoomsStore();

  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (message: Message) => {
      console.log('[useSocketMessages] New message received:', message);
      
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

      // Обновляем список комнат для обновления lastMessage и unreadCount
      setTimeout(() => {
        fetchRooms();
      }, 100);
    };

    socket.on('new-message', handleNewMessage);

    return () => {
      socket.off('new-message', handleNewMessage);
    };
  }, [socket, fetchRooms]);

  return { messages, fetchMessages };
}

