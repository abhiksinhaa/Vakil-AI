export default function PrivacyContent() {
  return (
    <div className="space-y-6 text-cream/80 text-sm leading-relaxed">
      <div>
        <h1 className="text-2xl font-display text-gold mb-2">Privacy Policy</h1>
        <p><strong>Draftee — AI Legal Draft Generator</strong></p>
        <p><strong>Effective Date:</strong> May 24, 2026</p>
        <p><strong>Last Updated:</strong> May 24, 2026</p>
      </div>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">1. Introduction</h2>
        <p>Draftee (“we”, “us”, “our”) is committed to protecting your privacy. This Privacy Policy explains how we collect, use, store, and protect your personal information when you use our platform at draftee.in.</p>
        <p className="mt-2">By using Draftee, you agree to the collection and use of information as described in this policy.</p>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">2. Information We Collect</h2>
        <h3 className="text-lg font-display text-gold/80 mt-4 mb-2">2.1 Information You Provide</h3>
        <ul className="list-disc pl-5 space-y-2 mb-4">
          <li><strong>Account Information:</strong> Email address and password when you sign up</li>
          <li><strong>Advocate Profile:</strong> Advocate name, Bar Council Number, City/Court/Jurisdiction</li>
          <li><strong>Draft Content:</strong> The facts, situations, and details you enter to generate legal drafts</li>
          <li><strong>Communications:</strong> Any messages you send to us via email or chatbot</li>
        </ul>
        
        <h3 className="text-lg font-display text-gold/80 mt-4 mb-2">2.2 Information Collected Automatically</h3>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Usage Data:</strong> Pages visited, features used, time spent on platform</li>
          <li><strong>Device Information:</strong> Browser type, operating system, device type</li>
          <li><strong>IP Address:</strong> For security and fraud prevention purposes</li>
          <li><strong>Cookies:</strong> To keep you logged in and improve your experience</li>
        </ul>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">3. How We Use Your Information</h2>
        <p className="mb-2">We use your information to:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Provide and improve the Draftee platform</li>
          <li>Generate AI-powered legal drafts based on your inputs</li>
          <li>Save your draft history for future reference</li>
          <li>Send important account and service updates</li>
          <li>Respond to your support requests</li>
          <li>Detect and prevent fraud or misuse</li>
          <li>Comply with legal obligations</li>
        </ul>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">4. AI Processing of Your Data</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>When you generate a draft, your input (facts, party details, situation) is sent to <strong>Google Gemini AI</strong> for processing.</li>
          <li>Google Gemini processes your data to generate the draft text.</li>
          <li>We recommend not entering sensitive personal information (Aadhaar numbers, bank account details, etc.) beyond what is necessary for the draft.</li>
          <li>Google’s privacy policy applies to data processed by Gemini AI: <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer" className="text-gold hover:underline">https://policies.google.com/privacy</a></li>
        </ul>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">5. Data Storage</h2>
        <ul className="list-disc pl-5 space-y-2">
          <li>Your account data and draft history are stored securely using <strong>Supabase</strong> (PostgreSQL database).</li>
          <li>Data is stored on secure servers with encryption at rest and in transit.</li>
          <li>Your drafts are only accessible to you through your account — other users cannot see your drafts.</li>
          <li>Row Level Security (RLS) is enabled — each user can only access their own data.</li>
        </ul>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">6. Data Sharing</h2>
        <p className="mb-4">We do <strong>NOT</strong> sell your personal data to anyone.</p>
        <p className="mb-2">We may share your data only in these limited cases:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li><strong>Service Providers:</strong> Supabase (database), Google Gemini (AI processing), Vercel (hosting) — only as necessary to provide the service</li>
          <li><strong>Legal Requirements:</strong> If required by Indian law, court order, or government authority</li>
          <li><strong>Business Transfer:</strong> In case of merger or acquisition, with appropriate notice to users</li>
          <li><strong>With Your Consent:</strong> Any other sharing only with your explicit permission</li>
        </ul>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">7. Cookies</h2>
        <p className="mb-2">Draftee uses cookies to:</p>
        <ul className="list-disc pl-5 space-y-2 mb-4">
          <li>Keep you logged in to your account</li>
          <li>Remember your preferences</li>
          <li>Analyze platform usage</li>
        </ul>
        <p>You can disable cookies in your browser settings, but this may affect platform functionality.</p>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">8. Data Retention</h2>
        <ul className="list-disc pl-5 space-y-2 mb-4">
          <li><strong>Account data:</strong> Retained as long as your account is active</li>
          <li><strong>Draft history:</strong> Retained until you delete it or close your account</li>
          <li><strong>Usage logs:</strong> Retained for up to 90 days</li>
        </ul>
        <p>Upon account deletion, your personal data is deleted within 30 days</p>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">9. Your Rights</h2>
        <p className="mb-2">As a user, you have the right to:</p>
        <ul className="list-disc pl-5 space-y-2 mb-4">
          <li><strong>Access:</strong> Request a copy of your personal data</li>
          <li><strong>Correction:</strong> Update or correct inaccurate information</li>
          <li><strong>Deletion:</strong> Request deletion of your account and personal data</li>
          <li><strong>Portability:</strong> Request your draft history in a downloadable format</li>
          <li><strong>Objection:</strong> Object to certain uses of your data</li>
        </ul>
        <p>To exercise any of these rights, contact us at: <strong><a href="mailto:abhiksinha1523@gmail.com" className="text-gold hover:underline">abhiksinha1523@gmail.com</a></strong></p>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">10. Data Security</h2>
        <p className="mb-2">We take reasonable measures to protect your data including:</p>
        <ul className="list-disc pl-5 space-y-2 mb-4">
          <li>HTTPS encryption for all data in transit</li>
          <li>Encrypted database storage via Supabase</li>
          <li>Row Level Security — users can only access their own data</li>
          <li>Secure authentication via Supabase Auth</li>
        </ul>
        <p>However, no method of transmission over the internet is 100% secure. We cannot guarantee absolute security.</p>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">11. Children’s Privacy</h2>
        <p>Draftee is not intended for users under 18 years of age. We do not knowingly collect personal information from minors. If you believe a minor has provided us with personal data, contact us at <a href="mailto:abhiksinha1523@gmail.com" className="text-gold hover:underline">abhiksinha1523@gmail.com</a> and we will delete it promptly.</p>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">12. Third-Party Links</h2>
        <p>Draftee may contain links to third-party websites. We are not responsible for the privacy practices of those websites. We encourage you to read their privacy policies.</p>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">13. Changes to This Policy</h2>
        <p className="mb-2">We may update this Privacy Policy from time to time. We will notify you of significant changes by:</p>
        <ul className="list-disc pl-5 space-y-2 mb-4">
          <li>Posting the updated policy on our website with a new effective date</li>
          <li>Sending an email notification to registered users</li>
        </ul>
        <p>Continued use of Draftee after changes constitutes acceptance of the updated policy.</p>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">14. Governing Law</h2>
        <p>This Privacy Policy is governed by the laws of India, including the <strong>Digital Personal Data Protection Act, 2023 (DPDP Act)</strong>. Any disputes shall be subject to the jurisdiction of courts in Silchar, Assam, India.</p>
      </section>

      <hr className="border-border" />

      <section>
        <h2 className="text-xl font-display text-gold mb-3">15. Contact Us</h2>
        <p className="mb-2">For any privacy-related questions, concerns, or requests:</p>
        <p><strong>Draftee</strong><br/>
        Email: <a href="mailto:abhiksinha1523@gmail.com" className="text-gold hover:underline">abhiksinha1523@gmail.com</a><br/>
        Website: draftee.in</p>
        <p className="mt-4">We will respond to all privacy requests within <strong>30 days</strong>.</p>
      </section>

      <hr className="border-border" />

      <p className="italic text-cream/50 pt-4">By using Draftee, you acknowledge that you have read and understood this Privacy Policy.</p>
    </div>
  );
}
