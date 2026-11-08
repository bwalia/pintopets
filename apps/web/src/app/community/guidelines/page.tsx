import { Card, CardContent } from "@pintopets/ui/components/card";
import type { Metadata } from "next";
import Link from "next/link";
import { AUTO_HIDE_REPORTS, MAX_LINKS, RATE_LIMITS } from "@/server/community/rules";

export const metadata: Metadata = { title: "Community guidelines" };

const RULES = [
  {
    title: "Be kind",
    body: "Everyone here loves their animals. Disagree with ideas, never with people. No insults, hate or harassment.",
  },
  {
    title: "Animal welfare first",
    body: "Never suggest anything that could hurt an animal. If a pet sounds seriously unwell, the best answer is “see a vet now”.",
  },
  {
    title: "Community advice isn't a diagnosis",
    body: "Share your experience, not prescriptions. Don't recommend specific doses of medicine; that's for a vet.",
  },
  {
    title: "Keep personal details private",
    body: "Phone numbers and email addresses are blocked in posts. Don't share addresses or meet strangers to hand over animals.",
  },
  {
    title: "No selling",
    body: "No buying, selling or paid rehoming of animals, and no adverts. Most pet scams start with a “puppy for sale” post.",
  },
  {
    title: "Stay on topic",
    body: `Choose the right topic and keep links useful (up to ${MAX_LINKS} per post, no link shorteners).`,
  },
];

export default function GuidelinesPage() {
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6">
      <div>
        <h1 className="font-semibold">Community guidelines</h1>
        <p className="text-muted-foreground mt-1">
          How we keep PintoPets friendly, useful and safe.
        </p>
      </div>
      <ol className="flex flex-col gap-3">
        {RULES.map((r, i) => (
          <li key={r.title}>
            <Card>
              <CardContent>
                <p className="font-semibold">
                  {i + 1}. {r.title}
                </p>
                <p className="text-muted-foreground mt-1">{r.body}</p>
              </CardContent>
            </Card>
          </li>
        ))}
      </ol>
      <section className="flex flex-col gap-2">
        <h2 className="text-h4 font-semibold">How moderation works</h2>
        <ul className="text-muted-foreground list-disc pl-5">
          <li>Use “Report” on any post that breaks these rules. Reports are private.</li>
          <li>
            When {AUTO_HIDE_REPORTS} different people report a post, it&apos;s hidden until a
            moderator reviews it.
          </li>
          <li>
            Moderators can hide or remove posts, lock discussions and pause accounts. Every action
            is recorded.
          </li>
          <li>
            To stop spam, you can start up to {RATE_LIMITS.threadsPerHour} discussions and post{" "}
            {RATE_LIMITS.repliesPerHour} replies an hour.
          </li>
        </ul>
      </section>
      <Link href="/community" className="text-primary underline underline-offset-2">
        Back to the community
      </Link>
    </div>
  );
}
