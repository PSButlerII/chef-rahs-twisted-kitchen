import { prisma } from "./script-prisma";
import { weeklyMenuTimeZone } from "../lib/weekly-menu-dates";
import { resolveWeeklyPeriodSchedule } from "../lib/weekly-ordering-window";

const DEMO_WEEKLY_FULFILLMENT_MESSAGE =
  "Weekly meal plan orders are delivered on Sunday. You will be notified when delivery is scheduled.";

const DEMO_BUSINESS_SETTINGS_ID = "business-settings";

const DEMO_WEEKLY_SCHEDULE_SETTINGS = {
  lateFee: 10,
  weeklyCustomerSchedulingEnabled: false,
  weeklyOrderingOpenDay: 3,
  weeklyOrderingOpenHour: 0,
  weeklyOrderingOpenMinute: 0,
  weeklyLateFeeStartDay: 5,
  weeklyLateFeeStartHour: 17,
  weeklyLateFeeStartMinute: 0,
  weeklyOrderingCloseDay: 5,
  weeklyOrderingCloseHour: 22,
  weeklyOrderingCloseMinute: 0,
  weeklyFixedFulfillmentDay: 0,
  weeklyFixedFulfillmentHour: null,
  weeklyFixedFulfillmentMinute: null,
  weeklyFixedFulfillmentMessage: DEMO_WEEKLY_FULFILLMENT_MESSAGE,
};

async function seedDemoUser() {
  const user = await prisma.user.upsert({
    where: {
      email: "demo.customer@example.com",
    },
    update: {
      name: "Demo Customer",
      phone: "404-555-0147",
      addressLine1: "123 Demo Street",
      addressLine2: "Apt 2",
      city: "Atlanta",
      state: "GA",
      postalCode: "30301",
      deliveryNotes: "Demo delivery instructions.",
      role: "CUSTOMER",
    },
    create: {
      name: "Demo Customer",
      email: "demo.customer@example.com",
      phone: "404-555-0147",
      addressLine1: "123 Demo Street",
      addressLine2: "Apt 2",
      city: "Atlanta",
      state: "GA",
      postalCode: "30301",
      deliveryNotes: "Demo delivery instructions.",
      role: "CUSTOMER",
    },
  });

  console.log(`Demo user ready: ${user.email}`);

  return user;
}

async function upsertCategory(name: string, sortOrder: number) {
  return prisma.menuCategory.upsert({
    where: {
      name,
    },
    update: {
      sortOrder,
    },
    create: {
      name,
      sortOrder,
    },
  });
}

async function upsertMenuItem(input: {
  name: string;
  description: string;
  price: string;
  type:
    | "PLATE"
    | "A_LA_CARTE"
    | "MEAL_PLAN"
    | "CATERING"
    | "DESSERT"
    | "SIDE"
    | "OTHER";
  categoryId: string;
  requiresApproval?: boolean;
  customerInstructionsEnabled?: boolean;
  imageUrl?: string;
  seasonal?: boolean;
}) {
  const existing = await prisma.menuItem.findFirst({
    where: {
      name: input.name,
    },
    select: {
      id: true,
    },
  });

  if (existing) {
    await prisma.menuItemOptionGroup.deleteMany({
      where: {
        menuItemId: existing.id,
      },
    });

    return prisma.menuItem.update({
      where: {
        id: existing.id,
      },
      data: {
        description: input.description,
        price: input.price,
        type: input.type,
        categoryId: input.categoryId,
        available: true,
        archived: false,
        imageUrl: input.imageUrl,
        seasonal: input.seasonal ?? false,
        requiresApproval: input.requiresApproval ?? false,
        customerInstructionsEnabled: input.customerInstructionsEnabled ?? true,
      },
    });
  }

  return prisma.menuItem.create({
    data: {
      name: input.name,
      description: input.description,
      price: input.price,
      type: input.type,
      categoryId: input.categoryId,
      available: true,
      archived: false,
      imageUrl: input.imageUrl,
      seasonal: input.seasonal ?? false,
      requiresApproval: input.requiresApproval ?? false,
      customerInstructionsEnabled: input.customerInstructionsEnabled ?? true,
    },
  });
}

async function syncMenuItemAllergens(
  menuItemId: string,
  allergenNames: string[],
) {
  await prisma.menuItemAllergen.deleteMany({
    where: {
      menuItemId,
    },
  });

  if (!allergenNames.length) {
    return;
  }

  const allergens = await prisma.allergen.findMany({
    where: {
      name: {
        in: allergenNames,
      },
    },
    select: {
      id: true,
    },
  });

  await prisma.menuItemAllergen.createMany({
    data: allergens.map((allergen) => ({
      menuItemId,
      allergenId: allergen.id,
    })),
    skipDuplicates: true,
  });
}

async function createOptionGroup(input: {
  menuItemId: string;
  name: string;
  required?: boolean;
  multiple?: boolean;
  choices: {
    name: string;
    description?: string;
    dietaryInfo?: string;
    imageUrl?: string;
    requestOnly?: boolean;
    priceDelta?: string;
  }[];
}) {
  return prisma.menuItemOptionGroup.create({
    data: {
      menuItemId: input.menuItemId,
      name: input.name,
      required: input.required ?? false,
      multiple: input.multiple ?? false,
      choices: {
        create: input.choices.map((choice) => ({
          name: choice.name,
          description: choice.description,
          dietaryInfo: choice.dietaryInfo,
          imageUrl: choice.imageUrl,
          requestOnly: choice.requestOnly ?? false,
          priceDelta: choice.priceDelta ?? "0.00",
        })),
      },
    },
  });
}

async function seedDemoMenuItems() {
  await prisma.menuItem.updateMany({
    where: {
      name: {
        in: ["Blackened Salmon Bowl"],
      },
    },
    data: {
      available: false,
      archived: true,
    },
  });

  const mealPlans = await upsertCategory("Meal Plans", 1);
  const plates = await upsertCategory("Plates", 2);
  const aLaCarte = await upsertCategory("A La Carte", 3);
  const catering = await upsertCategory("Catering", 4);
  const sides = await upsertCategory("Sides", 5);
  const desserts = await upsertCategory("Desserts", 6);
  const other = await upsertCategory("Other", 7);

  const images = {
    chickenBroccoli: "/gallery/webp/IMG_1487.webp",
    turkeyBowl: "/gallery/webp/IMG_1550.webp",
    stirFry: "/gallery/webp/IMG_1416.webp",
    stuffedPeppers: "/gallery/webp/IMG_1428.webp",
    soulBowl: "/gallery/webp/IMG_1471.webp",
    mealPlan: "/gallery/webp/IMG_1535.webp",
    catering: "/gallery/webp/IMG_1546.webp",
    dessert: "/gallery/webp/IMG_1491.webp",
  };

  const fiveDayPlan = await upsertMenuItem({
    name: "5-Day Balanced Meal Plan",
    description:
      "Ten chef-built meals for the week: lean proteins, seasoned vegetables, and rotating starches portioned for lunch and dinner.",
    price: "165.00",
    type: "MEAL_PLAN",
    categoryId: mealPlans.id,
    imageUrl: images.mealPlan,
    customerInstructionsEnabled: true,
  });

  await createOptionGroup({
    menuItemId: fiveDayPlan.id,
    name: "Weekly Flavor Direction",
    required: true,
    choices: [
      {
        name: "Southern Comfort",
        description: "Smoky, savory plates with greens, rice, and house gravy.",
      },
      {
        name: "Island Heat",
        description: "Jerk-inspired seasoning, citrus, herbs, and roasted veg.",
      },
      {
        name: "Clean & Lean",
        description: "Grilled proteins, bright vegetables, and lighter sauces.",
      },
    ],
  });

  await createOptionGroup({
    menuItemId: fiveDayPlan.id,
    name: "Protein Mix",
    required: true,
    multiple: true,
    choices: [
      {
        name: "Chicken + Turkey",
        description: "Standard lean-protein mix.",
      },
      {
        name: "Add Salmon Rotation",
        description: "Adds seafood portions to the weekly rotation.",
        priceDelta: "18.00",
      },
      {
        name: "Beef Feature",
        description: "Chef-approved specialty prep with market pricing.",
        requestOnly: true,
        priceDelta: "22.00",
      },
    ],
  });

  await syncMenuItemAllergens(fiveDayPlan.id, ["Fish", "Wheat"]);

  const starterPlan = await upsertMenuItem({
    name: "3-Day Starter Meal Plan",
    description:
      "Six meals designed as a lower-commitment intro to weekly prep, with hearty bowls, roasted vegetables, and one signature sauce.",
    price: "99.00",
    type: "MEAL_PLAN",
    categoryId: mealPlans.id,
    imageUrl: images.turkeyBowl,
    customerInstructionsEnabled: true,
  });

  await createOptionGroup({
    menuItemId: starterPlan.id,
    name: "Prep Style",
    required: true,
    choices: [
      {
        name: "Balanced Bowls",
        description: "Protein, vegetable, and starch in each meal.",
      },
      {
        name: "Low-Carb Lean",
        description: "Extra greens and vegetables instead of rice or potatoes.",
        priceDelta: "6.00",
      },
      {
        name: "No Pork or Beef",
        description: "Keep all starter meals poultry, seafood, or vegetarian.",
      },
    ],
  });

  const familyPlan = await upsertMenuItem({
    name: "7-Day Family Meal Plan",
    description:
      "Fourteen family-friendly prepared meals with generous portions, kid-safe spice levels, and reheating notes.",
    price: "225.00",
    type: "MEAL_PLAN",
    categoryId: mealPlans.id,
    imageUrl: images.chickenBroccoli,
    customerInstructionsEnabled: true,
  });

  await createOptionGroup({
    menuItemId: familyPlan.id,
    name: "Family Add-Ons",
    multiple: true,
    choices: [
      {
        name: "Extra Vegetable Portions",
        description: "Adds extra seasonal vegetables across the week.",
        priceDelta: "12.00",
      },
      {
        name: "Kid-Friendly Spice",
        description: "Keep sauces and heat on the side.",
      },
      {
        name: "Family Dessert Sampler",
        description: "Mini sweets packed with the final delivery.",
        priceDelta: "18.00",
      },
    ],
  });

  const wellnessPlan = await upsertMenuItem({
    name: "Custom Wellness Meal Plan",
    description:
      "A chef-reviewed plan for macro goals, training weeks, dietary restrictions, or tighter ingredient preferences.",
    price: "195.00",
    type: "MEAL_PLAN",
    categoryId: mealPlans.id,
    imageUrl: images.soulBowl,
    requiresApproval: true,
    customerInstructionsEnabled: true,
  });

  await createOptionGroup({
    menuItemId: wellnessPlan.id,
    name: "Wellness Goal",
    required: true,
    choices: [
      {
        name: "High Protein",
        description: "Build meals around larger lean-protein portions.",
      },
      {
        name: "Lower Sodium",
        description: "Reduce salt and lean on herbs, acid, and aromatics.",
      },
      {
        name: "Ingredient Review",
        description: "Chef reviews restrictions before confirming the menu.",
        requestOnly: true,
      },
    ],
  });

  const salmonBowl = await upsertMenuItem({
    name: "Blackened Salmon Power Bowl",
    description:
      "Blackened salmon over rice or sweet potatoes with roasted broccoli, peppers, citrus herb drizzle, and scallions.",
    price: "18.00",
    type: "A_LA_CARTE",
    categoryId: aLaCarte.id,
    imageUrl: images.chickenBroccoli,
  });

  await createOptionGroup({
    menuItemId: salmonBowl.id,
    name: "Base",
    required: true,
    choices: [
      { name: "Jasmine Rice", description: "Classic bowl base." },
      { name: "Sweet Potato Hash", description: "Roasted and lightly spiced." },
      {
        name: "Greens Only",
        description: "Extra vegetables instead of starch.",
      },
    ],
  });

  await createOptionGroup({
    menuItemId: salmonBowl.id,
    name: "Finish",
    multiple: true,
    choices: [
      { name: "Citrus Herb Drizzle" },
      { name: "Spicy Garlic Butter", priceDelta: "1.50" },
      { name: "Sauce On The Side" },
    ],
  });

  await syncMenuItemAllergens(salmonBowl.id, ["Fish", "Dairy"]);

  const turkeyWingPlate = await upsertMenuItem({
    name: "Smothered Turkey Wing Plate",
    description:
      "Slow-braised turkey wings over rice with rich pan gravy and a rotating vegetable side.",
    price: "19.00",
    type: "PLATE",
    categoryId: plates.id,
    imageUrl: images.stirFry,
  });

  await createOptionGroup({
    menuItemId: turkeyWingPlate.id,
    name: "Two Sides",
    required: true,
    multiple: true,
    choices: [
      { name: "Garlic Green Beans" },
      { name: "Southern Mac and Cheese", priceDelta: "2.00" },
      { name: "Candied Yams", priceDelta: "2.00" },
      { name: "Cabbage and Smoked Turkey" },
    ],
  });

  await syncMenuItemAllergens(turkeyWingPlate.id, ["Wheat"]);

  const catfishPlate = await upsertMenuItem({
    name: "Lemon Pepper Catfish Plate",
    description:
      "Crispy catfish seasoned with lemon pepper, packed with two sides and a house remoulade cup.",
    price: "18.00",
    type: "PLATE",
    categoryId: plates.id,
    imageUrl: images.stuffedPeppers,
  });

  await createOptionGroup({
    menuItemId: catfishPlate.id,
    name: "Sauce",
    required: true,
    choices: [
      { name: "House Remoulade", description: "Creamy, tangy, lightly spicy." },
      {
        name: "Hot Honey",
        description: "Sweet heat finish.",
        priceDelta: "1.00",
      },
      { name: "No Sauce" },
    ],
  });

  await syncMenuItemAllergens(catfishPlate.id, ["Fish", "Egg", "Wheat"]);

  const bbqChickenPlate = await upsertMenuItem({
    name: "BBQ Chicken Dinner Plate",
    description:
      "BBQ chicken glazed with house sauce, served with mac and cheese, greens, and cornbread crumble.",
    price: "17.00",
    type: "PLATE",
    categoryId: plates.id,
    imageUrl: images.catering,
  });

  await createOptionGroup({
    menuItemId: bbqChickenPlate.id,
    name: "BBQ Sauce",
    required: true,
    choices: [
      { name: "Sweet Heat" },
      { name: "Tangy Carolina" },
      { name: "Sauce On The Side" },
    ],
  });

  await syncMenuItemAllergens(bbqChickenPlate.id, ["Dairy", "Wheat"]);

  const veggiePlate = await upsertMenuItem({
    name: "Veggie Soul Bowl Plate",
    description:
      "Black beans, sweet potatoes, greens, roasted vegetables, rice, and green herb sauce for a hearty meatless plate.",
    price: "15.00",
    type: "PLATE",
    categoryId: plates.id,
    imageUrl: images.soulBowl,
  });

  await createOptionGroup({
    menuItemId: veggiePlate.id,
    name: "Add-On Protein",
    choices: [
      { name: "No Protein" },
      { name: "Jerk Chicken", priceDelta: "5.00" },
      { name: "Salmon", priceDelta: "8.00", requestOnly: true },
    ],
  });

  const jerkChicken = await upsertMenuItem({
    name: "Jerk Chicken Plate",
    description:
      "Jerk-marinated chicken with coconut rice, peppers, roasted vegetables, and a cooling herb sauce.",
    price: "16.00",
    type: "A_LA_CARTE",
    categoryId: aLaCarte.id,
    imageUrl: images.stirFry,
  });

  await createOptionGroup({
    menuItemId: jerkChicken.id,
    name: "Heat Level",
    required: true,
    choices: [{ name: "Mild" }, { name: "Medium" }, { name: "Hot" }],
  });

  const turkeyBowl = await upsertMenuItem({
    name: "Turkey Meatball Bowl",
    description:
      "Turkey meatballs in tomato gravy with black beans, sweet potato, cilantro, lime, and avocado-style crema.",
    price: "15.00",
    type: "A_LA_CARTE",
    categoryId: aLaCarte.id,
    imageUrl: images.turkeyBowl,
  });

  await createOptionGroup({
    menuItemId: turkeyBowl.id,
    name: "Bowl Base",
    required: true,
    choices: [
      { name: "Rice + Beans" },
      { name: "Sweet Potato + Greens" },
      { name: "Half Rice / Half Greens" },
    ],
  });

  const shrimpPasta = await upsertMenuItem({
    name: "Cajun Shrimp Pasta Cup",
    description:
      "A single-serve creamy Cajun pasta with shrimp, peppers, onions, herbs, and parmesan.",
    price: "14.00",
    type: "A_LA_CARTE",
    categoryId: aLaCarte.id,
    imageUrl: images.catering,
  });

  await createOptionGroup({
    menuItemId: shrimpPasta.id,
    name: "Pasta Finish",
    choices: [
      { name: "Extra Cajun Cream", priceDelta: "1.50" },
      { name: "Add Broccoli", priceDelta: "2.00" },
      { name: "Light Sauce" },
    ],
  });

  await syncMenuItemAllergens(shrimpPasta.id, ["Shellfish", "Dairy", "Wheat"]);

  const consultation = await upsertMenuItem({
    name: "Catering Consultation",
    description:
      "Start a catered event quote with menu direction, guest count, service style, and dietary needs.",
    price: "0.00",
    type: "CATERING",
    categoryId: catering.id,
    imageUrl: images.catering,
    requiresApproval: true,
  });

  await createOptionGroup({
    menuItemId: consultation.id,
    name: "Event Style",
    required: true,
    choices: [
      { name: "Drop-Off Catering" },
      { name: "Buffet Setup" },
      { name: "Private Chef Service", requestOnly: true },
    ],
  });

  const buffet = await upsertMenuItem({
    name: "Small Event Buffet",
    description:
      "Buffet-style package for intimate events with one protein, two sides, salad, rolls, and serving utensils.",
    price: "350.00",
    type: "CATERING",
    categoryId: catering.id,
    imageUrl: images.catering,
    requiresApproval: true,
    customerInstructionsEnabled: true,
  });

  await createOptionGroup({
    menuItemId: buffet.id,
    name: "Protein Feature",
    required: true,
    choices: [
      { name: "BBQ Chicken" },
      { name: "Smothered Turkey Wings", priceDelta: "45.00" },
      { name: "Salmon Tray", priceDelta: "85.00", requestOnly: true },
    ],
  });

  const corporate = await upsertMenuItem({
    name: "Corporate Lunch Drop-Off",
    description:
      "Individually packed lunch service for meetings and trainings with labels, utensils, and simple dietary sorting.",
    price: "275.00",
    type: "CATERING",
    categoryId: catering.id,
    imageUrl: images.mealPlan,
    requiresApproval: true,
    customerInstructionsEnabled: true,
  });

  await createOptionGroup({
    menuItemId: corporate.id,
    name: "Lunch Format",
    required: true,
    choices: [
      { name: "Bowls" },
      { name: "Sandwich + Side Boxes" },
      { name: "Mixed Entree Boxes", priceDelta: "35.00" },
    ],
  });

  const grazing = await upsertMenuItem({
    name: "Celebration Grazing Table",
    description:
      "A request-only party spread with savory bites, fresh produce, dips, small desserts, and styled setup.",
    price: "425.00",
    type: "CATERING",
    categoryId: catering.id,
    imageUrl: images.dessert,
    requiresApproval: true,
    customerInstructionsEnabled: true,
  });

  await createOptionGroup({
    menuItemId: grazing.id,
    name: "Grazing Add-Ons",
    multiple: true,
    choices: [
      { name: "Mini Dessert Cups", priceDelta: "48.00" },
      { name: "Warm Appetizer Tray", priceDelta: "75.00" },
      { name: "Theme Styling", requestOnly: true },
    ],
  });

  const greenBeans = await upsertMenuItem({
    name: "Garlic Green Beans",
    description:
      "Tender green beans sauteed with garlic, onion, pepper, and a savory pan finish.",
    price: "6.00",
    type: "SIDE",
    categoryId: sides.id,
    imageUrl: images.chickenBroccoli,
  });

  await createOptionGroup({
    menuItemId: greenBeans.id,
    name: "Portion",
    required: true,
    choices: [
      { name: "Single Side" },
      { name: "Pint", priceDelta: "6.00" },
      { name: "Quart", priceDelta: "16.00" },
    ],
  });

  const mac = await upsertMenuItem({
    name: "Southern Mac and Cheese",
    description:
      "Baked mac and cheese with a creamy seasoned cheese blend and golden top.",
    price: "7.00",
    type: "SIDE",
    categoryId: sides.id,
    imageUrl: images.catering,
  });

  await syncMenuItemAllergens(mac.id, ["Dairy", "Wheat"]);

  const yams = await upsertMenuItem({
    name: "Candied Yams",
    description:
      "Sweet potatoes simmered with brown sugar, warm spice, and a glossy butter finish.",
    price: "7.00",
    type: "SIDE",
    categoryId: sides.id,
    imageUrl: images.soulBowl,
    seasonal: true,
  });

  await syncMenuItemAllergens(yams.id, ["Dairy"]);

  const cabbage = await upsertMenuItem({
    name: "Cabbage and Smoked Turkey",
    description:
      "Tender cabbage cooked with smoked turkey flavor and house seasoning.",
    price: "7.00",
    type: "SIDE",
    categoryId: sides.id,
    imageUrl: images.stirFry,
  });

  await createOptionGroup({
    menuItemId: cabbage.id,
    name: "Seasoning",
    choices: [
      { name: "Classic" },
      { name: "Extra Pepper" },
      { name: "No Meat Flavor", requestOnly: true },
    ],
  });

  const dessertCups = await upsertMenuItem({
    name: "Mini Dessert Cups",
    description:
      "Assorted mini dessert cups for events or add-on orders, packed by the dozen.",
    price: "24.00",
    type: "DESSERT",
    categoryId: desserts.id,
    imageUrl: images.dessert,
  });

  await createOptionGroup({
    menuItemId: dessertCups.id,
    name: "Flavor Set",
    required: true,
    choices: [
      { name: "Banana Pudding" },
      { name: "Strawberry Crunch" },
      { name: "Mixed Dozen", priceDelta: "4.00" },
    ],
  });

  await syncMenuItemAllergens(dessertCups.id, ["Dairy", "Wheat"]);

  const cobbler = await upsertMenuItem({
    name: "Peach Cobbler Pan",
    description:
      "A shareable peach cobbler pan with buttery crust, syrupy peaches, and warm spice.",
    price: "28.00",
    type: "DESSERT",
    categoryId: desserts.id,
    imageUrl: images.dessert,
    seasonal: true,
  });

  await syncMenuItemAllergens(cobbler.id, ["Dairy", "Wheat"]);

  const pudding = await upsertMenuItem({
    name: "Banana Pudding Cups",
    description:
      "Layered banana pudding cups with vanilla wafers, whipped topping, and banana slices.",
    price: "24.00",
    type: "DESSERT",
    categoryId: desserts.id,
    imageUrl: images.dessert,
  });

  await syncMenuItemAllergens(pudding.id, ["Dairy", "Wheat"]);

  const cheesecake = await upsertMenuItem({
    name: "Sweet Potato Cheesecake Bites",
    description:
      "Mini cheesecake bites with sweet potato filling and spiced crumble.",
    price: "26.00",
    type: "DESSERT",
    categoryId: desserts.id,
    imageUrl: images.dessert,
  });

  await syncMenuItemAllergens(cheesecake.id, ["Dairy", "Egg", "Wheat"]);

  const seasonalSpecial = await upsertMenuItem({
    name: "Chef's Seasonal Special",
    description:
      "A rotating request-only item for limited runs, market finds, and weekend specials.",
    price: "20.00",
    type: "OTHER",
    categoryId: other.id,
    imageUrl: images.stuffedPeppers,
    seasonal: true,
    requiresApproval: true,
    customerInstructionsEnabled: true,
  });

  await createOptionGroup({
    menuItemId: seasonalSpecial.id,
    name: "Special Direction",
    required: true,
    choices: [
      { name: "Comfort Plate" },
      { name: "Seafood Feature", requestOnly: true, priceDelta: "8.00" },
      { name: "Vegetarian Feature" },
    ],
  });

  const sauceFlight = await upsertMenuItem({
    name: "Sauce Flight",
    description:
      "Three house sauces packaged as an add-on for plates, sides, or meal plans.",
    price: "9.00",
    type: "OTHER",
    categoryId: other.id,
    imageUrl: images.catering,
  });

  await createOptionGroup({
    menuItemId: sauceFlight.id,
    name: "Choose Three",
    required: true,
    multiple: true,
    choices: [
      { name: "Jerk Honey" },
      { name: "Citrus Herb" },
      { name: "Spicy Garlic Butter" },
      { name: "House BBQ" },
      { name: "Avocado Lime Crema" },
    ],
  });

  const familyAddOn = await upsertMenuItem({
    name: "Family Heat-and-Serve Add-On",
    description:
      "A flexible family-size add-on for reheatable portions, extra proteins, or special request trays.",
    price: "45.00",
    type: "OTHER",
    categoryId: other.id,
    imageUrl: images.mealPlan,
    requiresApproval: true,
    customerInstructionsEnabled: true,
  });

  await createOptionGroup({
    menuItemId: familyAddOn.id,
    name: "Tray Type",
    required: true,
    choices: [
      { name: "Extra Protein Tray", priceDelta: "20.00" },
      { name: "Vegetable Tray" },
      { name: "Chef's Choice Family Pan", requestOnly: true },
    ],
  });

  console.log("Demo menu items ready.");

  return {
    fiveDayPlan,
  };
}

async function seedDemoBusinessSettings() {
  const settings = await prisma.businessSettings.upsert({
    where: {
      id: DEMO_BUSINESS_SETTINGS_ID,
    },
    update: {
      lateFee: "10.00",
      checkoutCustomerSchedulingEnabled: false,
      checkoutFixedFulfillmentDay: 0,
      checkoutFixedFulfillmentHour: null,
      checkoutFixedFulfillmentMinute: null,
      checkoutFixedFulfillmentMessage: DEMO_WEEKLY_FULFILLMENT_MESSAGE,
      weeklyCustomerSchedulingEnabled:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyCustomerSchedulingEnabled,
      weeklyOrderingOpenDay:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyOrderingOpenDay,
      weeklyOrderingOpenHour:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyOrderingOpenHour,
      weeklyOrderingOpenMinute:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyOrderingOpenMinute,
      weeklyLateFeeStartDay:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyLateFeeStartDay,
      weeklyLateFeeStartHour:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyLateFeeStartHour,
      weeklyLateFeeStartMinute:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyLateFeeStartMinute,
      weeklyOrderingCloseDay:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyOrderingCloseDay,
      weeklyOrderingCloseHour:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyOrderingCloseHour,
      weeklyOrderingCloseMinute:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyOrderingCloseMinute,
      weeklyFixedFulfillmentDay:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyFixedFulfillmentDay,
      weeklyFixedFulfillmentHour:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyFixedFulfillmentHour,
      weeklyFixedFulfillmentMinute:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyFixedFulfillmentMinute,
      weeklyFixedFulfillmentMessage: DEMO_WEEKLY_FULFILLMENT_MESSAGE,
    },
    create: {
      id: DEMO_BUSINESS_SETTINGS_ID,
      lateFee: "10.00",
      checkoutCustomerSchedulingEnabled: false,
      checkoutFixedFulfillmentDay: 0,
      checkoutFixedFulfillmentHour: null,
      checkoutFixedFulfillmentMinute: null,
      checkoutFixedFulfillmentMessage: DEMO_WEEKLY_FULFILLMENT_MESSAGE,
      weeklyCustomerSchedulingEnabled:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyCustomerSchedulingEnabled,
      weeklyOrderingOpenDay:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyOrderingOpenDay,
      weeklyOrderingOpenHour:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyOrderingOpenHour,
      weeklyOrderingOpenMinute:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyOrderingOpenMinute,
      weeklyLateFeeStartDay:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyLateFeeStartDay,
      weeklyLateFeeStartHour:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyLateFeeStartHour,
      weeklyLateFeeStartMinute:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyLateFeeStartMinute,
      weeklyOrderingCloseDay:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyOrderingCloseDay,
      weeklyOrderingCloseHour:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyOrderingCloseHour,
      weeklyOrderingCloseMinute:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyOrderingCloseMinute,
      weeklyFixedFulfillmentDay:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyFixedFulfillmentDay,
      weeklyFixedFulfillmentHour:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyFixedFulfillmentHour,
      weeklyFixedFulfillmentMinute:
        DEMO_WEEKLY_SCHEDULE_SETTINGS.weeklyFixedFulfillmentMinute,
      weeklyFixedFulfillmentMessage: DEMO_WEEKLY_FULFILLMENT_MESSAGE,
    },
  });

  console.log("Demo business settings ready.");

  return settings;
}

async function seedWeeklyMealPlans() {
  const now = new Date();

  const startDate = new Date(now);
  startDate.setDate(now.getDate() + 7);
  startDate.setHours(0, 0, 0, 0);

  const endDate = new Date(startDate);
  endDate.setDate(startDate.getDate() + 6);
  endDate.setHours(23, 59, 59, 999);

  const weeklySchedule = resolveWeeklyPeriodSchedule({
    period: {
      startDate,
      endDate,
    },
    settings: DEMO_WEEKLY_SCHEDULE_SETTINGS,
    timeZone: weeklyMenuTimeZone,
  });
  const orderCutoffAt = weeklySchedule.orderingClosesAt;

  const existingPeriod = await prisma.weeklyMenuPeriod.findFirst({
    where: {
      label: "Demo Weekly Menu",
    },
    select: {
      id: true,
    },
  });

  const period = existingPeriod
    ? await prisma.weeklyMenuPeriod.update({
        where: {
          id: existingPeriod.id,
        },
        data: {
          startDate,
          endDate,
          orderCutoffAt,
          orderingOpenAt: weeklySchedule.orderingOpenAt,
          lateFeeStartsAt: weeklySchedule.lateFeeStartsAt,
          orderingClosesAt: weeklySchedule.orderingClosesAt,
          fixedFulfillmentAt: weeklySchedule.fixedFulfillmentAt,
          customerSchedulingEnabled: weeklySchedule.customerSchedulingEnabled,
          deliveryWindowLabel: weeklySchedule.deliveryWindowLabel,
          fulfillmentNotes:
            "Demo weekly menu for testing package and offering selection.",
          status: "PUBLISHED",
          capacity: 25,
          ordersPlaced: 0,
        },
      })
    : await prisma.weeklyMenuPeriod.create({
        data: {
          label: "Demo Weekly Menu",
          startDate,
          endDate,
          orderCutoffAt,
          orderingOpenAt: weeklySchedule.orderingOpenAt,
          lateFeeStartsAt: weeklySchedule.lateFeeStartsAt,
          orderingClosesAt: weeklySchedule.orderingClosesAt,
          fixedFulfillmentAt: weeklySchedule.fixedFulfillmentAt,
          customerSchedulingEnabled: weeklySchedule.customerSchedulingEnabled,
          deliveryWindowLabel: weeklySchedule.deliveryWindowLabel,
          fulfillmentNotes:
            "Demo weekly menu for testing package and offering selection.",
          status: "PUBLISHED",
          capacity: 25,
          ordersPlaced: 0,
        },
      });

  await prisma.weeklyMealPlanAllowedOption.deleteMany({
    where: {
      offering: {
        periodId: period.id,
      },
    },
  });

  await prisma.allergenWeeklyMealPlanOffering.deleteMany({
    where: {
      offering: {
        periodId: period.id,
      },
    },
  });

  await prisma.weeklyMealPlanOffering.deleteMany({
    where: {
      periodId: period.id,
    },
  });

  await prisma.weeklyMealPlanPackage.deleteMany({
    where: {
      periodId: period.id,
    },
  });

  await prisma.weeklyMealPlanPackage.createMany({
    data: [
      {
        periodId: period.id,
        name: "5-Day / 2 Meals Per Day",
        days: 5,
        mealsPerDay: 2,
        price: "165.00",
        available: true,
        mealSlotLabels: ["Lunch", "Dinner"],
        displayOrder: 1,
        notes: "Ten lunch and dinner meals total.",
      },
      {
        periodId: period.id,
        name: "5-Day / 3 Meals Per Day",
        days: 5,
        mealsPerDay: 3,
        price: "240.00",
        available: true,
        requiresChefApproval: true,
        mealSlotLabels: ["Breakfast", "Lunch", "Dinner"],
        displayOrder: 2,
        notes:
          "Fifteen meals total. Includes Breakfast, Lunch, and Dinner slots.",
      },
      {
        periodId: period.id,
        name: "3-Day / 2 Meals Per Day",
        days: 3,
        mealsPerDay: 2,
        price: "99.00",
        available: true,
        isSeasonal: true,
        mealSlotLabels: ["Lunch", "Dinner"],
        displayOrder: 3,
        notes: "Seasonal short-week lunch and dinner demo package.",
      },
    ],
  });

  const offerings = [
    {
      name: "Island Chicken Meal Plan",
      description:
        "Jerk-inspired chicken with vegetables and rice or sweet potato.",
      dietaryInfo: "Dairy-free option available.",
      displayOrder: 1,
      breakfastOnly: false,
    },
    {
      name: "Salmon Wellness Meal Plan",
      description:
        "Salmon-focused weekly prep with vegetables and healthy starches.",
      dietaryInfo: "Pescatarian-friendly.",
      displayOrder: 2,
      breakfastOnly: false,
    },
    {
      name: "Turkey Power Bowl Prep",
      description:
        "Turkey-based prep bowls with vegetables and balanced starch portions.",
      dietaryInfo: "High-protein option.",
      displayOrder: 3,
      breakfastOnly: false,
    },
    {
      name: "Lemon Herb Chicken & Greens",
      description:
        "Grilled lemon herb chicken with seasoned greens and roasted sweet potatoes.",
      dietaryInfo: "Gluten-free option available.",
      displayOrder: 4,
      breakfastOnly: false,
    },
    {
      name: "Turkey Sausage Breakfast Scramble",
      description:
        "Turkey sausage, eggs, peppers, onions, and roasted breakfast potatoes.",
      dietaryInfo: "Breakfast-only weekly offering.",
      displayOrder: 5,
      breakfastOnly: true,
    },
    {
      name: "Sweet Potato Breakfast Hash",
      description:
        "Roasted sweet potatoes, peppers, onions, greens, and seasoned breakfast protein.",
      dietaryInfo: "Breakfast-only weekly offering.",
      displayOrder: 6,
      breakfastOnly: true,
    },
    {
      name: "Berry Oat Breakfast Bowl",
      description:
        "Overnight oats with berries, cinnamon, and a balanced breakfast topping.",
      dietaryInfo: "Breakfast-only weekly offering.",
      displayOrder: 7,
      breakfastOnly: true,
    },
  ];

  for (const offeringData of offerings) {
    const offering = await prisma.weeklyMealPlanOffering.create({
      data: {
        periodId: period.id,
        name: offeringData.name,
        description: offeringData.description,
        dietaryInfo: offeringData.dietaryInfo,
        available: true,
        breakfastOnly: offeringData.breakfastOnly ?? false,
        displayOrder: offeringData.displayOrder,
      },
    });

    await prisma.weeklyMealPlanAllowedOption.createMany({
      data: [
        {
          offeringId: offering.id,
          optionType: "SPICE_LEVEL",
          name: "Mild",
          priceDelta: "0.00",
          available: true,
          displayOrder: 1,
        },
        {
          offeringId: offering.id,
          optionType: "SPICE_LEVEL",
          name: "Medium",
          priceDelta: "0.00",
          available: true,
          displayOrder: 2,
        },
        {
          offeringId: offering.id,
          optionType: "SPICE_LEVEL",
          name: "Hot",
          priceDelta: "0.00",
          available: true,
          displayOrder: 3,
        },
        {
          offeringId: offering.id,
          optionType: "PROTEIN_SUBSTITUTION",
          name: "No substitution",
          priceDelta: "0.00",
          available: true,
          displayOrder: 1,
        },
        {
          offeringId: offering.id,
          optionType: "PROTEIN_SUBSTITUTION",
          name: "Extra 3oz Protein",
          priceDelta: "2.00",
          available: true,
          displayOrder: 2,
        },
        {
          offeringId: offering.id,
          optionType: "PROTEIN_SUBSTITUTION",
          name: "Extra 5oz Seafood",
          priceDelta: "4.50",
          available: true,
          displayOrder: 3,
        },
        {
          offeringId: offering.id,
          optionType: "PROTEIN_SUBSTITUTION",
          name: "Beef Request",
          description:
            "Available by request only. Not included in standard meal plans.",
          priceDelta: "0.00",
          requestOnly: true,
          requiresApproval: true,
          available: true,
          displayOrder: 4,
        },
      ],
    });
  }

  console.log("Demo weekly meal plans ready.");

  return period;
}

async function main() {
  await seedDemoUser();
  await seedDemoBusinessSettings();
  await seedDemoMenuItems();
  await seedWeeklyMealPlans();

  const weeklyPeriodCount = await prisma.weeklyMenuPeriod.count();
  const weeklyPackageCount = await prisma.weeklyMealPlanPackage.count();
  const weeklyOfferingCount = await prisma.weeklyMealPlanOffering.count();

  console.log({
    weeklyPeriodCount,
    weeklyPackageCount,
    weeklyOfferingCount,
  });

  console.log("Demo data foundation seeded.");
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
