import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, LegalPage, LegalSection } from "@/components/legal-page";
import { LEGAL } from "@/lib/legal";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "What PintoPets collects, why, who processes it, and your rights under UK GDPR.",
};

export default function PrivacyPage() {
  return (
    <LegalPage
      title="Privacy Policy"
      intro={
        <p>
          PintoPets helps you keep your pets&apos; health records in one place. This policy explains
          what we collect, why, and the choices and rights you have. We only use your information to
          run PintoPets: no advertising, no tracking and no selling of data.
        </p>
      }
    >
      <LegalSection id="who" title="Who we are">
        <p>
          PintoPets is run by {LEGAL.controllerName}, the data controller for the information
          described here. Contact us about privacy at <ContactEmail />.
        </p>
      </LegalSection>

      <LegalSection id="collect" title="What we collect">
        <ul>
          <li>
            <strong>Account details:</strong> your name, email address and account ID, which come
            from your Workstation sign-in (by email and password, with Google, or with Apple).
          </li>
          <li>
            <strong>Your pets and their records:</strong> what you enter, such as name, species,
            breed, date of birth, passport number, insurance, vet practice and emergency contact
            details, and health records (weights, vaccinations, parasite treatments, medications,
            vet visits, conditions, allergies, symptoms, diet, water and horse care notes).
          </li>
          <li>
            <strong>Photos you upload.</strong> We re-encode every photo and remove all embedded
            metadata, including EXIF camera data and GPS location, before it is stored.
          </li>
          <li>
            <strong>Community content:</strong> your community name, the discussions and replies you
            post, your &ldquo;helpful&rdquo; votes and any reports you make.
          </li>
          <li>
            <strong>Security settings:</strong> whether two-factor sign-in is on, your authenticator
            secret (encrypted) and recovery codes (stored only as one-way hashes), and failed-code
            counts used to lock out guessing.
          </li>
          <li>
            <strong>Your privacy choices:</strong> whether you have agreed to the optional uses
            below, and when.
          </li>
        </ul>
      </LegalSection>

      <LegalSection id="why" title="Why we use it">
        <p>
          We use your information to provide PintoPets: to sign you in and keep your account secure,
          store and show your pets&apos; records and reminders, and run the community, including
          moderation to keep it safe. Our lawful basis is our contract with you to provide the
          service and, for security and moderation, our legitimate interest in keeping PintoPets and
          its members safe.
        </p>
        <p>Two optional uses happen only if you turn them on. Both are off by default:</p>
        <ul>
          <li>
            <strong>Help improve the pet assistant:</strong> vets may review anonymised questions
            (names, contact details and pet names removed) to improve the knowledge base.
          </li>
          <li>
            <strong>News and tips by email:</strong> occasional updates. You can unsubscribe at any
            time.
          </li>
        </ul>
        <p>
          You can change either choice whenever you like on your{" "}
          <Link href="/account">account page</Link>. Our basis for these is your consent.
        </p>
      </LegalSection>

      <LegalSection id="tracking" title="No tracking or advertising">
        <p>
          PintoPets has no adverts, no third-party analytics and no tracking across other apps or
          websites. We don&apos;t sell or rent your information. The only cookies we set are the
          ones needed to sign you in and keep you signed in securely (for example your session and a
          short-lived &ldquo;recently confirmed&rdquo; marker after you enter an authenticator
          code). Our fonts are hosted by us, so pages don&apos;t call out to font services.
        </p>
      </LegalSection>

      <LegalSection id="processors" title="Who processes it for us">
        <ul>
          <li>
            <strong>OpsAPI (Workstation)</strong> provides sign-in and hosts the database where
            PintoPets stores your account settings, pets, records, photo details and community
            content.
          </li>
          <li>
            <strong>Google</strong>, only if you choose &ldquo;Sign in with Google&rdquo;: Google
            confirms who you are and shares your name and email address with Workstation.
          </li>
          <li>
            <strong>Apple</strong>, only if you choose &ldquo;Continue with Apple&rdquo;: Apple
            confirms who you are and shares your name and email address (or a private relay address
            if you choose to hide your email) with Workstation.
          </li>
          <li>
            <strong>Error monitoring:</strong> if it is switched on for the site, technical error
            reports go to Sentry so we can fix problems. They are configured not to include personal
            details such as names, emails or IP addresses by default.
          </li>
        </ul>
        <p>We share information with others only if the law requires it.</p>
      </LegalSection>

      <LegalSection id="sharing" title="What other people can see">
        <p>
          Your pets and their records are private to you. In the community, other people see your
          community name (never your email) and what you post. Community moderators can see reports
          and posts that have been hidden.
        </p>
      </LegalSection>

      <LegalSection id="retention" title="How long we keep it">
        <p>
          We keep your information while you have a PintoPets account. You can delete a pet, a photo
          or a record at any time. When you <Link href="/account/delete">delete your account</Link>,
          we delete your pets, records, photos (including the image files), community name, votes
          and security settings straight away, and erase the text of your community posts and unlink
          them from you. Your Workstation sign-in is closed at the same time: it can no longer be
          used, and if you signed in with Apple we revoke our access to your Apple ID.
          Moderators&apos; records of actions they took are kept to keep the community safe. Copies
          in routine backups are overwritten as those backups expire.
        </p>
      </LegalSection>

      <LegalSection id="rights" title="Your rights">
        <p>Under UK data protection law (UK GDPR) you can:</p>
        <ul>
          <li>
            <strong>Access and take your data:</strong> download everything we hold about you and
            your pets as a file from your <Link href="/account">account page</Link> (&ldquo;Export
            my data&rdquo;, which needs two-factor sign-in turned on), or email us for a copy.
          </li>
          <li>
            <strong>Delete it:</strong> delete your account and data at{" "}
            <Link href="/account/delete">Delete your account</Link>.
          </li>
          <li>
            <strong>Correct it:</strong> edit your pets and records in the app, and your name and
            email in your Workstation account.
          </li>
          <li>
            <strong>Withdraw consent</strong> for the optional uses at any time.
          </li>
          <li>
            <strong>Object or ask us to restrict</strong> how we use your information.
          </li>
        </ul>
        <p>
          To use any right, or if something isn&apos;t possible in the app, email <ContactEmail />.
          If you&apos;re unhappy with how we handle your information, you can complain to the
          Information Commissioner&apos;s Office (ico.org.uk).
        </p>
        <p>
          Your Workstation sign-in is shared with other Workstation services. Deleting your
          PintoPets account closes it for all of them.
        </p>
      </LegalSection>

      <LegalSection id="security" title="Keeping it safe">
        <p>
          Connections are encrypted. Sensitive actions, such as exporting your data, need a fresh
          code from your authenticator app. Deleting your account needs that code if you use
          two-factor sign-in, or otherwise a sign-in in the last few minutes. Two-factor secrets are
          encrypted with a key that only PintoPets holds.
        </p>
      </LegalSection>

      <LegalSection id="children" title="Children">
        <p>
          PintoPets is not directed at children under 13, and we don&apos;t knowingly collect their
          information. If you think a child has given us information, contact us and we will delete
          it.
        </p>
      </LegalSection>

      <LegalSection id="changes" title="Changes to this policy">
        <p>
          If we change this policy we&apos;ll update the date at the top, and tell you in the app if
          the change is significant.
        </p>
      </LegalSection>

      <LegalSection id="contact" title="Contact">
        <p>
          {LEGAL.controllerName}, PintoPets: <ContactEmail />. See also our{" "}
          <Link href="/terms">Terms of Use</Link> and <Link href="/support">Support</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
