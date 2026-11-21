/**
 * More demo data on top of seed-demo.ts's core household:
 *  - MORE_PETS: extra pets for the owner (with photos), incl. one archived.
 *  - HOUSEHOLDS: every community member's own pets and records, so the
 *    database looks like many real households, not one (int and local only).
 *  - MORE_THREADS: more forum discussions across species and categories.
 * Member pets line up with what they post about in the forum.
 */
import {
  aisha,
  ago,
  callum,
  dan,
  day,
  grace,
  hannah,
  jamie,
  megan,
  oliver,
  priya,
  ravi,
  type SeedPet,
  type SeedRecord,
  type SeedThread,
  sarah,
  tom,
  vet,
  weighIns,
  type Who,
  years,
} from "./seed-lib";

const vacc = (vaccine: string, givenAgo: number, dueIn: number | null, extra = {}): SeedRecord => [
  "vaccinations",
  { vaccine, givenOn: day(-givenAgo), nextDueOn: dueIn === null ? null : day(dueIn), ...extra },
];
const parasite = (kind: string, product: string, givenAgo: number, dueIn: number): SeedRecord => [
  "parasite-treatments",
  { kind, product, givenOn: day(-givenAgo), nextDueOn: day(dueIn) },
];
const visit = (
  visitAgo: number,
  reason: string,
  outcome: string,
  extra: Record<string, unknown> = {},
): SeedRecord => ["vet-visits", { visitOn: day(-visitAgo), reason, outcome, ...extra }];
const food = (product: string, amount: string, frequency: string, brand?: string): SeedRecord => [
  "diet-items",
  { kind: "food", product, amount, frequency, brand: brand ?? null },
];
const symptom = (daysAgo: number, text: string, severity = "mild", notes?: string): SeedRecord => [
  "symptoms",
  { occurredAt: ago(daysAgo), symptom: text, severity, notes: notes ?? null },
];
const water = (daysAgo: number, observation: string, notes?: string): SeedRecord => [
  "water-notes",
  { notedOn: day(-daysAgo), observation, notes: notes ?? null },
];

/** The owner's extra pets (photos in ./photos, see CREDITS.md). */
export const MORE_PETS: SeedPet[] = [
  {
    input: {
      name: "Marmalade",
      speciesSlug: "cat",
      breedSlugs: ["domestic-longhair"],
      sex: "male",
      neutered: "yes",
      dateOfBirth: years(6.4),
      colourMarkings: "Ginger tabby, fluffy trousers",
      insuranceProvider: "Bought By Many",
      insurancePolicyRef: "BBM-77120-C",
      ...vet,
      notes: "Steals Luna's food if you turn your back. Microchip cat flap: chip ends 4471.",
    },
    photos: [
      {
        file: "marmalade",
        caption: "Supervising from the table",
        altText: "A ginger tabby cat lying on a wooden table",
      },
    ],
    records: [
      ...weighIns(
        [
          [360, 6_300],
          [280, 6_450],
          [200, 6_600],
          [120, 6_500],
          [50, 6_350],
          [8, 6_250],
        ],
        [200, "Heaviest yet: measured portions from now on"],
      ),
      vacc("Feline RCP + FeLV", 330, 35, {
        vet: "Riverside Veterinary Centre",
        batchNumber: "F88213",
      }),
      parasite("flea", "Bravecto Spot-on for cats", 70, 20),
      parasite("worm", "Milbemax for cats", 85, 5),
      visit(
        190,
        "Bad breath, dropping food on one side",
        "Dental under general anaesthetic: scale and polish, one premolar extracted.",
        { practice: "Riverside Veterinary Centre", vetName: "Dr Tom Lee", costPence: 38_500 },
      ),
      visit(330, "Annual vaccination and check", "Healthy. Overweight: weigh food, more play.", {
        practice: "Riverside Veterinary Centre",
        costPence: 6_100,
      }),
      food("Light chicken in jelly", "1 pouch", "Twice a day", "Purina ONE"),
      [
        "diet-items",
        {
          kind: "treat",
          product: "Freeze-dried chicken",
          amount: "5 pieces",
          frequency: "Evenings",
        },
      ],
      [
        "diet-items",
        {
          kind: "supplement",
          brand: "Hairball Paste",
          product: "Malt paste",
          amount: "2 cm",
          frequency: "Twice a week in moulting season",
        },
      ],
      symptom(19, "Coughed up a hairball twice in one day", "mild", "Started the malt paste again"),
    ],
  },
  {
    input: {
      name: "Bramble",
      speciesSlug: "dog",
      breedSlugs: ["australian-shepherd"],
      sex: "male",
      neutered: "no",
      dateOfBirth: day(-290),
      colourMarkings: "Blue merle, white collar, one blue eye",
      insuranceProvider: "Petplan",
      insurancePolicyRef: "PP-9902-1177",
      ...vet,
      notes:
        "Puppy! Crate trained, 4 hours max. Puppy class Saturdays 10am at the village hall. Chews anything left on the floor.",
    },
    photos: [
      {
        file: "bramble",
        caption: "Beach day, wind in the ears",
        altText: "A merle Australian Shepherd with its mouth open on a beach",
      },
    ],
    records: [
      ...weighIns([
        [235, 3_100],
        [215, 4_600],
        [190, 6_900],
        [160, 9_800],
        [130, 12_400],
        [100, 14_900],
        [70, 17_100],
        [40, 18_800],
        [12, 19_900],
      ]),
      vacc("DHP + Leptospirosis L4 (1st puppy dose)", 232, null, {
        vet: "Riverside Veterinary Centre",
      }),
      vacc("DHP + Leptospirosis L4 (2nd puppy dose)", 210, 155, {
        vet: "Riverside Veterinary Centre",
      }),
      vacc("Kennel cough (intranasal)", 150, 215),
      parasite("worm", "Panacur puppy paste", 30, 0),
      parasite("flea_and_tick", "NexGard Spectra", 27, 3),
      visit(232, "First puppy check and vaccination", "Healthy pup. Heart and hips sound normal.", {
        practice: "Riverside Veterinary Centre",
        vetName: "Dr Amara Okafor",
        costPence: 7_900,
      }),
      visit(64, "Ate part of a sock", "Made him sick at the vet; sock retrieved. Bin the socks!", {
        practice: "Riverside Veterinary Centre",
        costPence: 14_200,
      }),
      visit(3, "Discuss neutering", "Wait until 12 to 15 months for joint development.", {
        practice: "Riverside Veterinary Centre",
        followUpOn: day(90),
      }),
      food("Puppy medium breed, salmon", "140 g", "Three meals a day", "Lily's Kitchen"),
      [
        "diet-changes",
        {
          changedOn: day(-45),
          description: "Down from four meals to three",
          reaction: "No problems, still keen on breakfast",
        },
      ],
      symptom(64, "Vomiting after eating a sock", "moderate"),
      symptom(21, "Loose stools for a day after a new chew", "mild", "Back to normal next day"),
    ],
  },
  {
    input: {
      name: "Nugget",
      speciesSlug: "hamster",
      breedSlugs: ["syrian"],
      sex: "male",
      dateOfBirth: years(1.3),
      colourMarkings: "Golden with a white belly",
      notes:
        "Nocturnal, wakes at about 9pm. 120 cm cage, 28 cm wheel, deep bedding. Never on the same floor as the cats.",
    },
    photos: [
      {
        file: "nugget",
        caption: "Cheek pouches at capacity",
        altText: "A golden hamster sitting up with its paws together",
      },
    ],
    records: [
      ...weighIns([
        [150, 142],
        [100, 151],
        [60, 155],
        [30, 149],
        [4, 152],
      ]),
      visit(36, "Front teeth looking long", "Incisors trimmed. Add more chew sticks and hay.", {
        practice: "Avian and Exotics Clinic",
        costPence: 3_200,
      }),
      food("Hamster muesli", "1 tablespoon", "Each evening", "Science Selective"),
      [
        "diet-items",
        { kind: "treat", product: "Mealworms", amount: "2", frequency: "Twice a week" },
      ],
      symptom(
        38,
        "Not eating his hard food, dropping pieces",
        "moderate",
        "Teeth: vet trimmed them",
      ),
    ],
  },
  {
    input: {
      name: "Shelly",
      speciesSlug: "reptile",
      breedSlugs: ["hermanns-tortoise"],
      sex: "female",
      dateOfBirth: years(23),
      dateOfBirthIsEstimate: true,
      colourMarkings: "High domed shell, yellow and black",
      passportNumber: "Article 10: 2003/GB/ABC12345",
      notes:
        "Came with the house! Hibernates in the fridge (5 C) mid-November to February. Weigh weekly during hibernation: lose more than 1% a month = wake her.",
    },
    photos: [
      {
        file: "shelly",
        caption: "Out on the lawn",
        altText: "A tortoise walking on green grass",
      },
    ],
    records: [
      ...weighIns(
        [
          [270, 1_090],
          [200, 1_160],
          [120, 1_180],
          [40, 1_175],
          [10, 1_170],
          [3, 1_168],
        ],
        [10, "Into the hibernation fridge"],
      ),
      visit(30, "Pre-hibernation health check", "Good weight and condition, clear to hibernate.", {
        practice: "Avian and Exotics Clinic",
        vetName: "Dr Ellie Marsh",
        costPence: 5_500,
      }),
      food("Weeds: dandelion, plantain, clover", "A good handful", "Daily in summer"),
      [
        "diet-items",
        {
          kind: "supplement",
          brand: "Nutrobal",
          product: "Calcium and vitamin D3 powder",
          amount: "A pinch",
          frequency: "Twice a week",
        },
      ],
      [
        "conditions",
        {
          name: "Hibernation (annual)",
          diagnosedOn: day(-10),
          status: "active",
          notes: "Fridge at 5 C, check thermometer daily",
        },
      ],
    ],
  },
  {
    input: {
      name: "Henrietta",
      speciesSlug: "poultry",
      breedSlugs: ["hybrid-hen"],
      sex: "female",
      dateOfBirth: years(2.5),
      colourMarkings: "Speckledy, red comb",
      notes:
        "Head of the flock of four (with Doris, Peggy and Mrs Brown). About 5 eggs a week from her in spring. Locked in at dusk.",
    },
    photos: [
      {
        file: "hens",
        caption: "The girls on patrol",
        altText: "Brown hens foraging together in a run",
      },
    ],
    records: [
      ...weighIns([
        [180, 2_150],
        [90, 2_100],
        [14, 2_050],
      ]),
      parasite("worm", "Flubenvet (7 days in feed)", 95, 85),
      parasite("mite", "Poultry Shield and diatom powder", 40, -5),
      symptom(52, "Moulting heavily, no eggs", "mild", "Normal autumn moult. Extra protein."),
      food("Layers pellets", "Ad lib", "Always available", "Allen & Page"),
      [
        "diet-items",
        {
          kind: "supplement",
          product: "Oyster shell grit",
          amount: "Ad lib",
          frequency: "Separate dish",
        },
      ],
    ],
  },
  {
    input: {
      name: "Goldie",
      speciesSlug: "fish",
      breedSlugs: ["goldfish-fancy"],
      sex: "unknown",
      dateOfBirth: years(4),
      dateOfBirthIsEstimate: true,
      colourMarkings: "Orange oranda, white fins",
      notes:
        "Won at a fair, now in a 120 litre tank with two friends. 25% water change every week.",
    },
    photos: [
      {
        file: "goldie",
        caption: "Showing off the fins",
        altText: "An orange goldfish with flowing fins on a black background",
      },
    ],
    records: [
      water(2, "Ammonia 0, nitrite 0, nitrate 20 ppm", "Weekly test after the water change"),
      water(9, "Ammonia 0, nitrite 0, nitrate 40 ppm", "Bigger change this week"),
      water(16, "Water cloudy after adding new plants", "Cleared after 2 days"),
      water(30, "Ammonia 0.25 ppm after the filter clean", "Don't rinse the filter under the tap!"),
      food("Fancy goldfish sinking pellets", "Pinch", "Twice a day", "Hikari"),
      [
        "diet-items",
        { kind: "treat", product: "Peas (skins off)", amount: "2 or 3", frequency: "Once a week" },
      ],
      symptom(33, "Floating at the top and gasping", "moderate", "Ammonia spike, did a 50% change"),
    ],
  },
  {
    input: {
      name: "Coco",
      speciesSlug: "dog",
      breedSlugs: ["labrador-retriever"],
      sex: "female",
      neutered: "yes",
      dateOfBirth: years(10.2),
      colourMarkings: "Chocolate",
      notes:
        "Now lives with Mum and Dad in Devon (more garden, less stairs). Records kept for them.",
    },
    photos: [
      {
        file: "coco",
        caption: "Snack o'clock",
        altText: "A chocolate Labrador licking its nose",
      },
    ],
    records: [
      ...weighIns([
        [500, 31_500],
        [420, 30_800],
      ]),
      vacc("DHP + Leptospirosis L4 booster", 430, -65),
      [
        "conditions",
        {
          name: "Hip dysplasia",
          diagnosedOn: day(-900),
          status: "managed",
          notes: "Hydrotherapy helped a lot",
        },
      ],
      ["allergies", { allergen: "Beef", reaction: "Upset stomach", severity: "mild" }],
    ],
    archived: true,
  },
];

/** Every community member's household (no photos: only their owners see them). */
export const HOUSEHOLDS: [owner: Who, pets: SeedPet[]][] = [
  [
    priya,
    [
      {
        input: {
          name: "Clover",
          speciesSlug: "rabbit",
          breedSlugs: ["dwarf-lop"],
          sex: "female",
          neutered: "yes",
          dateOfBirth: years(4),
          colourMarkings: "Grey and white",
          vetPracticeName: "Hillside Vets",
        },
        photos: [],
        records: [
          ...weighIns([
            [90, 1_950],
            [30, 1_890],
            [2, 1_920],
          ]),
          visit(
            40,
            "Not eating, small droppings (out of hours)",
            "Early gut stasis. Pain relief and gut stimulants.",
            {
              practice: "Vets Now (out of hours)",
              costPence: 24_000,
            },
          ),
          [
            "medications",
            {
              name: "Metacam for rabbits",
              doseAsPrescribed: "0.3 ml by mouth once daily",
              frequency: "Once a day",
              startOn: day(-40),
              endOn: day(-35),
              prescribedBy: "Vets Now",
            },
          ],
          vacc("Myxomatosis + RHD1 + RHD2 combined", 200, 165),
          food("Meadow hay", "Unlimited", "Always available"),
        ],
      },
      {
        input: {
          name: "Mango",
          speciesSlug: "cat",
          breedSlugs: ["bengal"],
          sex: "male",
          neutered: "yes",
          dateOfBirth: years(2.1),
          colourMarkings: "Brown rosetted",
          notes: "From a rescue. Plays fetch. Opens doors.",
        },
        photos: [],
        records: [
          ...weighIns([
            [120, 5_200],
            [10, 5_500],
          ]),
          vacc("Feline RCP", 100, 265),
          parasite("flea", "Stronghold Plus", 20, 10),
          symptom(6, "Scratched nose after a fight with next door's cat", "mild"),
        ],
      },
    ],
  ],
  [
    tom,
    [
      {
        input: {
          name: "Duke",
          speciesSlug: "horse",
          breedSlugs: ["irish-draught"],
          sex: "male",
          neutered: "yes",
          dateOfBirth: years(12),
          colourMarkings: "Bay, white sock hind left",
          heightInches: 66,
          vetPracticeName: "Downs Equine Vets",
          vetPracticePhone: "01632 960 418",
        },
        photos: [],
        records: [
          [
            "horse-care",
            {
              kind: "farrier",
              doneOn: day(-28),
              provider: "J. Hartley, farrier",
              result: "Full set of shoes",
              nextDueOn: day(14),
            },
          ],
          [
            "horse-care",
            {
              kind: "worm_egg_count",
              doneOn: day(-60),
              result: "350 epg: wormed with Equest",
              nextDueOn: day(30),
            },
          ],
          [
            "horse-care",
            {
              kind: "dental",
              doneOn: day(-150),
              provider: "Downs Equine Vets",
              result: "Wolf tooth removed",
              nextDueOn: day(215),
            },
          ],
          vacc("Equine influenza + tetanus", 280, 85),
          visit(
            75,
            "Lame after hacking on the road",
            "Bruised sole. Poultice for 3 days, box rest.",
            { costPence: 18_500 },
          ),
          ...weighIns([[60, 640_000]]),
        ],
      },
      {
        input: {
          name: "Pebbles",
          speciesSlug: "horse",
          breedSlugs: ["shetland"],
          sex: "female",
          dateOfBirth: years(26),
          dateOfBirthIsEstimate: true,
          colourMarkings: "Skewbald",
          heightInches: 38,
          notes:
            "Retired. Soaked hay cubes since her teeth went. Rug check morning and night in winter.",
        },
        photos: [],
        records: [
          ["conditions", { name: "PPID (Cushing's)", diagnosedOn: day(-700), status: "managed" }],
          [
            "medications",
            {
              name: "Prascend 1 mg",
              doseAsPrescribed: "One tablet daily",
              frequency: "Once a day",
              startOn: day(-700),
              prescribedBy: "Downs Equine Vets",
            },
          ],
          [
            "conditions",
            { name: "Laminitis risk", status: "managed", notes: "Grazing muzzle April to October" },
          ],
          [
            "horse-care",
            {
              kind: "dental",
              doneOn: day(-100),
              result: "Several loose molars, soft diet",
              nextDueOn: day(80),
            },
          ],
        ],
      },
    ],
  ],
  [
    sarah,
    [
      {
        input: {
          name: "Hamish",
          speciesSlug: "cat",
          breedSlugs: ["british-shorthair"],
          sex: "male",
          neutered: "yes",
          dateOfBirth: years(15),
          colourMarkings: "Blue",
        },
        photos: [],
        records: [
          ...weighIns([
            [300, 5_600],
            [200, 5_300],
            [100, 5_050],
            [20, 4_950],
          ]),
          [
            "conditions",
            {
              name: "Chronic kidney disease (IRIS stage 2)",
              diagnosedOn: day(-210),
              status: "managed",
            },
          ],
          food("Renal wet food", "1 pouch", "Three times a day", "Hill's k/d"),
          [
            "diet-changes",
            {
              changedOn: day(-200),
              description: "Moved to renal diet, mixed 25% at a time over 4 weeks",
              reaction: "Fussy at first, fine with a little warm water",
            },
          ],
          water(5, "Drinking about 300 ml a day", "Measuring the fountain each morning"),
          visit(30, "Kidney recheck bloods", "Stable creatinine. Recheck in 3 months.", {
            followUpOn: day(60),
          }),
        ],
      },
      {
        input: {
          name: "Fern",
          speciesSlug: "dog",
          breedSlugs: ["whippet"],
          sex: "female",
          neutered: "yes",
          dateOfBirth: years(5),
          colourMarkings: "Brindle",
        },
        photos: [],
        records: [
          vacc("DHP + Leptospirosis L4 booster", 120, 245),
          parasite("lungworm", "Advocate", 15, 15),
          visit(260, "Tear on her side from a fence", "Six stitches. Cone for 10 days.", {
            costPence: 21_000,
          }),
        ],
      },
    ],
  ],
  [
    dan,
    [
      {
        input: {
          name: "Barney",
          speciesSlug: "dog",
          breedSlugs: ["beagle"],
          sex: "male",
          neutered: "yes",
          dateOfBirth: years(3.3),
          colourMarkings: "Tricolour",
          notes: "Rescue, came home in September. Separation training: up to 40 minutes alone now.",
        },
        photos: [],
        records: [
          ...weighIns([
            [70, 13_900],
            [40, 14_300],
            [5, 14_500],
          ]),
          vacc("DHP + Leptospirosis L4 booster", 75, 290),
          parasite("flea_and_tick", "Credelio", 12, 18),
          visit(
            65,
            "New dog health check",
            "Healthy. Referred to a behaviourist for separation distress.",
          ),
        ],
      },
      {
        input: {
          name: "Kiwi",
          speciesSlug: "bird",
          breedSlugs: ["budgerigar"],
          sex: "male",
          dateOfBirth: years(2),
          colourMarkings: "Green and yellow",
        },
        photos: [],
        records: [
          ...weighIns([
            [30, 38],
            [2, 39],
          ]),
        ],
      },
    ],
  ],
  [
    megan,
    [
      {
        input: {
          name: "Pickle",
          speciesSlug: "rabbit",
          breedSlugs: ["lionhead"],
          sex: "female",
          neutered: "yes",
          dateOfBirth: years(5),
          colourMarkings: "Black with a white mane",
        },
        photos: [],
        records: [
          vacc("Myxomatosis + RHD1 + RHD2 combined", 300, 65),
          visit(330, "Gut stasis", "Pain relief and gut stimulants, eating by the morning.", {
            costPence: 19_800,
          }),
          ...weighIns([
            [60, 1_700],
            [7, 1_720],
          ]),
        ],
      },
      {
        input: {
          name: "Gherkin",
          speciesSlug: "rabbit",
          breedSlugs: ["netherland-dwarf"],
          sex: "male",
          neutered: "yes",
          dateOfBirth: years(1.5),
          colourMarkings: "Agouti",
          notes: "Bonding with Pickle: week 3, sharing a pen now.",
        },
        photos: [],
        records: [
          vacc("Myxomatosis + RHD1 + RHD2 combined", 40, 325),
          visit(55, "Neuter", "Routine castration, healed well.", { costPence: 12_000 }),
        ],
      },
      {
        input: {
          name: "Mabel",
          speciesSlug: "cat",
          breedSlugs: ["domestic-longhair"],
          sex: "female",
          neutered: "yes",
          dateOfBirth: years(12.5),
          colourMarkings: "Tortoiseshell",
        },
        photos: [],
        records: [
          water(10, "Drinking noticeably more", "Vet running bloods"),
          visit(8, "Increased thirst", "Bloods: overactive thyroid. Starting tablets.", {
            followUpOn: day(20),
          }),
          [
            "medications",
            {
              name: "Felimazole 2.5 mg",
              doseAsPrescribed: "One tablet twice daily",
              frequency: "Twice a day",
              startOn: day(-7),
              prescribedBy: "Hillside Vets",
            },
          ],
          ["conditions", { name: "Hyperthyroidism", diagnosedOn: day(-8), status: "active" }],
        ],
      },
      {
        input: {
          name: "Bruno",
          speciesSlug: "dog",
          breedSlugs: ["labrador-retriever"],
          sex: "male",
          neutered: "yes",
          dateOfBirth: years(16),
          colourMarkings: "Yellow",
          notes: "Our old boy.",
        },
        photos: [],
        records: [],
        deceasedOn: day(-372),
      },
    ],
  ],
  [
    oliver,
    [
      {
        input: {
          name: "Salt",
          speciesSlug: "guinea-pig",
          breedSlugs: ["abyssinian"],
          sex: "female",
          dateOfBirth: years(0.8),
          colourMarkings: "White rosettes",
        },
        photos: [],
        records: [
          ...weighIns([
            [60, 720],
            [30, 810],
            [3, 870],
          ]),
        ],
      },
      {
        input: {
          name: "Pepper",
          speciesSlug: "guinea-pig",
          breedSlugs: ["teddy"],
          sex: "female",
          dateOfBirth: years(0.8),
          colourMarkings: "Black",
        },
        photos: [],
        records: [
          ...weighIns([
            [60, 690],
            [30, 760],
            [3, 805],
          ]),
          symptom(14, "Crusty patch on her ear", "mild", "Watching it"),
        ],
      },
      {
        input: {
          name: "Nala",
          speciesSlug: "dog",
          breedSlugs: ["labrador-retriever"],
          sex: "female",
          neutered: "yes",
          dateOfBirth: years(9),
          colourMarkings: "Black, grey chin",
        },
        photos: [],
        records: [
          ...weighIns([
            [200, 30_100],
            [90, 29_400],
            [10, 29_000],
          ]),
          [
            "conditions",
            { name: "Osteoarthritis (elbows)", diagnosedOn: day(-400), status: "managed" },
          ],
          [
            "medications",
            {
              name: "Librela",
              doseAsPrescribed: "Monthly injection at the vet",
              frequency: "Every 4 weeks",
              startOn: day(-180),
              prescribedBy: "Riverside Veterinary Centre",
            },
          ],
          symptom(4, "Ate grass and was sick on the walk", "mild"),
        ],
      },
    ],
  ],
  [
    aisha,
    [
      {
        input: {
          name: "Zeus",
          speciesSlug: "cat",
          breedSlugs: ["ragdoll"],
          sex: "male",
          neutered: "yes",
          dateOfBirth: years(3),
          colourMarkings: "Seal bicolour",
        },
        photos: [],
        records: [
          vacc("Feline RCP", 200, 165),
          symptom(25, "Matting behind the ears", "mild", "Combing daily now"),
        ],
      },
      {
        input: {
          name: "Freya",
          speciesSlug: "cat",
          breedSlugs: ["ragdoll"],
          sex: "female",
          neutered: "yes",
          dateOfBirth: years(3),
          colourMarkings: "Blue mitted",
        },
        photos: [],
        records: [
          vacc("Feline RCP", 200, 165),
          ["allergies", { allergen: "Fish", reaction: "Vomiting", severity: "moderate" }],
        ],
      },
    ],
  ],
  [
    jamie,
    [
      {
        input: {
          name: "Otis",
          speciesSlug: "dog",
          breedSlugs: ["lurcher"],
          sex: "male",
          neutered: "yes",
          dateOfBirth: years(4),
          colourMarkings: "Grey brindle",
          notes: "Reactive to dogs on lead, fine off lead. Muzzle trained.",
        },
        photos: [],
        records: [
          vacc("DHP + Leptospirosis L4 booster", 160, 205),
          parasite("worm", "Drontal", 50, 40),
        ],
      },
      {
        input: {
          name: "Ziggy",
          speciesSlug: "dog",
          breedSlugs: ["staffordshire-bull-terrier"],
          sex: "female",
          neutered: "yes",
          dateOfBirth: years(7),
          colourMarkings: "Red and white",
        },
        photos: [],
        records: [
          [
            "allergies",
            { allergen: "Grass pollen", reaction: "Red belly and paws", severity: "moderate" },
          ],
          [
            "medications",
            {
              name: "Apoquel 16 mg",
              doseAsPrescribed: "Half a tablet once daily",
              frequency: "Once a day",
              startOn: day(-120),
            },
          ],
        ],
      },
    ],
  ],
  [
    grace,
    [
      {
        input: {
          name: "Mrs Pecks",
          speciesSlug: "poultry",
          breedSlugs: ["ex-battery-hen"],
          sex: "female",
          dateOfBirth: years(2),
          dateOfBirthIsEstimate: true,
          notes: "Rescued from the BHWT. Feathers fully grown back.",
        },
        photos: [],
        records: [parasite("mite", "Red mite powder", 20, 10), symptom(9, "Pale comb", "mild")],
      },
      {
        input: {
          name: "Dolly",
          speciesSlug: "poultry",
          breedSlugs: ["indian-runner-duck"],
          sex: "female",
          dateOfBirth: years(3),
        },
        photos: [],
        records: [food("Duck layers pellets", "Ad lib", "Always available")],
      },
      {
        input: {
          name: "Clementine",
          speciesSlug: "goat",
          breedSlugs: ["pygmy"],
          sex: "female",
          dateOfBirth: years(4),
          notes: "Escape artist. CPH number on the paperwork in the shed.",
        },
        photos: [],
        records: [
          parasite("worm", "Faecal egg count clear, no wormer", 30, 60),
          visit(
            35,
            "Hoof trim and check-over",
            "Feet trimmed, body condition 3/5. Trim every 6 weeks.",
            { practice: "Hollybank Farm Vets", costPence: 4_000 },
          ),
          vacc("Heptavac P Plus", 250, 115),
        ],
      },
    ],
  ],
  [
    ravi,
    [
      {
        input: {
          name: "Rex",
          speciesSlug: "reptile",
          breedSlugs: ["bearded-dragon"],
          sex: "male",
          dateOfBirth: years(6),
          notes: "T5 12% UVB tube, replace every 12 months. Basking spot 40 C.",
        },
        photos: [],
        records: [
          ...weighIns([
            [60, 465],
            [20, 450],
            [2, 455],
          ]),
          visit(
            17,
            "Lethargic, not basking",
            "UVB tube was 18 months old. Replaced, calcium supplement.",
            { practice: "Avian and Exotics Clinic", costPence: 6_800 },
          ),
          [
            "diet-items",
            {
              kind: "food",
              product: "Dubia roaches and locusts",
              amount: "8 to 10",
              frequency: "Every other day",
            },
          ],
          [
            "diet-items",
            {
              kind: "supplement",
              product: "Calcium dust",
              amount: "Light dusting",
              frequency: "Most feeds",
            },
          ],
        ],
      },
      {
        input: {
          name: "Noodle",
          speciesSlug: "reptile",
          breedSlugs: ["corn-snake"],
          sex: "female",
          dateOfBirth: years(3),
          colourMarkings: "Amelanistic",
        },
        photos: [],
        records: [
          food("Frozen-thawed adult mouse", "1", "Every 10 days"),
          symptom(12, "In shed, eyes blue", "mild", "Shed in one piece 5 days later"),
        ],
      },
      {
        input: {
          name: "Axel",
          speciesSlug: "amphibian",
          breedSlugs: ["axolotl"],
          sex: "unknown",
          dateOfBirth: years(0.5),
        },
        photos: [],
        records: [
          water(1, "Tank cycled: ammonia 0, nitrite 0, nitrate 10", "Six weeks to cycle"),
          water(20, "Water 17 C, fan on"),
        ],
      },
    ],
  ],
  [
    hannah,
    [
      {
        input: {
          name: "Twiglet",
          speciesSlug: "ferret",
          breedSlugs: ["sable"],
          sex: "female",
          neutered: "yes",
          dateOfBirth: years(3),
        },
        photos: [],
        records: [
          [
            "medications",
            {
              name: "Suprelorin implant",
              doseAsPrescribed: "One implant",
              frequency: "Every 2 years",
              startOn: day(-300),
            },
          ],
          vacc("Canine distemper (ferret)", 180, 185),
        ],
      },
      {
        input: {
          name: "Bean",
          speciesSlug: "rat-mouse",
          breedSlugs: ["dumbo-rat"],
          sex: "male",
          dateOfBirth: years(1.8),
        },
        photos: [],
        records: [
          [
            "conditions",
            {
              name: "Respiratory infection (mycoplasma)",
              diagnosedOn: day(-50),
              status: "resolved",
            },
          ],
          ...weighIns([
            [50, 520],
            [5, 545],
          ]),
        ],
      },
      {
        input: {
          name: "Iggy",
          speciesSlug: "reptile",
          breedSlugs: ["green-iguana"],
          sex: "male",
          dateOfBirth: years(8),
          notes: "Rehomed from a client. Free-roams the spare room.",
        },
        photos: [],
        records: [
          food("Collard greens, squash, rocket", "A bowl", "Daily"),
          ...weighIns([
            [90, 3_900],
            [10, 4_050],
          ]),
        ],
      },
    ],
  ],
  [
    callum,
    [
      {
        input: {
          name: "Bruce",
          speciesSlug: "dog",
          breedSlugs: ["german-shepherd-dog"],
          sex: "male",
          neutered: "no",
          dateOfBirth: years(5),
          colourMarkings: "Black and tan",
        },
        photos: [],
        records: [
          vacc("DHP + Leptospirosis L4 booster", 340, 25),
          parasite("flea_and_tick", "Simparica", 33, -3),
          [
            "conditions",
            { name: "Sensitive stomach", status: "managed", notes: "Fish-based food only" },
          ],
        ],
      },
      {
        input: {
          name: "Big Ken",
          speciesSlug: "fish",
          breedSlugs: ["koi"],
          sex: "unknown",
          dateOfBirth: years(11),
          dateOfBirthIsEstimate: true,
          colourMarkings: "Kohaku (red and white), about 60 cm",
        },
        photos: [],
        records: [
          water(3, "Pond 8 C, fish not eating", "Stopped feeding below 10 C"),
          water(40, "Pond 14 C, all good"),
        ],
      },
    ],
  ],
];

/** More forum threads, newest first (interleaved with seed-demo's THREADS). */
export const MORE_THREADS: SeedThread[] = [
  {
    author: ravi,
    input: {
      category: "health",
      speciesSlug: "reptile",
      title: "Bearded dragon not basking and glass surfing",
      body: "Rex (6) has stopped going up to his basking spot and keeps scratching at the glass. Temps are 40 C under the lamp. Eating less too. Any ideas before the vet?",
      tags: ["bearded-dragon", "uvb"],
    },
    votes: [hannah, callum, jamie],
    replies: [
      {
        author: hannah,
        accepted: true,
        votes: [ravi, sarah, callum],
        body: "First thing I'd check is the age of your UVB tube. They stop giving out useful UVB long before they stop glowing (usually around 12 months for a T5). Low UVB means low energy and, over time, metabolic bone disease. Book the vet anyway if he's off food for more than a few days.",
      },
      {
        author: ravi,
        body: "Tube was 18 months old. Replaced it, vet says bloods are fine and he's back on his rock. Thank you!",
        votes: [hannah],
      },
    ],
  },
  {
    author: jamie,
    input: {
      category: "chat",
      title: "Fireworks week survival thread",
      body: "Bonfire night is going on all week round here. Share what's helping your pets get through it. Ours: curtains shut, telly up, and a den under the stairs.",
      tags: ["fireworks", "anxiety"],
    },
    votes: [priya, dan, megan, oliver, aisha, callum],
    replies: [
      {
        author: dan,
        body: "Walked Barney before dark and fed late. He slept through most of it.",
        votes: [jamie],
      },
      {
        author: sarah,
        body: "If yours really struggle, talk to your vet well before next year. There are medicines that help, but they need starting in advance.",
        votes: [jamie, megan, oliver],
      },
      {
        author: grace,
        body: "Shut the hens in early and put a radio on in the barn. The goat didn't care at all.",
      },
      {
        author: aisha,
        body: "Our two hid in the wardrobe. Left the door open and a blanket in there.",
      },
      { author: callum, body: "Bruce barked at every single one. Next year we're going camping." },
    ],
  },
  {
    author: callum,
    input: {
      category: "health",
      speciesSlug: "fish",
      title: "Koi have stopped eating, pond is at 8 C",
      body: "First winter with the pond. Fish are sitting at the bottom and ignoring food. Is this normal or should I be worried?",
      tags: ["koi", "pond", "winter"],
    },
    replies: [
      {
        author: hannah,
        accepted: true,
        votes: [callum],
        body: "Normal. Koi slow right down in the cold and can't digest food properly below about 10 C, so most keepers stop feeding or switch to a wheatgerm food. Keep a hole in any ice and don't break it by hitting it.",
      },
    ],
  },
  {
    author: megan,
    input: {
      category: "new-pets",
      speciesSlug: "rabbit",
      title: "Bonding two rabbits: how long did it take you?",
      body: "Week 3 of bonding Pickle and our new boy Gherkin. Lots of chasing, a bit of fur pulling, but they've started lying near each other. Is this going well?",
      tags: ["bonding", "rabbits"],
    },
    votes: [priya, oliver],
    replies: [
      {
        author: priya,
        body: "Sounds really promising! Lying near each other is a great sign. Ours took about 5 weeks.",
        votes: [megan],
      },
      {
        author: hannah,
        body: "Chasing and mounting are normal. Separate if there's real fighting (locked together, fur flying). Neutral space each session helps.",
      },
      {
        author: megan,
        body: "Update: they groomed each other this morning!",
        votes: [priya, hannah, oliver],
      },
    ],
  },
  {
    author: sarah,
    input: {
      category: "nutrition",
      speciesSlug: "cat",
      title: "Getting a fussy cat onto a kidney diet",
      body: "Hamish has stage 2 kidney disease and the vet wants him on renal food. He sniffs it and walks off. What worked for others?",
      tags: ["kidney", "senior"],
    },
    votes: [megan, aisha],
    replies: [
      {
        author: megan,
        body: "Mix it in slowly, a quarter at a time over weeks. Warm it slightly too.",
        votes: [sarah],
      },
      {
        author: aisha,
        body: "Try different textures. Ours wouldn't touch the loaf but ate the chunks.",
      },
      { author: sarah, body: "Warm water trick worked. Four weeks in and he's eating it all." },
    ],
  },
  {
    author: hannah,
    input: {
      category: "chat",
      speciesSlug: "ferret",
      title: "Ferret owners: what do you wish people knew?",
      body: "As an exotics nurse I see lots of new ferret owners surprised by how much they sleep (up to 18 hours) and how much they steal. Share your best ferret facts and photos!",
      tags: ["ferrets"],
    },
    votes: [ravi, jamie],
    replies: [
      {
        author: ravi,
        body: "They hide everything. We found 4 socks and a TV remote behind the sofa.",
      },
      { author: jamie, body: "The 'war dance' when they're happy is the best thing ever." },
    ],
  },
  {
    author: grace,
    input: {
      category: "health",
      speciesSlug: "poultry",
      title: "Red mite again: what actually works?",
      body: "Found red mite in the coop crevices last night. I've used powder before but they always come back. What's your routine?",
      tags: ["red-mite", "hens"],
    },
    replies: [
      {
        author: tom,
        body: "Pressure wash, dry it completely, then treat every crack. Repeat in 7 days to catch the hatching eggs.",
        votes: [grace],
      },
      {
        author: hannah,
        body: "Check at night with a torch. They hide in the day. A plastic coop is much easier to keep clear.",
      },
    ],
  },
  {
    author: aisha,
    input: {
      category: "grooming",
      speciesSlug: "cat",
      title: "Ragdoll matting behind the ears and armpits",
      body: "Zeus gets mats behind his ears and under his front legs. He tolerates the brush on his back but not there. Tips?",
      tags: ["ragdoll", "matting"],
    },
    replies: [
      {
        author: sarah,
        body: "A wide-toothed comb works better than a slicker in those spots. Little and often, with treats.",
      },
      {
        author: megan,
        body: "Our groomer does a 'hygiene trim' every few months which makes it much easier.",
      },
    ],
  },
  {
    author: oliver,
    input: {
      category: "health",
      speciesSlug: "dog",
      title: "Lab eating grass and being sick on walks",
      body: "Nala eats grass most walks and is sick maybe once a week. Otherwise eating normally and full of energy. Worth a vet visit?",
      tags: ["vomiting"],
    },
    votes: [dan],
    replies: [
      {
        author: sarah,
        accepted: true,
        votes: [oliver, dan],
        body: "Grass eating on its own is common, but being sick weekly is worth a vet check, especially at 9. Keep a note of when it happens and what she's eaten so you can show them.",
      },
    ],
  },
  {
    author: tom,
    input: {
      category: "chat",
      speciesSlug: "horse",
      title: "Clipping season: who's brave enough to do a full clip?",
      body: "Duke is sweating up on every ride. Thinking about a hunter clip this year. Do you do it yourself or get someone in?",
      tags: ["clipping", "winter"],
    },
    replies: [
      {
        author: grace,
        body: "Get someone in the first time and watch. Blades sharp, horse clean and dry.",
      },
      { author: callum, body: "Not a horse person but I had to look up 'hunter clip'. Brilliant." },
    ],
  },
  {
    author: priya,
    input: {
      category: "adoption",
      speciesSlug: "cat",
      title: "Adopted a Bengal from a rescue, what are they really like?",
      body: "Mango came home last month. He's amazing but SO much energy. How do you keep a Bengal busy?",
      tags: ["bengal", "enrichment"],
    },
    votes: [aisha, megan],
    replies: [
      {
        author: aisha,
        body: "Wand toys twice a day, a tall cat tree and puzzle feeders. Some even like a harness and walks!",
        votes: [priya],
      },
      { author: dan, body: "Our neighbour's Bengal learned to turn on taps. Hide everything." },
    ],
  },
  {
    author: dan,
    input: {
      category: "nutrition",
      speciesSlug: "dog",
      title: "Is grain-free food worth it?",
      body: "Pet shop keeps pushing grain-free for Barney. He's fine on his current food. Is there any reason to switch?",
      tags: ["food"],
    },
    replies: [
      {
        author: sarah,
        accepted: true,
        votes: [dan, jamie, oliver],
        body: "Unless your vet has diagnosed a grain allergy (rare), there's no need. Pick a complete food that suits him and keeps his weight steady. If you're unsure, ask your vet at his next check.",
      },
    ],
  },
  {
    author: ravi,
    input: {
      category: "new-pets",
      speciesSlug: "amphibian",
      title: "Axolotl tank cycling: how long did yours take?",
      body: "Set up a 100 litre tank for our first axolotl. Testing daily. How long should I expect the cycle to take before he comes home?",
      tags: ["axolotl", "cycling"],
    },
    replies: [
      {
        author: hannah,
        accepted: true,
        votes: [ravi],
        body: "Usually 4 to 8 weeks. Wait until ammonia and nitrite are both 0 and you have some nitrate. Keep the water cool (under 20 C) and avoid gravel they could swallow.",
      },
    ],
  },
  {
    author: grace,
    input: {
      category: "chat",
      speciesSlug: "goat",
      title: "The pygmy goat has escaped again",
      body: "Clementine got onto the shed roof this morning. Fence is 1.2 m. How high do your goat fences go?",
      tags: ["goats", "fun"],
    },
    votes: [tom, jamie, megan],
    replies: [
      {
        author: tom,
        body: "Anything climbable within a metre of the fence is a ladder to a goat.",
      },
      { author: megan, body: "Please tell me there's a photo." },
    ],
  },
  {
    author: jamie,
    input: {
      category: "behaviour",
      speciesSlug: "dog",
      title: "Reactive lurcher on lead: managing busy parks",
      body: "Otis is great off lead but lunges at dogs when he's on lead. Any tips for getting through a busy park calmly?",
      tags: ["reactivity", "training"],
    },
    votes: [dan],
    replies: [
      {
        author: dan,
        body: "Distance is your friend. Go at quieter times and reward him for looking at a dog calmly from far away.",
        votes: [jamie],
      },
      { author: oliver, body: "A yellow 'I need space' lead slip helped people give us room." },
    ],
  },
  {
    author: callum,
    input: {
      category: "pet-loss",
      title: "Saying goodbye to our first family dog",
      body: "We lost Max on Friday at 13. The kids are taking it hard. How did you explain it to children?",
      tags: [],
    },
    votes: [megan, sarah, priya],
    replies: [
      {
        author: megan,
        body: "So sorry. We were honest and simple, and let them help plant something in the garden for him.",
        votes: [callum],
      },
      {
        author: sarah,
        body: "Many vet practices and the Blue Cross have pet bereavement support, including for children.",
      },
    ],
  },
];
