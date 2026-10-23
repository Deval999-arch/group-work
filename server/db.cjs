'use strict'

const fs = require('node:fs')
const path = require('node:path')
const Database = require('better-sqlite3')
const bcrypt = require('bcryptjs')

const DEFAULT_DB_PATH = path.resolve(__dirname, '..', 'data', 'scholarfund.sqlite')

function initDatabase(customPath, { seedData = process.env.NODE_ENV !== 'production' } = {}) {
  const dbPath = customPath || process.env.SCHOLARFUND_DB_PATH || DEFAULT_DB_PATH

  if (dbPath !== ':memory:') {
    fs.mkdirSync(path.dirname(dbPath), { recursive: true })
  }

  const db = new Database(dbPath)
  db.pragma('journal_mode = WAL')
  db.pragma('foreign_keys = ON')

  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      email TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('student', 'donor', 'admin')),
      avatar_url TEXT NOT NULL DEFAULT '',
      institution TEXT NOT NULL DEFAULT '',
      headline TEXT NOT NULL DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire INTEGER NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions(expire);

    CREATE TABLE IF NOT EXISTS applications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      student_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
      student_name TEXT NOT NULL,
      age INTEGER NOT NULL DEFAULT 21,
      university TEXT NOT NULL,
      program TEXT NOT NULL,
      year_label TEXT NOT NULL DEFAULT 'Final Year Undergraduate',
      location TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      story TEXT NOT NULL,
      quote TEXT NOT NULL DEFAULT '',
      goal_cents INTEGER NOT NULL CHECK(goal_cents >= 10000),
      tuition_items_json TEXT NOT NULL DEFAULT '[]',
      portrait_url TEXT NOT NULL DEFAULT '/images/amara-mensah.jpg',
      status TEXT NOT NULL DEFAULT 'pending' CHECK(status IN ('pending', 'approved', 'rejected')),
      admin_note TEXT NOT NULL DEFAULT '',
      reviewed_by INTEGER REFERENCES users(id),
      reviewed_at TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_applications_student ON applications(student_user_id);
    CREATE INDEX IF NOT EXISTS idx_applications_status ON applications(status);

    CREATE TABLE IF NOT EXISTS campaigns (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      application_id INTEGER REFERENCES applications(id),
      student_user_id INTEGER REFERENCES users(id),
      student_name TEXT NOT NULL,
      age INTEGER NOT NULL DEFAULT 22,
      university TEXT NOT NULL,
      program TEXT NOT NULL,
      year_label TEXT NOT NULL,
      location TEXT NOT NULL,
      category TEXT NOT NULL,
      title TEXT NOT NULL,
      summary TEXT NOT NULL,
      story TEXT NOT NULL,
      quote TEXT NOT NULL DEFAULT '',
      goal_cents INTEGER NOT NULL CHECK(goal_cents > 0),
      raised_cents INTEGER NOT NULL DEFAULT 0 CHECK(raised_cents >= 0),
      supporter_count INTEGER NOT NULL DEFAULT 0 CHECK(supporter_count >= 0),
      portrait_url TEXT NOT NULL,
      tuition_items_json TEXT NOT NULL DEFAULT '[]',
      milestones_json TEXT NOT NULL DEFAULT '[]',
      status TEXT NOT NULL DEFAULT 'active' CHECK(status IN ('active', 'funded', 'paused')),
      verified INTEGER NOT NULL DEFAULT 1,
      featured INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_campaigns_status ON campaigns(status);
    CREATE INDEX IF NOT EXISTS idx_campaigns_category ON campaigns(category);
    CREATE INDEX IF NOT EXISTS idx_campaigns_student ON campaigns(student_user_id);

    CREATE TABLE IF NOT EXISTS donations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      campaign_id INTEGER NOT NULL REFERENCES campaigns(id) ON DELETE CASCADE,
      donor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      donor_name TEXT NOT NULL,
      donor_email TEXT NOT NULL DEFAULT '',
      is_anonymous INTEGER NOT NULL DEFAULT 0,
      amount_cents INTEGER NOT NULL CHECK(amount_cents >= 100),
      currency TEXT NOT NULL DEFAULT 'USD',
      frequency TEXT NOT NULL DEFAULT 'one_time' CHECK(frequency IN ('one_time', 'monthly')),
      payment_method TEXT NOT NULL DEFAULT 'card' CHECK(payment_method IN ('card', 'bank_transfer', 'mobile_money', 'digital_wallet')),
      payment_label TEXT NOT NULL DEFAULT 'Visa •••• 4242',
      message TEXT NOT NULL DEFAULT '',
      reference_code TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_donations_campaign ON donations(campaign_id);
    CREATE INDEX IF NOT EXISTS idx_donations_donor ON donations(donor_user_id);

    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      actor_user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
      actor_email TEXT NOT NULL DEFAULT 'system',
      actor_role TEXT NOT NULL DEFAULT 'system',
      action TEXT NOT NULL,
      target_type TEXT NOT NULL,
      target_id TEXT NOT NULL DEFAULT '',
      summary TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
    CREATE INDEX IF NOT EXISTS idx_audit_created ON audit_logs(id DESC);
  `)

  seedInitialData(db, { seedData })
  return db
}

function seedInitialData(db, { seedData }) {
  const existingUsers = db.prepare('SELECT COUNT(*) AS count FROM users').get().count
  if (existingUsers > 0) return

  const tx = db.transaction(() => {
    let primaryAdminId = null
    let amaraStudentId = null
    let davidStudentId = null
    let primarySponsorId = null
    let applicantKofiId = null
    let applicantSofiaId = null

    if (seedData) {
      const execHash = bcrypt.hashSync('ScholarFund!2026', 10)
      const compatAdminHash = bcrypt.hashSync('ScholarFundDemo!2026', 10)
      const scholarHash = bcrypt.hashSync('Scholar!2026', 10)
      const sponsorHash = bcrypt.hashSync('Sponsor!2026', 10)

      const insertUser = db.prepare(`
        INSERT INTO users (name, email, password_hash, role, avatar_url, institution, headline)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)

      primaryAdminId = insertUser.run(
        'Dr. Elena Rostova',
        'admin@scholarfund.org',
        execHash,
        'admin',
        '',
        'Academic Verification Board',
        'Chair of Registrar Verification & Institutional Grants'
      ).lastInsertRowid

      // Preserve compatibility admin account for automated security suite
      insertUser.run(
        'Dr. Elena Rostova',
        'admin@scholarfund.demo',
        compatAdminHash,
        'admin',
        '',
        'Academic Verification Board',
        'Chair of Registrar Verification & Institutional Grants'
      )

      amaraStudentId = insertUser.run(
        'Amara Mensah',
        'amara.mensah@scholarfund.org',
        scholarHash,
        'student',
        '/images/amara-mensah.jpg',
        'Kwame Nkrumah University of Science & Technology',
        'B.Sc. Electrical & Renewable Energy Engineering · Senior Capstone'
      ).lastInsertRowid

      davidStudentId = insertUser.run(
        'David Okonkwo',
        'david.okonkwo@scholarfund.org',
        scholarHash,
        'student',
        '/images/david-okonkwo.jpg',
        'University of Ibadan',
        'B.Agric. Soil Science & Sustainable Agronomy · Final Year'
      ).lastInsertRowid

      primarySponsorId = insertUser.run(
        'Marcus Vance',
        'marcus.vance@scholarfund.org',
        sponsorHash,
        'donor',
        '',
        'Vance Engineering Fellowship',
        'Supporting STEM, healthcare, and sustainable agriculture scholars'
      ).lastInsertRowid

      applicantKofiId = insertUser.run(
        'Kofi Boateng',
        'kofi.boateng@ucc.edu.gh',
        scholarHash,
        'student',
        '/images/tariq-al-mansoor.jpg',
        'University of Cape Coast',
        'B.Sc. Biomedical Laboratory Technology'
      ).lastInsertRowid

      applicantSofiaId = insertUser.run(
        'Sofia Morales',
        'sofia.morales@unmsm.edu.pe',
        scholarHash,
        'student',
        '/images/linh-nguyen.jpg',
        'Universidad Nacional Mayor de San Marcos',
        'B.Sc. Environmental Engineering & Water Quality'
      ).lastInsertRowid
    }

    const campaignsSeed = [
      {
        slug: 'amara-mensah-solar-cold-storage',
        student_user_id: amaraStudentId,
        student_name: 'Amara Mensah',
        age: 22,
        university: 'Kwame Nkrumah University of Science & Technology',
        program: 'B.Sc. Electrical & Renewable Energy Engineering',
        year_label: 'Year 4 of 4 · Senior Capstone',
        location: 'Kumasi, Ghana',
        category: 'Engineering & Technology',
        title: 'Final-year tuition & solar cold-storage microgrid capstone',
        summary:
          'Bridging final-semester university tuition and power-electronics lab bench hours to complete an off-grid solar cold-room controller for harvest cooperatives.',
        story:
          'Growing up outside Sunyani, I watched farming families lose nearly a third of their tomato and leafy-green harvests whenever rural grid outages stretched past forty-eight hours. Studying electrical engineering at KNUST gave me the foundation to design a high-efficiency MPPT charge controller and thermal battery unit built from locally serviceable components.\n\nMy merit scholarship covers 65% of academic tuition, leaving a final-year balance across university tuition, high-voltage laboratory testing hours, and printed-circuit fabrication for my thesis defense. Completing this final semester allows our team to publish open-hardware schematics for agricultural cooperatives across West Africa.',
        quote: 'Reliable clean power turns a three-day harvest window into three weeks of family income.',
        goal_cents: 420000,
        raised_cents: 342000,
        supporter_count: 38,
        portrait_url: '/images/amara-mensah.jpg',
        verified: 1,
        featured: 1,
        status: 'active',
        tuition_items: [
          { label: 'Final-year university tuition & academic registration', amount_cents: 245000 },
          { label: 'High-voltage power systems & microgrid laboratory fee', amount_cents: 95000 },
          { label: 'Capstone PCB fabrication & thermal sensor instrumentation', amount_cents: 80000 },
        ],
        milestones: [
          { term: 'Semester 1 Verified', text: 'Completed power electronics coursework with First-Class Honours standing (GPA 3.86 / 4.00).' },
          { term: 'Laboratory Prototype', text: 'Bench-tested 48V solar inverter & thermal controller at the campus energy lab.' },
          { term: 'Thesis Defense Target', text: 'Full field demonstration & B.Sc. graduation defense scheduled for June 2027.' },
        ],
      },
      {
        slug: 'david-okonkwo-soil-resilience',
        student_user_id: davidStudentId,
        student_name: 'David Okonkwo',
        age: 23,
        university: 'University of Ibadan',
        program: 'B.Agric. Soil Science & Sustainable Agronomy',
        year_label: 'Year 5 of 5 · Field Thesis',
        location: 'Ibadan, Nigeria',
        category: 'Agriculture & Climate',
        title: 'Final-year agronomy tuition & biochar soil-moisture trials',
        summary:
          'Funding final session registration, analytical soil laboratory assays, and rural extension trials testing cassava-husk biochar water retention.',
        story:
          'Unpredictable dry spells have made planting calendars increasingly difficult for smallholder growers across southern and central Nigeria. Over the past two academic sessions in the Department of Agronomy, I have formulated agricultural waste biochar amendments that help sandy-loam soils retain 28% more root-zone moisture between rainfall events.\n\nThis sponsorship covers my final academic session fees, spectrophotometer nutrient runs at the university laboratory, and field extension handbooks shared directly with partner farming cooperatives.',
        quote: 'Healthy soil holds water, protects harvests, and keeps rural communities thriving.',
        goal_cents: 310000,
        raised_cents: 245000,
        supporter_count: 29,
        portrait_url: '/images/david-okonkwo.jpg',
        verified: 1,
        featured: 1,
        status: 'active',
        tuition_items: [
          { label: 'Final academic session university tuition & faculty dues', amount_cents: 165000 },
          { label: 'Spectrophotometer soil chemistry & moisture retention assays', amount_cents: 85000 },
          { label: 'Field demonstration plots & grower extension guide printing', amount_cents: 60000 },
        ],
        milestones: [
          { term: 'Controlled Field Trials', text: 'Established 12 replicated biochar vs. control plots at the teaching research farm.' },
          { term: 'Laboratory Phase', text: 'Completed cation-exchange capacity & moisture retention curve measurements.' },
          { term: 'Grower Extension Day', text: 'Hosting open field workshop for 40 cooperative farmers prior to graduation.' },
        ],
      },
      {
        slug: 'mateo-delgado-rural-nursing',
        student_user_id: null,
        student_name: 'Mateo Delgado',
        age: 24,
        university: 'Universidad de Antioquia',
        program: 'B.S.N. Community & Maternal Health Nursing',
        year_label: 'Year 4 of 4 · Clinical Practicum',
        location: 'Medellín, Colombia',
        category: 'Health & Nursing',
        title: 'Clinical rotation fees, diagnostic kit & nursing licensure exam',
        summary:
          'Supporting final clinical practicum transport, maternal-care diagnostic equipment, and national nursing board registration.',
        story:
          'Before entering nursing school, I served two years as a primary health outreach coordinator in mountain municipalities outside Medellín. Witnessing how early prenatal screening prevents life-threatening complications inspired my commitment to rural maternal health nursing.\n\nWith 420 supervised clinical hours already completed, this final semester requires full-time hospital and rural clinic rotations alongside my diagnostic kit and national licensing examination.',
        quote: 'Preventive care begins when a clinician takes twenty unhurried minutes to listen.',
        goal_cents: 350000,
        raised_cents: 289000,
        supporter_count: 34,
        portrait_url: '/images/mateo-delgado.jpg',
        verified: 1,
        featured: 1,
        status: 'active',
        tuition_items: [
          { label: 'Final clinical semester tuition & hospital clinical insurance', amount_cents: 190000 },
          { label: 'Rural primary clinic rotation transport & clinical uniforms', amount_cents: 95000 },
          { label: 'Diagnostic kit & national nursing licensure examination fee', amount_cents: 65000 },
        ],
        milestones: [
          { term: 'Obstetrics Rotation', text: 'Completed 420 clinical practicum hours with faculty distinction.' },
          { term: 'Rural Health Placement', text: 'Assigned to six-week municipal maternal care clinic rotation.' },
          { term: 'Board Certification', text: 'Registered for national nursing licensure examination upon graduation.' },
        ],
      },
      {
        slug: 'linh-nguyen-assistive-computing',
        student_user_id: null,
        student_name: 'Linh Nguyen',
        age: 21,
        university: 'University of Da Nang',
        program: 'B.Sc. Computer Science & Human-Centered Computing',
        year_label: 'Year 3 of 4 · Honours Track',
        location: 'Da Nang, Vietnam',
        category: 'Computer Science',
        title: 'Honours tuition & Vietnamese STEM screen-reader accessibility tools',
        summary:
          'Covering third-year Computer Science tuition and acoustic model compute to help visually impaired students read mathematical notation aloud.',
        story:
          'My younger cousin reads Braille fluently yet encountered barriers whenever secondary STEM textbooks presented scanned equations that screen readers skipped completely. That challenge led me to specialize in human-computer interaction and assistive audio computing.\n\nWith two fellow researchers, I developed an open-source parser that translates LaTeX and MathML formulas into natural spoken Vietnamese phrasing, currently piloted across three inclusive secondary schools.',
        quote: 'Educational technology only succeeds when every learner can read the page equally.',
        goal_cents: 280000,
        raised_cents: 196000,
        supporter_count: 26,
        portrait_url: '/images/linh-nguyen.jpg',
        verified: 1,
        featured: 0,
        status: 'active',
        tuition_items: [
          { label: 'Third-year Honours Computer Science tuition & lab fee', amount_cents: 185000 },
          { label: 'Inclusive classroom usability sessions with partner schools', amount_cents: 55000 },
          { label: 'Acoustic speech synthesis training compute & hardware upgrade', amount_cents: 40000 },
        ],
        milestones: [
          { term: 'University Civic Award', text: 'Awarded First Prize in University Civic Software Innovation Showcase.' },
          { term: 'School Pilot', text: 'Active classroom evaluation with 18 visually impaired secondary students.' },
        ],
      },
      {
        slug: 'tariq-al-mansoor-math-education',
        student_user_id: null,
        student_name: 'Tariq Al-Mansoor',
        age: 23,
        university: 'University of Jordan',
        program: 'B.Ed. Secondary Mathematics & STEM Pedagogy',
        year_label: 'Year 4 of 4 · Student Teaching',
        location: 'Amman, Jordan',
        category: 'Education & Teaching',
        title: 'Teaching certification semester & tactile geometry classroom kits',
        summary:
          'Funding final B.Ed. certification credit hours and open-access visual geometry kits for public middle-school classrooms.',
        story:
          'Too many middle-school students lose confidence in mathematics because abstract theorems are introduced without physical intuition. Over the last three semesters I have led after-school geometry workshops using paper folding, surveying cord, and visual proofs.\n\nCompleting this final certification term covers my remaining credit hours and prints open-license workbook kits that remain permanently with my placement school.',
        quote: 'One dedicated mathematics teacher can transform how hundreds of young people see their potential.',
        goal_cents: 260000,
        raised_cents: 158000,
        supporter_count: 21,
        portrait_url: '/images/tariq-al-mansoor.jpg',
        verified: 1,
        featured: 0,
        status: 'active',
        tuition_items: [
          { label: 'Final B.Ed. semester tuition & teaching practicum credits', amount_cents: 170000 },
          { label: 'Placement school commuting & educator licensing dossier', amount_cents: 50000 },
          { label: 'Tactile classroom geometry manipulatives & printed workbooks', amount_cents: 40000 },
        ],
        milestones: [
          { term: 'Dean’s Honour Roll', text: 'Achieved top decile standing across all STEM pedagogy modules.' },
          { term: 'Practicum Classroom', text: 'Leading two Grade 8 mathematics sections under faculty mentorship.' },
        ],
      },
      {
        slug: 'hannah-lindqvist-civic-timber-housing',
        student_user_id: null,
        student_name: 'Hannah Lindqvist',
        age: 25,
        university: 'Chalmers University of Technology',
        program: 'M.Arch. Sustainable Timber & Cooperative Housing',
        year_label: 'Year 2 of 2 · Master’s Thesis',
        location: 'Gothenburg, Sweden',
        category: 'Architecture & Design',
        title: 'Modular cross-laminated timber student housing structural thesis',
        summary:
          'Fully funded scholarship campaign covering structural testing lab hours and full-scale reversible timber joinery prototypes.',
        story:
          'After three years working as a structural carpentry apprentice before becoming the first in my family to attend university, I focus on low-carbon modular student housing. My master’s thesis tests reversible birch-and-CLT connectors that allow affordable student residences to be assembled rapidly and adapted across generations.\n\nWith full support from 47 sponsors, all structural laboratory testing and full-scale joinery assemblies are completely funded.',
        quote: 'Civic architecture for students deserves craftsmanship built to endure for a century.',
        goal_cents: 390000,
        raised_cents: 390000,
        supporter_count: 47,
        portrait_url: '/images/hannah-lindqvist.jpg',
        verified: 1,
        featured: 0,
        status: 'funded',
        tuition_items: [
          { label: 'Structural fabrication workshop & load-testing laboratory hours', amount_cents: 195000 },
          { label: 'Full-scale 1:5 reversible birch-dowel timber joinery mockups', amount_cents: 125000 },
          { label: 'Thesis monograph & open construction detail documentation', amount_cents: 70000 },
        ],
        milestones: [
          { term: 'Structural Testing', text: 'Passed shear and compression load testing at structural engineering lab.' },
          { term: '100% Funded', text: 'Full $3,900 thesis budget achieved through 47 individual sponsorships.' },
        ],
      },
    ]

    const insertCampaign = db.prepare(`
      INSERT INTO campaigns (
        slug, student_user_id, student_name, age, university, program, year_label, location, category,
        title, summary, story, quote, goal_cents, raised_cents, supporter_count,
        portrait_url, tuition_items_json, milestones_json, status, verified, featured
      ) VALUES (
        @slug, @student_user_id, @student_name, @age, @university, @program, @year_label, @location, @category,
        @title, @summary, @story, @quote, @goal_cents, @raised_cents, @supporter_count,
        @portrait_url, @tuition_items_json, @milestones_json, @status, @verified, @featured
      )
    `)

    const campaignIds = []
    for (const c of campaignsSeed) {
      const info = insertCampaign.run({
        slug: c.slug,
        student_user_id: c.student_user_id,
        student_name: c.student_name,
        age: c.age,
        university: c.university,
        program: c.program,
        year_label: c.year_label,
        location: c.location,
        category: c.category,
        title: c.title,
        summary: c.summary,
        story: c.story,
        quote: c.quote,
        goal_cents: c.goal_cents,
        raised_cents: c.raised_cents,
        supporter_count: c.supporter_count,
        portrait_url: c.portrait_url,
        tuition_items_json: JSON.stringify(c.tuition_items),
        milestones_json: JSON.stringify(c.milestones),
        status: c.status,
        verified: c.verified,
        featured: c.featured,
      })
      campaignIds.push(info.lastInsertRowid)
    }

    const insertDonation = db.prepare(`
      INSERT INTO donations (
        campaign_id, donor_user_id, donor_name, donor_email, is_anonymous,
        amount_cents, frequency, payment_method, payment_label, message, reference_code, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', ?))
    `)

    const donationsSeed = [
      [campaignIds[0], primarySponsorId, 'Marcus Vance', 'marcus.vance@scholarfund.org', 0, 20000, 'one_time', 'card', 'Visa •••• 4821', 'Wishing you a brilliant power-systems capstone defense, Amara!', 'SF-TXN-894120', '-2 hours'],
      [campaignIds[0], null, 'Dr. Kwesi Mensah-Bonsu', 'kmensah@alumni.org', 0, 12500, 'one_time', 'bank_transfer', 'Standard Chartered Wire', 'Proud to support practical renewable energy research at KNUST.', 'SF-TXN-893904', '-1 day'],
      [campaignIds[0], null, 'Anonymous Sponsor', '', 1, 7500, 'monthly', 'mobile_money', 'MTN MoMo Wallet', 'Keep pushing rural clean energy forward!', 'SF-TXN-893612', '-3 days'],
      [campaignIds[1], primarySponsorId, 'Marcus Vance', 'marcus.vance@scholarfund.org', 0, 15000, 'one_time', 'bank_transfer', 'GTBank Instant Transfer', 'Soil moisture research is vital for food security across West Africa.', 'SF-TXN-894015', '-5 hours'],
      [campaignIds[1], null, 'Engr. Ngozi Eze', 'ngozi.eze@agro.ng', 0, 10000, 'one_time', 'mobile_money', 'OPay Wallet', 'Cheering on your UI agronomy thesis!', 'SF-TXN-893780', '-2 days'],
      [campaignIds[2], primarySponsorId, 'Marcus Vance', 'marcus.vance@scholarfund.org', 0, 12500, 'monthly', 'digital_wallet', 'PayPal Verified', 'Thank you for dedicating your nursing career to rural maternal care.', 'SF-TXN-893950', '-16 hours'],
      [campaignIds[2], null, 'Claire Beaumont, RN', 'c.beaumont@health.org', 0, 10000, 'one_time', 'card', 'Mastercard •••• 9104', 'From one nurse to an incoming colleague—rural clinics need you!', 'SF-TXN-893811', '-1 day'],
      [campaignIds[3], null, 'Minh-Tam Tran', 'minhtam@tech.vn', 0, 10000, 'one_time', 'card', 'Visa •••• 3319', 'Accessible Vietnamese math tools will empower so many students.', 'SF-TXN-893501', '-4 days'],
      [campaignIds[4], null, 'Layla Haddad', 'layla@stem.jo', 0, 10000, 'one_time', 'digital_wallet', 'Apple Pay', 'Inspired teachers build the next generation of engineers.', 'SF-TXN-893422', '-5 days'],
      [campaignIds[5], primarySponsorId, 'Marcus Vance', 'marcus.vance@scholarfund.org', 0, 20000, 'one_time', 'card', 'Visa •••• 4821', 'Congratulations on achieving 100% of your structural timber thesis budget!', 'SF-TXN-893109', '-6 days'],
    ]

    for (const d of donationsSeed) {
      insertDonation.run(...d)
    }

    if (seedData && applicantKofiId && applicantSofiaId) {
      const insertApp = db.prepare(`
        INSERT INTO applications (
          student_user_id, student_name, age, university, program, year_label, location, category,
          title, summary, story, quote, goal_cents, tuition_items_json, portrait_url, status, admin_note
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `)

      insertApp.run(
        applicantKofiId,
        'Kofi Boateng',
        22,
        'University of Cape Coast',
        'B.Sc. Biomedical Laboratory Technology',
        'Year 4 of 4 · Clinical Internship',
        'Cape Coast, Ghana',
        'Health & Nursing',
        'Diagnostic hematology hospital practicum & final examination balance',
        'Covering final-semester university tuition and regional hospital laboratory internship fees.',
        'Over the past three years studying biomedical laboratory sciences, I have worked part-time preparing teaching slides in our faculty pathology lab. My final semester requires a full-time clinical rotation across regional hospital laboratories where rapid hematology and infectious-disease diagnostics guide patient treatment daily.',
        'Every accurate clinical treatment begins with precision at the laboratory bench.',
        295000,
        JSON.stringify([
          { label: 'Final semester university tuition & examination fee', amount_cents: 185000 },
          { label: 'Clinical rotation laboratory protective gear & diagnostic manual', amount_cents: 55000 },
          { label: 'Regional hospital clinical rotation commuting stipend', amount_cents: 55000 },
        ]),
        '/images/tariq-al-mansoor.jpg',
        'pending',
        ''
      )

      insertApp.run(
        applicantSofiaId,
        'Sofia Morales',
        23,
        'Universidad Nacional Mayor de San Marcos',
        'B.Sc. Environmental Engineering & Water Quality',
        'Year 5 of 5 · Thesis Term',
        'Lima, Peru',
        'Engineering & Technology',
        'High-altitude watershed biofiltration thesis & analytical reagent budget',
        'Funding ICP water-quality testing and graduation credits for community spring-water biofiltration research.',
        'Andean mountain communities rely on seasonal glacial streams whose mineral composition shifts rapidly across wet and dry months. My senior engineering thesis evaluates Moringa-seed and activated-quartz biofilters that village water committees can maintain locally.',
        'Clean drinking water must be verifiable by the community it serves.',
        320000,
        JSON.stringify([
          { label: 'Final thesis credit registration & graduation fee', amount_cents: 175000 },
          { label: 'ICP heavy-metal water laboratory sample analyses', amount_cents: 95000 },
          { label: 'Field sampling kits for three partner communities', amount_cents: 50000 },
        ]),
        '/images/linh-nguyen.jpg',
        'pending',
        ''
      )

      const insertAudit = db.prepare(`
        INSERT INTO audit_logs (actor_user_id, actor_email, actor_role, action, target_type, target_id, summary)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `)
      insertAudit.run(
        primaryAdminId,
        'admin@scholarfund.org',
        'admin',
        'system.initialized',
        'database',
        'sqlite-wal',
        'Initialized ScholarFund SQLite database with registrar-verified campaigns and audit ledger.'
      )
      insertAudit.run(
        applicantKofiId,
        'kofi.boateng@ucc.edu.gh',
        'student',
        'application.submitted',
        'application',
        '1',
        'Submitted sponsorship dossier: Diagnostic hematology hospital practicum ($2,950 USD).'
      )
      insertAudit.run(
        primarySponsorId,
        'marcus.vance@scholarfund.org',
        'donor',
        'sponsorship.completed',
        'campaign',
        String(campaignIds[0]),
        'Processed $200.00 USD Visa sponsorship for Amara Mensah (Ref SF-TXN-894120).'
      )
    }
  })

  tx()
}

module.exports = { initDatabase, DEFAULT_DB_PATH }
