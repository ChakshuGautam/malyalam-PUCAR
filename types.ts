export interface TranscriptionItem {
  id: string;
  text: string;
  isUser: boolean; // true if input (User), false if output (Model/Translation)
  timestamp: number;
  isComplete: boolean;
}

export enum ConnectionState {
  DISCONNECTED = 'DISCONNECTED',
  CONNECTING = 'CONNECTING',
  CONNECTED = 'CONNECTED',
  ERROR = 'ERROR',
}

export interface AudioVisualizerData {
  inputLevel: number;
  outputLevel: number;
}
