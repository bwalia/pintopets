import { Alert, AlertDescription, AlertTitle } from "@pintopets/ui/components/alert";
import { Badge } from "@pintopets/ui/components/badge";
import { Button } from "@pintopets/ui/components/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@pintopets/ui/components/card";
import { Input } from "@pintopets/ui/components/input";
import { Label } from "@pintopets/ui/components/label";
import { BadgeCheck, CircleAlert, Info, Siren } from "lucide-react";
import type { Metadata } from "next";

/** Internal design-system preview. Not linked from the nav; hidden from search engines. */
export const metadata: Metadata = { title: "Design system", robots: { index: false } };

const SWATCHES = [
  ["Background", "bg-background", "text-foreground"],
  ["Primary (teal)", "bg-primary", "text-primary-foreground"],
  ["Secondary (sand)", "bg-secondary", "text-secondary-foreground"],
  ["Accent (clay)", "bg-accent", "text-accent-foreground"],
  ["Muted", "bg-muted", "text-muted-foreground"],
  ["Urgent", "bg-urgent", "text-urgent-foreground"],
  ["Warning (soon)", "bg-warning", "text-warning-foreground"],
  ["Success (vet reviewed)", "bg-success", "text-success-foreground"],
] as const;

export default function DesignPage() {
  return (
    <div className="mx-auto flex max-w-4xl flex-col gap-10">
      <header>
        <h1 className="font-semibold">Design system</h1>
        <p className="text-muted-foreground mt-2">
          Poppins for text, Unbounded for h1/h2 and JetBrains Mono for data, as on
          workstation.co.uk. Every colour pair meets WCAG 2.2 AA contrast.
        </p>
      </header>

      <section aria-labelledby="colours">
        <h2 id="colours" className="font-semibold">
          Colours
        </h2>
        <ul className="mt-4 grid grid-cols-2 gap-3 sm:grid-cols-4">
          {SWATCHES.map(([name, bg, fg]) => (
            <li
              key={name}
              className={`${bg} ${fg} flex h-24 items-end rounded-xl border p-3 text-sm font-semibold`}
            >
              {name}
            </li>
          ))}
        </ul>
      </section>

      <section aria-labelledby="buttons" className="flex flex-col gap-4">
        <h2 id="buttons" className="font-semibold">
          Buttons and badges
        </h2>
        <div className="flex flex-wrap gap-3">
          <Button>Save pet</Button>
          <Button variant="secondary">Add photo</Button>
          <Button variant="outline">Cancel</Button>
          <Button variant="ghost">More</Button>
          <Button variant="link">Read the guide</Button>
          <Button variant="urgent">Find an emergency vet</Button>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge>Dog</Badge>
          <Badge variant="secondary">Being sick</Badge>
          <Badge variant="expert">
            <BadgeCheck aria-hidden /> Vet reviewed
          </Badge>
          <Badge variant="warning">See a vet soon</Badge>
          <Badge variant="urgent">Urgent</Badge>
          <Badge variant="outline">Unverified</Badge>
        </div>
      </section>

      <section aria-labelledby="alerts" className="flex flex-col gap-3">
        <h2 id="alerts" className="font-semibold">
          Alerts
        </h2>
        <Alert variant="urgent" role="note">
          <Siren aria-hidden />
          <AlertTitle>Contact a vet now</AlertTitle>
          <AlertDescription>
            <p>Retching without bringing anything up, with a swollen belly, can be an emergency.</p>
          </AlertDescription>
        </Alert>
        <Alert variant="warning" role="note">
          <CircleAlert aria-hidden />
          <AlertTitle>See a vet soon</AlertTitle>
          <AlertDescription>
            <p>If the sickness carries on for more than a day, book an appointment.</p>
          </AlertDescription>
        </Alert>
        <Alert variant="success">
          <BadgeCheck aria-hidden />
          <AlertTitle>Vet reviewed</AlertTitle>
          <AlertDescription>
            <p>This guide was checked by a registered vet nurse.</p>
          </AlertDescription>
        </Alert>
        <Alert>
          <Info aria-hidden />
          <AlertTitle>Good to know</AlertTitle>
          <AlertDescription>
            <p>
              PintoPets is your own record. Official microchip details are held on a Defra-compliant
              database.
            </p>
          </AlertDescription>
        </Alert>
      </section>

      <section aria-labelledby="forms">
        <h2 id="forms" className="font-semibold">
          Forms and cards
        </h2>
        <Card className="mt-4 max-w-md">
          <CardHeader>
            <CardTitle>Add a pet</CardTitle>
            <CardDescription>You can change these details later.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col gap-2">
            <Label htmlFor="pet-name">Pet&apos;s name</Label>
            <Input id="pet-name" placeholder="Max" />
          </CardContent>
        </Card>
      </section>
    </div>
  );
}
