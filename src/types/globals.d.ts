// Ambient declarations for untyped browser APIs and dependencies used across the app.

declare module 'html2pdf.js';

interface Window {
  SpeechRecognition?: any;
  webkitSpeechRecognition?: any;
  Razorpay?: any;
}
