/**
 * Demo data: a household of pets with photos, a year of health records timed
 * so reminders are overdue / due soon / coming up, a pet who has passed away,
 * and a lively community forum.
 *
 * Local (the shared demo account):
 *   pnpm --filter @pintopets/web seed:demo
 *   Clears the demo account's pets and every forum post in the local OpsAPI
 *   (which e2e runs fill with throwaway rows), then seeds. Needs APP_ENV=local
 *   and OPSAPI_URL on localhost.
 *
 * int (a real account, via scripts/seed/seed-int.sh):
 *   APP_ENV=int SEED_OWNER_ID=<OpsAPI user uuid>. Only replaces what an
 *   earlier seed made: the owner's pets with the seeded names, and the seeded
 *   members with their threads (replies cascade) and votes. Anything else,
 *   including the owner's own pets and other people's posts, is left alone.
 *   Never runs on acc, and on prod only in review mode (below).
 *
 * prod, App Review's demo account only (via scripts/seed/seed-review.sh):
 *   APP_ENV=prod SEED_TARGET=review SEED_OWNER_ID=<reviewer's OpsAPI user uuid>.
 *   Pets, photos and records for that one account. No community members or
 *   posts (prod's forum is real people only); replaces only pets it made before.
 *
 * Photos: Unsplash (free to use under the Unsplash License), see photos/CREDITS.md.
 */
import { readFile } from "node:fs/promises";
import { PetInput, ThreadInput } from "@pintopets/api-contract";
import { expect, test } from "vitest";
import { env } from "@/env";
import { type Actor, DEMO_USER_ID } from "@/server/auth";
import {
  acceptAnswer,
  createReply,
  createThread,
  setDisplayName,
  vote,
} from "@/server/community/service";
import { setProfilePhoto, uploadPhoto } from "@/server/media/photos";
import { deleteRow, listAll, updateRow } from "@/server/opsapi/client";
import { createRecord } from "@/server/pets/records";
import { changePetStatus, createPet, deletePet, listPets } from "@/server/pets/service";

type Who = Pick<Actor, "id" | "role" | "displayName">;

const target =
  process.env.SEED_TARGET === "review" ? "review" : process.env.APP_ENV === "int" ? "int" : "local";
/** Whose household the pets join: the demo account locally, a real account on int / prod review. */
const demo: Who = {
  id: target === "local" ? DEMO_USER_ID : (process.env.SEED_OWNER_ID ?? ""),
  role: target === "review" ? "member" : "moderator",
  displayName: "Demo owner",
};

/** Fixed ids so re-running replaces the same community members. */
const member = (n: number, displayName: string): Who => ({
  id: `5eed0000-0000-4000-8000-${String(n).padStart(12, "0")}`,
  role: "owner",
  displayName,
});
const priya = member(1, "Priya R");
const tom = member(2, "Tom the horse guy");
const sarah = member(3, "Sarah (RVN)");
const dan = member(4, "Dan W");
const megan = member(5, "Megan and Pickle");
const oliver = member(6, "Oliver K");
const members = [priya, tom, sarah, dan, megan, oliver];

/** yyyy-mm-dd, `days` from today (negative = in the past). */
function day(days: number): string {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d.toLocaleDateString("en-CA");
}
const years = (n: number) => day(-Math.round(n * 365.25));
const photo = (name: string) => readFile(new URL(`./photos/${name}.jpg`, import.meta.url));

interface SeedPet {
  input: PetInput;
  photos: { file: string; caption: string; altText: string }[];
  records: [kind: Parameters<typeof createRecord>[2], input: Record<string, unknown>][];
  deceasedOn?: string;
}

const vet = { vetPracticeName: "Riverside Veterinary Centre", vetPracticePhone: "020 7946 0321" };
const emergency = { emergencyContactName: "Priya Patel", emergencyContactPhone: "07700 900123" };

/** Monthly-ish weigh-ins following a curve. */
function weighIns(points: [daysAgo: number, grams: number][], note?: [number, string]) {
  return points.map(
    ([ago, grams]) =>
      [
        "weights",
        { measuredOn: day(-ago), weightGrams: grams, notes: note?.[0] === ago ? note[1] : null },
      ] as SeedPet["records"][number],
  );
}

const PETS: SeedPet[] = [
  {
    input: {
      name: "Biscuit",
      speciesSlug: "dog",
      breedSlugs: ["beagle"],
      sex: "male",
      neutered: "yes",
      dateOfBirth: years(4.3),
      colourMarkings: "Tricolour, white tip on tail",
      insuranceProvider: "Petplan",
      insurancePolicyRef: "PP-4417-2209",
      passportNumber: "GB 826 0981 2234",
      ...vet,
      ...emergency,
      notes:
        "Will do anything for food: keep the bin closed. Pulls on the lead near squirrels. Hates the hoover.",
    },
    photos: [
      { file: "biscuit", caption: "Post-walk grin", altText: "A beagle smiling at the camera" },
    ],
    records: [
      ...weighIns(
        [
          [330, 15_400],
          [270, 15_600],
          [210, 15_200],
          [150, 14_900],
          [95, 14_600],
          [40, 14_300],
          [6, 14_100],
        ],
        [270, "Vet says aim for 14 kg"],
      ),
      [
        "vaccinations",
        {
          vaccine: "DHP + Leptospirosis L4 booster",
          givenOn: day(-341),
          batchNumber: "A2391B",
          vet: "Riverside Veterinary Centre",
          nextDueOn: day(24),
        },
      ],
      [
        "vaccinations",
        {
          vaccine: "Kennel cough (intranasal)",
          givenOn: day(-372),
          vet: "Riverside Veterinary Centre",
          nextDueOn: day(-7),
          notes: "Needed before his kennel stay at Christmas",
        },
      ],
      [
        "parasite-treatments",
        { kind: "flea_and_tick", product: "NexGard Spectra", givenOn: day(-24), nextDueOn: day(6) },
      ],
      [
        "parasite-treatments",
        { kind: "worm", product: "Milbemax", givenOn: day(-82), nextDueOn: day(8) },
      ],
      [
        "vet-visits",
        {
          visitOn: day(-341),
          practice: "Riverside Veterinary Centre",
          vetName: "Dr Amara Okafor",
          reason: "Annual health check and booster",
          outcome:
            "Healthy. A little overweight: reduce food by 10% and swap to lower-calorie treats.",
          costPence: 6_450,
        },
      ],
      [
        "vet-visits",
        {
          visitOn: day(-58),
          practice: "Riverside Veterinary Centre",
          vetName: "Dr Amara Okafor",
          reason: "Limping on front left leg after the park",
          outcome: "Mild soft-tissue strain. Rest for a week with short lead walks only.",
          costPence: 8_920,
        },
      ],
      [
        "allergies",
        { allergen: "Chicken", reaction: "Itchy ears and paws within a day", severity: "moderate" },
      ],
      [
        "conditions",
        {
          name: "Seasonal skin allergy",
          diagnosedOn: day(-500),
          status: "managed",
          notes: "Worse in late summer. Wipe paws after walks.",
        },
      ],
      [
        "diet-items",
        {
          kind: "food",
          brand: "Lily's Kitchen",
          product: "Adult Lamb Hotpot (dry)",
          amount: "110 g",
          frequency: "Twice a day",
          startedOn: day(-300),
        },
      ],
      [
        "diet-items",
        {
          kind: "treat",
          product: "Carrot sticks",
          amount: "A handful",
          frequency: "Training walks",
        },
      ],
      [
        "diet-changes",
        {
          changedOn: day(-300),
          description: "Switched from chicken kibble to lamb over 10 days",
          reaction: "Ears much less itchy after three weeks",
        },
      ],
      [
        "symptoms",
        {
          occurredAt: new Date(Date.now() - 12 * 86_400_000).toISOString(),
          symptom: "Scratching his right ear and shaking his head",
          severity: "mild",
          notes: "Settled after cleaning. Keep an eye on it.",
        },
      ],
    ],
  },
  {
    input: {
      name: "Luna",
      speciesSlug: "cat",
      breedSlugs: ["domestic-shorthair"],
      sex: "female",
      neutered: "yes",
      dateOfBirth: years(9.1),
      dateOfBirthIsEstimate: true,
      colourMarkings: "Brown classic tabby, green eyes",
      insuranceProvider: "Bought By Many",
      ...vet,
      notes: "Indoor-outdoor. Rescue from Battersea in 2018. Only drinks from the water fountain.",
    },
    photos: [
      { file: "luna", caption: "Caught mid-judgement", altText: "A tabby cat with green eyes" },
      {
        file: "luna-stairs",
        caption: "Her spot on the stairs",
        altText: "A tabby cat sitting on white stairs",
      },
    ],
    records: [
      ...weighIns([
        [300, 4_350],
        [200, 4_300],
        [120, 4_250],
        [60, 4_150],
        [9, 4_080],
      ]),
      [
        "vaccinations",
        {
          vaccine: "Feline RCP (cat flu and enteritis)",
          givenOn: day(-320),
          vet: "Riverside Veterinary Centre",
          nextDueOn: day(45),
        },
      ],
      [
        "parasite-treatments",
        { kind: "flea", product: "Frontline Plus for cats", givenOn: day(-33), nextDueOn: day(-3) },
      ],
      [
        "medications",
        {
          name: "Meloxicam oral suspension for cats",
          doseAsPrescribed: "Fill the syringe to her weight line (4 kg), once daily on food",
          frequency: "Once a day with breakfast",
          startOn: day(-10),
          endOn: day(4),
          prescribedBy: "Dr Amara Okafor",
        },
      ],
      [
        "conditions",
        {
          name: "Early arthritis in hips",
          diagnosedOn: day(-14),
          status: "managed",
          notes: "Ramp up to the windowsill helps.",
        },
      ],
      [
        "vet-visits",
        {
          visitOn: day(-14),
          practice: "Riverside Veterinary Centre",
          vetName: "Dr Amara Okafor",
          reason: "Stiff getting up, not jumping onto the bed",
          outcome: "Early arthritis in both hips. Two weeks of meloxicam, then review.",
          costPence: 7_200,
          followUpOn: day(5),
        },
      ],
      [
        "water-notes",
        {
          notedOn: day(-6),
          observation: "Drinking a bit more than usual from the fountain",
          notes: "Mention at the review appointment",
        },
      ],
      [
        "diet-items",
        {
          kind: "food",
          brand: "Royal Canin",
          product: "Mature 7+ in gravy",
          amount: "1 pouch",
          frequency: "Twice a day",
        },
      ],
    ],
  },
  {
    input: {
      name: "Mochi",
      speciesSlug: "dog",
      breedSlugs: ["french-bulldog"],
      sex: "male",
      neutered: "no",
      dateOfBirth: years(2.2),
      colourMarkings: "Fawn with black mask",
      insuranceProvider: "Petplan",
      ...vet,
      notes: "Snores. Keep walks short and in the shade when it's warm.",
    },
    photos: [
      {
        file: "mochi",
        caption: "Dressed for the occasion",
        altText: "A French Bulldog in a yellow t-shirt",
      },
    ],
    records: [
      ...weighIns([
        [240, 11_800],
        [150, 12_200],
        [70, 12_400],
        [15, 12_300],
      ]),
      [
        "vaccinations",
        { vaccine: "DHP + Leptospirosis L4 booster", givenOn: day(-245), nextDueOn: day(120) },
      ],
      [
        "parasite-treatments",
        { kind: "flea_and_tick", product: "Simparica Trio", givenOn: day(-18), nextDueOn: day(12) },
      ],
      [
        "conditions",
        {
          name: "Brachycephalic airway (mild)",
          diagnosedOn: day(-600),
          status: "managed",
          notes: "Avoid heat and harnesses that press on the throat.",
        },
      ],
      [
        "vet-visits",
        {
          visitOn: day(-9),
          practice: "Riverside Veterinary Centre",
          reason: "Red, weepy left eye",
          outcome: "Mild conjunctivitis. Eye drops for 7 days.",
          costPence: 5_800,
          followUpOn: day(12),
        },
      ],
    ],
  },
  {
    input: {
      name: "Willow",
      speciesSlug: "rabbit",
      breedSlugs: ["mini-lop"],
      sex: "female",
      neutered: "yes",
      dateOfBirth: years(3.4),
      colourMarkings: "Sandy, white chin",
      ...vet,
      notes: "Bonded with Pumpkin's hutch next door. Unlimited hay, greens in the evening.",
    },
    photos: [
      {
        file: "willow",
        caption: "Ears down, sun out",
        altText: "A sandy lop-eared rabbit on grass",
      },
    ],
    records: [
      ...weighIns([
        [200, 1_820],
        [110, 1_870],
        [20, 1_850],
      ]),
      [
        "vaccinations",
        {
          vaccine: "Myxomatosis + RHD1 + RHD2 combined",
          givenOn: day(-347),
          nextDueOn: day(18),
        },
      ],
      [
        "diet-items",
        {
          kind: "food",
          product: "Timothy hay",
          amount: "Unlimited",
          frequency: "Always available",
        },
      ],
      [
        "diet-items",
        {
          kind: "food",
          brand: "Science Selective",
          product: "Adult rabbit nuggets",
          amount: "1 egg cup",
          frequency: "Once a day",
        },
      ],
    ],
  },
  {
    input: {
      name: "Pumpkin",
      speciesSlug: "guinea-pig",
      breedSlugs: ["american-smooth-coated"],
      sex: "female",
      dateOfBirth: years(1.6),
      colourMarkings: "Tortoiseshell and white",
      notes: "Wheeks loudly at the fridge door. Lives with her sister Pip.",
    },
    photos: [
      {
        file: "pumpkin",
        caption: "Pumpkin and Pip at dinner",
        altText: "Two guinea pigs eating grated carrot",
      },
    ],
    records: [
      ...weighIns([
        [90, 940],
        [60, 965],
        [30, 980],
        [3, 990],
      ]),
      [
        "diet-items",
        {
          kind: "supplement",
          product: "Fresh pepper for vitamin C",
          amount: "A strip",
          frequency: "Daily",
        },
      ],
      [
        "parasite-treatments",
        { kind: "mite", product: "Xeno 450 spot-on", givenOn: day(-70), nextDueOn: day(20) },
      ],
    ],
  },
  {
    input: {
      name: "Storm",
      speciesSlug: "horse",
      breedSlugs: ["arab"],
      sex: "female",
      neutered: "unknown",
      dateOfBirth: years(14),
      colourMarkings: "Flea-bitten grey, star",
      heightInches: 59,
      passportNumber: "826 002 99 1873456",
      insuranceProvider: "NFU Mutual",
      vetPracticeName: "Downs Equine Vets",
      vetPracticePhone: "01632 960 418",
      notes: "Livery at Hollybank Farm. Sensitive to spring grass: muzzle from April.",
    },
    photos: [
      {
        file: "storm",
        caption: "First canter of spring",
        altText: "A grey horse cantering in a paddock",
      },
    ],
    records: [
      [
        "horse-care",
        {
          kind: "farrier",
          doneOn: day(-41),
          provider: "J. Hartley, farrier",
          result: "Front shoes reset, hinds trimmed",
          nextDueOn: day(-3),
        },
      ],
      [
        "horse-care",
        {
          kind: "dental",
          doneOn: day(-190),
          provider: "Downs Equine Vets",
          result: "Sharp edges rasped, no concerns",
          nextDueOn: day(175),
        },
      ],
      [
        "horse-care",
        {
          kind: "worm_egg_count",
          doneOn: day(-30),
          result: "Under 50 eggs per gram: no wormer needed",
          nextDueOn: day(60),
        },
      ],
      [
        "vaccinations",
        { vaccine: "Equine influenza + tetanus", givenOn: day(-300), nextDueOn: day(65) },
      ],
      ...weighIns([
        [180, 452_000],
        [60, 446_000],
      ]),
    ],
  },
  {
    input: {
      name: "Sunny",
      speciesSlug: "bird",
      breedSlugs: ["conure"],
      sex: "unknown",
      dateOfBirth: years(5),
      dateOfBirthIsEstimate: true,
      colourMarkings: "Sun conure: yellow, orange and green wings",
      notes: "Loud at sunrise and sunset. Loves millet sprays and the shower perch.",
    },
    photos: [
      {
        file: "sunny",
        caption: "Morning shout",
        altText: "An orange and yellow sun conure on a branch",
      },
    ],
    records: [
      ...weighIns([
        [120, 112],
        [60, 109],
        [5, 111],
      ]),
      [
        "vet-visits",
        {
          visitOn: day(-120),
          practice: "Avian and Exotics Clinic",
          reason: "Annual check and beak trim",
          outcome: "All good. Weigh weekly at home.",
          costPence: 4_500,
          followUpOn: day(245),
        },
      ],
    ],
  },
  {
    input: {
      name: "Scout",
      speciesSlug: "dog",
      breedSlugs: ["jack-russell-terrier"],
      sex: "female",
      neutered: "yes",
      dateOfBirth: years(7),
      colourMarkings: "White with tan and black face",
      ...vet,
    },
    photos: [
      {
        file: "scout",
        caption: "Ready for the beach",
        altText: "A Jack Russell Terrier looking at the camera",
      },
    ],
    records: [
      ...weighIns([
        [120, 6_900],
        [30, 7_000],
      ]),
      [
        "vaccinations",
        { vaccine: "DHP + Leptospirosis L4 booster", givenOn: day(-200), nextDueOn: day(165) },
      ],
      [
        "parasite-treatments",
        { kind: "lungworm", product: "Advocate", givenOn: day(-26), nextDueOn: day(4) },
      ],
    ],
  },
  {
    input: {
      name: "Rosie",
      speciesSlug: "dog",
      breedSlugs: ["golden-retriever"],
      sex: "female",
      neutered: "yes",
      dateOfBirth: years(14.5),
      colourMarkings: "Golden, white muzzle in her later years",
      notes: "The best girl. Swam in every river she ever met.",
    },
    photos: [
      {
        file: "rosie",
        caption: "Bringing flowers, as always",
        altText: "A golden retriever with a flower in her mouth",
      },
    ],
    records: [],
    deceasedOn: day(-410),
  },
];

interface SeedThread {
  author: Who;
  input: Record<string, unknown>;
  replies: { author: Who; body: string; votes?: Who[]; accepted?: true }[];
  votes?: Who[];
}

const THREADS: SeedThread[] = [
  {
    author: priya,
    input: {
      category: "health",
      speciesSlug: "rabbit",
      title: "Rabbit hasn't eaten her hay since this morning",
      body: "Our lop Clover usually hoovers up hay all day but she's barely touched it since breakfast and is sitting hunched in the corner. Poops look smaller than normal. Is this a wait-and-see thing or should I ring the vet tonight?",
      tags: ["gut-stasis", "rabbits"],
    },
    votes: [sarah, dan, megan],
    replies: [
      {
        author: sarah,
        accepted: true,
        votes: [priya, dan, oliver, megan],
        body: "Please ring your vet (or the out-of-hours service) now rather than waiting. A rabbit not eating with small or no droppings can be gut stasis, and that can get serious within hours. Keep her warm and note when she last ate and pooped so you can tell them.",
      },
      {
        author: megan,
        body: "Went through this with our Pickle last winter. The vet gave pain relief and gut stimulants and she was eating again by the next morning. Fingers crossed for Clover.",
      },
      {
        author: priya,
        body: "Update: the out-of-hours vet saw her. Early stasis, she's had meds and is nibbling coriander already. Thank you both, so glad I didn't wait.",
        votes: [sarah, megan],
      },
    ],
  },
  {
    author: dan,
    input: {
      category: "behaviour",
      speciesSlug: "dog",
      title: "Beagle howls every time we leave the house",
      body: "Rescued a 3 year old beagle two months ago. Lovely dog, but the neighbours say he howls for the first 20 minutes after we go out. We've tried a Kong and leaving the radio on. What worked for you?",
      tags: ["separation", "rescue"],
    },
    votes: [priya, oliver],
    replies: [
      {
        author: oliver,
        votes: [dan, priya],
        body: "Practise really short absences first: pick up keys, step outside for 30 seconds, come back calmly. Build up slowly. Ours got there in about six weeks. A camera helped us see when he actually settled.",
      },
      {
        author: sarah,
        body: "Worth a chat with your vet too. They can rule out anything medical and refer you to an accredited behaviourist if it doesn't improve.",
      },
      {
        author: megan,
        body: "A snuffle mat with his breakfast scattered in it bought us a good 15 quiet minutes. Beagles love a job to do.",
      },
    ],
  },
  {
    author: tom,
    input: {
      category: "health",
      speciesSlug: "horse",
      title: "How often do you get a worm egg count done?",
      body: "Yard is moving away from routine worming every 8 weeks to testing first. For those already doing it, how often do you test and when do you add a tapeworm test?",
      tags: ["worming", "faecal-egg-count"],
    },
    votes: [sarah],
    replies: [
      {
        author: sarah,
        accepted: true,
        votes: [tom],
        body: "Most vets suggest a count every 8 to 12 weeks from spring to autumn, plus a tapeworm saliva or blood test twice a year. Encysted redworm still needs a winter treatment for most horses, so check that plan with your vet.",
      },
      {
        author: oliver,
        body: "We do spring, summer and autumn counts. Saved us a fortune and our vet is happier about resistance.",
      },
    ],
  },
  {
    author: megan,
    input: {
      category: "nutrition",
      speciesSlug: "cat",
      title: "Getting an older cat to drink more water",
      body: "Our 12 year old cat has started drinking a bit more. Vet is running bloods, but meanwhile any tips for getting more water into her in a way she likes?",
      tags: ["senior", "hydration"],
    },
    replies: [
      {
        author: priya,
        votes: [megan, dan],
        body: "A water fountain changed everything for ours. Also try wide, shallow bowls away from the food bowl. Lots of cats don't like their whiskers touching the sides.",
      },
      {
        author: dan,
        body: "Wet food plus a spoonful of warm water stirred in. She thinks it's gravy.",
      },
    ],
  },
  {
    author: oliver,
    input: {
      category: "new-pets",
      speciesSlug: "guinea-pig",
      title: "First guinea pigs arriving Saturday, checklist?",
      body: "Picking up two sisters from a rescue this weekend. Hutch is indoors and big. What do people wish they'd known in the first month?",
      tags: ["checklist"],
    },
    votes: [megan, priya, tom],
    replies: [
      {
        author: megan,
        votes: [oliver],
        body: "Lots of hay, more than you think. Daily vitamin C from fresh veg (pepper is great). And weigh them weekly on kitchen scales, because weight loss is often the first sign something's up.",
      },
      {
        author: priya,
        body: "Give them hidey houses with two exits so nobody gets cornered. Ours took about a week before they'd wheek at us.",
      },
    ],
  },
  {
    author: priya,
    input: {
      category: "grooming",
      speciesSlug: "dog",
      title: "Nail clipping without the drama",
      body: "Our spaniel hates having her nails done. We end up taking her to the groomer just for that. Has anyone trained their dog to accept it at home?",
      tags: ["nails", "training"],
    },
    replies: [
      {
        author: dan,
        body: "Lick mat with peanut butter (xylitol-free!) on the wall of the bath. One nail a day at first. She now offers her paw.",
        votes: [priya],
      },
    ],
  },
  {
    author: sarah,
    input: {
      category: "senior-pets",
      title: "Small changes that helped our older pets",
      body: "Thought it'd be nice to collect these in one place. For us: rugs on the laminate, a ramp to the sofa, and two short walks instead of one long one. What helped yours?",
      tags: ["arthritis", "comfort"],
    },
    votes: [priya, tom, dan, megan, oliver],
    replies: [
      {
        author: tom,
        body: "For our old pony: soaked hay cubes once her teeth started going, and a rug check twice a day in winter.",
        votes: [sarah],
      },
      {
        author: megan,
        body: "A heated pad (low setting) in the cat bed. She hasn't left it since October.",
        votes: [sarah, priya],
      },
      {
        author: oliver,
        body: "Raised food and water bowls for our lab. Eats more comfortably now.",
      },
    ],
  },
  {
    author: dan,
    input: {
      category: "chat",
      title: "Show us your pet's best sleeping position",
      body: "Ours sleeps upside down with all four legs in the air every single night. Surely we're not the only ones. Describe yours!",
      tags: ["fun"],
    },
    votes: [megan, oliver],
    replies: [
      {
        author: megan,
        body: "Ours does the loaf. Perfect loaf. Paws completely invisible.",
      },
      { author: oliver, body: "Head on the stairs, body on the landing. Every night." },
      { author: priya, body: "Curled in a perfect circle with his nose under his tail." },
    ],
  },
  {
    author: megan,
    input: {
      category: "pet-loss",
      title: "It's been a year since we lost our old boy",
      body: "Just wanted to write it somewhere. He was 15 and we were lucky to have him. Some days are still hard. Thank you to everyone here who was kind last year.",
      tags: [],
    },
    votes: [priya, sarah, dan, tom, oliver],
    replies: [
      {
        author: sarah,
        body: "Sending love. Fifteen years of being loved like that is a wonderful life.",
      },
      { author: tom, body: "Thinking of you. They leave big pawprints." },
    ],
  },
  {
    author: tom,
    input: {
      category: "adoption",
      title: "Adopting a retired racing greyhound, what should we expect?",
      body: "We've been approved by a rehoming centre for a 4 year old ex-racer. Never had a sighthound before. What surprised you in the first few weeks?",
      tags: ["greyhound", "rescue"],
    },
    replies: [],
  },
];

function assertTarget() {
  const url = new URL(env().OPSAPI_URL);
  if (target === "review") {
    if (env().APP_ENV !== "prod" || !/^[0-9a-f-]{36}$/.test(demo.id)) {
      throw new Error("Review mode needs APP_ENV=prod and SEED_OWNER_ID=<reviewer's OpsAPI user uuid>.");
    }
    return;
  }
  if (target === "int") {
    if (env().APP_ENV !== "int" || !/^[0-9a-f-]{36}$/.test(demo.id)) {
      throw new Error("Seeding int needs APP_ENV=int and SEED_OWNER_ID=<OpsAPI user uuid>.");
    }
    return;
  }
  if (env().APP_ENV !== "local" || !["localhost", "127.0.0.1"].includes(url.hostname)) {
    throw new Error(
      `seed:demo only runs against a local OpsAPI or int (APP_ENV=${env().APP_ENV}, OPSAPI_URL=${url.origin}).`,
    );
  }
}

/** Remove the owner's pets an earlier seed made (by name); their other pets stay. */
async function clearSeededPets() {
  const names = new Set(PETS.map((p) => p.input.name));
  for (const status of ["active", "archived", "deceased"] as const) {
    for (const pet of await listPets(demo, status))
      if (names.has(pet.name)) await deletePet(demo, pet.id);
  }
}

/** int: remove only what a previous seed created, so real data is untouched. */
async function clearSeededData() {
  await clearSeededPets();
  const seedIds = new Set(members.map((m) => m.id));
  const mine = (row: Record<string, unknown>, col: string) => seedIds.has(String(row[col]));
  for (const row of await listAll("forum-votes", {}, 100))
    if (mine(row, "user_uuid")) await deleteRow("forum-votes", row.uuid);
  for (const row of await listAll("forum-threads", {}, 100))
    if (mine(row, "author_user_uuid")) await deleteRow("forum-threads", row.uuid);
  for (const row of await listAll("forum-replies", {}, 100))
    if (mine(row, "author_user_uuid")) await deleteRow("forum-replies", row.uuid);
  for (const row of await listAll("forum-members", {}, 100))
    if (mine(row, "user_uuid")) await deleteRow("forum-members", row.uuid);
}

async function clearDemoData() {
  for (const status of ["active", "archived", "deceased"] as const) {
    for (const pet of await listPets(demo, status)) await deletePet(demo, pet.id);
  }
  for (const resource of [
    "forum-votes",
    "forum-reports",
    "forum-mod-actions",
    "forum-replies",
    "forum-threads",
    "forum-members",
  ] as const) {
    const rows = await listAll(resource, {}, 100);
    for (const row of rows) await deleteRow(resource, row.uuid);
  }
}

async function seedPets() {
  for (const seed of PETS) {
    const pet = await createPet(demo, PetInput.parse(seed.input));
    let first: string | undefined;
    for (const p of seed.photos) {
      const uploaded = await uploadPhoto(demo, pet.id, {
        bytes: await photo(p.file),
        caption: p.caption,
        altText: p.altText,
      });
      first ??= uploaded.id;
    }
    if (first) await setProfilePhoto(demo, first);
    for (const [kind, input] of seed.records) await createRecord(demo, pet.id, kind, input);
    if (seed.deceasedOn) {
      await changePetStatus(demo, pet.id, { status: "deceased", deceasedOn: seed.deceasedOn });
    }
  }
}

async function seedCommunity() {
  // On int the owner is a real person: keep the name they chose.
  if (target === "local") await setDisplayName(demo, "Sam (Biscuit's human)");
  for (const m of members) await setDisplayName(m, m.displayName);
  // Oldest first, so the newest discussion is at the top of "Latest".
  const threads = [...THREADS].reverse();
  for (const [i, t] of threads.entries()) {
    const thread = await createThread(t.author, ThreadInput.parse(t.input));
    for (const v of t.votes ?? [])
      await vote(v, { targetType: "thread", targetId: thread.id, voted: true });
    // OpsAPI sets created_at itself, but last activity can be spread over the
    // last fortnight so "Latest" and the dashboard read like a real forum.
    let at = Date.now() - ((threads.length - i) ** 2 * 3.2 + 0.7) * 3_600_000;
    for (const r of t.replies) {
      const reply = await createReply(r.author, thread.id, r.body);
      at += 37 * 60_000 + r.body.length * 9_000;
      for (const v of r.votes ?? [])
        await vote(v, { targetType: "reply", targetId: reply.id, voted: true });
      if (r.accepted) await acceptAnswer(t.author, thread.id, reply.id);
    }
    await updateRow("forum-threads", thread.id, {
      lastActivityAt: new Date(Math.min(at, Date.now() - 10 * 60_000)).toISOString(),
    });
  }
}

test("seed demo data", async () => {
  assertTarget();
  if (target === "review") await clearSeededPets();
  else await (target === "int" ? clearSeededData() : clearDemoData());
  await seedPets();
  if (target !== "review") await seedCommunity();
  // Something to look at on the home page straight away.
  const names = new Set(PETS.map((p) => p.input.name));
  const seeded = (await listPets(demo)).filter((p) => names.has(p.name));
  expect(seeded.length).toBe(PETS.length - 1);
});
