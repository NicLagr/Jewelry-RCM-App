import Link from "next/link";

export const metadata = {
  title: "SMS Notifications Consent | LaGravinese Jewelers",
  description: "Information about SMS text message notifications for jewelry repair status updates and pickup notifications.",
};

export default function SmsConsentPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">
          SMS Notifications Consent
        </h1>

        <div className="prose prose-slate max-w-none space-y-8">
          {/* What messages are sent */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              What Messages Are Sent
            </h2>
            <p className="text-slate-600">
              LaGravinese Jewelers sends SMS text messages to customers regarding jewelry repair status updates and pickup notifications.
            </p>
          </section>

          {/* How customers opt in */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              How Customers Opt In
            </h2>
            <p className="text-slate-600">
              Customers provide consent verbally at the time of jewelry intake. Phone numbers are collected by store staff and entered into our internal repair ticket system for repair-related communications only.
            </p>
          </section>

          {/* Verbal Opt-In Script */}
          <section className="bg-slate-50 border border-slate-200 rounded-lg p-6">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Verbal Opt-In Script
            </h2>
            <p className="text-slate-700 italic">
              &ldquo;Can we text you updates about your jewelry repair, including when it&apos;s ready for pickup? Message frequency varies. Message and data rates may apply. You can reply STOP at any time to opt out.&rdquo;
            </p>
          </section>

          {/* Frequency and rates */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Message Frequency &amp; Rates
            </h2>
            <p className="text-slate-600">
              Message frequency varies. Message and data rates may apply.
            </p>
          </section>

          {/* Opt-out and help */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Opt-Out &amp; Help
            </h2>
            <p className="text-slate-600">
              Reply <strong>STOP</strong> to unsubscribe. Reply <strong>HELP</strong> for help.
            </p>
          </section>

          {/* No marketing */}
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Message Purpose
            </h2>
            <p className="text-slate-600">
              Messages are transactional and not used for marketing.
            </p>
          </section>

          {/* Contact */}
          <section className="border-t border-slate-200 pt-8 mt-8">
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Contact Us
            </h2>
            <p className="text-slate-600">
              LaGravinese Jewelers<br />
              For questions about SMS notifications, please contact the store directly.
            </p>
          </section>

          {/* Footer links */}
          <footer className="border-t border-slate-200 pt-8 mt-8 text-sm text-slate-500">
            <div className="flex gap-6">
              <Link href="/privacy" className="hover:text-slate-700 underline">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-slate-700 underline">
                Terms of Service
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

