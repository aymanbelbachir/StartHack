export interface Benefit {
  id: string;
  title: string;
  description: string;
  partnerId: string;
  partnerName: string;
  discountType: 'one_time' | 'multi_use';
  discountValue: number;
  emoji: string;
  imageUrl?: string;
}

export const BENEFITS: Benefit[] = [
  {
    id: 'benefit-1',
    title: 'Free Jungfraujoch Railway Ticket',
    description: 'One free return trip to the Top of Europe',
    partnerId: 'partner-jungfraujoch',
    partnerName: 'Jungfraujoch Railway',
    discountType: 'one_time',
    discountValue: 100,
    emoji: '🚂',
    imageUrl: 'https://images.unsplash.com/photo-1613989937169-d7030ca9f7ab?w=400&q=80',
  },
  {
    id: 'benefit-2',
    title: '10% off at Partner Restaurants',
    description: 'Enjoy a discount at any partner restaurant in the region',
    partnerId: 'partner-victoria-restaurant',
    partnerName: 'Hotel Victoria Restaurant',
    discountType: 'multi_use',
    discountValue: 10,
    emoji: '🍽️',
    imageUrl: 'https://images.unsplash.com/photo-1733551629631-47d5923a2a98?w=400&q=80',
  },
  {
    id: 'benefit-3',
    title: 'Free Mountain Bike Rental',
    description: 'One free day of mountain bike rental',
    partnerId: 'partner-interlaken-adventure',
    partnerName: 'Interlaken Adventure Sports',
    discountType: 'one_time',
    discountValue: 100,
    emoji: '🚵',
    imageUrl: 'https://images.unsplash.com/photo-1605548109944-9040d0972bf5?w=400&q=80',
  },
  {
    id: 'benefit-4',
    title: 'Unlimited Free Public Bus',
    description: 'Travel freely on all regional buses during your stay',
    partnerId: 'partner-regional-bus',
    partnerName: 'Jungfrau Region Bus',
    discountType: 'multi_use',
    discountValue: 100,
    emoji: '🚌',
    imageUrl: 'https://images.unsplash.com/photo-1594987975747-b0822d768bb2?w=400&q=80',
  },
];
