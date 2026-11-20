import type { Metadata } from "next";
import Link from "next/link";
import { ContactEmail, LegalPage, LegalSection } from "@/components/legal-page";
import { EXTERNAL_LINKS } from "@/lib/links";

export const metadata: Metadata = {
  title: "Support",
  description: "Get help with PintoPets: sign-in, two-factor codes, your data and the community.",
};

const FAQ = [
  {
    q: "How do I sign in?",
    a: (
      <p>
        Choose <strong>Sign in</strong> and use your Workstation account: your email and password
        with a one-time code, or, where offered, &ldquo;Continue with Apple&rdquo; or
        &ldquo;Continue with Google&rdquo;. In the iPhone and iPad app, sign-in opens a secure
        browser sheet and returns you to the app.
      </p>
    ),
  },
  {
    q: "I've lost my phone or authenticator app. How do I get in?",
    a: (
      <p>
        When asked for a 6-digit code, enter one of the recovery codes you saved when you turned on
        two-factor sign-in. Each works once. Once you&apos;re in, go to{" "}
        <Link href="/account#security">Account → Security</Link> to set up your new phone or make
        new recovery codes. If you have no recovery codes left, email <ContactEmail /> from the
        address you sign in with.
      </p>
    ),
  },
  {
    q: "How do I download my data?",
    a: (
      <p>
        On your <Link href="/account">account page</Link>, choose <strong>Export my data</strong>.
        You&apos;ll get a file with every pet, record, photo detail and community post we hold.
        You&apos;ll need a code from your authenticator app, so two-factor sign-in must be on. If
        you don&apos;t use it, email <ContactEmail /> from the address you sign in with and
        we&apos;ll send you a copy.
      </p>
    ),
  },
  {
    q: "How do I delete my account?",
    a: (
      <p>
        Go to <Link href="/account/delete">Delete your account</Link> (also linked from your account
        page), sign in again to confirm it&apos;s you, and type DELETE. If you use two-factor
        sign-in you&apos;ll also enter a code from your authenticator app. Your pets, records,
        photos, community posts and settings are deleted, and your Workstation sign-in is closed (if
        you signed in with Apple, our access to your Apple ID is revoked).
      </p>
    ),
  },
  {
    q: "How do I report a community post?",
    a: (
      <p>
        Use <strong>Report</strong> on the post and choose a reason. Reports are private. Posts
        reported by several people are hidden until a moderator reviews them. Read the{" "}
        <Link href="/community/guidelines">community guidelines</Link>.
      </p>
    ),
  },
  {
    q: "My pet is unwell. Can PintoPets help?",
    a: (
      <p>
        PintoPets isn&apos;t a vet and can&apos;t give a diagnosis. If your pet is injured,
        struggling to breathe, collapsed, bleeding or in pain,{" "}
        <strong>contact your vet or an emergency vet now</strong>. You can{" "}
        <a href={EXTERNAL_LINKS.findAVet} target="_blank" rel="noreferrer">
          find a vet near you (RCVS)
        </a>
        .
      </p>
    ),
  },
];

export default function SupportPage() {
  return (
    <LegalPage
      title="Support"
      updated={false}
      intro={
        <p>
          Need help with PintoPets? Check the questions below, or email us at <ContactEmail />. We
          aim to reply within a few working days.
        </p>
      }
    >
      <LegalSection title="Common questions">
        <div className="flex flex-col gap-4">
          {FAQ.map((item) => (
            <div key={item.q}>
              <h3 className="font-semibold">{item.q}</h3>
              <div className="text-muted-foreground mt-1">{item.a}</div>
            </div>
          ))}
        </div>
      </LegalSection>

      <LegalSection id="contact" title="Contact us">
        <p>
          Email <ContactEmail />. Please don&apos;t send your password or authenticator codes. For
          urgent pet health problems, contact a vet, not us.
        </p>
        <p>
          See also our <Link href="/privacy">Privacy Policy</Link> and{" "}
          <Link href="/terms">Terms of Use</Link>.
        </p>
      </LegalSection>
    </LegalPage>
  );
}
