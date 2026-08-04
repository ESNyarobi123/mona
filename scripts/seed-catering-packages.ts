import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

const packages = [
  {
    code: "CORPORATE_LUNCH",
    nameEn: "Corporate Lunch Package",
    nameSw: "Kifurushi cha Corporate Lunch",
    descriptionEn: "Ideal for office meetings — balanced hot meals for 10–50 guests.",
    descriptionSw: "Inafaa kwa mikutano ya ofisini — milo ya moto kwa watu 10–50.",
    pricePerHead: 18000,
    minGuests: 10,
    maxGuests: 50,
    featuresEn: ["Hot main + side", "Soft drink", "Disposable service set", "On-time office delivery"],
    featuresSw: ["Chakula kikuu + mboga", "Kinywaji baridi", "Vifaa vya kutumikia", "Uwasilishaji ofisini kwa muda"],
    sortOrder: 10,
  },
  {
    code: "EXECUTIVE_BUFFET",
    nameEn: "Executive Buffet Package",
    nameSw: "Kifurushi cha Executive Buffet",
    descriptionEn: "For 50+ guests — multiple dishes, salads, and fresh fruit.",
    descriptionSw: "Kwa watu 50 na kuendelea — aina nyingi za chakula, saladi, na matunda.",
    pricePerHead: 25000,
    minGuests: 50,
    maxGuests: null,
    featuresEn: ["Multi-dish buffet", "Salads & fruit", "Serving staff option", "Premium presentation"],
    featuresSw: ["Buffet yenye vyakula mbalimbali", "Saladi & matunda", "Wahudumu (kwa ombi)", "Uwasilishaji wa kiwango cha juu"],
    sortOrder: 20,
  },
  {
    code: "PRIVATE_EVENT",
    nameEn: "Private Event Package",
    nameSw: "Kifurushi cha Private Event",
    descriptionEn: "Small home celebrations and birthdays — warm, personal service.",
    descriptionSw: "Sherehe ndogo za nyumbani au birthday — huduma ya joto na binafsi.",
    pricePerHead: 22000,
    minGuests: 15,
    maxGuests: 80,
    featuresEn: ["Signature mains", "Cake table setup support", "Home / venue delivery", "Custom spice level"],
    featuresSw: ["Vyakula vikuu maalumu", "Msaada wa meza ya keki", "Uwasilishaji nyumbani/eneo", "Pilipili kulingana na ombi"],
    sortOrder: 30,
  },
] as const;

async function main() {
  for (const pkg of packages) {
    await prisma.cateringPackage.upsert({
      where: { code: pkg.code },
      create: { ...pkg },
      update: { ...pkg, active: true },
    });
  }
  console.log(`Seeded ${packages.length} catering packages`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
