'use client';

import { useState, useEffect, useCallback, useRef, type DragEvent } from 'react';
import { toast } from 'sonner';
import {
  Mail,
  Phone,
  Linkedin,
  Github,
  Globe,
  FileUp,
  Briefcase,
  GraduationCap,
  Code,
  Award,
  Languages,
  Calendar,
  Download,
  FileText,
  Clock,
  Loader2,
} from 'lucide-react';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Separator } from '@/components/ui/separator';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from '@/components/ui/tooltip';

// ─── Types ────────────────────────────────────────────────────────────────────

interface ResumeData {
  id: string;
  fileName: string;
  parsedData: ParsedResume;
  skills: string[];
  experience: WorkExperience[];
  education: Education[];
  projects: Project[];
  certifications: string[];
  languages: string[];
}

interface ResumeVersion {
  id: string;
  fileName: string;
  createdAt: string;
  description: string;
}

interface ParsedResume {
  name: string;
  email: string;
  phone?: string;
  linkedin?: string;
  github?: string;
  website?: string;
  summary: string;
  experience: WorkExperience[];
  education: Education[];
  projects: Project[];
  certifications: string[];
  languages: string[];
  skills: string[];
}

interface WorkExperience {
  company: string;
  title: string;
  startDate: string;
  endDate?: string;
  current: boolean;
  description: string;
  technologies: string[];
}

interface Education {
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate?: string;
  gpa?: string;
}

interface Project {
  name: string;
  description: string;
  technologies: string[];
  url?: string;
  startDate?: string;
}

// ─── Skill Category Helper ─────────────────────────────────────────────────────

const SKILL_CATEGORIES: Record<string, string[]> = {
  'Languages': ['Python', 'JavaScript', 'TypeScript', 'Java', 'C++', 'Go', 'Rust', 'SQL'],
  'ML / AI': ['PyTorch', 'TensorFlow', 'Hugging Face', 'OpenAI API', 'Prompt Engineering', 'RLHF', 'NLP', 'Transformer Models', 'scikit-learn', 'Keras'],
  'Frameworks': ['React', 'Next.js', 'Node.js', 'Express', 'Django', 'FastAPI', 'Flask', 'LangChain', 'Vue.js', 'Angular'],
  'Databases & Infra': ['PostgreSQL', 'MySQL', 'Redis', 'MongoDB', 'Docker', 'Kubernetes', 'Git', 'AWS', 'GCP', 'Azure', 'Terraform'],
  'Tools & Testing': ['Jest', 'Cypress', 'Selenium', 'CI/CD', 'Webpack', 'Vite', 'ESLint'],
};

function categorizeSkills(skills: string[]): Record<string, string[]> {
  const categorized: Record<string, string[]> = {};
  const uncategorized: string[] = [];

  for (const skill of skills) {
    let matched = false;
    for (const [category, categorySkills] of Object.entries(SKILL_CATEGORIES)) {
      if (categorySkills.some((cs) => cs.toLowerCase() === skill.toLowerCase())) {
        if (!categorized[category]) categorized[category] = [];
        categorized[category].push(skill);
        matched = true;
        break;
      }
    }
    if (!matched) uncategorized.push(skill);
  }

  if (uncategorized.length > 0) {
    categorized['Other'] = uncategorized;
  }

  return categorized;
}

// ─── Date formatting helper ────────────────────────────────────────────────────

function formatDate(date?: string, end?: string, current?: boolean): string {
  if (!date) return '';
  const startStr = new Date(date + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
  if (current) return `${startStr} – Present`;
  const endStr = end ? new Date(end + '-01').toLocaleDateString('en-US', { month: 'short', year: 'numeric' }) : '';
  return endStr ? `${startStr} – ${endStr}` : startStr;
}

// ─── Skeleton loader ───────────────────────────────────────────────────────────

function ResumeSkeleton() {
  return (
    <div className="space-y-6">
      <div className="space-y-3">
        <Skeleton className="h-8 w-64" />
        <div className="flex flex-wrap gap-3">
          <Skeleton className="h-5 w-48" />
          <Skeleton className="h-5 w-40" />
          <Skeleton className="h-5 w-44" />
        </div>
      </div>
      <Separator />
      <Card>
        <CardContent className="p-4">
          <Skeleton className="h-5 w-20 mb-3" />
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-5/6 mt-2" />
          <Skeleton className="h-4 w-4/6 mt-2" />
        </CardContent>
      </Card>
      <div className="space-y-3">
        <Skeleton className="h-5 w-20" />
        <div className="flex flex-wrap gap-2">
          {Array.from({ length: 10 }).map((_, i) => (
            <Skeleton key={i} className="h-6 w-24 rounded-full" />
          ))}
        </div>
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-32" />
        {Array.from({ length: 3 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-5 w-48" />
              <Skeleton className="h-4 w-32" />
              <Skeleton className="h-4 w-full" />
              <Skeleton className="h-4 w-5/6" />
            </CardContent>
          </Card>
        ))}
      </div>
      <div className="space-y-3">
        <Skeleton className="h-5 w-28" />
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-4 space-y-2">
              <Skeleton className="h-5 w-56" />
              <Skeleton className="h-4 w-40" />
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
}

// ─── Sub-components ────────────────────────────────────────────────────────────

function ContactLink({ icon: Icon, href, label }: { icon: React.ElementType; href: string; label: string }) {
  return (
    <a
      href={href.startsWith('http') || href.startsWith('mailto:') || href.startsWith('tel:') ? href : `https://${href}`}
      target="_blank"
      rel="noopener noreferrer"
      className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
    >
      <Icon className="h-4 w-4" />
      <span>{label}</span>
    </a>
  );
}

function ExperienceCard({ exp }: { exp: WorkExperience }) {
  return (
    <Card className="relative overflow-hidden">
      <div className="absolute left-0 top-0 bottom-0 w-1 bg-primary" />
      <CardContent className="p-4 pl-6">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-2">
          <div>
            <h4 className="font-semibold text-base">{exp.title}</h4>
            <p className="text-sm text-muted-foreground font-medium">{exp.company}</p>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-muted-foreground shrink-0">
            <Calendar className="h-3.5 w-3.5" />
            <span>{formatDate(exp.startDate, exp.endDate, exp.current)}</span>
          </div>
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{exp.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {exp.technologies.map((tech) => (
            <Badge key={tech} variant="secondary" className="text-xs font-normal">
              {tech}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

function EducationCard({ edu }: { edu: Education }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-1 mb-1">
          <div>
            <h4 className="font-semibold text-base">{edu.institution}</h4>
            <p className="text-sm text-muted-foreground">
              {edu.degree} in {edu.field}
            </p>
          </div>
          <div className="text-xs text-muted-foreground shrink-0">
            {formatDate(edu.startDate, edu.endDate)}
          </div>
        </div>
        {edu.gpa && (
          <p className="text-sm text-muted-foreground mt-1">
            GPA: <span className="font-medium text-foreground">{edu.gpa}</span>
          </p>
        )}
      </CardContent>
    </Card>
  );
}

function ProjectCard({ project }: { project: Project }) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-2 mb-1">
          <h4 className="font-semibold text-base flex items-center gap-2">
            <Code className="h-4 w-4 text-primary" />
            {project.name}
          </h4>
          {project.url && (
            <a
              href={project.url.startsWith('http') ? project.url : `https://${project.url}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-primary hover:underline shrink-0"
            >
              View Project
            </a>
          )}
        </div>
        <p className="text-sm text-muted-foreground leading-relaxed mb-3">{project.description}</p>
        <div className="flex flex-wrap gap-1.5">
          {project.technologies.map((tech) => (
            <Badge key={tech} variant="outline" className="text-xs font-normal">
              {tech}
            </Badge>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function ResumeVaultPanel() {
  const [resume, setResume] = useState<ResumeData | null>(null);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);
  const [versions, setVersions] = useState<ResumeVersion[]>([]);
  const fileInputRef = useRef<HTMLInputElement>(null);

  /* ---- Fetch resume versions ---- */
  const fetchVersions = useCallback(async () => {
    try {
      const res = await fetch('/api/resume/versions');
      if (res.ok) {
        const data = await res.json();
        setVersions(Array.isArray(data) ? data : data?.versions ?? []);
      }
    } catch {
      // Versions are non-critical, don't show toast
    }
  }, []);

  /* ---- Fetch resume data ---- */
  const fetchResume = useCallback(async () => {
    setLoading(true);
    try {
      const res = await fetch('/api/resume');
      if (res.ok) {
        const data: ResumeData = await res.json();
        setResume(data);
      } else {
        setResume(null);
        toast.error('Failed to load resume');
      }
    } catch {
      setResume(null);
      toast.error('Failed to load resume');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchResume();
    fetchVersions();
  }, [fetchResume, fetchVersions]);

  /* ---- Upload file ---- */
  const uploadFile = useCallback(
    async (file: File) => {
      const validTypes = [
        'application/pdf',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
      ];
      const validExts = ['.pdf', '.docx'];
      const ext = '.' + file.name.split('.').pop()?.toLowerCase();
      if (!validTypes.includes(file.type) && !validExts.includes(ext)) {
        toast.error('Invalid file type. Please upload PDF or DOCX.');
        return;
      }
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File too large. Maximum size is 10MB.');
        return;
      }

      setUploading(true);
      try {
        const formData = new FormData();
        formData.append('file', file);
        const res = await fetch('/api/resume', {
          method: 'POST',
          body: formData,
        });
        if (res.ok) {
          toast.success('Resume uploaded and parsed successfully!');
          fetchResume();
          fetchVersions();
        } else {
          const errData = await res.json().catch(() => null);
          toast.error(errData?.error ?? 'Failed to upload resume.');
        }
      } catch {
        toast.error('Failed to upload resume.');
      } finally {
        setUploading(false);
      }
    },
    [fetchResume, fetchVersions],
  );

  /* ---- Drag & Drop handlers ---- */
  const handleDragOver = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(true);
  }, []);

  const handleDragLeave = useCallback((e: DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragOver(false);
  }, []);

  const handleDrop = useCallback(
    (e: DragEvent) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragOver(false);
      const file = e.dataTransfer.files[0];
      if (file) uploadFile(file);
    },
    [uploadFile],
  );

  const handleUploadClick = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) uploadFile(file);
      // Reset input so the same file can be re-uploaded
      e.target.value = '';
    },
    [uploadFile],
  );

  /* ---- Render ---- */
  const parsedData = resume?.parsedData;

  return (
    <div className="space-y-6">
      {/* Upload Section */}
      <Card>
        <CardContent className="p-4">
          <div
            role="button"
            tabIndex={0}
            onClick={handleUploadClick}
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') handleUploadClick();
            }}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            className={`
              relative flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed
              p-8 cursor-pointer transition-colors
              ${
                isDragOver
                  ? 'border-primary bg-primary/5'
                  : 'border-muted-foreground/25 hover:border-primary/50 hover:bg-muted/50'
              }
              ${uploading ? 'pointer-events-none opacity-60' : ''}
            `}
          >
            {uploading ? (
              <Loader2 className="h-6 w-6 text-primary animate-spin" />
            ) : (
              <div
                className={`rounded-full p-3 transition-colors ${
                  isDragOver ? 'bg-primary/10' : 'bg-muted'
                }`}
              >
                <FileUp className={`h-6 w-6 ${isDragOver ? 'text-primary' : 'text-muted-foreground'}`} />
              </div>
            )}
            <div className="text-center">
              <p className="text-sm font-medium">
                {uploading
                  ? 'Uploading…'
                  : isDragOver
                    ? 'Drop your resume here'
                    : 'Drop your resume here or click to upload'}
              </p>
              <p className="text-xs text-muted-foreground mt-1">Supported formats: PDF, DOCX (max 10MB)</p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept=".pdf,.docx"
              className="hidden"
              onChange={handleFileChange}
              aria-label="Upload resume file"
            />
          </div>
        </CardContent>
      </Card>

      {/* Parsed Resume Display */}
      {loading ? (
        <ResumeSkeleton />
      ) : parsedData ? (
        <div className="space-y-6">
          {/* Header */}
          <section>
            <div className="flex items-start justify-between gap-3">
              <div>
                <h2 className="text-2xl font-bold tracking-tight">{parsedData.name}</h2>
                <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-2">
                  {parsedData.email && (
                    <ContactLink icon={Mail} href={`mailto:${parsedData.email}`} label={parsedData.email} />
                  )}
                  {parsedData.phone && (
                    <ContactLink icon={Phone} href={`tel:${parsedData.phone}`} label={parsedData.phone} />
                  )}
                  {parsedData.linkedin && (
                    <ContactLink icon={Linkedin} href={parsedData.linkedin} label="LinkedIn" />
                  )}
                  {parsedData.github && (
                    <ContactLink icon={Github} href={parsedData.github} label="GitHub" />
                  )}
                  {parsedData.website && (
                    <ContactLink icon={Globe} href={parsedData.website} label="Website" />
                  )}
                </div>
              </div>
              {resume?.id && (
                <TooltipProvider>
                  <Tooltip>
                    <TooltipTrigger asChild>
                      <Button variant="outline" size="sm" className="shrink-0" asChild>
                        <a href={`/api/resume/${resume.id}`} download>
                          <Download className="h-4 w-4 mr-1.5" />
                          Download
                        </a>
                      </Button>
                    </TooltipTrigger>
                    <TooltipContent>Download resume file</TooltipContent>
                  </Tooltip>
                </TooltipProvider>
              )}
            </div>
          </section>

          <Separator />

          {/* Summary */}
          <Card>
            <CardHeader className="pb-2 px-4 pt-4">
              <CardTitle className="text-base font-semibold">Professional Summary</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-4">
              <p className="text-sm text-muted-foreground leading-relaxed">{parsedData.summary}</p>
            </CardContent>
          </Card>

          {/* Skills */}
          <section>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Code className="h-4 w-4" />
              Skills
            </h3>
            <div className="space-y-3">
              {Object.entries(categorizeSkills(parsedData.skills)).map(([category, skills]) => (
                <div key={category}>
                  <p className="text-xs font-medium text-muted-foreground mb-1.5 uppercase tracking-wider">
                    {category}
                  </p>
                  <div className="flex flex-wrap gap-1.5">
                    {skills.map((skill) => (
                      <Badge key={skill} variant="secondary" className="text-xs">
                        {skill}
                      </Badge>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </section>

          <Separator />

          {/* Experience */}
          <section>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <Briefcase className="h-4 w-4" />
              Experience
            </h3>
            <div className="space-y-3">
              {parsedData.experience.map((exp, i) => (
                <ExperienceCard key={`${exp.company}-${i}`} exp={exp} />
              ))}
            </div>
          </section>

          <Separator />

          {/* Education */}
          <section>
            <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
              <GraduationCap className="h-4 w-4" />
              Education
            </h3>
            <div className="space-y-3">
              {parsedData.education.map((edu, i) => (
                <EducationCard key={`${edu.institution}-${i}`} edu={edu} />
              ))}
            </div>
          </section>

          <Separator />

          {/* Projects */}
          {parsedData.projects.length > 0 && (
            <section>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Code className="h-4 w-4" />
                Projects
              </h3>
              <div className="space-y-3">
                {parsedData.projects.map((project) => (
                  <ProjectCard key={project.name} project={project} />
                ))}
              </div>
            </section>
          )}

          {parsedData.projects.length > 0 && <Separator />}

          {/* Certifications */}
          {parsedData.certifications.length > 0 && (
            <section>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Award className="h-4 w-4" />
                Certifications
              </h3>
              <Card>
                <CardContent className="p-4">
                  <ul className="space-y-2">
                    {parsedData.certifications.map((cert) => (
                      <li key={cert} className="flex items-start gap-2 text-sm">
                        <Award className="h-4 w-4 text-primary mt-0.5 shrink-0" />
                        <span>{cert}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </section>
          )}

          {/* Languages */}
          {parsedData.languages.length > 0 && (
            <section>
              <h3 className="text-base font-semibold mb-3 flex items-center gap-2">
                <Languages className="h-4 w-4" />
                Languages
              </h3>
              <div className="flex flex-wrap gap-2">
                {parsedData.languages.map((lang) => (
                  <Badge key={lang} variant="outline" className="text-sm">
                    {lang}
                  </Badge>
                ))}
              </div>
            </section>
          )}
        </div>
      ) : (
        <Card>
          <CardContent className="p-8 text-center">
            <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
            <p className="text-sm text-muted-foreground">No resume data found. Upload a resume to get started.</p>
          </CardContent>
        </Card>
      )}

      {/* Resume Versions */}
      <Card>
        <CardHeader className="pb-2 px-4 pt-4">
          <CardTitle className="text-base font-semibold flex items-center gap-2">
            <Clock className="h-4 w-4" />
            Resume Versions
          </CardTitle>
        </CardHeader>
        <CardContent className="px-4 pb-4">
          {versions.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">
              No version history yet. Upload new resumes to build history.
            </p>
          ) : (
            <div className="space-y-2">
              {versions.map((version) => (
                <div
                  key={version.id}
                  className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="text-sm font-medium truncate">{version.fileName}</p>
                    <p className="text-xs text-muted-foreground">
                      {new Date(version.createdAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      {version.description && ` · ${version.description}`}
                    </p>
                  </div>
                  <TooltipProvider>
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="shrink-0 h-8 w-8"
                          asChild
                        >
                          <a href={`/api/resume/${version.id}`} download aria-label={`Download ${version.fileName}`}>
                            <Download className="h-4 w-4" />
                          </a>
                        </Button>
                      </TooltipTrigger>
                      <TooltipContent>Download</TooltipContent>
                    </Tooltip>
                  </TooltipProvider>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}