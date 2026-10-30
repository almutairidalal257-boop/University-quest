// Character appearance definitions shared by Phaser sprites and React portraits.

export type HairStyle = 'short' | 'long' | 'bun' | 'hijab' | 'ghutra' | 'bald' | 'bob';

export interface Look {
  skin: string;
  hair: string;
  style: HairStyle;
  wrap?: string; // hijab / ghutra colour
  top: string;
  bottom: string;
  shoes: string;
  dress?: boolean; // long garment (abaya, dishdasha, long skirt)
  glasses?: boolean;
  beard?: string;
  coat?: string; // lab coat / blazer / gown colour
  trim?: string; // gown trim
}

export const LOOKS: Record<string, Look> = {
  // ---- player avatars
  'hijab-lavender': { skin: '#e9b98f', hair: '#3b2a24', style: 'hijab', wrap: '#b9a2ee', top: '#ff9a85', bottom: '#3f4a7a', shoes: '#5a4a6a', dress: true },
  'hijab-sage': { skin: '#c98e63', hair: '#2b1d18', style: 'hijab', wrap: '#8fc79a', top: '#fff1d6', bottom: '#5d6e9e', shoes: '#4a3a3a', dress: true },
  'ghutra': { skin: '#d9a073', hair: '#2b1d18', style: 'ghutra', wrap: '#ffffff', top: '#f4f2ee', bottom: '#f4f2ee', shoes: '#7a5a3a', dress: true },
  'short-hair': { skin: '#f0c49b', hair: '#33261f', style: 'short', top: '#7fb2f0', bottom: '#3d4f7a', shoes: '#ffffff' },
  'long-hair': { skin: '#e2ad85', hair: '#6a3e26', style: 'long', top: '#ffd36e', bottom: '#8a78c9', shoes: '#5a4a6a' },
  // ---- NPCs
  gatekeeper: { skin: '#c78c5e', hair: '#d0d0d0', style: 'ghutra', wrap: '#ffffff', top: '#3c5a8a', bottom: '#2d3d5e', shoes: '#222', beard: '#c9c9c9', coat: '#3c5a8a' },
  coach: { skin: '#e3b089', hair: '#2b1d18', style: 'hijab', wrap: '#ff9a85', top: '#fff1d6', bottom: '#6e5aa8', shoes: '#5a4a6a', dress: true, coat: '#f6c87a' },
  sara: { skin: '#dba67c', hair: '#2b1d18', style: 'hijab', wrap: '#ffd36e', top: '#8fb8ff', bottom: '#41507e', shoes: '#333', dress: true },
  lulwa: { skin: '#f0c49b', hair: '#3b2a24', style: 'hijab', wrap: '#9fd6d6', top: '#ffb3c1', bottom: '#4a4a7a', shoes: '#333', dress: true },
  noura: { skin: '#e9b98f', hair: '#1f1612', style: 'long', top: '#ff7f9f', bottom: '#2f3a5e', shoes: '#fff' },
  fatma: { skin: '#c98e63', hair: '#2b1d18', style: 'hijab', wrap: '#c9a7ff', top: '#fff1d6', bottom: '#3d3d5e', shoes: '#333', dress: true },
  maryam: { skin: '#e2ad85', hair: '#2b1d18', style: 'hijab', wrap: '#c9b8f0', top: '#a8d5a2', bottom: '#3f4a7a', shoes: '#333', dress: true },
  ahmad: { skin: '#d9a073', hair: '#241812', style: 'short', top: '#ffffff', bottom: '#ffffff', shoes: '#7a5a3a', dress: true },
  dana: { skin: '#f0c49b', hair: '#4a2e1e', style: 'bob', top: '#ffa94d', bottom: '#3d4f7a', shoes: '#fff' },
  bashayer: { skin: '#dba67c', hair: '#2b1d18', style: 'hijab', wrap: '#ff9a85', top: '#c9e4ff', bottom: '#3d3d5e', shoes: '#333', dress: true },
  huda: { skin: '#c98e63', hair: '#2b1d18', style: 'hijab', wrap: '#8fd19e', top: '#fff6e6', bottom: '#5d6e9e', shoes: '#333', dress: true },
  shahad: { skin: '#e9b98f', hair: '#3b2a24', style: 'bun', top: '#b9a2ee', bottom: '#2f3a5e', shoes: '#fff' },
  reem: { skin: '#e3b089', hair: '#2b1d18', style: 'hijab', wrap: '#7fa3d8', top: '#d6d6e6', bottom: '#4a4a6a', shoes: '#333', dress: true },
  professor: { skin: '#c78c5e', hair: '#cfcfcf', style: 'ghutra', wrap: '#ffffff', top: '#efe6d6', bottom: '#efe6d6', shoes: '#7a5a3a', dress: true, glasses: true, beard: '#d8d8d8', coat: '#7a5a8a' },
  librarian: { skin: '#e9b98f', hair: '#2b1d18', style: 'hijab', wrap: '#7a6ab8', top: '#fff1d6', bottom: '#4a3f6e', shoes: '#333', dress: true, glasses: true, coat: '#a8d5a2' },
  faisal: { skin: '#d9a073', hair: '#1f1612', style: 'short', top: '#9fd6d6', bottom: '#3d4f7a', shoes: '#333', beard: '#2b1d18', coat: '#ffffff', glasses: true },
  officer: { skin: '#dba67c', hair: '#2b1d18', style: 'hijab', wrap: '#3f4a7a', top: '#ffffff', bottom: '#2f3a5e', shoes: '#222', dress: true, coat: '#5d6e9e' },
  tutor: { skin: '#e2ad85', hair: '#33261f', style: 'short', top: '#ffd36e', bottom: '#4a4a6a', shoes: '#5a3a2a', glasses: true, beard: '#33261f', coat: '#8fb8a0' },
  dean: { skin: '#e3b089', hair: '#2b1d18', style: 'hijab', wrap: '#2f2a4a', top: '#fff1d6', bottom: '#1f1a3a', shoes: '#222', dress: true, coat: '#2f2a4a', trim: '#ffd36e', glasses: true },
  student1: { skin: '#f0c49b', hair: '#241812', style: 'short', top: '#ff9a85', bottom: '#3d4f7a', shoes: '#fff' },
  student2: { skin: '#c98e63', hair: '#2b1d18', style: 'hijab', wrap: '#ffd36e', top: '#a8d5a2', bottom: '#3d3d5e', shoes: '#333', dress: true },
  student3: { skin: '#d9a073', hair: '#2b1d18', style: 'ghutra', wrap: '#ffffff', top: '#f4f2ee', bottom: '#f4f2ee', shoes: '#7a5a3a', dress: true },
};

export const AVATARS = [
  { id: 'hijab-lavender', label: 'Hijab – lavender' },
  { id: 'hijab-sage', label: 'Hijab – sage' },
  { id: 'ghutra', label: 'Ghutra & dishdasha' },
  { id: 'short-hair', label: 'Short hair' },
  { id: 'long-hair', label: 'Long hair' },
];

export const NPC_NAMES: Record<string, string> = {
  gatekeeper: 'Abu Salem (Gatekeeper)',
  coach: 'Ms Hessa (Listening Coach)',
  professor: 'Professor Yousef',
  librarian: 'Mrs Amal (Librarian)',
  faisal: 'Dr Faisal',
  officer: 'Ms Latifa (Admissions Officer)',
  tutor: 'Mr Bader (Writing Tutor)',
  dean: 'Dr Munira (University Dean)',
  reem: 'Reem',
};
