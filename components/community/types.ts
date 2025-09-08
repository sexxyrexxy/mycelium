export type MushroomKind =
  | "Oyster"
  | "Shiitake"
  | "King Stropharia"
  | "Enokitake"
  | "King Oyster"
  | "Lion’s Mane"
  | "Pink Oyster"
  | "Turkey Tail"
  | "Wood Blewit";

export type MushroomProfile = {
  id: string;
  name: string;            // grower’s handle / personal name / mushroom nickname
  kind: MushroomKind;      // common name (category)
  scientificName: string;  // Latin binomial
  avatarUrl: string;
  coverUrl?: string;
  growthDays: number;
  spawnDate?: string;
  yieldGrams?: number;
  followers?: number;
  featured?: boolean;
  bio?: string;
};
