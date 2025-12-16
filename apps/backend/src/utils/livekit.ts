import { AccessToken } from 'livekit-server-sdk';

/**
 * Создание токена для подключения к LiveKit комнате
 */
export async function createLiveKitToken(
  roomName: string,
  participantIdentity: string,
  participantName?: string
): Promise<string> {
  const apiKey = process.env.LIVEKIT_API_KEY;
  const apiSecret = process.env.LIVEKIT_API_SECRET;

  if (!apiKey || !apiSecret) {
    throw new Error('LiveKit API credentials not configured');
  }

  const token = new AccessToken(apiKey, apiSecret, {
    identity: participantIdentity,
    name: participantName,
  });

  // Права доступа
  token.addGrant({
    room: roomName,
    roomJoin: true,
    canPublish: true,
    canSubscribe: true,
    canPublishData: true,
  });

  return await token.toJwt();
}

/**
 * Создание токена для группового звонка
 */
export async function createGroupCallToken(
  roomId: number,
  userId: number,
  username: string
): Promise<string> {
  const roomName = `room-${roomId}`;
  const participantIdentity = userId.toString();
  
  return await createLiveKitToken(roomName, participantIdentity, username);
}

/**
 * Создание токена для 1-на-1 звонка
 */
export async function createDirectCallToken(
  callId: string,
  userId: number,
  username: string
): Promise<string> {
  const roomName = `call-${callId}`;
  const participantIdentity = userId.toString();
  
  return await createLiveKitToken(roomName, participantIdentity, username);
}
