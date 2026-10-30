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

    if (
      lowerTitle.includes('mern') ||
      lowerTitle.includes('full stack') ||
      lowerTitle.includes('full-stack') ||
      lowerTitle.includes('fullstack') ||
      lowerTitle.includes('web develop') ||
      lowerTitle.includes('frontend') ||
      lowerTitle.includes('backend') ||
      lowerTitle.includes('react') ||
      lowerTitle.includes('node')
    ) {
      score += 35;
      reasons.push('Title matches Web Development / Full-Stack / MERN stack (+35).');
    } else if (
      lowerTitle.includes('python') ||
      lowerTitle.includes('c++') ||
      lowerTitle.includes('cpp') ||
      lowerTitle.includes('software') ||
      lowerTitle.includes('developer') ||
      lowerTitle.includes('engineer') ||
      lowerTitle.includes('programmer')
    ) {
      score += 35;
      reasons.push('Title matches Software / Python / C++ engineering (+35).');
    } else if (
      lowerTitle.includes('ai') ||
      lowerTitle.includes('machine learning') ||
      lowerTitle.includes('data science')
    ) {
      score += 35;
      reasons.push('Title matches AI / Machine Learning focus (+35).');
    } else if (
      lowerTitle.includes('data entry') ||
      lowerTitle.includes('computer operator') ||
      lowerTitle.includes('office') ||
      lowerTitle.includes('clerk') ||
      lowerTitle.includes('typing') ||
      lowerTitle.includes('assistant') ||
      lowerTitle.includes('graduate') ||
      lowerTitle.includes('education') ||
      lowerTitle.includes('bachelor')
    ) {
      score += 35;
      reasons.push('Title matches Data Entry / Computer / Office / Graduate opportunity (+35).');
    } else if (matchesTargetRole) {
      score += 30;
      reasons.push('Title matches target career role (+30).');
    } else {
      score += 20;
      reasons.push('General job opportunity (+20).');
    }

    // 2. Core Tech Stack Match (Max 40 points)
    const coreMatches = matchedTech.filter(tech =>
      [
        'React.js',
        'Node.js',
        'Express.js',
        'MongoDB',
        'MERN Stack',
        'React Native',
        'TypeScript',
        'Tailwind CSS',
        'Full-Stack',
        'Web Development',
        'Next.js',
        'JavaScript',
        'REST APIs',
        'Python',
        'C++',
        'AI & Machine Learning',
        'Data Entry',
        'MS Excel',
        'MS Office',
        'Computer Typing'
      ].includes(tech)
    );

    let techPoints = 0;
    if (coreMatches.length >= 2) {
      techPoints = 40;
    } else if (coreMatches.length === 1) {
      techPoints = 35;
    } else {
      techPoints = 25;
    }
    score += techPoints;
    if (coreMatches.length > 0) {
      reasons.push(`Matched technologies/skills: ${coreMatches.join(', ')} (+${techPoints}).`);
    } else {
      reasons.push(`General skill alignment (+${techPoints}).`);
    }

    // 3. Seniority & Experience Alignment (Max 15 points) - Accepts all experience levels (1 to 5+ years)
    score += 15;
    reasons.push('Experience level accepted (+15).');

    // 4. Remote / Location Alignment (Max 10 points)
    if (isRemote) {
      score += 10;
      reasons.push('Remote work option aligned with preference (+10).');
    } else {
      score += 10;
      reasons.push('Acceptable location (+10).');
    }

    // Clamp score between 0 and 100
    score = Math.max(0, Math.min(100, score));

    const isEligibleForAutoApply = score >= criteria.minMatchThreshold;
    const requiresReview = score < criteria.minMatchThreshold;

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
