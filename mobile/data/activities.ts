export interface Activity {
  id: string;
  title: string;
  description: string;
  location: string;
  pointsReward: number;
  imageEmoji: string;
  category: string;
  duration: string;
}

export const ACTIVITIES: Activity[] = [
  {
    id: 'activity-paragliding',
    title: 'Paragliding Interlaken',
    description: 'Fly over the stunning Swiss Alps with a certified instructor. Panoramic views of Eiger, Mönch & Jungfrau.',
    location: 'Interlaken',
    pointsReward: 150,
    imageEmoji: '🪂',
    category: 'Adventure',
    duration: '2h',
  },
  {
    id: 'activity-eiger-trail',
    title: 'Eiger Trail Hike',
    description: 'Classic mountain hike along the base of the Eiger north face. Stunning alpine scenery.',
    location: 'Grindelwald',
    pointsReward: 80,
    imageEmoji: '⛰️',
    category: 'Hiking',
    duration: '4h',
  },
  {
    id: 'activity-glacier-walk',
    title: 'Grindelwald Glacier Walk',
    description: 'Walk alongside the retreating Grindelwald glacier and learn about climate change.',
    location: 'Grindelwald',
    pointsReward: 60,
    imageEmoji: '🧊',
    category: 'Nature',
    duration: '3h',
  },
  {
    id: 'activity-boat-tour',
    title: 'Lake Thun Boat Tour',
    description: 'Cruise across the turquoise Lake Thun with stops at Spiez and Oberhofen castle.',
    location: 'Thun',
    pointsReward: 50,
    imageEmoji: '⛵',
    category: 'Leisure',
    duration: '2.5h',
  },
];
