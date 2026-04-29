// Shared types for Viora Smart Academy (VSA)

export type AvatarAction = 'wave' | 'idle' | 'explain' | 'listen' | 'point';

export interface BoardRegion {
  x: number; // 0..1 normalized board coords
  y: number;
  w: number;
  h: number;
}

export type BoardCommand =
  | { action: 'write_text'; text: string; region?: BoardRegion }
  | { action: 'write_formula'; latex: string; region?: BoardRegion }
  | {
      action: 'draw_triangle';
      kind?: 'right' | 'equilateral' | 'arbitrary';
      labels?: [string, string, string];
      region?: BoardRegion;
    }
  | { action: 'draw_circle'; labels?: string[]; region?: BoardRegion }
  | {
      action: 'draw_function_graph';
      expr: string; // mathjs-compatible expression in x
      xRange?: [number, number];
      yRange?: [number, number];
      region?: BoardRegion;
    }
  | {
      action: 'draw_3d_solid';
      shape: 'pyramid' | 'cube' | 'sphere' | 'cone' | 'cylinder';
      sides?: number;
      height?: number;
      radius?: number;
    }
  | { action: 'highlight'; region: BoardRegion }
  | { action: 'erase'; region?: BoardRegion };

export type SceneType =
  | 'intro'
  | 'board_draw'
  | 'formula'
  | 'explain'
  | 'example'
  | 'graph'
  | 'practice'
  | 'outro'
  | 'qa';

export interface LessonScene {
  type: SceneType;
  tts: string;
  duration: number;
  avatar_action?: AvatarAction;
  board_command?: BoardCommand;
  /** if 'draw' — overlay for free-hand input */
  interactive?: 'draw' | 'input' | null;
}

export interface LessonScript {
  title: string;
  duration_sec: number;
  scenes: LessonScene[];
}

export interface ChatTurn {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface ChatAnswer {
  answer: string;
  board_commands: BoardCommand[];
}

export interface BoardSnapshotState {
  lessonSlug?: string;
  sceneIndex: number;
  commands: BoardCommand[];
  note?: string;
}
