import crypto from 'crypto';

export interface ScoringCriteria {
  targetRoles: string[];
  skills: string[];
  remoteOnly: boolean;
  internshipsJuniorOnly: boolean;
  minMatchThreshold: number;
}

export interface MatchEvaluationResult {
  score: number;
  matchedTech: string[];
  explanation: string;
  isEligibleForAutoApply: boolean;
  requiresReview: boolean;
  reasons: string[];
}

export class ScoringEngine {
  public static calculateFingerprint(params: {
    company: string;
    title: string;
    rawText: string;
    contact?: string;
  }): string {
    const normCompany = (params.company || 'undisclosed').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normTitle = (params.title || '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const normSnippet = (params.rawText || '').substring(0, 150).toLowerCase().replace(/[^a-z0-9]/g, '');
    const normContact = (params.contact || '').toLowerCase().replace(/[^a-z0-9]/g, '');

    return crypto
      .createHash('sha256')
      .update(`${normCompany}:${normTitle}:${normContact}:${normSnippet}`)
      .digest('hex');
  }

  public static evaluateJob(params: {
    title: string;
    seniority: string;
    matchedTech: string[];
    isRemote: boolean;
    location: string;
    criteria: ScoringCriteria;
  }): MatchEvaluationResult {
    const { title, seniority, matchedTech, isRemote, criteria } = params;
    const lowerTitle = title.toLowerCase();
    const reasons: string[] = [];
    let score = 0;

    // 1. Role Title Alignment (Max 35 points)
    const matchesTargetRole = criteria.targetRoles.some(role => {
      const parts = role.toLowerCase().split(/\s+/);
      return parts.some(p => p.length > 2 && lowerTitle.includes(p));
    });

    if (lowerTitle.includes('mern') || lowerTitle.includes('full stack') || lowerTitle.includes('full-stack') || lowerTitle.includes('fullstack')) {
      score += 35;
      reasons.push('Title strongly matches target MERN / Full-Stack focus (+35).');
    } else if (lowerTitle.includes('react native') || lowerTitle.includes('mobile')) {
      score += 32;
      reasons.push('Title matches React Native / Mobile focus (+32).');
    } else if (lowerTitle.includes('react') || lowerTitle.includes('frontend')) {
      score += 30;
      reasons.push('Title matches React / Frontend focus (+30).');
    } else if (lowerTitle.includes('node') || lowerTitle.includes('backend')) {
      score += 30;
      reasons.push('Title matches Node.js / Backend focus (+30).');
    } else if (matchesTargetRole) {
      score += 25;
      reasons.push('Title matches one of candidate target roles (+25).');
    } else {
      score += 5;
      reasons.push('General engineering title (+5).');
    }

    // 2. Core Tech Stack Match (Max 40 points)
    const coreMatches = matchedTech.filter(tech =>
      ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'MERN Stack', 'React Native', 'TypeScript', 'Tailwind CSS', 'Full-Stack', 'Next.js', 'JavaScript', 'REST APIs', 'Python'].includes(tech)
    );

    let techPoints = 0;
    if (coreMatches.length >= 3) {
      techPoints = 40;
    } else if (coreMatches.length === 2) {
      techPoints = 35;
    } else if (coreMatches.length === 1) {
      techPoints = 20;
    }
    score += techPoints;
    if (techPoints > 0) {
      reasons.push(`Matched ${coreMatches.length} core technologies: ${coreMatches.join(', ')} (+${techPoints}).`);
    }

    // 3. Seniority & Experience Alignment (Max 15 points)
    const isSenior = seniority.toLowerCase().includes('senior') || seniority.toLowerCase().includes('lead');
    const isJuniorOrIntern = seniority.toLowerCase().includes('junior') || seniority.toLowerCase().includes('intern') || seniority.toLowerCase().includes('entry');

    if (isJuniorOrIntern) {
      score += 15;
      reasons.push('Seniority perfectly matches Junior / Entry-level / Internship preference (+15).');
    } else if (isSenior) {
      score -= 25; // Significant penalty for senior roles outside qualifications
      reasons.push('Senior / Lead seniority requirements flag outside qualifications (-25).');
    } else {
      score += 10;
      reasons.push('Mid / General experience level (+10).');
    }

    // 4. Remote / Location Alignment (Max 10 points)
    if (isRemote) {
      score += 10;
      reasons.push('Remote work option aligned with preference (+10).');
    } else if (criteria.remoteOnly) {
      score -= 10;
      reasons.push('On-site position when remote-only preference is set (-10).');
    } else {
      score += 10;
      reasons.push('Acceptable location (+10).');
    }

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    const isEligibleForAutoApply = score >= criteria.minMatchThreshold && !isSenior;
    const requiresReview = score < criteria.minMatchThreshold || isSenior;

    const explanation = reasons.join(' ');

    return {
      score,
      matchedTech,
      explanation,
      isEligibleForAutoApply,
      requiresReview,
      reasons
    };
  }
}
