import Link from "next/link";

export const metadata = {
  title: "Terms of Service | LaGravinese Jewelers",
  description: "Terms of service for LaGravinese Jewelers jewelry repair services.",
};

export default function TermsPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">
          Terms of Service
        </h1>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Services
            </h2>
            <p className="text-slate-600">
              LaGravinese Jewelers provides jewelry repair, maintenance, and related services. By using our services, you agree to these terms.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Repair Services
            </h2>
            <p className="text-slate-600">
              When you submit an item for repair, you will receive a ticket with an estimated completion date and pricing. Final pricing may vary based on the actual work required. We will contact you if significant changes to the estimate are needed.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              SMS Notifications
            </h2>
            <p className="text-slate-600">
              By providing your phone number and consenting to SMS notifications, you agree to receive text messages regarding your repair status and pickup notifications. These are transactional messages only, not marketing. Message frequency varies. Message and data rates may apply. Reply STOP to opt out at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Pickup &amp; Storage
            </h2>
            <p className="text-slate-600">
              Items should be picked up promptly after notification that repairs are complete. We are not responsible for items left unclaimed for extended periods.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Liability
            </h2>
            <p className="text-slate-600">
              While we take every precaution to care for your items, LaGravinese Jewelers&apos; liability is limited to the repair services agreed upon. We recommend obtaining independent appraisals and insurance for valuable items.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Contact Us
            </h2>
            <p className="text-slate-600">
              For questions about these terms, please contact LaGravinese Jewelers directly at the store.
            </p>
          </section>

          <footer className="border-t border-slate-200 pt-8 mt-8 text-sm text-slate-500">
            <div className="flex gap-6">
              <Link href="/sms-consent" className="hover:text-slate-700 underline">
                SMS Consent
              </Link>
              <Link href="/privacy" className="hover:text-slate-700 underline">
                Privacy Policy
              </Link>
            </div>
            <p className="mt-4">
              &copy; {new Date().getFullYear()} LaGravinese Jewelers. All rights reserved.
            </p>
          </footer>
        </div>
      </div>
    </div>
  );
}

