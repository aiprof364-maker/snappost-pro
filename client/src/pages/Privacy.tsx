import { ArrowLeft } from "lucide-react";
import { useLocation } from "wouter";

export default function Privacy() {
  const [, navigate] = useLocation();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container flex items-center gap-4 py-6">
          <button
            onClick={() => navigate("/")}
            className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Home
          </button>
        </div>
      </div>

      {/* Content */}
      <div className="container max-w-3xl py-12">
        <h1 className="mb-2 text-4xl font-bold">Privacy Policy</h1>
        <p className="mb-8 text-muted-foreground">
          Last updated: June 2026
        </p>

        <div className="prose prose-invert max-w-none space-y-8">
          <section>
            <h2 className="text-2xl font-semibold mb-4">1. Introduction</h2>
            <p className="text-foreground/90 leading-relaxed">
              SnapPost Pro ("we," "us," "our," or "Company") is committed to
              protecting your privacy. This Privacy Policy explains how we
              collect, use, disclose, and safeguard your information when you
              use our website and services.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              2. Information We Collect
            </h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We may collect information about you in a variety of ways. The
              information we may collect on the Site includes:
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/90">
              <li>
                <strong>Personal Data:</strong> Personally identifiable
                information, such as your name, shipping address, email address,
                and telephone number, and demographic information, such as your
                age, gender, hometown, and interests, that you voluntarily give
                to us when you register with the Site or when you choose to
                participate in various activities related to the Site.
              </li>
              <li>
                <strong>Financial Data:</strong> Financial information, such as
                data related to your payment method (e.g., valid credit card
                number, card brand, expiration date) that we may collect when
                you purchase, order, return, exchange, or request information
                about our services from the Site.
              </li>
              <li>
                <strong>Data From Social Networks:</strong> User information
                from social networks, including your name, your social network
                username, location, gender, birth date, email address, profile
                picture, and public data for contacts, if you connect your
                account to such social networks.
              </li>
              <li>
                <strong>Mobile Device Data:</strong> Device information, such as
                your mobile device ID, model, and manufacturer, and information
                about the location of your device, if you access the Site from a
                mobile device.
              </li>
              <li>
                <strong>Third-Party Data:</strong> Information from third
                parties, such as personal information or network friends, if you
                connect your account to the third party and grant the Site
                permission to access this information.
              </li>
              <li>
                <strong>Data From Contests, Giveaways, and Surveys:</strong>{" "}
                Personal and preference information you may provide when
                entering contests or giveaways and/or responding to surveys.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              3. Use of Your Information
            </h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              Having accurate information about you permits us to provide you
              with a smooth, efficient, and customized experience. Specifically,
              we may use information collected about you via the Site to:
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/90">
              <li>Create and manage your account.</li>
              <li>
                Email you regarding your account or order, including order
                confirmations and updates.
              </li>
              <li>
                Fulfill and send out your orders, and send you related
                information.
              </li>
              <li>Generate a personal profile about you.</li>
              <li>Increase the efficiency and operation of the Site.</li>
              <li>Monitor and analyze usage and trends to improve your experience with the Site.</li>
              <li>
                Notify you of updates to the Site or promotional information
                relating to our services.
              </li>
              <li>
                Offer new products, services, and/or recommendations to you.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              4. Disclosure of Your Information
            </h2>
            <p className="text-foreground/90 leading-relaxed mb-4">
              We may share information we have collected about you in certain
              situations:
            </p>
            <ul className="list-disc list-inside space-y-2 text-foreground/90">
              <li>
                <strong>By Law or to Protect Rights:</strong> If we believe the
                release of information about you is necessary to comply with the
                law, enforce our Site policies, or protect ours or others'
                rights, property, or safety.
              </li>
              <li>
                <strong>Third-Party Service Providers:</strong> We may share
                your information with third parties that perform services for
                us, including payment processing, data analysis, email delivery,
                hosting services, customer service, and marketing assistance.
              </li>
              <li>
                <strong>Business Transfers:</strong> If we are involved in a
                merger, acquisition, or asset sale, your information may be
                transferred as part of that transaction.
              </li>
            </ul>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              5. Security of Your Information
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              We use administrative, technical, and physical security measures
              to protect your personal information. However, no method of
              transmission over the Internet or method of electronic storage is
              100% secure. While we strive to use commercially acceptable means
              to protect your personal information, we cannot guarantee its
              absolute security.
            </p>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              6. Contact Us About Privacy
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              If you have questions or comments about this Privacy Policy,
              please contact us at:
            </p>
            <div className="mt-4 rounded-lg bg-card border border-border p-4">
              <p className="font-semibold">SnapPost Pro</p>
              <p className="text-sm text-muted-foreground mt-2">
                Email: support@snappostpro.com
              </p>
            </div>
          </section>

          <section>
            <h2 className="text-2xl font-semibold mb-4">
              7. Changes to This Privacy Policy
            </h2>
            <p className="text-foreground/90 leading-relaxed">
              We reserve the right to modify this Privacy Policy at any time. If
              we make material changes to this policy, we will notify you by
              updating the "Last updated" date of this Privacy Policy, and any
              such changes will become effective upon posting to the Site.
            </p>
          </section>
        </div>
      </div>
    </div>
  );
}
