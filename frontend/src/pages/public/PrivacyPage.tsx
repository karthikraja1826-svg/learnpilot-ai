import { LegalPageLayout } from '../../components/legal/LegalPageLayout';
import { LegalSection } from '../../components/legal/LegalSection';

const LAST_UPDATED = 'September 8, 2026';

export function PrivacyPage() {
  return (
    <LegalPageLayout title="Privacy Policy" lastUpdated={LAST_UPDATED}>
      <p className="text-body text-text-secondary">
        This Privacy Policy explains what information LearnPilot AI (the "Service") collects, how it is used, and
        the choices you have. It covers the data and third-party services the Service actually relies on to
        operate.
      </p>

      <LegalSection title="1. Information We Collect">
        <p>We collect the following categories of information:</p>
        <ul>
          <li>
            <strong>Account information</strong> — your name, email address, and authentication identifier,
            managed through Firebase Authentication when you sign up or log in with email/password or
            Google.
          </li>
          <li>
            <strong>Profile information</strong> — personal, academic, and study-preference details you add
            to your profile, and any profile photo you choose to upload.
          </li>
          <li>
            <strong>Academic and study data</strong> — subjects, topics, exams, assignments, tasks, study
            plans, study sessions, Pomodoro sessions, and related progress and streak data you create while
            using the Service.
          </li>
          <li>
            <strong>Notification data</strong> — if you enable push notifications, your browser generates a
            push subscription (an endpoint and encryption keys) that we store so we can deliver
            notifications to that browser, along with a history of notifications sent to your account.
          </li>
          <li>
            <strong>Local preferences</strong> — your light/dark theme preference, stored in your browser's
            local storage on your device.
          </li>
        </ul>
      </LegalSection>

      <LegalSection title="2. How We Use Your Information">
        <p>We use the information above to:</p>
        <ul>
          <li>Operate your account and keep your study data in sync across your sessions.</li>
          <li>Generate AI-assisted study plans and scheduling suggestions.</li>
          <li>Send study reminders, deadline alerts, and streak updates through in-app and push notifications.</li>
          <li>Display your profile photo and details back to you within the app.</li>
          <li>Maintain the security and reliability of the Service.</li>
        </ul>
      </LegalSection>

      <LegalSection title="3. Third-Party Services We Use">
        <p>The Service relies on the following third-party providers to function:</p>
        <ul>
          <li>
            <strong>Firebase Authentication (Google)</strong> — handles sign-up, login, and identity
            verification, including Google sign-in.
          </li>
          <li>
            <strong>Groq</strong> — a third-party AI service used to generate study plans and scheduling
            suggestions based on the academic information and preferences you provide.
          </li>
          <li>
            <strong>Web Push (VAPID)</strong> — the standard browser push notification protocol used to
            deliver notifications to your device; your browser vendor's push service relays these messages.
          </li>
        </ul>
        <p>
          These providers process the data necessary to perform their function and are subject to their own
          privacy practices.
        </p>
      </LegalSection>

      <LegalSection title="4. Data Storage">
        <p>
          Your account and study data are stored in our database. Uploaded profile photos are stored on our
          server and served back to your browser when your profile loads. If you remove your profile photo,
          the stored file is deleted from our server and your profile reverts to having no custom photo.
        </p>
      </LegalSection>

      <LegalSection title="5. Your Choices">
        <p>You control the information you share with the Service. You can:</p>
        <ul>
          <li>Update or correct your profile and academic information at any time.</li>
          <li>Upload, change, or remove your profile photo at any time.</li>
          <li>Turn push notifications on or off from the Notifications or Settings page, or from your browser's site settings.</li>
          <li>Choose which categories of reminders (study, assignment, exam, streak) you receive.</li>
        </ul>
        <p>
          Depending on where you live, you may have additional rights over your personal information, such
          as the ability to request access to, correction of, or deletion of your data.
        </p>
      </LegalSection>

      <LegalSection title="6. Data Security">
        <p>
          We use reasonable technical and organizational measures to protect your information. No method of
          storage or transmission over the internet is completely secure, so we cannot guarantee absolute
          security.
        </p>
      </LegalSection>

      <LegalSection title="7. Children's Privacy">
        <p>
          The Service is not directed to children under 13, and we do not knowingly collect personal
          information from children under that age.
        </p>
      </LegalSection>

      <LegalSection title="8. Changes to This Policy">
        <p>
          We may update this Privacy Policy from time to time. The "Last updated" date at the top of this
          page reflects the most recent version. Continued use of the Service after changes take effect
          constitutes acceptance of the updated policy.
        </p>
      </LegalSection>

      <LegalSection title="9. Contact">
        <p>
          If you have questions about this Privacy Policy, you can reach out through the support or contact
          options available within the app.
        </p>
      </LegalSection>
    </LegalPageLayout>
  );
}
