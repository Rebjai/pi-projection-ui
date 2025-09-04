export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface RectConfig extends Rect {
  id: string;
  client_id: string;
  display_output: string;
}

export interface Assignment {
  display_output: string;
  rect: Rect;
}

export interface DisplayConfig {
  name: string;
  resolution: { width: number; height: number };
  status: string;
}

export interface Homography {
  matrix: number[][];
}

export interface ClientConfig {
  client_id: string;
  assignments: Assignment[];
  displays: DisplayConfig[];
  homographies: { [key: string]: Homography };
  last_seen: string;
  is_connected: boolean;
}

export interface Client {
  client_id: string;
  config?: ClientConfig;
}
