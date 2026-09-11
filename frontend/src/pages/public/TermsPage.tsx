import { LegalPageLayout } from '../../components/legal/LegalPageLayout';
import { LegalSection } from '../../components/legal/LegalSection';

const LAST_UPDATED = 'September 8, 2026';

export function TermsPage() {
  return (
    <LegalPageLayout title="Terms & Conditions" lastUpdated={LAST_UPDATED}>
      <p className="text-body text-text-secondary">
        These Terms & Conditions ("Terms") govern your access to and use of LearnPilot AI (the "Service"), an
        AI-assisted study planning application. By creating an account or using the Service, you agree to
        these Terms. If you do not agree, please do not use the Service.
      </p>

      <LegalSection title="1. Your Account">
        <p>
          You need an account to use the Service. Accounts are created and authenticated through Firebase
          Authentication, using either an email and password or Google sign-in. You are responsible for
          maintaining the confidentiality of your account credentials and for all activity that occurs
          under your account.
        </p>
        <p>
          You must provide accurate information when creating your account and keep your profile
          information up to date. You may update your profile, change or remove your profile photo, and
          adjust your notification and study preferences at any time from within the app.
        </p>
      </LegalSection>

      <LegalSection title="2. What the Service Does">
        <p>
          LearnPilot AI lets you organize subjects, topics, exams, assignments, and tasks; build and follow a
          study plan; run focus (Pomodoro) sessions; and review analytics about your study activity and
          streaks. The Service can generate AI-assisted study plans and scheduling suggestions based on the
          academic information, availability, and preferences you provide.
        </p>
      </LegalSection>

      <LegalSection title="3. AI-Generated Content">
        <p>
          Study plans, schedules, and other suggestions produced by the Service are generated with the
          assistance of a third-party AI model. AI-generated content may occasionally be inaccurate,
          incomplete, or unsuitable for your specific circumstances. You are responsible for reviewing and
          using your own judgment before relying on any AI-generated study plan, and the Service is not a
          substitute for guidance from your teachers, professors, or academic institution.
        </p>
      </LegalSection>

      <LegalSection title="4. Your Content">
        <p>
          You retain ownership of the academic information, tasks, notes, and profile photo you add to the
          Service ("Your Content"). You grant us the right to store and process Your Content solely to
          operate, maintain, and provide the Service to you, including sending it to the third-party AI
          service to generate study plans.
        </p>
        <p>
          Do not upload or submit content that is unlawful, infringes on someone else's rights, or that you
          do not have the right to share.
        </p>
      </LegalSection>

      <LegalSection title="5. Notifications">
        <p>
          The Service can send browser push notifications for study reminders, deadlines, and streak
          updates, and in-app notifications visible on the Notifications page. Push notifications require
          your explicit browser permission and can be turned on or off at any time from the Notifications
          or Settings page, or by changing your browser's site permissions.
        </p>
      </LegalSection>

      <LegalSection title="6. Acceptable Use">
        <p>You agree not to:</p>
        <ul>
          <li>Use the Service for any unlawful purpose or in violation of these Terms.</li>
          <li>Attempt to gain unauthorized access to another user's account or data.</li>
          <li>Interfere with, disrupt, or attempt to circumvent the security of the Service.</li>
          <li>Upload malicious code or content that could harm the Service or other users.</li>
        </ul>
      </LegalSection>

      <LegalSection title="7. Termination">
        <p>
          You may stop using the Service at any time. We may suspend or terminate access to the Service for
          accounts that violate these Terms or where required to protect the Service or its users.
        </p>
      </LegalSection>

      <LegalSection title="8. Disclaimers">
        <p>
          The Service is provided "as is" and "as available," without warranties of any kind, whether
          express or implied. We do not guarantee that the Service, including AI-generated study plans or
          push notification delivery, will be uninterrupted, error-free, or perfectly accurate.
        </p>
      </LegalSection>

      <LegalSection title="9. Changes to These Terms">
        <p>
          We may update these Terms from time to time to reflect changes to the Service. The "Last updated"
          date at the top of this page reflects the most recent version. Continued use of the Service after
          changes take effect constitutes acceptance of the updated Terms.
        </p>
      </LegalSection>

      <LegalSection title="10. Contact">
        <p>
          If you have questions about these Terms, you can reach out through the support or contact options
          available within the app.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
