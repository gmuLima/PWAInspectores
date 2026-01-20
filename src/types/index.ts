export interface Inspector {
  id: string;
  name: string;
  lat: number;
  lng: number;
  lastUpdate: number;
  isOnline: boolean;
}

export interface LocationData {
  lat: number;
  lng: number;
  accuracy: number;
  timestamp: number;
}

export interface VoiceMessage {
  senderId: string;
  senderName: string;
  audioBlob: Blob;
  timestamp: number;
}

export interface SocketUser {
  id: string;
  name: string;
  lat: number;
  lng: number;
}
