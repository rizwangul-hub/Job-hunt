export interface DetectedFormStructure {
  hasForm: boolean;
  fields: {
    fullName?: string;
    email?: string;
    phone?: string;
    cvUpload?: string;
    coverLetter?: string;
    portfolioUrl?: string;
    linkedinUrl?: string;
    githubUrl?: string;
    screeningQuestions: string[];
  };
  hasCaptchaOrCloudflare: boolean;
  captchaType?: string;
  submitButtonFound: boolean;
  submitButtonSelector?: string;
  notes: string[];
}

export function analyzeFormHtml(htmlContent: string): DetectedFormStructure {
  const lower = htmlContent.toLowerCase();

  const hasRecaptcha = lower.includes('g-recaptcha') || lower.includes('google.com/recaptcha');
  const hasHcaptcha = lower.includes('h-captcha') || lower.includes('hcaptcha.com');
  const hasTurnstile = lower.includes('cf-turnstile') || lower.includes('challenges.cloudflare.com');
  const hasCloudflareChallenge = lower.includes('checking your browser') || lower.includes('cf-browser-verification');

  const hasCaptchaOrCloudflare = hasRecaptcha || hasHcaptcha || hasTurnstile || hasCloudflareChallenge;
  let captchaType: string | undefined;
  if (hasRecaptcha) captchaType = 'Google reCAPTCHA';
  else if (hasHcaptcha) captchaType = 'hCaptcha';
  else if (hasTurnstile) captchaType = 'Cloudflare Turnstile';
  else if (hasCloudflareChallenge) captchaType = 'Cloudflare Browser Check';

  const hasForm = lower.includes('<form') || lower.includes('input') || lower.includes('textarea');

  const fields: DetectedFormStructure['fields'] = {
    screeningQuestions: []
  };

  const notes: string[] = [];

  if (lower.includes('type="file"') || lower.includes("type='file'") || lower.includes('resume') || lower.includes('cv')) {
    fields.cvUpload = 'input[type="file"], [data-qa="resume-upload"]';
    notes.push('Detected file upload field for CV/Resume.');
  }

  if (lower.includes('name="name"') || lower.includes('id="name"') || lower.includes('placeholder="full name"')) {
    fields.fullName = 'input[name*="name"], input[id*="name"]';
  }

  if (lower.includes('type="email"') || lower.includes('name="email"') || lower.includes('id="email"')) {
    fields.email = 'input[type="email"], input[name*="email"]';
  }

  if (lower.includes('type="tel"') || lower.includes('name="phone"') || lower.includes('id="phone"')) {
    fields.phone = 'input[type="tel"], input[name*="phone"]';
  }

  if (lower.includes('linkedin')) {
    fields.linkedinUrl = 'input[name*="linkedin"], input[id*="linkedin"]';
  }

  if (lower.includes('portfolio') || lower.includes('website')) {
    fields.portfolioUrl = 'input[name*="portfolio"], input[name*="website"]';
  }

  if (lower.includes('github')) {
    fields.githubUrl = 'input[name*="github"], input[id*="github"]';
  }

  if (lower.includes('<textarea') || lower.includes('cover letter')) {
    fields.coverLetter = 'textarea[name*="cover"], textarea[id*="cover"], textarea';
  }

  const submitButtonFound =
    lower.includes('type="submit"') ||
    lower.includes("type='submit'") ||
    lower.includes('submit application') ||
    lower.includes('apply now');

  return {
    hasForm,
    fields,
    hasCaptchaOrCloudflare,
    captchaType,
    submitButtonFound,
    submitButtonSelector: submitButtonFound ? 'button[type="submit"], input[type="submit"], button:has-text("Submit")' : undefined,
    notes
  };
}
