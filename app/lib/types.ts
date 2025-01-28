export type User = {
  user_id: string;
  username: string;
  avatar: string | null;
  display_name: string;
};

export type League = {
  league_id: string;
  name: string;
  avatar: string | null;
  season: string;
  settings: { [key: string]: number };
  scoring_settings: { [key: string]: number };
  roster_positions: string[];
  status: string;
};

export type Draft = {
  draft_id: string;
  status: string;
  type: string;
  settings: { [key: string]: number };
  start_time: number;
  last_picked: number;
  league_id: string;
  picks: { [key: string]: string };
};
