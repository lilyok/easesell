import type { ProductMatch } from "@/lib/types";

/** Demo catalog used by the mock reverse-image provider. */
export const MOCK_CATALOG: ProductMatch[] = [
  {
    title: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones",
    description:
      "Industry-leading noise cancellation with dual processors, 30-hour battery life, and crystal-clear call quality. Soft fit leather ear cushions. Used but well cared for.",
    originalPrice: 399.99,
    currency: "USD",
    source: "amazon",
    sourceUrl: "https://www.amazon.com/dp/B09XS7JWHH",
    confidence: 0.94,
  },
  {
    title: "Apple AirPods Pro (2nd generation) with MagSafe Case",
    description:
      "Active Noise Cancellation, Adaptive Transparency, and personalized Spatial Audio. Includes MagSafe charging case. Light cosmetic wear on the case.",
    originalPrice: 249.0,
    currency: "USD",
    source: "amazon",
    sourceUrl: "https://www.amazon.com/dp/B0CHWRXH8B",
    confidence: 0.91,
  },
  {
    title: "Instant Pot Duo Plus 9-in-1 Electric Pressure Cooker, 6 Qt",
    description:
      "Pressure cook, slow cook, sauté, steam, and more. Stainless steel inner pot. Excellent working condition with minor exterior scuffs.",
    originalPrice: 129.99,
    currency: "USD",
    source: "amazon",
    sourceUrl: "https://www.amazon.com/dp/B07W55DDFB",
    confidence: 0.88,
  },
  {
    title: "Kindle Paperwhite (16 GB) — Waterproof E-reader",
    description:
      "6.8\" glare-free display, adjustable warm light, weeks of battery life. Perfect for reading on the go. Screen is clean and scratch-free.",
    originalPrice: 149.99,
    currency: "USD",
    source: "amazon",
    sourceUrl: "https://www.amazon.com/dp/B08N36XNTT",
    confidence: 0.9,
  },
  {
    title: "Ninja Foodi PossibleCooker Pro 8.5 Qt Multi-Cooker",
    description:
      "Slow cooker, steamer, sear, and more in one versatile pot. Includes cooking pot and utensil. Barely used, like-new condition.",
    originalPrice: 169.99,
    currency: "USD",
    source: "amazon",
    sourceUrl: "https://www.amazon.com/dp/B0BXQZ7V9R",
    confidence: 0.86,
  },
  {
    title: "Dyson V8 Absolute Cordless Vacuum",
    description:
      "Powerful suction for whole-home cleaning. Includes multiple attachments. Battery holds a solid charge; some wear on the wand.",
    originalPrice: 449.99,
    currency: "USD",
    source: "amazon",
    sourceUrl: "https://www.amazon.com/dp/B07FHY51P2",
    confidence: 0.87,
  },
  {
    title: "LEGO Creator Expert Modular Building Set",
    description:
      "Detailed modular building with interiors and minifigures. Complete set with instructions. Displayed carefully, never played with roughly.",
    originalPrice: 199.99,
    currency: "USD",
    source: "other",
    sourceUrl: "https://www.lego.com/",
    confidence: 0.78,
  },
  {
    title: "Patagonia Better Sweater Fleece Jacket — Men's Medium",
    description:
      "Classic full-zip fleece with soft interior and durable face fabric. Warm, versatile layer. Gently worn with no holes or stains.",
    originalPrice: 149.0,
    currency: "USD",
    source: "other",
    sourceUrl: "https://www.patagonia.com/",
    confidence: 0.82,
  },
  {
    title: "Nintendo Switch OLED Model — White",
    description:
      "7-inch OLED screen, enhanced audio, and 64 GB storage. Includes dock and Joy-Con controllers. Light use, screen protector applied.",
    originalPrice: 349.99,
    currency: "USD",
    source: "amazon",
    sourceUrl: "https://www.amazon.com/dp/B098RKWHHZ",
    confidence: 0.93,
  },
  {
    title: "Cuisinart 14-Cup Food Processor",
    description:
      "Powerful motor with large work bowl, slicing disc, and dough blade. Kitchen workhorse in great shape. All original accessories included.",
    originalPrice: 229.95,
    currency: "USD",
    source: "amazon",
    sourceUrl: "https://www.amazon.com/dp/B00LZUQ6YS",
    confidence: 0.85,
  },
];
