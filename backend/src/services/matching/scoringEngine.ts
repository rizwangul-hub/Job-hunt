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
  // STRICT NON-TECH EXCLUSIONS
  private static readonly NON_TECH_EXCLUSIONS = [
    'procurement', 'distribution', 'supply chain', 'logistics', 'warehouse',
    'store keeper', 'inventory', 'driver', 'rider', 'delivery', 'security guard',
    'guard', 'cook', 'chef', 'waiter', 'waitress', 'nurse', 'doctor', 'pharmacist',
    'medical', 'pharmacy', 'patient', 'clinic', 'sales executive', 'sales representative',
    'sales agent', 'sales manager', 'telesales', 'telemarketing', 'call center',
    'bpo agent', 'receptionist', 'front desk', 'cashier', 'accountant', 'accounts officer',
    'audit officer', 'finance officer', 'bookkeeper', 'tax consultant', 'legal',
    'lawyer', 'attorney', 'civil engineer', 'mechanical engineer', 'electrical technician',
    'electrician', 'plumber', 'mechanic', 'teacher', 'tutor', 'principal', 'professor',
    'lecturer', 'faculty', 'maid', 'cleaner', 'housekeeping', 'janitor', 'tailor',
    'beautician', 'salon', 'barber', 'general opportunity', 'urgent requirement'
  ];

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
    const { title, seniority, matchedTech, isRemote, location = '', criteria } = params;
    const lowerTitle = title.toLowerCase().trim();
    const reasons: string[] = [];

    // 0. IMMEDIATE REJECTION OF EXCLUDED NON-TECH ROLES
    const isExcluded = ScoringEngine.NON_TECH_EXCLUSIONS.some(ex => lowerTitle.includes(ex));
    const isVagueTitle = /^(general opportunity|urgent requirement|opportunity|vacancy|job opening|staff needed|hiring)$/i.test(lowerTitle);
    if (isExcluded || isVagueTitle) {
      return {
        score: 0,
        matchedTech: [],
        explanation: `Excluded non-technical role (${title}). RizAgent strictly applies for Web/Software Development and tech projects.`,
        isEligibleForAutoApply: false,
        requiresReview: false,
        reasons: [`Role matches non-tech exclusion list or vague title (${title}).`]
      };
    }

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
      lowerTitle.includes('computer operator')
    ) {
      score += 25;
      reasons.push('Title matches Data Entry / Computer Operator (+25).');
    } else if (matchesTargetRole) {
      score += 30;
      reasons.push('Title matches target career role (+30).');
    } else {
      score += 0;
      reasons.push('Title does not match target tech roles (+0).');
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
    } else if (score > 0) {
      techPoints = 15; // Relevant tech title but no explicit stack list
    } else {
      techPoints = 0;
    }
    score += techPoints;
    if (coreMatches.length > 0) {
      reasons.push(`Matched technologies/skills: ${coreMatches.join(', ')} (+${techPoints}).`);
    } else if (techPoints > 0) {
      reasons.push(`General tech alignment (+${techPoints}).`);
    } else {
      reasons.push('No matching technical skills (+0).');
    }

    // 3. Seniority & Experience Alignment (Max 15 points) - Accepts all experience levels (1 to 5+ years)
    if (score >= 25) {
      score += 15;
      reasons.push('Experience level accepted (+15).');
    }

    // 4. Remote / Location Alignment (Max 10 points)
    // Rule: Pakistan -> Both remote and onsite allowed. International -> Remote strictly required.
    const isPakistan = /pakistan|karachi|lahore|islamabad|rawalpindi|peshawar|faisalabad|multan|\bpk\b/i.test(location);
    if (isPakistan) {
      score += 10;
      reasons.push(isRemote ? 'Pakistan remote opportunity (+10).' : 'Pakistan onsite/hybrid opportunity accepted (+10).');
    } else if (isRemote) {
      score += 10;
      reasons.push('Worldwide remote opportunity aligned with preference (+10).');
    } else if (!location || location === 'Remote' || location.toLowerCase().includes('remote')) {
      score += 10;
      reasons.push('Remote opportunity (+10).');
    } else {
      reasons.push('International job requires remote capability; onsite overseas not eligible.');
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
