import Link from "next/link";

export const metadata = {
  title: "Privacy Policy | LaGravinese Jewelers",
  description: "Privacy policy for LaGravinese Jewelers jewelry repair services.",
};

export default function PrivacyPage() {
  return (
    <div className="min-h-screen bg-white">
      <div className="max-w-3xl mx-auto px-4 py-12">
        <h1 className="text-3xl font-bold text-slate-900 mb-8">
          Privacy Policy
        </h1>

        <div className="prose prose-slate max-w-none space-y-8">
          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Information We Collect
            </h2>
            <p className="text-slate-600">
              When you use our jewelry repair services, we collect information necessary to provide those services, including:
            </p>
            <ul className="text-slate-600 list-disc list-inside mt-2 space-y-1">
              <li>Name and contact information (phone number, email address)</li>
              <li>Details about your jewelry items for repair tracking</li>
              <li>Photos of items for documentation purposes</li>
              <li>Service history and transaction records</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              How We Use Your Information
            </h2>
            <p className="text-slate-600">
              We use your information to:
            </p>
            <ul className="text-slate-600 list-disc list-inside mt-2 space-y-1">
              <li>Process and track your jewelry repairs</li>
              <li>Send you status updates and pickup notifications via SMS</li>
              <li>Contact you about your repairs</li>
              <li>Maintain records of services provided</li>
            </ul>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              SMS Communications
            </h2>
            <p className="text-slate-600">
              With your consent, we send SMS text messages for repair status updates and pickup notifications. These messages are transactional and not used for marketing. Message frequency varies. Message and data rates may apply. Reply STOP to unsubscribe at any time.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Data Security
            </h2>
            <p className="text-slate-600">
              We implement appropriate security measures to protect your personal information. Access to customer data is restricted to authorized store personnel only.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Data Retention
            </h2>
            <p className="text-slate-600">
              We retain customer and repair records for business and legal purposes. Photos associated with repairs may be deleted after a period of time to manage storage.
            </p>
          </section>

          <section>
            <h2 className="text-xl font-semibold text-slate-800 mb-3">
              Contact Us
            </h2>
            <p className="text-slate-600">
              For questions about this privacy policy or your personal information, please contact LaGravinese Jewelers directly at the store.
            </p>
          </section>

          <footer className="border-t border-slate-200 pt-8 mt-8 text-sm text-slate-500">
            <div className="flex gap-6">
              <Link href="/sms-consent" className="hover:text-slate-700 underline">
                SMS Consent
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

