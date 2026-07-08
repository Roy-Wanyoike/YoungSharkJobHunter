#!/usr/bin/env python3
"""
Generate a comprehensive enterprise architecture DOCX document
for YoungSharkJobHunter — an AI Career Operating System.
"""

from docx import Document
from docx.shared import Pt, Inches, Cm, RGBColor, Emu
from docx.enum.text import WD_ALIGN_PARAGRAPH
from docx.enum.table import WD_TABLE_ALIGNMENT
from docx.enum.section import WD_ORIENT
from docx.oxml.ns import qn, nsdecls
from docx.oxml import parse_xml
import os

# ── Color Recipe ("tech") ────────────────────────────────────────────────────
COLORS = {
    "primary": RGBColor(0x0A, 0x16, 0x28),
    "body": RGBColor(0x1A, 0x2B, 0x40),
    "secondary": RGBColor(0x68, 0x78, 0xA0),
    "accent": RGBColor(0x5B, 0x8D, 0xB8),
    "surface": RGBColor(0xF4, 0xF8, 0xFC),
    "white": RGBColor(0xFF, 0xFF, 0xFF),
    "table_header_bg": "0A1628",
    "table_header_fg": "FFFFFF",
    "table_alt_bg": "F4F8FC",
    "table_border": "B0BEC5",
}


def hex_to_rgbcolor(hex_str: str) -> RGBColor:
    """Convert hex string like '0A1628' to RGBColor."""
    h = hex_str.lstrip("#")
    return RGBColor(int(h[0:2], 16), int(h[2:4], 16), int(h[4:6], 16))


# ── Style Setup ──────────────────────────────────────────────────────────────

def configure_styles(doc: Document):
    """Configure all paragraph and table styles for the document."""
    style = doc.styles

    # -- Normal / Body --
    normal = style["Normal"]
    normal.font.name = "Calibri"
    normal.font.size = Pt(11)
    normal.font.color.rgb = COLORS["body"]
    normal.paragraph_format.line_spacing = 1.3
    normal.paragraph_format.space_after = Pt(6)
    normal.paragraph_format.space_before = Pt(2)
    # Set East-Asian fallback font
    rpr = normal.element.get_or_add_rPr()
    rfonts = parse_xml(
        f'<w:rFonts {nsdecls("w")} w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Carlito" w:eastAsia="Carlito"/>'
    )
    rpr.insert(0, rfonts)

    # -- Heading 1 --
    h1 = style["Heading 1"]
    h1.font.name = "Calibri"
    h1.font.size = Pt(28)
    h1.font.bold = True
    h1.font.color.rgb = COLORS["primary"]
    h1.paragraph_format.line_spacing = 1.3
    h1.paragraph_format.space_before = Pt(24)
    h1.paragraph_format.space_after = Pt(12)
    _set_heading_font(h1)

    # -- Heading 2 --
    h2 = style["Heading 2"]
    h2.font.name = "Calibri"
    h2.font.size = Pt(22)
    h2.font.bold = True
    h2.font.color.rgb = COLORS["primary"]
    h2.paragraph_format.line_spacing = 1.3
    h2.paragraph_format.space_before = Pt(18)
    h2.paragraph_format.space_after = Pt(8)
    _set_heading_font(h2)

    # -- Heading 3 --
    h3 = style["Heading 3"]
    h3.font.name = "Calibri"
    h3.font.size = Pt(16)
    h3.font.bold = True
    h3.font.color.rgb = COLORS["body"]
    h3.paragraph_format.line_spacing = 1.3
    h3.paragraph_format.space_before = Pt(14)
    h3.paragraph_format.space_after = Pt(6)
    _set_heading_font(h3)

    # -- Heading 4 --
    h4 = style["Heading 4"]
    h4.font.name = "Calibri"
    h4.font.size = Pt(13)
    h4.font.bold = False
    # Simulate semibold via color emphasis
    h4.font.color.rgb = COLORS["accent"]
    h4.paragraph_format.line_spacing = 1.3
    h4.paragraph_format.space_before = Pt(10)
    h4.paragraph_format.space_after = Pt(4)
    _set_heading_font(h4)


def _set_heading_font(style_obj):
    """Set fallback fonts on a heading style's rPr."""
    rpr = style_obj.element.get_or_add_rPr()
    rfonts = parse_xml(
        f'<w:rFonts {nsdecls("w")} w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Carlito" w:eastAsia="Carlito"/>'
    )
    rpr.insert(0, rfonts)


# ── Helper: Run Properties ───────────────────────────────────────────────────

def _make_run_props(color: RGBColor = None, bold: bool = None, size: Pt = None, font: str = None):
    """Build a w:rPr element with optional overrides."""
    parts = []
    if font:
        parts.append(f'w:ascii="{font}" w:hAnsi="{font}" w:cs="Carlito" w:eastAsia="Carlito"')
    else:
        parts.append(f'w:ascii="Calibri" w:hAnsi="Calibri" w:cs="Carlito" w:eastAsia="Carlito"')
    if color:
        c = f"{color.red:02X}{color.green:02X}{color.blue:02X}"
        parts.append(f'w:color="{c}"')
    if bold is not None:
        b = "1" if bold else "0"
        parts.append(f'w:b="{b}"')
    if size:
        half_pt = int(size.pt * 2)
        parts.append(f'w:sz="{half_pt}" w:szCs="{half_pt}"')
    return parse_xml(f'<w:rPr {nsdecls("w")}> {" ".join(parts)}</w:rPr>')


# ── Paragraph Helpers ────────────────────────────────────────────────────────

def add_body(doc: Document, text: str) -> None:
    """Add a body paragraph."""
    p = doc.add_paragraph(text)
    p.paragraph_format.line_spacing = 1.3
    return p


def add_body_bold_start(doc: Document, bold_text: str, normal_text: str) -> None:
    """Add a paragraph where the first run is bold."""
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.3
    run_b = p.add_run(bold_text)
    run_b.bold = True
    run_b.font.size = Pt(11)
    run_b.font.color.rgb = COLORS["body"]
    run_b.font.name = "Calibri"
    run_n = p.add_run(normal_text)
    run_n.font.size = Pt(11)
    run_n.font.color.rgb = COLORS["body"]
    run_n.font.name = "Calibri"
    return p


# ── Table Helpers ────────────────────────────────────────────────────────────

def set_cell_shading(cell, hex_color: str):
    """Set background color of a table cell."""
    shading = parse_xml(
        f'<w:shd {nsdecls("w")} w:fill="{hex_color}" w:val="clear"/>'
    )
    cell._tc.get_or_add_tcPr().append(shading)


def set_cell_text(cell, text: str, bold: bool = False, color: RGBColor = None, size: Pt = None):
    """Set text in a cell with formatting. Clears existing content."""
    cell.text = ""
    p = cell.paragraphs[0]
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_before = Pt(2)
    p.paragraph_format.space_after = Pt(2)
    run = p.add_run(text)
    run.font.name = "Calibri"
    run.font.size = size or Pt(10)
    if bold:
        run.bold = True
    if color:
        run.font.color.rgb = color
    else:
        run.font.color.rgb = COLORS["body"]


def set_table_borders(table):
    """Add borders to all cells in a table."""
    tbl = table._tbl
    tblPr = tbl.tblPr if tbl.tblPr is not None else parse_xml(f'<w:tblPr {nsdecls("w")}/>')
    borders = parse_xml(
        f'<w:tblBorders {nsdecls("w")}>'
        f'  <w:top w:val="single" w:sz="4" w:space="0" w:color="{COLORS["table_border"]}"/>'
        f'  <w:left w:val="single" w:sz="4" w:space="0" w:color="{COLORS["table_border"]}"/>'
        f'  <w:bottom w:val="single" w:sz="4" w:space="0" w:color="{COLORS["table_border"]}"/>'
        f'  <w:right w:val="single" w:sz="4" w:space="0" w:color="{COLORS["table_border"]}"/>'
        f'  <w:insideH w:val="single" w:sz="4" w:space="0" w:color="{COLORS["table_border"]}"/>'
        f'  <w:insideV w:val="single" w:sz="4" w:space="0" w:color="{COLORS["table_border"]}"/>'
        f'</w:tblBorders>'
    )
    tblPr.append(borders)


def set_table_properties(table):
    """Set cantSplit and alignment for a table."""
    tbl = table._tbl
    tblPr = tbl.tblPr if tbl.tblPr is not None else parse_xml(f'<w:tblPr {nsdecls("w")}/>')
    # cantSplit on rows
    tblGrid = tbl.find(qn("w:tblGrid"))
    # Set table width to 100%
    tblW = parse_xml(f'<w:tblW {nsdecls("w")} w:type="pct" w:w="5000"/>')
    tblPr.append(tblW)


def add_table(doc: Document, headers: list[str], rows: list[list[str]]) -> None:
    """Create a formatted table with header row and alternating row colors."""
    table = doc.add_table(rows=1 + len(rows), cols=len(headers))
    table.alignment = WD_TABLE_ALIGNMENT.CENTER
    set_table_borders(table)

    # Header row
    for i, header in enumerate(headers):
        cell = table.rows[0].cells[i]
        set_cell_shading(cell, COLORS["table_header_bg"])
        set_cell_text(cell, header, bold=True, color=COLORS["white"], size=Pt(10))
    # Mark header row
    tr = table.rows[0]._tr
    trPr = tr.get_or_add_trPr()
    tblHeader = parse_xml(f'<w:tblHeader {nsdecls("w")}/>')
    trPr.append(tblHeader)
    # Prevent header row from splitting across pages
    cantSplit = parse_xml(f'<w:cantSplit {nsdecls("w")} w:val="true"/>')
    trPr.append(cantSplit)

    # Data rows
    for row_idx, row_data in enumerate(rows):
        for col_idx, cell_text in enumerate(row_data):
            cell = table.rows[row_idx + 1].cells[col_idx]
            if row_idx % 2 == 1:
                set_cell_shading(cell, COLORS["table_alt_bg"])
            set_cell_text(cell, cell_text, size=Pt(9.5))
        # Prevent data rows from splitting
        tr = table.rows[row_idx + 1]._tr
        trPr = tr.get_or_add_trPr()
        cantSplit = parse_xml(f'<w:cantSplit {nsdecls("w")} w:val="true"/>')
        trPr.append(cantSplit)

    doc.add_paragraph()  # spacing after table
    return table


def add_code_block(doc: Document, code: str) -> None:
    """Add a monospaced code block."""
    p = doc.add_paragraph()
    p.paragraph_format.line_spacing = 1.15
    p.paragraph_format.space_before = Pt(6)
    p.paragraph_format.space_after = Pt(6)
    # Indent
    p.paragraph_format.left_indent = Inches(0.3)
    # Light background via shading
    pPr = p._p.get_or_add_pPr()
    shading = parse_xml(
        f'<w:shd {nsdecls("w")} w:fill="EBF0F5" w:val="clear"/>'
    )
    pPr.append(shading)
    run = p.add_run(code)
    run.font.name = "Courier New"
    run.font.size = Pt(9)
    run.font.color.rgb = COLORS["body"]


# ═══════════════════════════════════════════════════════════════════════════════
# SECTION BUILDERS
# ═══════════════════════════════════════════════════════════════════════════════

def section_cover(doc: Document):
    """Section 1: Cover Page."""
    # Add spacing before the title block
    for _ in range(6):
        p = doc.add_paragraph()
        p.paragraph_format.space_after = Pt(0)
        p.paragraph_format.space_before = Pt(0)

    # Title
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.line_spacing = 1.3
    p.paragraph_format.space_after = Pt(4)
    run = p.add_run("YoungSharkJobHunter")
    run.font.name = "Calibri"
    run.font.size = Pt(44)
    run.font.bold = True
    run.font.color.rgb = COLORS["primary"]

    # Subtitle
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.line_spacing = 1.3
    p.paragraph_format.space_after = Pt(6)
    run = p.add_run("System Architecture & Technical Specification")
    run.font.name = "Calibri"
    run.font.size = Pt(20)
    run.font.color.rgb = COLORS["accent"]

    # Horizontal rule (simulated with paragraph border)
    p = doc.add_paragraph()
    p.alignment = WD_ALIGN_PARAGRAPH.CENTER
    p.paragraph_format.space_before = Pt(12)
    p.paragraph_format.space_after = Pt(12)
    pPr = p._p.get_or_add_pPr()
    pBdr = parse_xml(
        f'<w:pBdr {nsdecls("w")}>'
        f'  <w:bottom w:val="single" w:sz="8" w:space="1" w:color="{COLORS["accent"]}"/>'
        f'</w:pBdr>'
    )
    pPr.append(pBdr)

    # Meta lines
    meta_lines = [
        "Version 1.0",
        "Classification: Confidential",
        "Date: July 2026",
    ]
    for line in meta_lines:
        p = doc.add_paragraph()
        p.alignment = WD_ALIGN_PARAGRAPH.CENTER
        p.paragraph_format.line_spacing = 1.3
        p.paragraph_format.space_after = Pt(2)
        run = p.add_run(line)
        run.font.name = "Calibri"
        run.font.size = Pt(12)
        run.font.color.rgb = COLORS["secondary"]

    # Page break after cover
    doc.add_page_break()


def section_product_vision(doc: Document):
    """Section 2: Product Vision."""
    doc.add_heading("Product Vision", level=1)

    add_body(doc,
        "YoungSharkJobHunter is an autonomous AI-powered Career Operating System that continuously "
        "discovers job opportunities from 55+ sources including AI training platforms (Outlier, Scale AI, "
        "DataAnnotation), research labs (OpenAI, Anthropic, DeepMind), big tech (Google, Microsoft, Amazon), "
        "and ATS platforms (Greenhouse, Lever, Ashby). Unlike traditional job boards, it functions as an "
        "intelligent career agent that normalizes job data across sources, builds structured career profiles, "
        "generates ATS-optimized application materials, scores job matches using embeddings, tracks application "
        "pipelines, identifies skill gaps, and learns from outcomes to continuously improve recommendations."
    )

    doc.add_heading("Architecture Philosophy", level=2)
    add_body(doc,
        "The system follows Domain-Driven Design (DDD) with Clean Architecture principles. All modules "
        "communicate through an event-driven architecture using domain events. Each bounded context "
        "encapsulates a core domain capability. Adapters handle external integrations (job sources, email, "
        "browser automation) through well-defined ports. The system is designed as a modular monolith with "
        "clear extraction paths to microservices for scalability bottlenecks."
    )

    doc.add_page_break()


def section_system_architecture_overview(doc: Document):
    """Section 3: System Architecture Overview."""
    doc.add_heading("System Architecture Overview", level=1)

    add_body(doc,
        "See System Architecture Diagram (Figure 1) for the high-level system architecture. The system "
        "is organized into seven core layers: (1) Presentation Layer — Next.js 16 with React, Tailwind CSS, "
        "and shadcn/ui, (2) Application Layer — REST API with versioned endpoints, JWT authentication, and "
        "rate limiting, (3) Application Services — Use cases including Resume Engine, Job Matching, Application "
        "Workflow, and Cover Letter Generation, (4) Domain Layer — Core domain models (Job, Company, "
        "Application, Resume, User, Skill) with domain events, (5) Infrastructure Services — Connector "
        "framework, notification workers, scraping scheduler, and vector embedding service, (6) Integration "
        "Adapters — Modular connectors for Greenhouse, Lever, Ashby, RemoteOK, LinkedIn, etc., (7) Data "
        "Layer — PostgreSQL for relational data, Redis for caching and job queues, Qdrant for vector "
        "embeddings, and S3-compatible object storage. All layers communicate through an internal event bus "
        "using domain events."
    )

    doc.add_page_break()


def section_modular_architecture(doc: Document):
    """Section 4: Modular Architecture & Module Decomposition."""
    doc.add_heading("Modular Architecture & Module Decomposition", level=1)

    add_body(doc,
        "The system is decomposed into focused, independently maintainable modules. Each module owns a "
        "clear slice of domain responsibility and exposes its capabilities through well-defined interfaces. "
        "This decomposition enables parallel development, targeted testing, and the ability to extract any "
        "module into a standalone microservice when scalability demands it."
    )

    headers = ["Module", "Layer", "Responsibility", "Key Interfaces", "Tech Stack"]
    rows = [
        ["Job Discovery Service", "Application", "Discovers and normalizes jobs from external sources", "JobSourceConnector, JobNormalizer, JobRepository", "Python/Rust worker"],
        ["Company Discovery Service", "Application", "Discovers companies and their career pages", "CompanyScraper, CompanyRepository", "Python worker"],
        ["Resume Engine", "Application", "Parses resumes, generates tailored versions", "ResumeParser, ResumeGenerator, TemplateEngine", "TypeScript"],
        ["AI Matching Engine", "Domain", "Calculates job-fit scores using embeddings", "MatchingService, EmbeddingService, ScoreCalculator", "Python, sentence-transformers, Qdrant"],
        ["Cover Letter Agent", "Application", "Generates tailored cover letters", "CoverLetterAgent, PromptTemplate", "Python, LLM API"],
        ["ATS Optimizer", "Domain", "Analyzes JDs for ATS compatibility", "ATSAnalyzer, KeywordExtractor", "Python"],
        ["Application Workflow", "Application", "Manages application state machine", "ApplicationStateMachine, StateRepository", "TypeScript"],
        ["Interview Tracker", "Application", "Tracks interview rounds and feedback", "InterviewService, SchedulerService", "TypeScript"],
        ["Skill Ontology Service", "Domain", "Maps and manages skill relationships", "SkillGraph, OntologyMapper", "TypeScript, Neo4j"],
        ["Salary Intelligence", "Domain", "Aggregates and analyzes compensation data", "SalaryAnalyzer, CompensationDB", "TypeScript, PostgreSQL"],
        ["Notification Service", "Infrastructure", "Push notifications across channels", "NotificationWorker, EmailSender, PushRegistry", "TypeScript"],
        ["Scraper Orchestrator", "Infrastructure", "Schedules and manages scraping jobs", "ScrapingScheduler, RateLimiter", "TypeScript, BullMQ/Redis"],
        ["AI Assistant Agent", "Application", "Natural language career assistant", "ChatHandler, ContextManager, ToolRegistry", "TypeScript, LLM API"],
        ["Learning Recommendations", "Domain", "Identifies skill gaps and recommends resources", "GapAnalyzer, ResourceRegistry", "Python"],
        ["Admin Console", "Presentation", "System administration and monitoring", "AdminDashboard, UserManagement, SourceManagement", "TypeScript"],
        ["Recruiter CRM", "Application", "Recruiter relationship management", "RecruiterService, ContactRepository", "TypeScript"],
        ["Search & Discovery", "Infrastructure", "Semantic and keyword search", "SearchService, VectorIndex, QueryParser", "TypeScript, Qdrant, Meilisearch"],
    ]
    add_table(doc, headers, rows)

    doc.add_page_break()


def section_domain_model(doc: Document):
    """Section 5: Domain Model."""
    doc.add_heading("Domain Model", level=1)

    add_body(doc,
        "The domain model captures the core entities of the system and their relationships. Each entity "
        "encapsulates business rules and invariants within its bounded context. The model is designed to "
        "reflect the ubiquity of job-seeking workflows while remaining flexible for future domain extensions."
    )

    headers = ["Entity", "Description", "Key Fields", "Relationships"]
    rows = [
        ["User", "Platform user with authentication", "email, name, role, preferences, subscription", "has many Applications, owns Resumes"],
        ["Resume", "Structured career profile data", "fileName, skills[], experience[], education[], projects[]", "has many Versions, belongs to User"],
        ["ResumeVersion", "Generated resume variant for a job", "resumeId, jobId, version, atsScore", "belongs to Resume"],
        ["Job", "Normalized job posting", "title, company, description, skills[], salaryMin, salaryMax, location, remote, matchScore, source, sourceUrl", "has many Applications, belongs to Company"],
        ["Company", "Employer organization", "name, website, industry, size, careersUrl", "has many Jobs"],
        ["JobSource", "Job discovery source", "name, type, website, isActive, jobsCount", "discovers Jobs"],
        ["Application", "Job application record", "status, atsScore, coverLetter, appliedAt, feedback", "belongs to User and Job"],
        ["Interview", "Interview round record", "round, type, date, status, feedback", "belongs to Application"],
        ["Skill", "Skill in the ontology", "name, category, relatedSkills[]", "referenced by Jobs and Resumes"],
        ["ScrapingLog", "Source scraping audit trail", "source, status, jobsFound, jobsNew, errors", "created by scraping"],
        ["Notification", "User notification", "type, message, read, userId", "sent to User"],
    ]
    add_table(doc, headers, rows)

    doc.add_page_break()


def section_bounded_contexts(doc: Document):
    """Section 6: Bounded Contexts."""
    doc.add_heading("Bounded Contexts", level=1)

    add_body(doc,
        "Following Domain-Driven Design principles, the system is partitioned into bounded contexts. Each "
        "context owns its domain services, defines its own ubiquitous language, and communicates with other "
        "contexts exclusively through domain events. This isolation ensures that changes within one context "
        "do not cascade unpredictably into others."
    )

    headers = ["Context", "Core Domain Services", "External Adapters", "Notes"]
    rows = [
        ["JobDiscoveryContext", "JobSourceConnector, JobNormalizer, JobRepository", "GreenhouseAdapter, LeverAdapter, RemoteOKAdapter", "Each source = separate bounded context"],
        ["CompanyDiscoveryContext", "CompanyScraper, CompanyRepository", "CrunchbaseAdapter, YC Portfolio", "Event-driven company discovery"],
        ["ResumeEngineContext", "ResumeParser, ResumeGenerator, TemplateEngine", "LLM API Adapter", "Pure domain logic"],
        ["MatchingContext", "MatchingService, EmbeddingService, ScoreCalculator", "QdrantClient, SentenceTransformers", "Independent matching logic"],
        ["ApplicationWorkflowContext", "ApplicationStateMachine, StateRepository", "EmailAdapter", "State machine per application"],
        ["InterviewContext", "InterviewService, SchedulerService", "CalendarAdapter", "Scheduled interview reminders"],
        ["SkillOntologyContext", "SkillGraph, OntologyMapper", "OpenAI Embeddings", "Graph-based skill mapping"],
        ["SalaryContext", "SalaryAnalyzer, CompensationDB", "External Salary APIs", "Aggregated market data"],
    ]
    add_table(doc, headers, rows)

    doc.add_page_break()


def section_event_catalog(doc: Document):
    """Section 7: Event Catalog."""
    doc.add_heading("Event Catalog", level=1)

    add_body(doc,
        "The event catalog defines all domain events that flow through the system's internal event bus. "
        "Each event represents a significant state change or business occurrence. Events are immutable, "
        "carry descriptive payloads, and enable loose coupling between bounded contexts."
    )

    headers = ["Event Name", "Domain Context", "Payload", "Consumers", "Description"]
    rows = [
        ["job.discovered", "JobDiscovery", "{ sourceId, jobId, normalizedJob }", "MatchingContext, SalaryContext", "New job found and normalized"],
        ["job.match_score_calculated", "Matching", "{ jobId, score, breakdown }", "ApplicationWorkflowContext", "Job scored for a user"],
        ["resume.parsed", "ResumeEngine", "{ resumeId, parsedData }", "MatchingContext", "Resume extracted into structured data"],
        ["resume.generated", "ResumeEngine", "{ resumeId, jobId, atsScore }", "ApplicationWorkflowContext", "Tailored resume created"],
        ["cover_letter.generated", "ResumeEngine", "{ resumeId, jobId, content }", "ApplicationWorkflowContext", "Cover letter ready"],
        ["application.started", "ApplicationWorkflow", "{ applicationId, jobId }", "Notification Service", "Application submitted"],
        ["application.status_changed", "ApplicationWorkflow", "{ applicationId, oldStatus, newStatus }", "Notification Service, InterviewContext", "Status pipeline updated"],
        ["interview.scheduled", "Interview", "{ applicationId, round, date }", "InterviewContext, Notification", "Interview reminder set"],
        ["skill_gap.detected", "Learning", "{ skills[], jobId }", "Learning Recommendations", "Skill gap identified"],
        ["scraping.completed", "Infrastructure", "{ source, jobsFound, jobsNew, errors }", "Dashboard", "Scraping run finished"],
    ]
    add_table(doc, headers, rows)

    doc.add_page_break()


def section_api_design(doc: Document):
    """Section 8: API Design."""
    doc.add_heading("API Design", level=1)

    add_body(doc,
        "The system exposes a versioned REST API that serves as the primary integration point for the "
        "frontend application and future client SDKs. All endpoints follow consistent conventions for "
        "authentication, error handling, and response formatting."
    )

    doc.add_heading("API Conventions", level=2)
    conventions = [
        ("REST with JSON: ", "All endpoints accept and return JSON. Standard HTTP methods (GET, POST, PATCH, DELETE) convey intent."),
        ("Versioned endpoints: ", "All routes are prefixed with /api/v1/ to allow independent evolution of API versions without breaking existing clients."),
        ("JWT authentication: ", "Authentication tokens are passed via the Authorization header using the Bearer scheme. Tokens are short-lived and refreshed via a separate endpoint."),
        ("Rate limiting: ", "Default rate limit of 100 requests per minute per user. Rate limit headers (X-RateLimit-*) are included in responses."),
        ("CORS configuration: ", "Configured per environment. Development allows all origins; production restricts to known domains."),
        ("Error response format: ", "Errors follow the structure: { error: string, message: string, code: number, details?: object }."),
        ("Success response format: ", "Paginated responses use: { data: object | null, meta: { page, limit, total } }."),
    ]
    for bold_part, normal_part in conventions:
        add_body_bold_start(doc, bold_part, normal_part)

    doc.add_heading("Endpoints", level=2)

    headers = ["Method", "Endpoint", "Description", "Auth", "Request Body", "Response"]
    rows = [
        ["GET", "/api/v1/jobs", "List/search jobs", "Yes", "Query: search, sourceType, remote, minSalary, maxSalary, minMatch, sortBy, page, limit", "Paginated job list"],
        ["GET", "/api/v1/jobs/:id", "Get job details", "Yes", "—", "Job object"],
        ["GET", "/api/v1/sources", "List job sources", "Yes", "—", "Source list"],
        ["POST", "/api/v1/scrape", "Trigger scraping", "Admin", "{ sourceId?, force?: boolean }", "Scraping task ID"],
        ["GET", "/api/v1/resumes", "Get user resumes", "Yes", "—", "Resume list"],
        ["POST", "/api/v1/resumes/upload", "Upload resume", "Yes", "multipart/form-data (file)", "Resume object"],
        ["POST", "/api/v1/resumes/:id/generate", "Generate tailored resume", "Yes", "{ jobId, options? }", "Generated resume URL"],
        ["GET", "/api/v1/applications", "List applications", "Yes", "Query: status", "Paginated application list"],
        ["POST", "/api/v1/applications/:id/submit", "Submit application", "Yes", "{ coverLetter?, resumeId? }", "Updated application"],
        ["GET", "/api/v1/applications/:id", "Get application details", "Yes", "—", "Application object"],
        ["PATCH", "/api/v1/applications/:id/status", "Update status", "Yes", "{ status, feedback? }", "Updated application"],
        ["POST", "/api/v1/chat", "AI assistant chat", "Yes", "{ message, context? }", "AI response"],
        ["GET", "/api/v1/dashboard/stats", "Dashboard statistics", "Yes", "—", "Stats object"],
        ["GET", "/api/v1/skills", "Skill ontology", "Yes", "Query: search, category", "Skill list"],
        ["GET", "/api/v1/market/salary", "Salary intelligence", "Yes", "Query: role, location, level", "Salary data"],
        ["GET/PUT", "/api/v1/user/profile", "User career profile", "Yes", "Profile fields", "Profile object"],
        ["GET", "/api/v1/admin/sources", "Admin: manage sources", "Admin", "—", "Source management data"],
        ["GET", "/api/v1/admin/audit-log", "Admin: audit trail", "Admin", "Query: userId, action, from, to", "Audit log entries"],
    ]
    add_table(doc, headers, rows)

    doc.add_page_break()


def section_ai_agent_architecture(doc: Document):
    """Section 9: AI Agent Architecture."""
    doc.add_heading("AI Agent Architecture", level=1)

    add_body(doc,
        "The system employs a multi-agent architecture where specialized AI agents handle distinct career "
        "workflow tasks. Each agent has a focused responsibility, a defined input/output contract, and "
        "operates either on-demand (request-response) or on a schedule. Agents communicate through the "
        "domain event bus, enabling a composable and extensible intelligence layer."
    )

    doc.add_heading("Agent Types", level=2)

    headers = ["Agent", "Type", "Input", "Output / Model", "Description"]
    rows = [
        ["Discovery Agent", "Background Worker", "New job events, enriched job data", "None — Periodically scans sources, publishes events", "Scans configured sources on a schedule and publishes job.discovered events to the event bus"],
        ["Resume Agent", "Request-Response", "Job description, user resume data", "GPT-4 / claude-3.5-sonnet", "Generates tailored resumes and cover letters optimized for specific job descriptions"],
        ["ATS Agent", "Request-Response", "Job description", "GPT-4 / claude-3.5-sonnet", "Analyzes job descriptions and provides keyword optimization recommendations for ATS compatibility"],
        ["Interview Agent", "Request-Response", "Interview context, user profile", "GPT-4 / claude-3.5-sonnet", "Prepares interview materials including potential questions, talking points, and company research"],
        ["Learning Agent", "Request-Response", "User skills, job requirements", "GPT-4 / claude-3.5-sonnet", "Identifies skill gaps between a user's profile and job requirements, then recommends learning resources"],
        ["Market Intelligence Agent", "Scheduled", "Salary trends, demand signals", "Fine-tuned model", "Analyzes job market conditions, tracks salary trends, and identifies emerging demand for skills"],
        ["Career Coach Agent", "Request-Response", "Career profile, market data", "GPT-4o / claude-3.5-sonnet", "Synthesizes data from all agents to provide holistic career strategy and actionable advice"],
    ]
    add_table(doc, headers, rows)

    doc.add_heading("Communication Pattern", level=2)
    add_body(doc,
        "Agents communicate through an internal event bus. Each agent subscribes to domain events relevant "
        "to its responsibility. For example, the Discovery Agent publishes job.discovered events, which the "
        "Resume Agent and ATS Agent consume. The Market Intelligence Agent operates on a schedule, analyzing "
        "aggregated data. The Career Coach Agent synthesizes information from all agents to provide holistic "
        "career advice."
    )

    doc.add_page_break()


def section_connector_architecture(doc: Document):
    """Section 10: Connector Architecture."""
    doc.add_heading("Connector Architecture", level=1)

    add_body(doc,
        "The connector framework provides a modular, extensible pattern for integrating with external job "
        "sources. Each source is implemented as a self-contained connector that adheres to a common interface. "
        "This design allows new sources to be added without modifying existing code, following the Open/Closed "
        "principle."
    )

    doc.add_heading("Connector Interface", level=2)
    add_body(doc,
        "All connectors implement the JobSourceConnector interface, which defines the contract for discovery, "
        "fetching, normalization, validation, and rate limiting. This ensures consistent behavior across all "
        "source integrations."
    )

    connector_code = (
        "interface JobSourceConnector {\n"
        "  sourceId: string;\n"
        "  sourceName: string;\n"
        "  discover(): Promise<DiscoveredJob[]>;\n"
        "  fetchJobs(): Promise<RawJob[]>;\n"
        "  normalize(job: RawJob): NormalizedJob;\n"
        "  validate(job: NormalizedJob): boolean;\n"
        "  rateLimit: { requestsPerMinute: number };\n"
        "  isAvailable(): boolean;\n"
        "}"
    )
    add_code_block(doc, connector_code)

    doc.add_heading("Connector Registry Pattern", level=2)
    add_body(doc,
        "Each connector is registered in a ConnectorRegistry. The registry manages lifecycle, health checks, "
        "rate limiting, and error handling per connector. New connectors can be added without modifying "
        "existing code."
    )

    doc.add_heading("Source Type Categories", level=2)
    add_body(doc,
        "Job sources are categorized by type, each with distinct scraping strategies and normalization "
        "rules. The following table summarizes the source categories and their known integrations."
    )

    headers = ["Category", "Examples", "Connector Count", "Priority"]
    rows = [
        ["ATS Platforms", "Greenhouse, Lever, Ashby, Workday, SmartRecruiters, iCIMS", "6", "High"],
        ["AI Training", "Outlier, Scale AI, DataAnnotation, Alignerr, Remotasks, Appen, etc.", "7+", "High"],
        ["Research Labs", "OpenAI, Anthropic, DeepMind, xAI, Cohere, Mistral, Hugging Face", "7", "High"],
        ["Remote Boards", "RemoteOK, We Work Remotely, FlexJobs, Himalayas", "4", "Medium"],
        ["Job Boards", "LinkedIn, Indeed, Glassdoor, Wellfound", "4", "Medium"],
        ["Startup", "YC Jobs, Otta, F6S", "3", "Medium"],
        ["General", "RSS feeds, Hacker News, Reddit", "3", "Low"],
    ]
    add_table(doc, headers, rows)

    doc.add_page_break()


def section_search_architecture(doc: Document):
    """Section 11: Search Architecture."""
    doc.add_heading("Search Architecture", level=1)

    add_body(doc,
        "Search uses a hybrid approach combining keyword matching (PostgreSQL full-text) with semantic "
        "vector search (Qdrant). Job descriptions, resumes, and skill data are embedded using "
        "sentence-transformer models. The SearchService accepts natural language queries and returns ranked "
        "results using a two-stage pipeline: (1) keyword pre-filter to narrow candidates, (2) vector "
        "similarity re-ranking of the top N results for precision. The vector index is updated incrementally "
        "as new jobs and resumes are processed."
    )

    add_body(doc,
        "This hybrid approach ensures both recall (through keyword matching) and relevance (through semantic "
        "understanding). The two-stage pipeline is critical for performance at scale: keyword filtering "
        "reduces the candidate set from millions to thousands, and vector re-ranking applies computationally "
        "expensive similarity calculations only on that reduced set."
    )

    doc.add_page_break()


def section_database_design(doc: Document):
    """Section 12: Database Design."""
    doc.add_heading("Database Design", level=1)

    add_body(doc,
        "The system employs a polyglot persistence strategy, selecting the optimal storage technology for "
        "each access pattern. This approach avoids the impedance mismatch that arises from forcing all data "
        "into a single database model."
    )

    doc.add_heading("PostgreSQL", level=2)
    add_body(doc,
        "Primary relational database for jobs, applications, users, companies, and application metadata. "
        "Chosen for ACID compliance, mature tooling, full-text search capabilities, and JSON column support "
        "for semi-structured data such as skill arrays and preference objects."
    )

    doc.add_heading("Redis", level=2)
    add_body(doc,
        "Queue management for scraping jobs and notifications. Caching for API responses, session data, "
        "and rate limiters. Redis is chosen for its sub-millisecond latency and native support for sorted "
        "sets, which power the job ranking queues."
    )

    doc.add_heading("Qdrant", level=2)
    add_body(doc,
        "Vector database for storing job description and resume embeddings. Enables semantic similarity "
        "search across millions of jobs. Qdrant is selected for its filtering capabilities, horizontal "
        "scalability, and native gRPC support for low-latency queries."
    )

    doc.add_heading("S3-compatible Object Storage", level=2)
    add_body(doc,
        "Stores generated resumes (PDF/DOCX), cover letters, and portfolio documents. Object storage "
        "provides cost-effective, durable binary storage with CDN integration for fast downloads."
    )

    doc.add_heading("Design Pattern", level=2)
    add_body(doc,
        "Each storage technology is selected based on its access pattern. Relational queries use PostgreSQL. "
        "Queue operations use Redis. Vector search uses Qdrant. Large binary files (resumes) use object "
        "storage. This separation ensures each component operates at peak efficiency."
    )

    doc.add_page_break()


def section_security_architecture(doc: Document):
    """Section 13: Security Architecture."""
    doc.add_heading("Security Architecture", level=1)

    add_body(doc,
        "Security is layered throughout the architecture, from transport encryption to application-level "
        "authorization. The following subsections describe the security measures applied at each layer of "
        "the system."
    )

    doc.add_heading("Authentication", level=2)
    add_body(doc,
        "JWT with short-lived access tokens and HTTP-only refresh tokens. Token rotation every 15 minutes. "
        "Supports optional OAuth2 for social login. Tokens include claims for user identity, role, and "
        "subscription tier. Refresh tokens are stored securely with rotation on each use to prevent replay."
    )

    doc.add_heading("Authorization", level=2)
    add_body(doc,
        "Role-Based Access Control with roles: viewer, applicant, admin. Resources scoped to user's own "
        "data. Admin role can manage all sources and users. Authorization checks are enforced at the API "
        "layer and reinforced at the data access layer to prevent privilege escalation."
    )

    doc.add_heading("Data Protection", level=2)
    add_body(doc,
        "All PII encrypted at rest. AES-256 for file storage. Database-level encryption for sensitive fields. "
        "Resume data stored with user-controlled access. Encryption keys are managed through a dedicated key "
        "management service with automatic rotation."
    )

    doc.add_heading("API Security", level=2)
    add_body(doc,
        "Input validation, output encoding, CSRF protection (double-submit cookie pattern), rate limiting, "
        "API key rotation, helmet middleware for security headers. All user input is sanitized and validated "
        "against strict schemas before processing."
    )

    doc.add_heading("File Security", level=2)
    add_body(doc,
        "Malware scanning for uploaded resumes. File type validation. Size limits (10MB max). Virus "
        "scanning via ClamAV integration. Uploaded files are stored in isolated containers with no execute "
        "permissions."
    )

    doc.add_page_break()


def section_infrastructure_architecture(doc: Document):
    """Section 14: Infrastructure Architecture."""
    doc.add_heading("Infrastructure Architecture", level=1)

    add_body(doc,
        "Infrastructure is designed for horizontal scaling with vertical partitioning. The application runs "
        "on Kubernetes with the following components: (1) Next.js server pods with HPA (1-3 replicas), "
        "(2) Redis cluster for job queues and caching, (3) Qdrant for vector search, (4) PostgreSQL cluster "
        "with read replicas, (5) S3-compatible storage for generated documents. Each component scales "
        "independently. Worker services (scraping, notifications) run as separate deployments with their own "
        "lifecycle. Ingress controllers manage API routing. A Kubernetes CronJob triggers scheduled scraping "
        "runs."
    )

    add_body(doc,
        "This architecture ensures that the presentation layer, application services, background workers, "
        "and data stores can each scale according to their own demand curves. The Kubernetes orchestration "
        "layer provides self-healing, rolling updates, and resource management across the entire stack."
    )

    doc.add_page_break()


def section_deployment_strategy(doc: Document):
    """Section 15: Deployment Strategy."""
    doc.add_heading("Deployment Strategy", level=1)

    add_body(doc,
        "The deployment strategy defines three environments, each tailored to a stage of the development "
        "lifecycle. Environments increase in fidelity and operational rigor as code progresses toward "
        "production."
    )

    doc.add_heading("Development", level=2)
    add_body(doc,
        "Local Docker Compose with hot reload. PostgreSQL and Redis via containers. Object storage uses "
        "local volume mount. Mock services or real API keys. Developers get a full local stack with a "
        "single docker-compose up command."
    )

    doc.add_heading("Staging", level=2)
    add_body(doc,
        "Kubernetes cluster with managed database (RDS/Cloud SQL). GitHub Actions CI/CD pipeline. "
        "Blue-green deployments. Preview environments per PR. Staging mirrors production configuration "
        "to catch environment-specific issues before release."
    )

    doc.add_heading("Production", level=2)
    add_body(doc,
        "Multi-region Kubernetes deployment. Global load balancer (ALB/CloudFront). Multi-AZ with "
        "auto-scaling. RDS Multi-AZ with read replicas. ElastiCache (Redis). CloudFront WAF + DDoS "
        "protection. CDN for static assets. Automated backups with point-in-time recovery."
    )

    doc.add_page_break()


def section_monitoring(doc: Document):
    """Section 16: Monitoring & Observability."""
    doc.add_heading("Monitoring & Observability", level=1)

    add_body(doc,
        "Structured logging with correlation IDs (trace_id). OpenTelemetry metrics export. Health check "
        "endpoints (/health, /ready) with dependency status. Distributed tracing with sampling. Performance "
        "dashboards (p50, p95, p99 latencies, request rate). Error monitoring with alerting (Sentry-compatible). "
        "Audit log for all state changes. Custom dashboards for scraping health, connector status, match score "
        "distribution, and application funnel conversion rates."
    )

    add_body(doc,
        "The observability stack is designed around the three pillars: logs, metrics, and traces. Every "
        "request carries a trace_id that propagates through all service boundaries, enabling end-to-end "
        "request reconstruction. Alerts are configured for anomaly detection on critical business metrics "
        "such as scraping failure rates, API error spikes, and application pipeline drop-off."
    )

    doc.add_page_break()


def section_scalability_roadmap(doc: Document):
    """Section 17: Scalability Roadmap."""
    doc.add_heading("Scalability Roadmap", level=1)

    add_body(doc,
        "The following phased roadmap defines the progression from initial core engine delivery through "
        "full platform maturity. Each phase builds on the previous, with clear deliverables and scaling "
        "targets that align with business growth milestones."
    )

    headers = ["Phase", "Focus", "Targets", "Timeline"]
    rows = [
        ["Phase 1", "Core Engine", "20 sources, resume gen, AI matching, 10K jobs indexed", "Months 1-3"],
        ["Phase 2", "Discovery Scale", "55+ sources, 100K jobs, salary intelligence, skill ontology", "Months 3-5"],
        ["Phase 3", "Scale & Performance", "1M+ jobs, sub-second search, distributed workers", "Months 6-9"],
        ["Phase 4", "Intelligence", "Learning feedback loop, auto-apply workflow, recruiter CRM", "Months 9-12"],
        ["Phase 5", "Platform", "Multi-tenant, API marketplace, mobile SDK", "Months 12-18"],
    ]
    add_table(doc, headers, rows)

    doc.add_page_break()


def section_implementation_roadmap(doc: Document):
    """Section 18: Implementation Roadmap."""
    doc.add_heading("Implementation Roadmap", level=1)

    add_body(doc,
        "The implementation roadmap decomposes the scalability phases into 12 two-week sprints. Each sprint "
        "focuses on a coherent set of deliverables that incrementally build the system's capabilities. "
        "Story point estimates reflect relative complexity and effort."
    )

    headers = ["Sprint #", "Focus", "Key Deliverables", "Story Points"]
    rows = [
        ["Sprint 1", "Foundation & Setup", "Project scaffolding, Prisma schema, Docker Compose, CI/CD pipeline, base UI shell", "34"],
        ["Sprint 2", "Job Discovery Core", "Greenhouse & Lever connectors, connector registry, job normalization, scraping scheduler", "40"],
        ["Sprint 3", "Resume Engine", "Resume upload & parsing, PDF extraction, structured data model, resume storage", "38"],
        ["Sprint 4", "AI Matching", "Embedding service integration, Qdrant setup, match score calculation, job ranking", "42"],
        ["Sprint 5", "Application Workflow", "Application state machine, status tracking, application CRUD, dashboard stats", "36"],
        ["Sprint 6", "Resume Generation", "LLM integration for resume tailoring, ATS scoring, template engine, version management", "44"],
        ["Sprint 7", "Source Expansion", "Ashby, RemoteOK, LinkedIn connectors, 55+ source support, source health monitoring", "40"],
        ["Sprint 8", "Cover Letter & ATS", "Cover letter generation agent, ATS keyword optimization, JD analysis, optimization tips", "38"],
        ["Sprint 9", "AI Assistant", "Chat interface, context management, tool registry, career coach agent integration", "42"],
        ["Sprint 10", "Intelligence Layer", "Salary intelligence, skill ontology, learning recommendations, skill gap detection", "44"],
        ["Sprint 11", "Scale & Polish", "Distributed workers, search optimization, notification service, interview tracker", "40"],
        ["Sprint 12", "Production Readiness", "Security hardening, monitoring, admin console, recruiter CRM, performance tuning", "46"],
    ]
    add_table(doc, headers, rows)

    doc.add_page_break()


def section_folder_structure(doc: Document):
    """Section 19: Folder Structure."""
    doc.add_heading("Folder Structure", level=1)

    add_body(doc,
        "The project follows a convention-based folder structure that aligns with Next.js 16 app router "
        "patterns while maintaining clear separation between API routes, domain services, and infrastructure "
        "code. The structure supports both the modular monolith and future microservice extraction."
    )

    folder_lines = [
        "src/",
        "\u251c\u2500\u2500 app/",
        "\u2502   \u251c\u2500\u2500 api/v1/                  # Versioned REST API",
        "\u2502   \u2502   \u251c\u2500\u2500 jobs/",
        "\u2502   \u2502   \u251c\u2500\u2500 sources/",
        "\u2502   \u2502   \u251c\u2500\u2500 applications/",
        "\u2502   \u2502   \u251c\u2500\u2500 resumes/",
        "\u2502   \u2502   \u251c\u2500\u2500 chat/",
        "\u2502   \u2502   \u251c\u2500\u2500 dashboard/",
        "\u2502   \u2502   \u251c\u2500\u2500 skills/",
        "\u2502   \u2502   \u251c\u2500\u2500 salary/",
        "\u2502   \u2502   \u251c\u2500\u2500 admin/",
        "\u2502   \u2502   \u2514\u2500\u2500 health.ts",
        "\u2502   \u251c\u2500\u2500 components/",
        "\u2502   \u2502   \u251c\u2500\u2500 panels/             # Main feature panels",
        "\u2502   \u2502   \u251c\u2500\u2500 ui/                 # shadcn/ui components",
        "\u2502   \u2502   \u2514\u2500\u2500 layout.tsx",
        "\u2502   \u2514\u2500\u2500 pages/",
        "\u2502       \u2514\u2500\u2500 page.tsx",
        "\u251c\u2500\u2500 src/",
        "\u2502   \u251c\u2500\u2500 lib/",
        "\u2502   \u2502   \u251c\u2500\u2500 db.ts               # Prisma client",
        "\u2502   \u2502   \u251c\u2500\u2500 utils.ts",
        "\u2502   \u2502   \u251c\u2500\u2500 store.ts            # Zustand state",
        "\u2502   \u2502   \u251c\u2500\u2500 types.ts            # TypeScript types",
        "\u2502   \u2502   \u251c\u2500\u2500 mock-data.ts        # Mock/seed data",
        "\u2502   \u2502   \u2514\u2500\u2500 connectors/            # Job source connectors",
        "\u2502   \u2502       \u251c\u2500\u2500 types.ts",
        "\u2502   \u2502       \u251c\u2500\u2500 base-connector.ts",
        "\u2502   \u2502       \u251c\u2500\u2500 greenhouse.ts",
        "\u2502   \u2502       \u251c\u2500\u2500 lever.ts",
        "\u2502   \u2502       \u251c\u2500\u2500 ashby.ts",
        "\u2502   \u2502       \u2514\u2500\u2500 registry.ts",
        "\u2502   \u2514\u2500\u2500 services/                # Domain services",
        "\u2502       \u251c\u2500\u2500 discovery.ts",
        "\u2502       \u251c\u2500\u2500 company.ts",
        "\u2502       \u251c\u2500\u2500 matching.ts",
        "\u2502       \u251c\u2500\u2500 scraping.ts",
        "\u2502       \u2514\u2500\u2500 events.ts           # Domain events",
        "\u251c\u2500\u2500 prisma/",
        "\u2502   \u2514\u2500\u2500 schema.prisma",
        "\u251c\u2500\u2500 mini-services/              # Background workers",
        "\u2502   \u2514\u2500\u2500 scraper-worker/",
        "\u251c\u2500\u2500 scripts/                    # Build and utility scripts",
        "\u2514\u2500\u2500 docs/                      # Generated architecture docs",
    ]
    folder_text = "\n".join(folder_lines)
    add_code_block(doc, folder_text)

    doc.add_page_break()


def section_coding_standards(doc: Document):
    """Section 20: Coding Standards."""
    doc.add_heading("Coding Standards", level=1)

    add_body(doc,
        "Consistent coding standards are essential for maintaining code quality across a growing codebase. "
        "The following standards apply to all contributors and are enforced through linters, formatters, "
        "and CI checks."
    )

    doc.add_heading("Naming Conventions", level=2)
    add_body(doc,
        "camelCase for all TypeScript/TSX variables, functions, and file names. snake_case for database "
        "columns and Prisma model fields. UPPER_SNAKE_CASE for environment variables and constants. "
        "PascalCase for React components, classes, interfaces, and types. Kebab-case for CSS class names "
        "and URL slugs."
    )

    doc.add_heading("File Organization", level=2)
    add_body(doc,
        "One component per file. Co-located test files using the .test.ts/.test.tsx suffix. Barrel exports "
        "(index.ts) for module boundaries. Shared utilities in the lib/ directory. Feature-specific code "
        "lives within the relevant app/api/ route or component/panels/ directory."
    )

    doc.add_heading("Error Handling", level=2)
    add_body(doc,
        "Never throw raw exceptions from service functions. Return a Result<T, E> type that explicitly "
        "represents success or failure. Use discriminated unions for error classification. All errors are "
        "logged with structured context before being returned to callers."
    )

    doc.add_heading("Type Safety", level=2)
    add_body(doc,
        "Strict TypeScript with no implicit any. Use the 'unknown' type over 'any' when the type is truly "
        "not known at design time. All API request/response bodies have defined TypeScript interfaces. "
        "Zod schemas provide runtime validation that mirrors compile-time types."
    )

    doc.add_heading("API Design", level=2)
    add_body(doc,
        "All endpoints are versioned under /api/v1/. Responses follow a consistent envelope format with "
        "data and meta fields. Error responses include machine-readable codes for programmatic handling. "
        "Pagination is cursor-based for large collections and offset-based for simple lists."
    )

    doc.add_heading("Testing Requirements", level=2)
    add_body(doc,
        "Unit tests for all domain services and utility functions. Integration tests for API routes and "
        "database operations. End-to-end tests for critical user workflows (resume upload, job search, "
        "application submission). Minimum 80% code coverage for domain and service layers."
    )

    doc.add_heading("Git Workflow", level=2)
    add_body(doc,
        "Conventional commits (feat:, fix:, chore:, docs:). Feature branches from main. Pull requests "
        "require at least one approval. Squash commits on merge to main. Protected branches for main "
        "and release branches. Semantic versioning derived from commit history."
    )

    doc.add_heading("Documentation", level=2)
    add_body(doc,
        "JSDoc on all public APIs, functions, and interfaces. README.md in each major directory describing "
        "purpose and usage. Architecture Decision Records (ADRs) for significant design choices. Inline "
        "comments for complex business logic only; the code should be self-documenting."
    )

    doc.add_heading("Security Practices", level=2)
    add_body(doc,
        "No secrets in code or committed configuration files. All sensitive values loaded from environment "
        "variables via .env files (never committed). Dependency audits run in CI. No eval() or innerHTML "
        "usage. Content Security Policy headers enforced in production."
    )

    doc.add_page_break()


def section_startup_configuration(doc: Document):
    """Section 21: Startup Configuration (Appendix)."""
    doc.add_heading("Startup Configuration (Appendix)", level=1)

    add_body(doc,
        "This appendix documents the environment variables, startup sequence, and key configuration options "
        "required to run the YoungSharkJobHunter system. Configuration follows the twelve-factor app "
        "methodology, with all environment-specific values externalized."
    )

    doc.add_heading("Environment Variables", level=2)
    add_body(doc,
        "The following environment variables must be configured before starting the application. Variables "
        "marked as required will cause the application to fail on startup if not set."
    )

    headers = ["Variable", "Required", "Description", "Default"]
    rows = [
        ["DATABASE_URL", "Yes", "PostgreSQL connection string", "—"],
        ["REDIS_URL", "Yes", "Redis connection URL", "redis://localhost:6379"],
        ["QDRANT_URL", "Yes", "Qdrant vector DB URL", "http://localhost:6333"],
        ["S3_ENDPOINT", "Yes", "S3-compatible storage endpoint", "—"],
        ["S3_ACCESS_KEY", "Yes", "S3 access key", "—"],
        ["S3_SECRET_KEY", "Yes", "S3 secret key", "—"],
        ["S3_BUCKET", "Yes", "S3 bucket name", "—"],
        ["JWT_SECRET", "Yes", "JWT signing secret", "—"],
        ["JWT_EXPIRY", "No", "Access token expiry (minutes)", "15"],
        ["OPENAI_API_KEY", "No", "OpenAI API key for AI features", "—"],
        ["ANTHROPIC_API_KEY", "No", "Anthropic API key for AI features", "—"],
        ["NODE_ENV", "No", "Application environment", "development"],
        ["PORT", "No", "Application listen port", "3000"],
        ["CORS_ORIGINS", "No", "Comma-separated allowed origins", "http://localhost:3000"],
        ["SCRAPING_CRON", "No", "Cron expression for scraping schedule", "0 */6 * * *"],
    ]
    add_table(doc, headers, rows)

    doc.add_heading("Startup Sequence", level=2)
    add_body(doc,
        "On startup, the application follows this initialization sequence: (1) Load and validate environment "
        "variables, (2) Initialize Prisma client and run database migrations, (3) Connect to Redis and "
        "verify connectivity, (4) Initialize Qdrant client and ensure required collections exist, "
        "(5) Register all job source connectors in the ConnectorRegistry, (6) Start the event bus and "
        "subscribe domain event handlers, (7) Initialize the scraping scheduler with configured cron, "
        "(8) Start the HTTP server and begin accepting requests."
    )

    doc.add_heading("Key Configuration Options", level=2)
    add_body(doc,
        "Rate limits, feature flags, and connector-specific settings are managed through a configuration "
        "service that reads from environment variables with optional database overrides. Feature flags "
        "enable gradual rollout of new capabilities. Connector configurations (rate limits, timeouts, "
        "authentication credentials) are stored per-source and can be updated at runtime through the "
        "admin console without requiring a service restart."
    )


# ═══════════════════════════════════════════════════════════════════════════════
# MAIN
# ═══════════════════════════════════════════════════════════════════════════════

def main():
    doc = Document()

    # Configure styles
    configure_styles(doc)

    # Set default section margins
    for section in doc.sections:
        section.top_margin = Cm(2.54)
        section.bottom_margin = Cm(2.54)
        section.left_margin = Cm(2.54)
        section.right_margin = Cm(2.54)

    # Build all sections
    section_cover(doc)
    section_product_vision(doc)
    section_system_architecture_overview(doc)
    section_modular_architecture(doc)
    section_domain_model(doc)
    section_bounded_contexts(doc)
    section_event_catalog(doc)
    section_api_design(doc)
    section_ai_agent_architecture(doc)
    section_connector_architecture(doc)
    section_search_architecture(doc)
    section_database_design(doc)
    section_security_architecture(doc)
    section_infrastructure_architecture(doc)
    section_deployment_strategy(doc)
    section_monitoring(doc)
    section_scalability_roadmap(doc)
    section_implementation_roadmap(doc)
    section_folder_structure(doc)
    section_coding_standards(doc)
    section_startup_configuration(doc)

    # Save
    output_dir = os.path.join(os.path.dirname(os.path.abspath(__file__)), "..", "docs")
    os.makedirs(output_dir, exist_ok=True)
    output_path = os.path.join(output_dir, "YoungSharkJobHunter-Architecture.docx")
    doc.save(output_path)
    print(f"Document generated successfully: {output_path}")


if __name__ == "__main__":
    main()