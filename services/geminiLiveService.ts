import { GoogleGenAI, LiveServerMessage, Modality } from "@google/genai";
import { ConnectionState, TranscriptionItem } from "../types";
import { createPcmBlob, decodeBase64, decodeAudioData } from "./audioUtils";

const MODEL_NAME = 'gemini-2.5-flash-native-audio-preview-09-2025';
const SYSTEM_INSTRUCTION = `
You are a precise speech processor for a multilingual conversation. Your task depends on the language spoken:

1. **If the user speaks English**: Transcribe exactly what they say in English. DO NOT translate it to any other language.
2. **If the user speaks Hindi**: Transcribe exactly what they say in Hindi (Devanagari script). DO NOT translate it.
3. **If the user speaks Malayalam**: Translate what they say into English.

Do not add any conversational filler or meta-commentary. Just output the processed text.
`;

export class GeminiLiveService {
  private ai: GoogleGenAI;
  private connectionState: ConnectionState = ConnectionState.DISCONNECTED;
  private inputAudioContext: AudioContext | null = null;
  private outputAudioContext: AudioContext | null = null;
  private nextStartTime = 0;
  private sources = new Set<AudioBufferSourceNode>();
  private sessionPromise: Promise<any> | null = null;
  private stream: MediaStream | null = null;
  private processor: ScriptProcessorNode | null = null;
  private sourceNode: MediaStreamAudioSourceNode | null = null;
  
  // Callbacks
  public onStateChange: (state: ConnectionState) => void = () => {};
  public onTranscription: (item: TranscriptionItem) => void = () => {};
  public onAudioLevel: (input: number, output: number) => void = () => {};
  public onError: (error: string) => void = () => {};

  // Internal state for transcription buffering
  private currentInputTranscription = '';
  private currentOutputTranscription = '';
  private currentInputId = '';
  private currentOutputId = '';

  constructor(apiKey: string) {
    this.ai = new GoogleGenAI({ apiKey });
  }

  async connect() {
    try {
      this.updateState(ConnectionState.CONNECTING);

      // Initialize Audio Contexts
      this.inputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 16000 });
      this.outputAudioContext = new (window.AudioContext || (window as any).webkitAudioContext)({ sampleRate: 24000 });
      this.nextStartTime = 0;

      // Reset transcription state
      this.currentInputTranscription = '';
      this.currentOutputTranscription = '';
      this.currentInputId = '';
      this.currentOutputId = '';

      // Get User Media
      this.stream = await navigator.mediaDevices.getUserMedia({ audio: true });

      // Connect to Gemini
      this.sessionPromise = this.ai.live.connect({
        model: MODEL_NAME,
        config: {
          responseModalities: [Modality.AUDIO],
          speechConfig: {
            voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Puck' } },
          },
          systemInstruction: SYSTEM_INSTRUCTION,
          inputAudioTranscription: {},
          outputAudioTranscription: {},
        },
        callbacks: {
          onopen: this.handleOpen.bind(this),
          onmessage: this.handleMessage.bind(this),
          onerror: this.handleError.bind(this),
          onclose: this.handleClose.bind(this),
        },
      });

      // Catch initialization errors (e.g. Network Error, Invalid Key)
      this.sessionPromise.catch((err) => {
        this.handleError(new ErrorEvent('error', { message: err.message || 'Connection failed' }));
      });
      
    } catch (err: any) {
      this.handleError(new ErrorEvent('error', { message: err.message }));
    }
  }

  private handleOpen() {
    this.updateState(ConnectionState.CONNECTED);
    this.setupAudioInput();
  }

  private setupAudioInput() {
    if (!this.inputAudioContext || !this.stream || !this.sessionPromise) return;

    this.sourceNode = this.inputAudioContext.createMediaStreamSource(this.stream);
    this.processor = this.inputAudioContext.createScriptProcessor(4096, 1, 1);

    this.processor.onaudioprocess = (e) => {
      const inputData = e.inputBuffer.getChannelData(0);
      
      // Calculate rough input volume for visualizer
      let sum = 0;
      for (let i = 0; i < inputData.length; i++) {
        sum += inputData[i] * inputData[i];
      }
      const rms = Math.sqrt(sum / inputData.length);
      // We send levels, output level is 0 here (will be updated when playing)
      this.onAudioLevel(rms, 0);

      const pcmBlob = createPcmBlob(inputData);

      this.sessionPromise!.then((session) => {
        session.sendRealtimeInput({ media: pcmBlob });
      }).catch((err) => {
          console.error("Error sending audio:", err);
      });
    };

    this.sourceNode.connect(this.processor);
    this.processor.connect(this.inputAudioContext.destination);
  }

  private async handleMessage(message: LiveServerMessage) {
    // 1. Handle Transcriptions
    this.handleTranscription(message);

    // 2. Handle Audio Output (Receive data but play silently)
    const base64Audio = message.serverContent?.modelTurn?.parts?.[0]?.inlineData?.data;
    if (base64Audio && this.outputAudioContext) {
      try {
        const audioBuffer = await decodeAudioData(
          decodeBase64(base64Audio),
          this.outputAudioContext,
          24000,
          1
        );
        
        this.playAudioBuffer(audioBuffer);
      } catch (e) {
        console.error("Error decoding audio", e);
      }
    }

    // 3. Handle Interruption
    if (message.serverContent?.interrupted) {
      this.stopAllSources();
      this.nextStartTime = 0;
      // Reset output state so next model speech gets a new bubble
      this.currentOutputTranscription = '';
      this.currentOutputId = '';
    }
  }

  private handleTranscription(message: LiveServerMessage) {
    // Input (User)
    if (message.serverContent?.inputTranscription) {
      const text = message.serverContent.inputTranscription.text;
      if (text) {
        if (!this.currentInputId) {
            this.currentInputId = Date.now().toString() + '-user';
        }
        this.currentInputTranscription += text;
        this.onTranscription({
          id: this.currentInputId,
          text: this.currentInputTranscription,
          isUser: true,
          timestamp: Date.now(),
          isComplete: false
        });
      }
    }

    // Output (Model)
    if (message.serverContent?.outputTranscription) {
      const text = message.serverContent.outputTranscription.text;
      if (text && text.trim().length > 0) {
        if (!this.currentOutputId) {
            this.currentOutputId = Date.now().toString() + '-model';
        }
        this.currentOutputTranscription += text;
        this.onTranscription({
          id: this.currentOutputId,
          text: this.currentOutputTranscription,
          isUser: false,
          timestamp: Date.now(),
          isComplete: false
        });
      }
    }

    // Turn Complete -> finalize the messages
    if (message.serverContent?.turnComplete) {
      // Finalize User Input
      if (this.currentInputId) {
        this.onTranscription({
          id: this.currentInputId,
          text: this.currentInputTranscription,
          isUser: true,
          timestamp: Date.now(),
          isComplete: true
        });
        this.currentInputId = '';
        this.currentInputTranscription = '';
      }

      // Finalize Model Output
      if (this.currentOutputId) {
        this.onTranscription({
          id: this.currentOutputId,
          text: this.currentOutputTranscription,
          isUser: false,
          timestamp: Date.now(),
          isComplete: true
        });
        this.currentOutputId = '';
        this.currentOutputTranscription = '';
      }
    }
  }

  private playAudioBuffer(buffer: AudioBuffer) {
    if (!this.outputAudioContext) return;

    this.nextStartTime = Math.max(this.nextStartTime, this.outputAudioContext.currentTime);
    
    const source = this.outputAudioContext.createBufferSource();
    source.buffer = buffer;
    
    // MUTE OUTPUT: Create a GainNode with 0 gain
    // This ensures the audio "plays" for timing/visualizer purposes, but makes no sound.
    const silentGain = this.outputAudioContext.createGain();
    silentGain.gain.value = 0;
    
    source.connect(silentGain);
    silentGain.connect(this.outputAudioContext.destination);
    
    source.start(this.nextStartTime);
    this.sources.add(source);

    // Visualizer logic: trigger "speaking" level while this buffer plays
    const duration = buffer.duration;
    const startTime = this.nextStartTime;
    
    // Schedule cleanup
    source.onended = () => {
      this.sources.delete(source);
    };

    // Emit levels during playback (approximate)
    const interval = setInterval(() => {
       if (!this.outputAudioContext) { clearInterval(interval); return; }
       if (this.outputAudioContext.currentTime >= startTime && this.outputAudioContext.currentTime < startTime + duration) {
          // Mock output level for visualizer when playing
          this.onAudioLevel(0, 0.5 + Math.random() * 0.3); 
       } else if (this.outputAudioContext.currentTime > startTime + duration) {
          clearInterval(interval);
       }
    }, 50);

    this.nextStartTime += buffer.duration;
  }

  private stopAllSources() {
    for (const source of this.sources) {
      try { source.stop(); } catch (e) {}
    }
    this.sources.clear();
  }

  private handleError(e: ErrorEvent) {
    console.error(e);
    this.updateState(ConnectionState.ERROR);
    this.onError(e.message || "An error occurred with the connection.");
    this.disconnect();
  }

  private handleClose(e: CloseEvent) {
    console.log('Connection closed', e);
    this.updateState(ConnectionState.DISCONNECTED);
  }

  disconnect() {
    this.stopAllSources();
    
    if (this.processor) {
      this.processor.disconnect();
      this.processor = null;
    }
    if (this.sourceNode) {
      this.sourceNode.disconnect();
      this.sourceNode = null;
    }
    if (this.stream) {
      this.stream.getTracks().forEach(t => t.stop());
      this.stream = null;
    }
    if (this.inputAudioContext) {
      this.inputAudioContext.close();
      this.inputAudioContext = null;
    }
    if (this.outputAudioContext) {
      this.outputAudioContext.close();
      this.outputAudioContext = null;
    }
    
    this.updateState(ConnectionState.DISCONNECTED);
  }

  private updateState(state: ConnectionState) {
    this.connectionState = state;
    this.onStateChange(state);
  }
}
