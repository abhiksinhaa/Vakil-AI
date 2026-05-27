import { useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from './Navbar';
import { saveWaitlist } from '../lib/supabase';

export default function PricingPage() {
  const [formData, setFormData] = useState({
    fullName: '',
    advocateName: '',
    city: '',
    whatsappNumber: '',
    email: '',
  });
  const [statusMessage, setStatusMessage] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleChange = (event) => {
    const { name, value } = event.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setErrorMessage('');
    setStatusMessage('');
  };

  const handleSubmit = async (event) => {
    event.preventDefault();
    setErrorMessage('');
    setStatusMessage('');

    const { fullName, advocateName, city, whatsappNumber, email } = formData;
    if (!fullName || !advocateName || !city || !whatsappNumber || !email) {
      setErrorMessage('Please fill in all fields.');
      return;
    }

    setIsSubmitting(true);
    const { error } = await saveWaitlist({
      full_name: fullName,
      advocate_name: advocateName,
      city,
      whatsapp_number: whatsappNumber,
      email,
    });
    setIsSubmitting(false);

    if (error) {
      console.error(error);
      setErrorMessage('Unable to join the waitlist right now. Please try again.');
      return;
    }

    setFormData({ fullName: '', advocateName: '', city: '', whatsappNumber: '', email: '' });
    setStatusMessage("You're on the list! We'll notify you on WhatsApp when Pro launches. 🎉");
  };

  return (
    <div className="min-h-screen bg-navy flex flex-col">
      <Navbar />

      <div className="flex-1 max-w-4xl mx-auto w-full px-4 sm:px-6 py-12 flex flex-col items-center justify-center">
        <div className="card w-full max-w-lg flex flex-col items-center text-center p-10 border-gold/40 ring-1 ring-gold/20 relative overflow-hidden">
          {/* Subtle background glow */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-gold/10 blur-[80px] rounded-full pointer-events-none"></div>

          <div className="w-16 h-16 bg-gold/10 rounded-full flex items-center justify-center mb-6 ring-1 ring-gold/30">
            <svg
              className="w-8 h-8 text-gold"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              xmlns="http://www.w3.org/2000/svg"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1.5}
                d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z"
              />
            </svg>
          </div>

          <h1 className="font-display text-3xl sm:text-4xl text-gold mb-3">
            Premium Version Coming Soon
          </h1>

          <p className="text-cream/90 text-lg mb-6 font-medium italic">
            "We are building something special for you" ✨
          </p>

          <p className="text-cream/50 text-sm mb-8 max-w-sm">
            We are working hard to bring you advanced AI legal tools, unlimited drafts, and much more. Stay tuned for our upcoming launch!
          </p>

          <Link to="/" className="btn-primary w-full sm:w-auto px-10 mb-8">
            Return to Dashboard
          </Link>

          <div className="w-full border-t border-gold/30 pt-8 mt-4">
            <h2 className="text-2xl sm:text-3xl text-gold font-semibold mb-2">
              Join the Waitlist
            </h2>
            <p className="text-cream/80 text-sm sm:text-base mb-6">
              Be the first to know when Pro launches
            </p>

            <form onSubmit={handleSubmit} className="w-full space-y-4 text-left">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <label className="block">
                  <span className="text-cream/80 text-sm mb-2 block">Full Name</span>
                  <input
                    name="fullName"
                    type="text"
                    value={formData.fullName}
                    onChange={handleChange}
                    placeholder="Your full name"
                    className="w-full rounded-2xl border border-gold/30 bg-navy/80 px-4 py-3 text-cream placeholder-gold/40 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  />
                </label>

                <label className="block">
                  <span className="text-cream/80 text-sm mb-2 block">Advocate Name</span>
                  <input
                    name="advocateName"
                    type="text"
                    value={formData.advocateName}
                    onChange={handleChange}
                    placeholder="Advocate name"
                    className="w-full rounded-2xl border border-gold/30 bg-navy/80 px-4 py-3 text-cream placeholder-gold/40 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  />
                </label>

                <label className="block">
                  <span className="text-cream/80 text-sm mb-2 block">City</span>
                  <input
                    name="city"
                    type="text"
                    value={formData.city}
                    onChange={handleChange}
                    placeholder="City"
                    className="w-full rounded-2xl border border-gold/30 bg-navy/80 px-4 py-3 text-cream placeholder-gold/40 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  />
                </label>

                <label className="block">
                  <span className="text-cream/80 text-sm mb-2 block">WhatsApp Number</span>
                  <input
                    name="whatsappNumber"
                    type="tel"
                    value={formData.whatsappNumber}
                    onChange={handleChange}
                    placeholder="+91 98765 43210"
                    className="w-full rounded-2xl border border-gold/30 bg-navy/80 px-4 py-3 text-cream placeholder-gold/40 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                  />
                </label>
              </div>

              <label className="block">
                <span className="text-cream/80 text-sm mb-2 block">Email</span>
                <input
                  name="email"
                  type="email"
                  value={formData.email}
                  onChange={handleChange}
                  placeholder="you@example.com"
                  className="w-full rounded-2xl border border-gold/30 bg-navy/80 px-4 py-3 text-cream placeholder-gold/40 outline-none focus:border-gold focus:ring-2 focus:ring-gold/20"
                />
              </label>

              {errorMessage && <p className="text-sm text-red-300">{errorMessage}</p>}
              {statusMessage && <p className="text-sm text-emerald-300">{statusMessage}</p>}

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-full bg-gold text-navy font-semibold px-6 py-3 shadow-lg shadow-gold/25 transition hover:bg-gold/90 disabled:cursor-not-allowed disabled:opacity-60"
              >
                {isSubmitting ? 'Joining...' : 'Join Waitlist'}
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
