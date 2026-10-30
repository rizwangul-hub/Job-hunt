import { env } from '../../config/env';
import { logger } from '../../utils/logger';

export interface ExtractedJobData {
  title: string;
  company: string;
  poster: string;
  contact: string;
  contactType: 'whatsapp' | 'email' | 'url';
  extractedSkills: string[];
  matchedTech: string[];
  seniority: string;
  location: string;
  isRemote: boolean;
  salaryStipend?: string;
  deadline?: string;
  applicationUrl?: string;
  isSuspicious?: boolean;
  suspiciousReason?: string;
}

const TECH_DICTIONARY = [
  { key: 'react', name: 'React.js' },
  { key: 'node', name: 'Node.js' },
  { key: 'express', name: 'Express.js' },
  { key: 'mongo', name: 'MongoDB' },
  { key: 'mern', name: 'MERN Stack' },
  { key: 'react native', name: 'React Native' },
  { key: 'typescript', name: 'TypeScript' },
  { key: 'javascript', name: 'JavaScript' },
  { key: 'tailwind', name: 'Tailwind CSS' },
  { key: 'next', name: 'Next.js' },
  { key: 'rest', name: 'REST APIs' },
  { key: 'redux', name: 'Redux' },
  { key: 'git', name: 'Git & GitHub' },
  { key: 'full stack', name: 'Full-Stack' },
  { key: 'frontend', name: 'Frontend' },
  { key: 'backend', name: 'Backend' },
  { key: 'html', name: 'HTML5/CSS3' },
  { key: 'sql', name: 'SQL/PostgreSQL' },
  { key: 'python', name: 'Python' },
  { key: 'java', name: 'Java' },
  { key: 'docker', name: 'Docker' },
  { key: 'aws', name: 'AWS' },
];

export class AIService {
  public async extractJobDetails(rawText: string): Promise<ExtractedJobData> {
    if (env.AI_PROVIDER === 'openai' && env.OPENAI_API_KEY) {
      try {
        return await this.extractWithOpenAI(rawText);
      } catch (err: any) {
        logger.warn(`OpenAI extraction failed (${err.message}). Falling back to heuristic extractor.`);
      }
    }

    if (env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY) {
      try {
        return await this.extractWithGemini(rawText);
      } catch (err: any) {
        logger.warn(`Gemini extraction failed (${err.message}). Falling back to heuristic extractor.`);
      }
    }

    // Default resilient heuristic extraction
    return this.extractHeuristically(rawText);
  }

  public async generateCoverLetter(params: {
    jobTitle: string;
    company: string;
    matchedTech: string[];
    portfolioUrl: string;
    linkedinUrl: string;
    githubUrl: string;
    contactName?: string;
  }): Promise<string> {
    const { jobTitle, company, matchedTech, portfolioUrl, linkedinUrl, githubUrl, contactName } = params;

    const greeting = contactName && contactName !== 'Recruiter' ? `Dear ${contactName},` : `Dear Hiring Team at ${company || 'your team'},`;
    const techHighlights = matchedTech.length > 0 ? matchedTech.join(', ') : 'MongoDB, Express.js, React.js, and Node.js';

    return `${greeting}

I am writing to express my strong enthusiasm for the ${jobTitle} position. With hands-on experience developing full-stack web and cross-platform mobile solutions using ${techHighlights}, I am confident in my ability to make an immediate, meaningful impact.

My work focuses on clean architecture, responsive user experiences, resilient REST API design, and scalable state management. You can review my production code, live demos, and case studies at:
- Portfolio: ${portfolioUrl}
- GitHub: ${githubUrl}
- LinkedIn: ${linkedinUrl}

I am eager to discuss how my technical skills and work ethic align with your goals for this role. Thank you for your time and consideration.

Warm regards,
Rizwan Ullah
Full-Stack Developer`;
  }

  public extractHeuristically(rawText: string): ExtractedJobData {
    const lower = rawText.toLowerCase();

    // 1. Contact Extraction
    let contact = 'N/A';
    let contactType: 'whatsapp' | 'email' | 'url' = 'email';

    // WhatsApp / Phone
    const phoneMatch = rawText.match(/(\+?\d{1,3}[-.\s]?)?\(?\d{3,4}\)?[-.\s]?\d{3}[-.\s]?\d{3,4}/);
    // Email
    const emailMatch = rawText.match(/([a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+\.[a-zA-Z0-9_-]+)/);
    // URL
    const urlMatch = rawText.match(/(https?:\/\/[^\s]+)/);

    if (phoneMatch && (lower.includes('whatsapp') || lower.includes('wa.me') || lower.includes('call') || lower.includes('dm'))) {
      contact = phoneMatch[0].trim();
      contactType = 'whatsapp';
    } else if (emailMatch) {
      contact = emailMatch[0].trim();
      contactType = 'email';
    } else if (phoneMatch) {
      contact = phoneMatch[0].trim();
      contactType = 'whatsapp';
    } else if (urlMatch) {
      contact = urlMatch[0].trim();
      contactType = 'url';
    }

    // 2. Application URL
    let applicationUrl: string | undefined = undefined;
    const allUrls = rawText.match(/(https?:\/\/[^\s]+)/g) || [];
    for (const u of allUrls) {
      const cleanU = u.replace(/[),.]+$/, '');
      const lowerU = cleanU.toLowerCase();
      if (!lowerU.includes('wa.me') && 
          !lowerU.includes('whatsapp.com') && 
          !lowerU.includes('facebook.com') && 
          !lowerU.includes('fb.com') && 
          !lowerU.includes('instagram.com') && 
          !lowerU.includes('youtube.com') && 
          !lowerU.includes('twitter.com') && 
          !lowerU.includes('x.com') && 
          !lowerU.includes('linkedin.com/company') &&
          !lowerU.includes('linkedin.com/in')) {
        applicationUrl = cleanU;
        break;
      }
    }

    // 3. Technologies
    const extractedSkills: string[] = [];
    const matchedTech: string[] = [];

    for (const item of TECH_DICTIONARY) {
      if (lower.includes(item.key)) {
        extractedSkills.push(item.name);
        if (['React.js', 'Node.js', 'Express.js', 'MongoDB', 'MERN Stack', 'React Native', 'TypeScript', 'Tailwind CSS', 'REST APIs', 'Full-Stack'].includes(item.name)) {
          matchedTech.push(item.name);
        }
      }
    }

    // 4. Seniority
    let seniority = 'Entry / Mid-Level';
    if (lower.includes('intern') || lower.includes('internship') || lower.includes('trainee')) {
      seniority = 'Internship';
    } else if (lower.includes('junior') || lower.includes('fresh') || lower.includes('entry level') || lower.includes('0-1')) {
      seniority = 'Junior / Entry-Level';
    } else if (lower.includes('senior') || lower.includes('lead') || lower.includes('5+') || lower.includes('7+')) {
      seniority = 'Senior / Lead';
    }

    // 5. Title Extraction
    let title = 'Software Developer';
    const hiringTitleMatch = rawText.match(/(?:hiring|role|position|opening|job)\s*:\s*([^\n\r*]+)/i);
    if (hiringTitleMatch && hiringTitleMatch[1]) {
      const detected = hiringTitleMatch[1].replace(/[*_#]/g, '').trim();
      if (detected.length >= 3 && detected.length <= 40) {
        title = detected;
      }
    } else if (lower.includes('mern') || lower.includes('mern stack')) {
      title = 'Full-Stack MERN Developer';
    } else if (lower.includes('full stack') || lower.includes('fullstack') || lower.includes('full-stack')) {
      title = 'Full Stack Developer';
    } else if (lower.includes('react native') || lower.includes('mobile developer')) {
      title = 'React Native Mobile Developer';
    } else if (lower.includes('react') || lower.includes('frontend')) {
      title = 'React Frontend Developer';
    } else if (lower.includes('node') || lower.includes('backend')) {
      title = 'Node.js Backend Developer';
    } else if (lower.includes('intern') || lower.includes('trainee')) {
      title = 'Software Development Intern';
    }

    // 6. Company
    let company = 'Undisclosed';
    const companyLabelMatch = rawText.match(/(?:🏢\s*company|company|organization|firm|agency)\s*:\s*([^\n\r]+)/i);
    if (companyLabelMatch && companyLabelMatch[1]) {
      company = companyLabelMatch[1].replace(/[*_#]/g, '').trim();
    } else {
      const atMatch = rawText.match(/(?:at|with|for|join)\s+([A-Z][A-Za-z0-9&.\s]{2,20})/);
      if (atMatch && atMatch[1]) {
        company = atMatch[1].trim();
      }
    }

    // 7. Poster
    let poster = 'Recruiter';
    const hrMatch = rawText.match(/([A-Z][a-z]+(?:\s+[A-Z][a-z]+)?)\s*(?:\(HR\)|\(Recruiter\)|\bHR\b|\bRecruiter\b)/i);
    if (hrMatch && hrMatch[1]) {
      poster = hrMatch[1].trim();
    }

    // 8. Remote
    const isRemote = lower.includes('remote') || lower.includes('work from home') || lower.includes('wfh');
    const location = isRemote ? 'Remote (Pakistan / Global)' : (lower.includes('lahore') ? 'Lahore, Pakistan' : (lower.includes('karachi') ? 'Karachi, Pakistan' : (lower.includes('islamabad') ? 'Islamabad, Pakistan' : 'On-Site / Hybrid')));

    // 9. Stipend / Salary
    let salaryStipend = undefined;
    const salaryMatch = rawText.match(/(\d{2,3}k|\b(?:pkr|rs\.?|\$)\s*\d+[,\d]*|\d+[-–]\d+\s*k)/i);
    if (salaryMatch) {
      salaryStipend = salaryMatch[0];
    }

    // 10. Suspicious check
    const isSuspicious = lower.includes('registration fee') || lower.includes('pay deposit') || lower.includes('crypto payment');

    return {
      title,
      company,
      poster,
      contact,
      contactType,
      extractedSkills: Array.from(new Set(extractedSkills)),
      matchedTech: Array.from(new Set(matchedTech)),
      seniority,
      location,
      isRemote,
      salaryStipend,
      applicationUrl,
      isSuspicious,
      suspiciousReason: isSuspicious ? 'Suspicious payment/deposit request found in job post' : undefined
    };
  }

  private async extractWithOpenAI(rawText: string): Promise<ExtractedJobData> {
    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${env.OPENAI_API_KEY}`,
      },
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You extract structured job information in JSON.' },
          { role: 'user', content: `Extract JSON details from this job post:\n${rawText}` }
        ],
        response_format: { type: 'json_object' }
      })
    });
    const data: any = await res.json();
    if (!data.choices?.[0]?.message?.content) {
      throw new Error(data.error?.message || 'OpenAI API returned no content');
    }
    return JSON.parse(data.choices[0].message.content);
  }

  private async extractWithGemini(rawText: string): Promise<ExtractedJobData> {
    const model = process.env.GEMINI_MODEL || 'gemini-3.8-flash';
    const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;
    const res = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      signal: AbortSignal.timeout(4000),
      body: JSON.stringify({
        contents: [
          {
            parts: [
              { text: `Extract structured job JSON from this post:\n${rawText}` }
            ]
          }
        ]
      })
    });
    const data: any = await res.json();
    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
      throw new Error(data.error?.message || 'Gemini API returned no candidates');
    }
    const content = data.candidates[0].content.parts[0].text;
    const cleanJson = content.replace(/```json\n?|```/g, '').trim();
    return JSON.parse(cleanJson);
  }
}

export const aiService = new AIService();
