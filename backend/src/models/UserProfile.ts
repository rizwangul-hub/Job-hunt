import mongoose, { Schema, Document } from 'mongoose';

export interface IUserCV {
  _id?: string;
  name: string;
  category: 'Full Stack / MERN' | 'React / Frontend' | 'React Native / Mobile' | 'Internship / Junior';
  filename: string;
  filepath: string;
  filesize: number;
  uploadedAt: Date;
  isDefault: boolean;
  isValid: boolean;
}

export interface IUserProfile extends Document {
  email: string;
  passwordHash: string;
  fullName: string;
  handle: string;
  phone: string;
  whatsapp: string;
  portfolioUrl: string;
  linkedinUrl: string;
  githubUrl: string;
  targetRoles: string[];
  skills: string[];
  education: Array<{
    institution: string;
    degree: string;
    year: string;
  }>;
  experience: Array<{
    title: string;
    company: string;
    period: string;
    description: string;
  }>;
  projects: Array<{
    title: string;
    description: string;
    tech: string[];
    link?: string;
  }>;
  cvs: IUserCV[];
  preferences: {
    minMatchThreshold: number;
    preferredLocation: string;
    remoteOnly: boolean;
    internshipsJuniorOnly: boolean;
    targetSalary: string;
    maxApplicationsPerDay: number;
    automationMode: 'REVIEW_ONLY' | 'APPROVAL_REQUIRED' | 'RESTRICTED_AUTO_APPLY';
    pitchTemplate: string;
  };
  createdAt: Date;
  updatedAt: Date;
}

const UserCVSchema = new Schema<IUserCV>({
  name: { type: String, required: true },
  category: {
    type: String,
    enum: ['Full Stack / MERN', 'React / Frontend', 'React Native / Mobile', 'Internship / Junior'],
    default: 'Full Stack / MERN'
  },
  filename: { type: String, required: true },
  filepath: { type: String, required: true },
  filesize: { type: Number, required: true },
  uploadedAt: { type: Date, default: Date.now },
  isDefault: { type: Boolean, default: false },
  isValid: { type: Boolean, default: true }
});

const UserProfileSchema = new Schema<IUserProfile>(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    passwordHash: { type: String, required: true },
    fullName: { type: String, required: true, default: 'Rizwan Ullah' },
    handle: { type: String, default: 'Rizwan' },
    phone: { type: String, default: '+92 300 0000000' },
    whatsapp: { type: String, default: '+92 300 0000000' },
    portfolioUrl: { type: String, default: 'https://full-stack-portfolio-coral.vercel.app' },
    linkedinUrl: { type: String, default: 'https://www.linkedin.com/in/rizwanmerndev' },
    githubUrl: { type: String, default: 'https://github.com/rizwangul-hub' },
    targetRoles: {
      type: [String],
      default: [
        'MERN Stack Developer',
        'Full Stack Developer',
        'React Developer',
        'Node.js Developer',
        'React Native Developer',
        'Junior Software Developer',
        'Software Development Intern'
      ]
    },
    skills: {
      type: [String],
      default: [
        'React.js',
        'Node.js',
        'Express.js',
        'MongoDB',
        'React Native',
        'JavaScript',
        'TypeScript',
        'Tailwind CSS',
        'REST APIs',
        'Git',
        'HTML',
        'CSS'
      ]
    },
    education: [
      {
        institution: { type: String },
        degree: { type: String },
        year: { type: String }
      }
    ],
    experience: [
      {
        title: { type: String },
        company: { type: String },
        period: { type: String },
        description: { type: String }
      }
    ],
    projects: [
      {
        title: { type: String },
        description: { type: String },
        tech: [String],
        link: { type: String }
      }
    ],
    cvs: [UserCVSchema],
    preferences: {
      minMatchThreshold: { type: Number, default: 80, min: 50, max: 100 },
      preferredLocation: { type: String, default: 'Pakistan / Remote' },
      remoteOnly: { type: Boolean, default: false },
      internshipsJuniorOnly: { type: Boolean, default: false },
      targetSalary: { type: String, default: 'Competitive / Stipend' },
      maxApplicationsPerDay: { type: Number, default: 15 },
      automationMode: {
        type: String,
        enum: ['REVIEW_ONLY', 'APPROVAL_REQUIRED', 'RESTRICTED_AUTO_APPLY'],
        default: 'APPROVAL_REQUIRED'
      },
      pitchTemplate: {
        type: String,
        default: `Hi {{contact_name}}, I noticed your opening regarding the {{role_title}} role requiring {{matched_tech}}.\n\nI'm Rizwan Ullah, a Full-Stack MERN & Mobile developer with hands-on experience building production web apps (MongoDB, Express, React, Node.js) and cross-platform mobile apps with React Native.\n\n🚀 Live Portfolio: {{portfolio_url}}\n📄 Attached: Resume PDF\n\nI'd be glad to discuss how I can contribute immediately. Looking forward to hearing from you!`
      }
    }
  },
  { timestamps: true }
);

export const UserProfile = mongoose.model<IUserProfile>('UserProfile', UserProfileSchema);
