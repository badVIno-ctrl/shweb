// Sequential scene runner. Plays scenes one by one: dispatch board cmd -> speak TTS -> wait.

import type { BoardCommand, LessonScene, LessonScript } from './types';
import { clientSpeak, type ClientSpeakHandle } from './tts';

export interface SceneRunnerCallbacks {
  onSceneStart: (idx: number, scene: LessonScene) => void;
  onBoardCommand: (cmd: BoardCommand) => void;
  onAvatarAction?: (action: string) => void;
  onSpeakStart?: (text: string, audio?: HTMLAudioElement) => void;
  onSpeakEnd?: () => void;
  onSceneEnd: (idx: number) => void;
  onComplete: () => void;
  getRate: () => number;
}

export class SceneRunner {
  private idx = 0;
  private paused = false;
  private cancelled = false;
  private current?: ClientSpeakHandle;
  private resumeSignal: { promise: Promise<void>; resolve: () => void } = this.makeSignal();

  constructor(private script: LessonScript, private cb: SceneRunnerCallbacks) {}

  private makeSignal(): { promise: Promise<void>; resolve: () => void } {
    let resolve: () => void = () => undefined;
    const promise = new Promise<void>((r) => {
      resolve = r;
    });
    return { promise, resolve };
  }

  get index(): number {
    return this.idx;
  }

  setIndex(i: number): void {
    this.idx = Math.max(0, Math.min(this.script.scenes.length - 1, i));
  }

  pause(): void {
    if (this.paused) return;
    this.paused = true;
    this.current?.stop();
  }

  resume(): void {
    if (!this.paused) return;
    this.paused = false;
    this.resumeSignal.resolve();
    this.resumeSignal = this.makeSignal();
  }

  cancel(): void {
    this.cancelled = true;
    this.current?.stop();
    this.resumeSignal.resolve();
  }

  async run(startIdx = 0): Promise<void> {
    this.idx = startIdx;
    while (!this.cancelled && this.idx < this.script.scenes.length) {
      const scene = this.script.scenes[this.idx];
      this.cb.onSceneStart(this.idx, scene);
      if (scene.avatar_action) this.cb.onAvatarAction?.(scene.avatar_action);
      if (scene.board_command) this.cb.onBoardCommand(scene.board_command);

      // Speak
      try {
        this.current = await clientSpeak(scene.tts, { rate: this.cb.getRate() });
        this.cb.onSpeakStart?.(scene.tts, this.current.audio);
        await this.current.ended;
      } catch {
        // skip on error
      }
      this.cb.onSpeakEnd?.();

      // Honor pause
      while (this.paused && !this.cancelled) {
        await this.resumeSignal.promise;
      }
      if (this.cancelled) break;

      this.cb.onSceneEnd(this.idx);
      this.idx += 1;
    }
    if (!this.cancelled) this.cb.onComplete();
  }
}
