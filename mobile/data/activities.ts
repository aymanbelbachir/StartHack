export interface Activity {
  id: string;
  title: string;
  description: string;
  location: string;
  pointsReward: number;
  imageEmoji: string;
  imageUrl?: string;
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
    imageUrl: 'https://images.unsplash.com/photo-1605548109944-9040d0972bf5?w=800&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1533240332313-0db49b459ad6?w=800&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1666030910636-6291b581962e?w=800&q=80',
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
    imageUrl: 'https://images.unsplash.com/photo-1717080637896-e44a3cb0f7a2?w=800&q=80',
    category: 'Leisure',
    duration: '2.5h',
  },
  {
    id: 'activity-jungfraujoch',
    title: 'Jungfraujoch – Top of Europe',
    description: 'Take the cogwheel railway to Europe\'s highest station at 3,454m. Eternal snow, the Aletsch Glacier, and views that stretch to France.',
    location: 'Jungfraujoch',
    pointsReward: 200,
    imageEmoji: '🏔',
    imageUrl: 'https://images.unsplash.com/photo-QmM7e2vrZnU?w=800&q=80',
    category: 'Iconic',
    duration: '5h',
  },
  {
    id: 'activity-schilthorn',
    title: 'Schilthorn – Piz Gloria',
    description: 'Cable car to 2,970m and the famous revolving restaurant. James Bond filming location with a 360° panorama of 200 Alpine peaks.',
    location: 'Mürren',
    pointsReward: 120,
    imageEmoji: '🚡',
    imageUrl: 'https://images.unsplash.com/photo-JaI9_GtwzfM?w=800&q=80',
    category: 'Iconic',
    duration: '4h',
  },
  {
    id: 'activity-first-cliff-walk',
    title: 'First Cliff Walk',
    description: 'Walk along a suspended steel walkway bolted into the cliff face at Grindelwald First. Glass-floored sections and a thrilling zipline option.',
    location: 'Grindelwald',
    pointsReward: 90,
    imageEmoji: '🪜',
    imageUrl: 'https://images.unsplash.com/photo-QDaNOhNvJwA?w=800&q=80',
    category: 'Adventure',
    duration: '3h',
  },
  {
    id: 'activity-canyon-swing',
    title: 'Canyon Swing Interlaken',
    description: 'Europe\'s biggest canyon swing — 180m freefall over a gorge at 120km/h. Pure adrenaline in the heart of the Alps.',
    location: 'Interlaken',
    pointsReward: 130,
    imageEmoji: '🎢',
    imageUrl: 'https://images.unsplash.com/photo-J16ep2LfHwY?w=800&q=80',
    category: 'Adventure',
    duration: '1h',
  },
  {
    id: 'activity-harder-kulm',
    title: 'Harder Kulm Funicular',
    description: 'Ride the 1908 funicular to the Two Lakes Bridge — a panoramic platform suspended above Interlaken with views of both Lake Thun and Lake Brienz.',
    location: 'Interlaken',
    pointsReward: 70,
    imageEmoji: '🌉',
    imageUrl: 'https://images.unsplash.com/photo-SMj2DY7QUfw?w=800&q=80',
    category: 'Scenic',
    duration: '2h',
  },
  {
    id: 'activity-lauterbrunnen',
    title: 'Lauterbrunnen Valley',
    description: 'Explore the valley of 72 waterfalls — the inspiration for Tolkien\'s Rivendell. Walk among thundering cascades and BASE jumpers in flight.',
    location: 'Lauterbrunnen',
    pointsReward: 55,
    imageEmoji: '💦',
    imageUrl: 'https://images.unsplash.com/photo-0kcOMLFiec4?w=800&q=80',
    category: 'Nature',
    duration: '2h',
  },
];
