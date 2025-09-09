import Image from "next/image";

interface GrowPageProps {
  params: {
    name: string;
  };
}

interface MushroomData {
  common: string;
  species: string;
  intro: string;
  materials: {
    title: string;
    items: { name: string; subItems?: string[] }[];
  };
  steps: {
    title: string;
    description?: string;
    subSteps?: string[];
  }[];
  tips?: string[];
  enhancements?: string[];
  facts: { temperature: string; humidity: string; air: string };
  img?: string;
}

const growData: Record<string, MushroomData> = {
  oyster: {
    common: "Oyster",
    species: "Pleurotus ostreatus",
    intro:
      "Oyster mushrooms are one of the easiest gourmet mushrooms to grow, making them ideal for beginners and small-scale growers, as they are highly adaptable and thrive on a variety of cellulose-rich substrates such as straw, sawdust, coffee grounds, or agricultural waste. They grow quickly under proper conditions and can produce multiple flushes over a short period, providing both a rewarding and educational experience. Beyond their ease of cultivation, oyster mushrooms are highly nutritious, containing protein, fiber, vitamins, and minerals, and they are praised for their delicate, slightly sweet flavor and tender texture, making them popular in culinary dishes around the world. Cultivating oyster mushrooms also teaches important aspects of mushroom growing such as substrate preparation, humidity control, air exchange, and hygiene, and with careful attention, they can provide both a plentiful harvest and an enjoyable learning process for anyone interested in fungi cultivation.",
    materials: {
      title: "Materials Needed",
      items: [
        {
          name: "Mushroom spawn",
          subItems: ["Grain spawn", "Sawdust spawn", "Plug spawn (for logs)"],
        },
        {
          name: "Substrate",
          subItems: [
            "Straw",
            "Sawdust",
            "Coffee grounds",
            "Cardboard or agricultural waste",
          ],
        },
        {
          name: "Containers or bags",
          subItems: [
            "Plastic grow bags with filter patches",
            "Buckets, trays, or containers",
          ],
        },
        {
          name: "Equipment",
          subItems: [
            "Large pot or drum",
            "Thermometer (optional)",
            "Water for soaking",
            "Spray bottle",
            "Gloves and mask (optional)",
          ],
        },
      ],
    },
    steps: [
      {
        title: "Substrate Preparation",
        description:
          "Chop or shred straw into 2–4 inch pieces. Pasteurize to kill unwanted organisms:",
        subSteps: [
          "Heat water to 65–75 °C",
          "Soak substrate for 1–2 hours",
          "Drain excess water; substrate should be damp but not dripping",
          "Alternative: Sterilize sawdust in pressure cooker at 121 °C for 1–2 hours",
        ],
      },
      {
        title: "Inoculation (Spawning)",
        description:
          "Work in clean conditions to reduce contamination. Mix substrate with mushroom spawn:",
        subSteps: [
          "Typical ratio: 5–10% spawn by weight for straw, 10–20% for sawdust",
          "Fill the mixture into bags or containers, lightly compacting but not compressing",
        ],
      },
      {
        title: "Incubation",
        subSteps: [
          "Store in dark, warm place: 20–25 °C",
          "Keep environment humid: ~70–80%",
          "Mycelium colonizes substrate in 2–3 weeks",
          "Avoid direct sunlight",
        ],
      },
      {
        title: "Fruiting Conditions",
        subSteps: [
          "Move colonized substrate to bright, indirect light",
          "Maintain high humidity: 85–95%",
          "Provide fresh air exchange",
          "Ideal temperature: 18–24 °C",
        ],
      },
      {
        title: "Pinning",
        description:
          "Small “pins” appear within 3–7 days, growing into mushrooms.",
      },
      {
        title: "Harvesting",
        subSteps: [
          "Harvest when caps are fully formed but not flattened",
          "Twist gently or cut at base",
          "Subsequent flushes over 2–3 weeks",
        ],
      },
    ],
    tips: [
      "Hygiene is crucial",
      "Maintain proper moisture balance",
      "Air circulation prevents leggy mushrooms",
      "Track temperature, humidity, and flushes",
    ],
    enhancements: [
      "Enrich straw with bran (5–10%) for larger yields",
      "Use polypropylene bags with filter patches",
      "Automate humidity with humidifier",
    ],
    facts: {
      temperature: "20 - 25°C",
      humidity: "80 - 95%",
      air: "High",
    },
  },

  shiitake: {
    common: "Shiitake",
    species: "Lentinula edodes",
    intro:
      "Shiitake mushrooms are native to East Asia and are highly valued for their rich, savory flavor and health-promoting properties, traditionally cultivated on hardwood logs or sawdust blocks which require specific care and patience. They offer a meaty texture and deep umami taste, making them a staple in many culinary traditions, and are also celebrated for potential benefits including immune support, cholesterol reduction, and antioxidant effects. Cultivating shiitake teaches careful management of temperature, moisture, and light, as they require a cooler incubation period and a cold shock to trigger fruiting, and although they are more demanding than oyster mushrooms, successful cultivation on logs or blocks can provide multiple harvests over several years, making them a highly rewarding experience for both beginners and experienced growers alike.",
    materials: {
      title: "Materials Needed",
      items: [
        {
          name: "Mushroom spawn",
          subItems: ["Sawdust spawn", "Plug spawn for logs"],
        },
        {
          name: "Substrate",
          subItems: ["Hardwood logs (oak, beech)", "Sawdust blocks"],
        },
        {
          name: "Containers or logs",
          subItems: ["Logs or plastic containers for blocks"],
        },
        {
          name: "Equipment",
          subItems: [
            "Drill for logs",
            "Hammer for plugs",
            "Water for soaking",
            "Gloves",
          ],
        },
      ],
    },
    steps: [
      {
        title: "Log Preparation",
        subSteps: [
          "Select fresh hardwood logs",
          "Cut to manageable length (3–4 feet)",
          "Drill holes for plug spawn",
        ],
      },
      {
        title: "Inoculation",
        subSteps: ["Insert plug spawn into holes", "Seal holes with wax"],
      },
      {
        title: "Incubation",
        subSteps: [
          "Store logs in shade, humid environment",
          "Logs may colonize in 6–12 months",
        ],
      },
      {
        title: "Fruiting",
        subSteps: [
          "Soak logs in water for 24 hours",
          "Place in bright, humid conditions",
        ],
      },
      {
        title: "Harvesting",
        subSteps: [
          "Pick mushrooms when caps open but edges still curled",
          "Twist or cut at base",
        ],
      },
    ],
    tips: [
      "Avoid direct sunlight during incubation",
      "Keep logs moist for best yields",
      "Rotate logs for even colonization",
    ],
    enhancements: [
      "Supplement logs with sawdust blocks for continuous harvest",
      "Use shade cloth to regulate light",
    ],
    facts: { temperature: "12 - 20°C", humidity: "85 - 95%", air: "Moderate" },
  },

  velvetshank: {
    common: "Velvet Shank",
    species: "Flammulina velutipes",
    intro:
      "Velvet Shank, known as Enoki when cultivated, is a winter-fruiting mushroom that naturally grows on dead or dying hardwood trees and produces long, thin stems with small caps prized in Asian cuisine, especially when grown in the dark to achieve the characteristic white appearance. These mushrooms are low in calories but high in fiber and antioxidants, offering a crisp, slightly fruity flavor, and have been studied for immune-boosting and anti-inflammatory properties, making them both a nutritious and flavorful addition to meals. Cultivating Velvet Shank requires careful control of cold temperatures and high humidity, with minimal light exposure to ensure proper stem elongation, and the process teaches patience and precision, as careful environmental management is essential to produce high-quality Enoki mushrooms suitable for culinary use.",
    materials: {
      title: "Materials Needed",
      items: [
        { name: "Mushroom spawn", subItems: ["Sawdust spawn"] },
        {
          name: "Substrate",
          subItems: ["Pasteurized sawdust", "Hardwood chips"],
        },
        { name: "Containers", subItems: ["Plastic bags or jars"] },
        {
          name: "Equipment",
          subItems: ["Humidity tent or chamber", "Spray bottle", "Gloves"],
        },
      ],
    },
    steps: [
      {
        title: "Substrate Preparation",
        subSteps: [
          "Sterilize or pasteurize sawdust",
          "Fill into containers or bags",
        ],
      },
      {
        title: "Inoculation",
        subSteps: ["Mix sawdust spawn into substrate under clean conditions"],
      },
      {
        title: "Incubation",
        subSteps: [
          "Store in dark, cool environment (3–10 °C)",
          "Wait 2–4 weeks for colonization",
        ],
      },
      {
        title: "Fruiting",
        subSteps: [
          "Move to dark environment for long stems",
          "Maintain high humidity: 85–95%",
        ],
      },
      {
        title: "Harvesting",
        subSteps: [
          "Harvest when stems are long and caps small",
          "Cut at base gently",
        ],
      },
    ],
    tips: [
      "Keep environment cold for optimal stem elongation",
      "Avoid contamination",
    ],
    enhancements: [
      "Grow in dark for white stems",
      "Use controlled temperature rooms",
    ],
    facts: { temperature: "3 - 10°C", humidity: "85 - 95%", air: "Moderate" },
  },

  puffball: {
    common: "Puffball",
    species: "Lycoperdon perlatum",
    intro:
      "Puffball mushrooms are round, spore-filled fungi that release a distinctive cloud of spores when mature and can be grown on nutrient-rich soil or composted substrates, though they are less commonly cultivated than oyster or shiitake mushrooms. They are edible when young, offering a mild, slightly nutty flavor and firm texture, and are rich in protein, fiber, and antioxidants, making them a nutritious option for foragers and home growers. Growing puffballs requires indirect light, consistent moisture, and well-drained substrates, teaching careful observation and patience, and while they are slower and less predictable than other gourmet mushrooms, successfully cultivating them can provide a unique and rewarding experience, as well as an opportunity to explore unusual and interesting fungi in a home garden.",
    materials: {
      title: "Materials Needed",
      items: [
        { name: "Mushroom spawn", subItems: ["Grain or sawdust spawn"] },
        { name: "Substrate", subItems: ["Composted soil", "Rich garden soil"] },
        { name: "Containers", subItems: ["Trays or pots"] },
      ],
    },
    steps: [
      {
        title: "Substrate Preparation",
        subSteps: [
          "Fill trays with rich soil or compost",
          "Moisten thoroughly",
        ],
      },
      {
        title: "Inoculation",
        subSteps: [
          "Mix spawn into top layer of soil",
          "Cover lightly with soil",
        ],
      },
      {
        title: "Incubation",
        subSteps: ["Keep in shaded area", "Maintain moisture for 2–3 weeks"],
      },
      {
        title: "Fruiting",
        subSteps: ["Provide indirect light", "Maintain humidity 80–90%"],
      },
      {
        title: "Harvesting",
        subSteps: [
          "Pick when round puffballs are firm",
          "Do not wait until spores released",
        ],
      },
    ],
    tips: ["Ensure soil is rich and well-drained", "Avoid overwatering"],
    enhancements: ["Mix in organic matter for faster growth"],
    facts: { temperature: "15 - 22°C", humidity: "85 - 95%", air: "Moderate" },
  },

  flyagaric: {
    common: "Fly Agaric",
    species: "Amanita muscaria",
    intro:
      "Fly Agaric is one of the most iconic mushrooms in the world, instantly recognizable by its bright red cap with white spots, and although it is not cultivated for consumption due to its toxic and psychoactive compounds, it is often studied and admired for its ecological and cultural significance. It forms symbiotic mycorrhizal relationships with birch, pine, and spruce trees, relying on these associations to grow successfully in shaded forest environments with moist, well-drained soil. Observing Fly Agaric provides insight into forest ecology, fungal symbiosis, and the life cycle of mycorrhizal fungi, making it an educational specimen for mycology enthusiasts, artists, and photographers, and while it should never be consumed, it remains a fascinating mushroom for study and forest-based cultivation experiments.",
    materials: {
      title: "Materials Needed",
      items: [
        { name: "Host trees", subItems: ["Birch", "Pine", "Spruce"] },
        { name: "Mushroom spores", subItems: ["Collected from mature caps"] },
      ],
    },
    steps: [
      {
        title: "Symbiotic Growth",
        subSteps: [
          "Spores need to form mycorrhizal association with tree roots",
          "Plant spores near young host trees",
        ],
      },
      {
        title: "Maintenance",
        subSteps: [
          "Provide natural forest environment",
          "Moist soil, partial shade",
        ],
      },
      {
        title: "Fruiting",
        subSteps: ["Occurs in late summer to autumn"],
      },
    ],
    tips: [
      "Do not consume",
      "Grow only for educational or decorative purposes",
    ],
    enhancements: ["Use in terrariums or outdoor forest gardens"],
    facts: {
      temperature: "10 - 20°C",
      humidity: "70 - 90%",
      air: "Natural forest airflow",
    },
  },

  porcini: {
    common: "Porcini",
    species: "Boletus edulis",
    intro:
      "Porcini mushrooms are highly prized for their nutty, earthy flavor and meaty texture, but they are notoriously difficult to cultivate because they form mycorrhizal relationships with tree roots, particularly pine, spruce, and oak, which require a healthy forest ecosystem to thrive. They are widely used in gourmet cuisine, from risottos to soups and sauces, and are rich in protein, fiber, B vitamins, and minerals such as selenium and potassium, making them both flavorful and nutritious. Cultivating porcini is extremely challenging, often requiring patience and an understanding of forest ecology, soil health, and tree-fungus symbiosis, so most harvesting is done through foraging in autumn, but studying and observing them provides valuable insights into the complex interactions between fungi and their natural environment, offering both culinary inspiration and educational opportunities for mycology enthusiasts.",
    materials: {
      title: "Materials Needed",
      items: [
        { name: "Host trees", subItems: ["Pine", "Spruce", "Oak"] },
        { name: "Mushroom spores", subItems: ["Collected from mature caps"] },
        {
          name: "Soil",
          subItems: ["Well-drained, moist soil in forested areas"],
        },
      ],
    },
    steps: [
      {
        title: "Symbiotic Planting",
        subSteps: [
          "Introduce spores near roots of host trees",
          "Maintain undisturbed soil",
        ],
      },
      {
        title: "Incubation",
        subSteps: ["Allow spores to form mycorrhizal network for 1–3 years"],
      },
      {
        title: "Fruiting",
        subSteps: ["Occurs naturally in autumn under cool, damp conditions"],
      },
      {
        title: "Harvesting",
        subSteps: ["Pick mature caps carefully without disturbing soil"],
      },
    ],
    tips: [
      "Patience is key",
      "Maintain forest ecosystem health",
      "Avoid overharvesting",
    ],
    enhancements: [
      "Enrich surrounding soil with leaf litter",
      "Use for educational mycology studies",
    ],
    facts: {
      temperature: "15 - 20°C",
      humidity: "80 - 90%",
      air: "Natural forest airflow",
    },
  },
};

export default function GrowPage({ params }: GrowPageProps) {
  const mushroom = growData[params.name];

  if (!mushroom) {
    return <p className="p-8">Mushroom not found.</p>;
  }

  const imgSrc = mushroom.img ?? `/pixelarts/${params.name}.png`;

  return (
    <div className="p-8 grid grid-cols-1 md:grid-cols-4 gap-8">
      {/* Left - Detailed Guide */}
      <div className="md:col-span-3 space-y-6">
        <h1 className="text-2xl font-bold">
          Growing {mushroom.common} Mushrooms: A Detailed Guide
        </h1>
        <p className="text-lg">{mushroom.intro}</p>

        {/* Materials */}
        <h2 className="text-xl font-bold">{mushroom.materials.title}</h2>
        <ul className="list-disc list-inside space-y-2">
          {mushroom.materials.items.map((item, idx) => (
            <li key={idx}>
              <strong>{item.name}:</strong>
              {item.subItems && (
                <ul className="list-disc list-inside ml-6">
                  {item.subItems.map((sub, sidx) => (
                    <li key={sidx}>{sub}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ul>

        {/* Steps */}
        <h2 className="text-xl font-bold">Step-by-Step Process</h2>
        <ol className="list-decimal list-inside space-y-4">
          {mushroom.steps.map((step, idx) => (
            <li key={idx}>
              <strong>{step.title}</strong>
              {step.description && <p>{step.description}</p>}
              {step.subSteps && (
                <ul className="list-disc list-inside ml-6">
                  {step.subSteps.map((sub, sidx) => (
                    <li key={sidx}>{sub}</li>
                  ))}
                </ul>
              )}
            </li>
          ))}
        </ol>

        {/* Tips */}
        {mushroom.tips && (
          <>
            <h2 className="text-xl font-bold">Tips for Success</h2>
            <ul className="list-disc list-inside space-y-2">
              {mushroom.tips.map((tip, idx) => (
                <li key={idx}>{tip}</li>
              ))}
            </ul>
          </>
        )}

        {/* Enhancements */}
        {mushroom.enhancements && (
          <>
            <h2 className="text-xl font-bold">Optional Enhancements</h2>
            <ul className="list-disc list-inside space-y-2">
              {mushroom.enhancements.map((enh, idx) => (
                <li key={idx}>{enh}</li>
              ))}
            </ul>
          </>
        )}
      </div>

      {/* Right - Sidebar */}
      <aside className="flex flex-col items-center gap-4 p-4 border rounded-md bg-gray-50 max-w-xs">
        <Image
          src={imgSrc}
          alt={mushroom.common}
          width={120}
          height={120}
          className="rounded-md"
        />
        <h2 className="text-xl font-bold">{mushroom.common}</h2>
        <p className="text-sm italic">{mushroom.species}</p>
        <ul className="text-sm space-y-1">
          <li>
            <strong>Temperature:</strong> {mushroom.facts.temperature}
          </li>
          <li>
            <strong>Humidity:</strong> {mushroom.facts.humidity}
          </li>
          <li>
            <strong>Air Exchange:</strong> {mushroom.facts.air}
          </li>
        </ul>
      </aside>
    </div>
  );
}
