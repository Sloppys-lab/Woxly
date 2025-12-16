// End-to-End Encryption utility using Web Crypto API

const ALGORITHM = 'RSA-OAEP';
const HASH = 'SHA-256';
const KEY_LENGTH = 2048;

// Storage keys
const PRIVATE_KEY_STORAGE = 'woxly_private_key';
const PUBLIC_KEY_STORAGE = 'woxly_public_key';

// Generate RSA key pair for E2E encryption
export const generateKeyPair = async (): Promise<CryptoKeyPair> => {
  const keyPair = await window.crypto.subtle.generateKey(
    {
      name: ALGORITHM,
      modulusLength: KEY_LENGTH,
      publicExponent: new Uint8Array([1, 0, 1]),
      hash: HASH,
    },
    true,
    ['encrypt', 'decrypt']
  );
  
  return keyPair;
};

// Export public key to base64 string
export const exportPublicKey = async (publicKey: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey('spki', publicKey);
  return arrayBufferToBase64(exported);
};

// Export private key to base64 string (for storage)
export const exportPrivateKey = async (privateKey: CryptoKey): Promise<string> => {
  const exported = await window.crypto.subtle.exportKey('pkcs8', privateKey);
  return arrayBufferToBase64(exported);
};

// Import public key from base64 string
export const importPublicKey = async (base64Key: string): Promise<CryptoKey> => {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return await window.crypto.subtle.importKey(
    'spki',
    keyBuffer,
    {
      name: ALGORITHM,
      hash: HASH,
    },
    true,
    ['encrypt']
  );
};

// Import private key from base64 string
export const importPrivateKey = async (base64Key: string): Promise<CryptoKey> => {
  const keyBuffer = base64ToArrayBuffer(base64Key);
  return await window.crypto.subtle.importKey(
    'pkcs8',
    keyBuffer,
    {
      name: ALGORITHM,
      hash: HASH,
    },
    true,
    ['decrypt']
  );
};

// Encrypt message with recipient's public key
export const encryptMessage = async (message: string, recipientPublicKey: CryptoKey): Promise<string> => {
  const encoder = new TextEncoder();
  const data = encoder.encode(message);
  
  // For long messages, we use hybrid encryption (AES + RSA)
  // Generate random AES key for this message
  const aesKey = await window.crypto.subtle.generateKey(
    {
      name: 'AES-GCM',
      length: 256,
    },
    true,
    ['encrypt', 'decrypt']
  );
  
  // Generate random IV
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  
  // Encrypt message with AES
  const encryptedData = await window.crypto.subtle.encrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    aesKey,
    data
  );
  
  // Export AES key
  const exportedAesKey = await window.crypto.subtle.exportKey('raw', aesKey);
  
  // Encrypt AES key with RSA public key
  const encryptedAesKey = await window.crypto.subtle.encrypt(
    {
      name: ALGORITHM,
    },
    recipientPublicKey,
    exportedAesKey
  );
  
  // Combine: [IV (12 bytes)] + [Encrypted AES key length (4 bytes)] + [Encrypted AES key] + [Encrypted data]
  const encryptedKeyLength = new Uint8Array(4);
  new DataView(encryptedKeyLength.buffer).setUint32(0, encryptedAesKey.byteLength, true);
  
  const result = new Uint8Array(
    iv.length + 
    encryptedKeyLength.length + 
    encryptedAesKey.byteLength + 
    encryptedData.byteLength
  );
  
  let offset = 0;
  result.set(iv, offset);
  offset += iv.length;
  result.set(encryptedKeyLength, offset);
  offset += encryptedKeyLength.length;
  result.set(new Uint8Array(encryptedAesKey), offset);
  offset += encryptedAesKey.byteLength;
  result.set(new Uint8Array(encryptedData), offset);
  
  return arrayBufferToBase64(result.buffer);
};

// Decrypt message with own private key
export const decryptMessage = async (encryptedMessage: string, privateKey: CryptoKey): Promise<string> => {
  const data = base64ToArrayBuffer(encryptedMessage);
  const dataArray = new Uint8Array(data);
  
  let offset = 0;
  
  // Extract IV
  const iv = dataArray.slice(offset, offset + 12);
  offset += 12;
  
  // Extract encrypted AES key length
  const keyLengthBytes = dataArray.slice(offset, offset + 4);
  const keyLength = new DataView(keyLengthBytes.buffer).getUint32(0, true);
  offset += 4;
  
  // Extract encrypted AES key
  const encryptedAesKey = dataArray.slice(offset, offset + keyLength);
  offset += keyLength;
  
  // Extract encrypted data
  const encryptedData = dataArray.slice(offset);
  
  // Decrypt AES key with RSA private key
  const aesKeyRaw = await window.crypto.subtle.decrypt(
    {
      name: ALGORITHM,
    },
    privateKey,
    encryptedAesKey
  );
  
  // Import AES key
  const aesKey = await window.crypto.subtle.importKey(
    'raw',
    aesKeyRaw,
    {
      name: 'AES-GCM',
    },
    false,
    ['decrypt']
  );
  
  // Decrypt message with AES
  const decryptedData = await window.crypto.subtle.decrypt(
    {
      name: 'AES-GCM',
      iv,
    },
    aesKey,
    encryptedData
  );
  
  const decoder = new TextDecoder();
  return decoder.decode(decryptedData);
};

// Save keys to localStorage (encrypted with password in production)
export const saveKeys = async (keyPair: CryptoKeyPair): Promise<void> => {
  const publicKeyBase64 = await exportPublicKey(keyPair.publicKey);
  const privateKeyBase64 = await exportPrivateKey(keyPair.privateKey);
  
  localStorage.setItem(PUBLIC_KEY_STORAGE, publicKeyBase64);
  localStorage.setItem(PRIVATE_KEY_STORAGE, privateKeyBase64);
};

// Load keys from localStorage
export const loadKeys = async (): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey } | null> => {
  const publicKeyBase64 = localStorage.getItem(PUBLIC_KEY_STORAGE);
  const privateKeyBase64 = localStorage.getItem(PRIVATE_KEY_STORAGE);
  
  if (!publicKeyBase64 || !privateKeyBase64) {
    return null;
  }
  
  try {
    const publicKey = await importPublicKey(publicKeyBase64);
    const privateKey = await importPrivateKey(privateKeyBase64);
    return { publicKey, privateKey };
  } catch (error) {
    console.error('Failed to load keys:', error);
    return null;
  }
};

// Get or generate keys
export const getOrCreateKeys = async (): Promise<{ publicKey: CryptoKey; privateKey: CryptoKey; publicKeyBase64: string }> => {
  let keys = await loadKeys();
  
  if (!keys) {
    const keyPair = await generateKeyPair();
    await saveKeys(keyPair);
    keys = { publicKey: keyPair.publicKey, privateKey: keyPair.privateKey };
  }
  
  const publicKeyBase64 = await exportPublicKey(keys.publicKey);
  
  return { ...keys, publicKeyBase64 };
};

// Clear keys (logout)
export const clearKeys = (): void => {
  localStorage.removeItem(PUBLIC_KEY_STORAGE);
  localStorage.removeItem(PRIVATE_KEY_STORAGE);
};

// Helper functions
const arrayBufferToBase64 = (buffer: ArrayBuffer): string => {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary);
};

const base64ToArrayBuffer = (base64: string): ArrayBuffer => {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
};

// Encryption store for caching recipient public keys
const publicKeyCache = new Map<number, CryptoKey>();

export const cachePublicKey = async (userId: number, publicKeyBase64: string): Promise<void> => {
  if (!publicKeyBase64) return;
  try {
    const publicKey = await importPublicKey(publicKeyBase64);
    publicKeyCache.set(userId, publicKey);
  } catch (error) {
    console.error('Failed to cache public key:', error);
  }
};

export const getCachedPublicKey = (userId: number): CryptoKey | undefined => {
  return publicKeyCache.get(userId);
};

export const clearPublicKeyCache = (): void => {
  publicKeyCache.clear();
};








