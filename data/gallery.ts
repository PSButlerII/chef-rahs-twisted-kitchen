export const galleryCategoryOptions = [
  "Meal Plans",
  "Catering",
  "Personal Chef",
  "Behind the Scenes",
] as const;

export type GalleryImageCategory = (typeof galleryCategoryOptions)[number];

export type GalleryImage = {
  src: string;
  alt: string;
  title: string;
  category: GalleryImageCategory;
};

export const galleryImages: GalleryImage[] = [
  {
    src: "/gallery/webp/IMG_1416.webp",
    alt: "Chicken and broccoli with scallions",
    title: "Chicken and Broccoli Meal Plan",
    category: "Meal Plans",
  },
  {
    src: "/gallery/webp/IMG_1417.webp",
    alt: "Tomato braised dish with herbs and cheese",
    title: "Tomato Braised Meal Plan",
    category: "Meal Plans",
  },
  {
    src: "/gallery/webp/IMG_1420.webp",
    alt: "Stuffed peppers topped with tomato and cheese",
    title: "Stuffed Pepper Meal",
    category: "Meal Plans",
  },
  {
    src: "/gallery/webp/IMG_1428.webp",
    alt: "Stuffed peppers prepared on a catering tray",
    title: "Stuffed Pepper Tray",
    category: "Catering",
  },
  {
    src: "/gallery/webp/IMG_1429.webp",
    alt: "Close-up of stuffed peppers with savory filling",
    title: "Savory Stuffed Peppers",
    category: "Catering",
  },
  {
    src: "/gallery/webp/IMG_1432.webp",
    alt: "Crab cake meal with lemon garnish",
    title: "Crab Cake Plate",
    category: "Personal Chef",
  },
  {
    src: "/gallery/webp/IMG_1469.webp",
    alt: "Salmon over rice and vegetables",
    title: "Salmon Rice Bowl",
    category: "Meal Plans",
  },
  {
    src: "/gallery/webp/IMG_1471.webp",
    alt: "Savory rice dish with jalapenos and sauce",
    title: "Savory Rice Meal",
    category: "Meal Plans",
  },
  {
    src: "/gallery/webp/IMG_1478.webp",
    alt: "Shrimp saute with vegetables in a bowl",
    title: "Shrimp Saute",
    category: "Personal Chef",
  },
  {
    src: "/gallery/webp/IMG_1481.webp",
    alt: "Shrimp pasta with grated cheese",
    title: "Shrimp Pasta",
    category: "Personal Chef",
  },
  {
    src: "/gallery/webp/IMG_1487.webp",
    alt: "Salmon meal with broccoli and rice",
    title: "Salmon and Broccoli Plate",
    category: "Meal Plans",
  },
  {
    src: "/gallery/webp/IMG_1490.webp",
    alt: "Barbecue chicken with vegetables",
    title: "Barbecue Chicken Meal Plan",
    category: "Meal Plans",
  },
  {
    src: "/gallery/webp/IMG_1491.webp",
    alt: "Seasonal plate with rice and a pastry",
    title: "Seasonal Meal Plan Plate",
    category: "Meal Plans",
  },
  {
    src: "/gallery/webp/IMG_1535.webp",
    alt: "Grilled chicken plate with greens",
    title: "Grilled Chicken Plate",
    category: "Meal Plans",
  },
  {
    src: "/gallery/webp/IMG_1544.webp",
    alt: "Composed plate with greens, mash, and braised meat",
    title: "Composed Dinner Plate",
    category: "Personal Chef",
  },
  {
    src: "/gallery/webp/IMG_1546.webp",
    alt: "Rice bowl with chicken, chickpeas, and herbs",
    title: "Chicken Rice Bowl",
    category: "Meal Plans",
  },
  {
    src: "/gallery/webp/IMG_1550.webp",
    alt: "Plate with beans, rice, and lime",
    title: "Rice and Bean Meal Plan",
    category: "Meal Plans",
  },
];
