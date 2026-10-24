require('dotenv').config();
const { BrevoClient } = require('@getbrevo/brevo');

/**
 * Centralized Brevo Configuration & Client Initializer
 * Validates Brevo API Key and default Sender details.
 */
const BREVO_API_KEY = (process.env.BREVO_API_KEY || '').trim();
const SENDER_EMAIL = (process.env.SENDER_EMAIL || 'jainsamarpan7@gmail.com').trim();
const SENDER_NAME = (process.env.SENDER_NAME || 'iMovies').trim();

let brevoClientInstance = null;

const validateBrevoConfig = () => {
  if (!BREVO_API_KEY) {
    console.warn('[Brevo Config] WARNING: BREVO_API_KEY is not defined in environment variables.');
    return false;
  }
  if (!BREVO_API_KEY.startsWith('xkeysib-')) {
    console.warn('[Brevo Config] WARNING: BREVO_API_KEY does not start with expected prefix (xkeysib-).');
  }
  if (!SENDER_EMAIL || !SENDER_EMAIL.includes('@')) {
    console.warn('[Brevo Config] WARNING: SENDER_EMAIL is invalid or missing.');
    return false;
  }
  return true;
};

const getBrevoClient = () => {
  if (!brevoClientInstance) {
    if (!BREVO_API_KEY) {
      throw new Error('Cannot initialize Brevo client: BREVO_API_KEY is missing from environment.');
    }
    brevoClientInstance = new BrevoClient({
      apiKey: BREVO_API_KEY
    });
  }
  return brevoClientInstance;
};

const getBrevoSender = () => ({
  email: SENDER_EMAIL,
  name: SENDER_NAME
});

module.exports = {
  BREVO_API_KEY,
  SENDER_EMAIL,
  SENDER_NAME,
  validateBrevoConfig,
  getBrevoClient,
  getBrevoSender
};
