import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, LegalPage, LegalSection } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Terms of Use",
  description: "The terms for using PintoPets and its community.",
};

export default function TermsPage() {
  return (
    <LegalPage
      title="Terms of Use"
      intro={
        <p>
          These terms apply when you use PintoPets on the web or in the app. By using PintoPets you
          agree to them. PintoPets is run by {LEGAL.controllerName} (&ldquo;we&rdquo;).
        </p>
      }
    >
      <LegalSection title="Not veterinary advice">
        <p>
          PintoPets helps you keep records and reminders and talk to other pet owners. It is not a
          replacement for advice from a vet. Information in the app and in the community may be
          wrong or not right for your pet. In an emergency, contact a vet straight away.
        </p>
      </LegalSection>

      <LegalSection title="Your account">
        <p>
          You sign in with a Workstation account. Keep your sign-in details and recovery codes safe;
          you&apos;re responsible for what happens in your account. PintoPets is not directed at
          children under 13.
        </p>
      </LegalSection>

      <LegalSection title="Your content">
        <p>
          You own what you add: pet records, photos and posts. You give us permission to store and
          show it to run PintoPets (for example, showing your posts to the community). Only upload
          photos and information you have the right to share. You can export or delete your data at
          any time (see our <Link href="/privacy">Privacy Policy</Link>).
        </p>
      </LegalSection>

      <LegalSection id="community" title="Community rules">
        <p>
          Everyone posting in the community agrees to the{" "}
          <Link href="/community/guidelines">community guidelines</Link>. In short:
        </p>
        <ul>
          <li>Be kind. No insults, hate or harassment.</li>
          <li>Animal welfare first: never suggest anything that could hurt an animal.</li>
          <li>Share experience, not prescriptions or medicine doses; that&apos;s for a vet.</li>
          <li>Keep personal details private. Don&apos;t post contact details or addresses.</li>
          <li>No buying, selling or paid rehoming of animals, and no adverts.</li>
          <li>Stay on topic and keep links useful.</li>
        </ul>
        <p>
          Anyone can report a post. Moderators can hide or remove posts, lock discussions and pause
          accounts that break the rules, and every action is recorded. Posting is rate limited to
          stop spam.
        </p>
      </LegalSection>

      <LegalSection title="Acceptable use">
        <p>
          Don&apos;t misuse PintoPets: no trying to access other people&apos;s data, breaking or
          overloading the service, scraping, or using it for anything unlawful. We may suspend or
          close access for serious or repeated misuse.
        </p>
      </LegalSection>

      <LegalSection title="The service">
        <p>
          We work to keep PintoPets available and your data safe, but we provide it &ldquo;as
          is&rdquo; and can&apos;t promise it will always be available or error-free. We may change
          or stop features. Nothing in these terms limits your rights as a consumer or our liability
          where the law doesn&apos;t allow it to be limited.
        </p>
      </LegalSection>

      <LegalSection title="Ending">
        <p>
          You can stop using PintoPets and <Link href="/account/delete">delete your account</Link>{" "}
          at any time.
        </p>
      </LegalSection>

      <LegalSection title="Changes and law">
        <p>
          If we change these terms we&apos;ll update the date at the top, and tell you in the app if
          the change is significant. These terms are governed by the laws of England and Wales.
        </p>
      </LegalSection>

      <LegalSection title="Contact">
        <p>
          Questions? Email <ContactEmail /> or visit <Link href="/support">Support</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
