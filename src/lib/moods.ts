export type Mood = {
  id: string;
  label: string;
  brief: string; // steer text handed to the generation model
};

export const MOODS: Mood[] = [
  { id: 'comfort',   label: 'comfort',     brief: 'reassure someone having a hard day; give them permission to rest' },
  { id: 'cheerup',   label: 'cheer up',    brief: 'lift someone who is low, lightly and without pressure' },
  { id: 'celebrate', label: 'celebrate',   brief: 'mark a win the reader had, big or small' },
  { id: 'steady',    label: 'steady',      brief: 'ground someone who feels overwhelmed; one step at a time' },
  { id: 'hi',        label: 'just say hi', brief: 'a simple, no-reason hello from a stranger' },
];

export function findMood(id: string | null | undefined): Mood | undefined {
  return MOODS.find((m) => m.id === id);
}
