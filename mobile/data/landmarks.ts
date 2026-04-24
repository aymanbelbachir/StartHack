export interface Landmark {
  id: string;
  title: string;
  description: string;
  coords: { lat: number; lng: number };
  pointsReward: number;
  emoji: string;
}

export const LANDMARKS: Landmark[] = [
  {
    id: 'landmark-1',
    title: 'Jungfraujoch Summit',
    description: 'The Top of Europe at 3,454m — highest railway station in the Alps',
    coords: { lat: 46.5476, lng: 7.9857 },
    pointsReward: 100,
    emoji: '🏔️',
  },
  {
    id: 'landmark-2',
    title: 'Grindelwald Village',
    description: 'Charming alpine village at the foot of the Eiger north face',
    coords: { lat: 46.6241, lng: 8.0412 },
    pointsReward: 40,
    emoji: '🏘️',
  },
  {
    id: 'landmark-3',
    title: 'Lauterbrunnen Waterfall',
    description: 'Valley of 72 waterfalls — the most spectacular in Switzerland',
    coords: { lat: 46.5936, lng: 7.9088 },
    pointsReward: 50,
    emoji: '💧',
  },
  {
    id: 'landmark-4',
    title: 'Lake Brienz Viewpoint',
    description: 'Crystal-clear turquoise lake with views of the Brienzer Rothorn',
    coords: { lat: 46.7517, lng: 7.9884 },
    pointsReward: 30,
    emoji: '🏞️',
  },
];

export const HOTEL_CODES = ['HOTEL-VICTORIA', 'HOTEL-EIGER', 'HOTEL-ALPINA'];
