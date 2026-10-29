import { ScoringEngine } from '../src/services/matching/scoringEngine';

describe('AI Scoring Engine & Duplicate Detection', () => {
  const defaultCriteria = {
    targetRoles: [
      'MERN Stack Developer',
      'Full Stack Developer',
      'React Developer',
      'Node.js Developer',
      'React Native Developer',
      'Junior Software Developer',
      'Software Development Intern'
    ],
    skills: ['React.js', 'Node.js', 'Express.js', 'MongoDB', 'React Native'],
    remoteOnly: false,
    internshipsJuniorOnly: false,
    minMatchThreshold: 80
  };

  it('should score a high match for a MERN stack developer role with React and Node', () => {
    const result = ScoringEngine.evaluateJob({
      title: 'Full-Stack MERN Developer',
      seniority: 'Junior / Entry-Level',
      matchedTech: ['React.js', 'Node.js', 'Express.js', 'MongoDB'],
      isRemote: true,
      location: 'Remote',
      criteria: defaultCriteria
    });

    expect(result.score).toBeGreaterThanOrEqual(80);
    expect(result.isEligibleForAutoApply).toBe(true);
    expect(result.requiresReview).toBe(false);
  });

  it('should penalize senior lead positions outside candidate qualifications', () => {
    const result = ScoringEngine.evaluateJob({
      title: 'Senior Staff Lead Architect',
      seniority: 'Senior / Lead',
      matchedTech: ['React.js'],
      isRemote: true,
      location: 'Remote',
      criteria: defaultCriteria
    });

    expect(result.score).toBeLessThan(70);
    expect(result.isEligibleForAutoApply).toBe(false);
    expect(result.requiresReview).toBe(true);
    expect(result.reasons.some(r => r.includes('outside qualifications'))).toBe(true);
  });

  it('should generate consistent SHA-256 fingerprint for duplicate detection', () => {
    const fp1 = ScoringEngine.calculateFingerprint({
      company: 'ApexTech',
      title: 'MERN Developer',
      rawText: 'Looking for a skilled MERN Stack Developer for remote team...',
      contact: '+92 300 1234567'
    });

    const fp2 = ScoringEngine.calculateFingerprint({
      company: ' apextech ',
      title: 'mern developer',
      rawText: 'looking for a skilled mern stack developer for remote team...',
      contact: '+92 300 1234567'
    });

    expect(fp1).toBe(fp2);
  });

  it('should generate different fingerprints for different jobs', () => {
    const fp1 = ScoringEngine.calculateFingerprint({
      company: 'ApexTech',
      title: 'MERN Developer',
      rawText: 'First job description',
      contact: '+92 300 1111111'
    });

    const fp2 = ScoringEngine.calculateFingerprint({
      company: 'ApexTech',
      title: 'React Native Engineer',
      rawText: 'Second job description for mobile app',
      contact: '+92 300 2222222'
    });

    expect(fp1).not.toBe(fp2);
  });
});
