import mongoose from 'mongoose';
import { faker } from '@faker-js/faker';
import { connectDatabase, disconnectDatabase } from './connection';
import { User, IUserDocument } from '../features/auth/user.model';
import { Lab, ILabDocument } from '../features/labs/lab.model';
import { Resource, IResourceDocument } from '../features/resources/resource.model';
import { Booking, IBookingDocument } from '../features/bookings/booking.model';
import { Inspection } from '../features/inspections/inspection.model';
import { Incident } from '../features/incidents/incident.model';
import { WaitlistEntry } from '../features/waitlist/waitlist.model';
import { auditService } from '../features/audit/audit.service';

export async function seedDatabase(options: { silent?: boolean } = {}) {
  const log = (msg: string) => {
    if (!options.silent) {
      console.log(`[Seed] ${msg}`);
    }
  };

  faker.seed(2026);

  log('Starting high-fidelity Faker-powered database seeding...');

  await connectDatabase();

  log('Clearing existing database collections...');
  const collections = mongoose.connection.collections;
  for (const name of Object.keys(collections)) {
    await collections[name].deleteMany({});
  }

  const now = new Date();
  const oneYearFromNow = new Date(now.getTime() + 365 * 24 * 60 * 60 * 1000);
  const passwordPlain = 'Password123!';

  log('Seeding 5 core demo personas with password "Password123!"...');

  const studentPersona = new User({
    name: 'Alex Mercer',
    email: 'student@university.edu',
    passwordHash: passwordPlain,
    role: 'STUDENT',
    department: 'Physics',
    trustScore: 88,
    reputationPoints: 88,
    weeklyQuotaLimitHours: 12,
    weeklyQuotaUsedHours: 4,
    certifications: [
      { certCode: 'CERT-LASER-SAFETY-L1', name: 'Laser Safety Level 1', issuedAt: now, expiresAt: oneYearFromNow },
      { certCode: 'CERT-CLEANROOM-L1', name: 'Cleanroom Protocol Level 1', issuedAt: now, expiresAt: oneYearFromNow },
      { certCode: 'CERT-AFM-SPM-L1', name: 'Atomic Force Microscopy Operator', issuedAt: now, expiresAt: oneYearFromNow },
    ],
    safetyTrainingsCompleted: ['SAFETY-101', 'HAZMAT-101'],
    isActive: true,
  });
  await studentPersona.save();

  const researcherPersona = new User({
    name: 'Dr. Elena Rostova',
    email: 'researcher@university.edu',
    passwordHash: passwordPlain,
    role: 'RESEARCHER',
    department: 'Materials Science',
    trustScore: 94,
    reputationPoints: 94,
    weeklyQuotaLimitHours: 25,
    weeklyQuotaUsedHours: 14,
    certifications: [
      { certCode: 'CERT-LASER-SAFETY-L2', name: 'Laser Safety Level 2', issuedAt: now, expiresAt: oneYearFromNow },
      { certCode: 'CERT-SEM-TEM-ADV', name: 'Advanced Electron Microscopy Specialist', issuedAt: now, expiresAt: oneYearFromNow },
      { certCode: 'CERT-RADIATION-L1', name: 'Radiation Safety Level 1', issuedAt: now, expiresAt: oneYearFromNow },
      { certCode: 'CERT-CLEANROOM-L2', name: 'Advanced Cleanroom Nanofabrication', issuedAt: now, expiresAt: oneYearFromNow },
    ],
    safetyTrainingsCompleted: ['SAFETY-101', 'HAZMAT-101', 'RADIATION-201', 'CRYO-101'],
    isActive: true,
  });
  await researcherPersona.save();

  const ownerPersona = new User({
    name: 'Prof. Marcus Vance',
    email: 'owner@university.edu',
    passwordHash: passwordPlain,
    role: 'RESOURCE_OWNER',
    department: 'Physics',
    trustScore: 98,
    reputationPoints: 98,
    weeklyQuotaLimitHours: 40,
    weeklyQuotaUsedHours: 6,
    certifications: [
      { certCode: 'CERT-SAFETY-MASTER', name: 'Institutional Master Safety Certification', issuedAt: now, expiresAt: oneYearFromNow },
    ],
    safetyTrainingsCompleted: ['SAFETY-101', 'HAZMAT-101', 'PI-COMPLIANCE-301'],
    isActive: true,
  });
  await ownerPersona.save();

  const managerPersona = new User({
    name: 'Dr. Sarah Jenkins',
    email: 'manager@university.edu',
    passwordHash: passwordPlain,
    role: 'LAB_MANAGER',
    department: 'Materials Science',
    trustScore: 100,
    reputationPoints: 100,
    weeklyQuotaLimitHours: 40,
    weeklyQuotaUsedHours: 0,
    certifications: [
      { certCode: 'CERT-SAFETY-MASTER', name: 'Institutional Master Safety Certification', issuedAt: now, expiresAt: oneYearFromNow },
    ],
    safetyTrainingsCompleted: ['SAFETY-101', 'HAZMAT-101', 'INCIDENT-RESPONSE-401'],
    isActive: true,
  });
  await managerPersona.save();

  const adminPersona = new User({
    name: 'Chief Admin Arthur Pendelton',
    email: 'admin@university.edu',
    passwordHash: passwordPlain,
    role: 'ADMIN',
    department: 'Central Administration',
    trustScore: 100,
    reputationPoints: 100,
    weeklyQuotaLimitHours: 100,
    weeklyQuotaUsedHours: 0,
    certifications: [],
    safetyTrainingsCompleted: ['ADMIN-AUDIT-101'],
    isActive: true,
  });
  await adminPersona.save();

  await auditService.logEvent({
    action: 'SYSTEM_INITIALIZATION',
    actorId: adminPersona._id.toString(),
    actorRole: 'ADMIN',
    entityType: 'SYSTEM',
    entityId: 'GENESIS_BLOCK',
    metadata: {
      platform: 'UniShare Labs',
      version: '2.0.0-faker-enhanced',
      environment: 'University Sandbox Simulation',
      description: 'Genesis block initialized with cryptographic SHA-256 chaining',
    },
  });

  log('Generating 30+ realistic academic researchers, professors, and students with Faker...');

  const academicDepartments = [
    'Materials Science',
    'Physics',
    'Biomedical Engineering',
    'Mechanical Engineering',
    'Chemical Engineering',
    'Electrical & Computer Engineering',
    'Quantum Information & Nanotechnology',
    'Biochemistry',
  ];

  const certificationCatalog = [
    { certCode: 'CERT-LASER-SAFETY-L1', name: 'Laser Safety Level 1' },
    { certCode: 'CERT-LASER-SAFETY-L2', name: 'Laser Safety Level 2' },
    { certCode: 'CERT-CLEANROOM-L1', name: 'Cleanroom Protocol Level 1' },
    { certCode: 'CERT-CLEANROOM-L2', name: 'Advanced Cleanroom Nanofabrication' },
    { certCode: 'CERT-SEM-TEM-ADV', name: 'Advanced Electron Microscopy Specialist' },
    { certCode: 'CERT-AFM-SPM-L1', name: 'Atomic Force Microscopy Operator' },
    { certCode: 'CERT-NMR-600-L1', name: '600 MHz NMR Operator' },
    { certCode: 'CERT-LCMS-BIO-L1', name: 'High Resolution LC/MS Specialist' },
    { certCode: 'CERT-CNC-MILL-L1', name: 'CNC Milling Certified' },
    { certCode: 'CERT-3D-DMLS-L1', name: 'Industrial Additive Manufacturing' },
    { certCode: 'CERT-WATERJET-L1', name: 'Abrasive Waterjet Operator' },
    { certCode: 'CERT-RADIATION-L1', name: 'Radiation Safety Level 1' },
    { certCode: 'CERT-CRYO-101', name: 'Cryogenic Liquid Handling' },
    { certCode: 'CERT-BIO-SAFETY-L2', name: 'Biosafety Level 2 Containment' },
  ];

  const allStudents: IUserDocument[] = [studentPersona];
  const allResearchers: IUserDocument[] = [researcherPersona];
  const allOwners: IUserDocument[] = [ownerPersona];
  const allManagers: IUserDocument[] = [managerPersona];
  const allUsers: IUserDocument[] = [studentPersona, researcherPersona, ownerPersona, managerPersona, adminPersona];

  const userRolesConfig: Array<{ role: 'STUDENT' | 'RESEARCHER' | 'RESOURCE_OWNER' | 'LAB_MANAGER'; count: number }> = [
    { role: 'STUDENT', count: 14 },
    { role: 'RESEARCHER', count: 10 },
    { role: 'RESOURCE_OWNER', count: 4 },
    { role: 'LAB_MANAGER', count: 3 },
  ];

  const usedEmails = new Set<string>([
    'student@university.edu',
    'researcher@university.edu',
    'owner@university.edu',
    'manager@university.edu',
    'admin@university.edu',
  ]);

  for (const config of userRolesConfig) {
    for (let i = 0; i < config.count; i++) {
      const firstName = faker.person.firstName();
      const lastName = faker.person.lastName();
      const department = faker.helpers.arrayElement(academicDepartments);
      
      let email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}@university.edu`;
      let disambiguator = 1;
      while (usedEmails.has(email)) {
        email = `${firstName.toLowerCase()}.${lastName.toLowerCase()}${disambiguator}@university.edu`;
        disambiguator++;
      }
      usedEmails.add(email);

      let fullName = `${firstName} ${lastName}`;
      if (config.role === 'RESOURCE_OWNER') {
        fullName = `Prof. ${firstName} ${lastName}`;
      } else if (config.role === 'RESEARCHER' || config.role === 'LAB_MANAGER') {
        fullName = `Dr. ${firstName} ${lastName}`;
      }

      const certCount = config.role === 'STUDENT' ? faker.number.int({ min: 1, max: 2 }) : faker.number.int({ min: 2, max: 4 });
      const userCerts = faker.helpers.arrayElements(certificationCatalog, certCount).map((c) => ({
        certCode: c.certCode,
        name: c.name,
        issuedAt: faker.date.recent({ days: 120 }),
        expiresAt: faker.date.future({ years: 1 }),
      }));

      const trainings = ['SAFETY-101'];
      if (userCerts.some((c) => c.certCode.includes('CLEANROOM'))) trainings.push('HAZMAT-101');
      if (userCerts.some((c) => c.certCode.includes('RADIATION'))) trainings.push('RADIATION-201');
      if (userCerts.some((c) => c.certCode.includes('CRYO'))) trainings.push('CRYO-101');

      const quotaLimits = {
        STUDENT: 12,
        RESEARCHER: 25,
        RESOURCE_OWNER: 40,
        LAB_MANAGER: 40,
      };

      const newUser = new User({
        name: fullName,
        email,
        passwordHash: passwordPlain,
        role: config.role,
        department,
        trustScore: faker.number.int({ min: 72, max: 99 }),
        reputationPoints: faker.number.int({ min: 70, max: 100 }),
        weeklyQuotaLimitHours: quotaLimits[config.role],
        weeklyQuotaUsedHours: faker.number.int({ min: 0, max: Math.floor(quotaLimits[config.role] * 0.7) }),
        certifications: userCerts,
        safetyTrainingsCompleted: trainings,
        isActive: true,
      });

      const savedUser = await newUser.save();
      allUsers.push(savedUser);

      if (config.role === 'STUDENT') allStudents.push(savedUser);
      else if (config.role === 'RESEARCHER') allResearchers.push(savedUser);
      else if (config.role === 'RESOURCE_OWNER') allOwners.push(savedUser);
      else if (config.role === 'LAB_MANAGER') allManagers.push(savedUser);
    }
  }

  log(`Created ${allUsers.length} total university academic profiles across 8 research departments.`);

  log('Creating 6 multi-department research facilities and core centers...');

  const defaultHours = {
    dailyStartTime: '08:00',
    dailyEndTime: '20:00',
    allowedDays: [1, 2, 3, 4, 5, 6],
  };

  const labDefs = [
    {
      name: 'Nanotech Cleanroom & Microfabrication Core',
      code: 'LAB-NANO-01',
      institution: 'University Institute of Technology & Research',
      department: 'Materials Science',
      building: 'Engineering Hall B',
      room: 'Cleanroom Suite 100',
      safetyOfficerId: managerPersona._id,
      contactEmail: 'cleanroom@university.edu',
      operationalHours: defaultHours,
      certificationsSupported: ['CERT-CLEANROOM-L1', 'CERT-CLEANROOM-L2'],
      capacity: 15,
      safetyLevel: 'LEVEL_3_RESTRICTED' as const,
      description: 'ISO Class 5/6 cleanroom bay with wet benches, direct-write laser lithography, and ICP etching.',
    },
    {
      name: 'Advanced Electron Microscopy & Imaging Center',
      code: 'LAB-AEMC-02',
      institution: 'University Institute of Technology & Research',
      department: 'Physics',
      building: 'Physical Sciences Complex',
      room: 'Basement Vibration-Isolated Suite 042',
      safetyOfficerId: managerPersona._id,
      contactEmail: 'microscopy@university.edu',
      operationalHours: defaultHours,
      certificationsSupported: ['CERT-SEM-TEM-ADV', 'CERT-LASER-SAFETY-L2'],
      capacity: 10,
      safetyLevel: 'LEVEL_2_SUPERVISED' as const,
      description: 'Ultra-low vibration, acoustically isolated facility housing FE-SEM, DualBeam FIB, and aberration-corrected TEM.',
    },
    {
      name: 'Robotics & Advanced Prototyping Makerspace',
      code: 'LAB-ROBOT-03',
      institution: 'University Institute of Technology & Research',
      department: 'Mechanical Engineering',
      building: 'Innovation Pavilion',
      room: 'Workshop Floor 1',
      safetyOfficerId: allManagers[1]?._id || managerPersona._id,
      contactEmail: 'makerspace@university.edu',
      operationalHours: { dailyStartTime: '08:00', dailyEndTime: '22:00', allowedDays: [1, 2, 3, 4, 5, 6, 7] },
      certificationsSupported: ['CERT-CNC-MILL-L1', 'CERT-3D-DMLS-L1'],
      capacity: 35,
      safetyLevel: 'LEVEL_1_GENERAL' as const,
      description: 'High-speed 5-axis CNC machining centers, selective laser sintering metal 3D printers, and composite curing ovens.',
    },
    {
      name: 'Bio-Spectrometry & Nuclear Magnetic Resonance Lab',
      code: 'LAB-BIOSPEC-04',
      institution: 'University Institute of Technology & Research',
      department: 'Biochemistry',
      building: 'Life Sciences Institute',
      room: 'NMR Wing Suite 215',
      safetyOfficerId: managerPersona._id,
      contactEmail: 'spectrometry@university.edu',
      operationalHours: defaultHours,
      certificationsSupported: ['CERT-NMR-600-L1', 'CERT-RADIATION-L1'],
      capacity: 12,
      safetyLevel: 'LEVEL_2_SUPERVISED' as const,
      description: 'High-field 600 MHz superconducting NMR spectrometer and tandem quadrupole time-of-flight LC/MS.',
    },
    {
      name: 'Quantum Optics & Ultrafast Laser Facility',
      code: 'LAB-QOPT-05',
      institution: 'University Institute of Technology & Research',
      department: 'Quantum Information & Nanotechnology',
      building: 'Photonics Research Tower',
      room: 'Class 4 Laser Enclosure 305',
      safetyOfficerId: allManagers[2]?._id || managerPersona._id,
      contactEmail: 'quantumoptics@university.edu',
      operationalHours: defaultHours,
      certificationsSupported: ['CERT-LASER-SAFETY-L2', 'CERT-CRYO-101'],
      capacity: 8,
      safetyLevel: 'LEVEL_3_RESTRICTED' as const,
      description: 'Ti:Sapphire femtosecond pulse oscillators, optical parametric amplifiers, and cryofree superconducting magnets.',
    },
    {
      name: 'Precision Heavy Machining & Waterjet Facility',
      code: 'LAB-PREC-06',
      institution: 'University Institute of Technology & Research',
      department: 'Mechanical Engineering',
      building: 'Heavy Engineering Annex',
      room: 'High Bay 12',
      safetyOfficerId: allManagers[1]?._id || managerPersona._id,
      contactEmail: 'heavymachining@university.edu',
      operationalHours: defaultHours,
      certificationsSupported: ['CERT-CNC-MILL-L1', 'CERT-WATERJET-L1'],
      capacity: 18,
      safetyLevel: 'LEVEL_2_SUPERVISED' as const,
      description: 'Abrasive waterjet cutting, 4-axis heavy horizontal CNC machining, and aerospace alloy cutting stations.',
    },
  ];

  const createdLabs: ILabDocument[] = [];
  for (const def of labDefs) {
    const lab = new Lab(def);
    const saved = await lab.save();
    createdLabs.push(saved);
  }

  log(`Created ${createdLabs.length} core university laboratory facilities.`);

  const labCleanroom = createdLabs[0];
  const labMicroscopy = createdLabs[1];
  const labMakerspace = createdLabs[2];
  const labBioSpec = createdLabs[3];
  const labQuantum = createdLabs[4];
  const labPrecision = createdLabs[5];

  log('Creating 28 advanced research instruments across all categories...');

  const calendarTemplate = {
    dailyStartTime: '08:00',
    dailyEndTime: '20:00',
    allowedDays: [1, 2, 3, 4, 5, 6],
    slotGranularityMinutes: 30,
    minDurationMinutes: 30,
    maxDurationMinutes: 240,
    bufferTimeMinutes: 15,
    advanceBookingDaysMax: 14,
    leadTimeMinutesMin: 60,
  };

  const instrumentsData: any[] = [
    {
      title: 'FEI Helios G4 UC DualBeam SEM/FIB',
      code: 'RES-SEM-001',
      category: 'MICROSCOPES',
      department: 'Physics',
      labLocation: 'Physical Sciences Complex - Room 042A',
      labId: labMicroscopy._id,
      ownerId: ownerPersona._id,
      hourlyRate: 85,
      safetyLevel: 'LEVEL_2_SUPERVISED',
      approvalMode: 'MANUAL_REVIEW',
      capacity: 2,
      leadTimeHours: 2,
      bufferMinutes: 15,
      cooldownMinutes: 30,
      description: 'Sub-nanometer resolution field emission SEM integrated with Ga+ focused ion beam for cross-sectioning and nanofabrication.',
      specs: { resolution: '0.6 nm at 15 kV', accelerationVoltage: '200 V - 30 kV', detectorSuite: 'Elstar In-lens SE/BSE, EDAX Octane Elite' },
      checklistItems: [
        { itemId: 'chk-vac', itemText: 'Confirm specimen chamber vacuum < 2.0e-6 mbar', isCritical: true },
        { itemId: 'chk-beam', itemText: 'Verify electron gun filament emission stability', isCritical: true },
        { itemId: 'chk-gas', itemText: 'Check GIS precursor gas injection needle retraction', isCritical: false },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Ion Beam Source Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'operatingTemperature', label: 'Detector Cryo-Temp', unit: 'Celsius', meterType: 'GAUGE_VALUE' },
        { meterKey: 'spindleCycles', label: 'Stage Tilt Cycles', unit: 'cycles', meterType: 'CYCLE_COUNT' },
        { meterKey: 'runTimeSeconds', label: 'Beam On Time', unit: 'seconds', meterType: 'INCREMENTAL_COUNTER' },
      ],
      requiredCertifications: [{ certCode: 'CERT-SEM-TEM-ADV', name: 'Advanced Electron Microscopy Specialist' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: true,
    },
    {
      title: 'JEOL JEM-ARM200F Atomic Resolution TEM',
      code: 'RES-TEM-002',
      category: 'MICROSCOPES',
      department: 'Physics',
      labLocation: 'Physical Sciences Complex - Room 042B',
      labId: labMicroscopy._id,
      ownerId: ownerPersona._id,
      hourlyRate: 120,
      safetyLevel: 'LEVEL_3_RESTRICTED',
      approvalMode: 'MANUAL_REVIEW',
      capacity: 2,
      leadTimeHours: 4,
      bufferMinutes: 30,
      cooldownMinutes: 45,
      description: 'Spherical aberration-corrected analytical TEM achieving 78 picometer spatial resolution with dual EDS.',
      specs: { resolution: '78 pm STEM resolution', accelerationVoltage: '80 kV / 200 kV', correctors: 'CEOS ASCOR probe corrector' },
      checklistItems: [
        { itemId: 'chk-nitrogen', itemText: 'Liquid nitrogen cold trap topped off', isCritical: true },
        { itemId: 'chk-aperture', itemText: 'Objective aperture centered and clean', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'FEG Emission Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'operatingTemperature', label: 'Cold Finger Temp', unit: 'Kelvin', meterType: 'GAUGE_VALUE' },
        { meterKey: 'runTimeSeconds', label: 'High Voltage Uptime', unit: 'seconds', meterType: 'INCREMENTAL_COUNTER' },
      ],
      requiredCertifications: [{ certCode: 'CERT-SEM-TEM-ADV', name: 'Advanced Electron Microscopy Specialist' }],
      minRole: 'RESEARCHER',
      supervisorEndorsementRequired: true,
      projectGrantCodeRequired: true,
    },
    {
      title: 'Asylum Research MFP-3D Infinity Atomic Force Microscope',
      code: 'RES-AFM-003',
      category: 'MICROSCOPES',
      department: 'Materials Science',
      labLocation: 'Engineering Hall B - Room 104',
      labId: labCleanroom._id,
      ownerId: allOwners[1]?._id || ownerPersona._id,
      hourlyRate: 60,
      safetyLevel: 'LEVEL_1_GENERAL',
      approvalMode: 'AUTOMATIC',
      capacity: 2,
      leadTimeHours: 1,
      bufferMinutes: 15,
      cooldownMinutes: 15,
      description: 'Versatile AFM offering closed-loop nanopositioning for topography, nanomechanics, and conductive AFM.',
      specs: { scanRange: '90 um x 90 um x 16 um', noiseFloor: '< 20 pm deflection', modes: 'Contact, AC/Tapping, KPFM' },
      checklistItems: [
        { itemId: 'chk-laser-align', itemText: 'Photodiode 4-quadrant laser sum signal > 4.5 V', isCritical: true },
        { itemId: 'chk-isolation', itemText: 'Acoustic hood latched and vibration table floating', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'SLD Superluminescent Diode Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'spindleCycles', label: 'Piezo Tip Engagements', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-AFM-SPM-L1', name: 'Atomic Force Microscopy Operator' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },
    {
      title: 'Zeiss LSM 980 Airyscan 2 Confocal Super-Resolution Microscope',
      code: 'RES-CONFOCAL-004',
      category: 'MICROSCOPES',
      department: 'Biochemistry',
      labLocation: 'Life Sciences Institute - Room 112',
      labId: labBioSpec._id,
      ownerId: allOwners[2]?._id || ownerPersona._id,
      hourlyRate: 70,
      safetyLevel: 'LEVEL_2_SUPERVISED',
      approvalMode: 'AUTOMATIC',
      capacity: 2,
      leadTimeHours: 1,
      bufferMinutes: 15,
      cooldownMinutes: 15,
      description: 'Spectral laser scanning confocal microscope with Airyscan 2 area detector enabling 120 nm super-resolution multiplexing.',
      specs: { lasers: '405, 488, 561, 639 nm solid-state', resolution: '120 nm lateral, 350 nm axial', objectiveSet: '10x, 20x, 40x oil, 63x oil' },
      checklistItems: [
        { itemId: 'chk-laser-interlock', itemText: 'Laser safety interlock engaged on scan head', isCritical: true },
        { itemId: 'chk-oil-lens', itemText: 'Immersion oil cleaned from 63x objective lens', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Multi-Laser Source Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'runTimeSeconds', label: 'Frame Acquisition Time', unit: 'seconds', meterType: 'INCREMENTAL_COUNTER' },
      ],
      requiredCertifications: [{ certCode: 'CERT-LASER-SAFETY-L1', name: 'Laser Safety Level 1' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },
    {
      title: 'Leica TCS SP8 STED 3X Nanoscopy Platform',
      code: 'RES-STED-005',
      category: 'MICROSCOPES',
      department: 'Biochemistry',
      labLocation: 'Life Sciences Institute - Room 116',
      labId: labBioSpec._id,
      ownerId: allOwners[2]?._id || ownerPersona._id,
      hourlyRate: 90,
      safetyLevel: 'LEVEL_3_RESTRICTED',
      approvalMode: 'MANUAL_REVIEW',
      capacity: 2,
      leadTimeHours: 2,
      bufferMinutes: 20,
      cooldownMinutes: 30,
      description: 'Stimulated Emission Depletion (STED) super-resolution nanoscope breaking the diffraction limit below 40 nm.',
      specs: { stedLasers: '592 nm, 660 nm, 775 nm pulsed depletion', spatialResolution: '< 40 nm lateral', detectors: 'HyD photon counters' },
      checklistItems: [
        { itemId: 'chk-depletion-laser', itemText: '775 nm pulsed depletion laser chiller temperature stable', isCritical: true },
        { itemId: 'chk-immersion', itemText: 'Cover slip thickness verified (170 um standard)', isCritical: false },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Pulsed STED Laser Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'operatingTemperature', label: 'Chiller Temp', unit: 'Celsius', meterType: 'GAUGE_VALUE' },
      ],
      requiredCertifications: [{ certCode: 'CERT-LASER-SAFETY-L2', name: 'Laser Safety Level 2' }],
      minRole: 'RESEARCHER',
      supervisorEndorsementRequired: true,
      projectGrantCodeRequired: true,
    },

    {
      title: 'Heidelberg DWL 66+ Laser Lithography System',
      code: 'RES-LITHO-006',
      category: 'CLEANROOMS',
      department: 'Materials Science',
      labLocation: 'Engineering Hall B - Cleanroom Bay 100',
      labId: labCleanroom._id,
      ownerId: managerPersona._id,
      hourlyRate: 95,
      safetyLevel: 'LEVEL_3_RESTRICTED',
      approvalMode: 'MANUAL_REVIEW',
      capacity: 2,
      leadTimeHours: 2,
      bufferMinutes: 30,
      cooldownMinutes: 30,
      description: 'Direct-write diode laser lithography system for maskless photomasks and sub-micron direct substrate exposure.',
      specs: { minFeatureSize: '0.6 um', laserWavelength: '405 nm diode laser', substrateSize: 'Up to 200 x 200 mm' },
      checklistItems: [
        { itemId: 'chk-clean', itemText: 'Verify air shower and yellow lithography lighting active', isCritical: true },
        { itemId: 'chk-chuck', itemText: 'Vacuum chuck surface inspect for photoresist debris', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Diode Laser Run Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'operatingTemperature', label: 'Stage Thermal Enclosure', unit: 'Celsius', meterType: 'GAUGE_VALUE' },
        { meterKey: 'spindleCycles', label: 'Autofocus Actuations', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-CLEANROOM-L1', name: 'Cleanroom Protocol Level 1' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: true,
    },
    {
      title: 'Oxford Instruments PlasmaPro 100 Cobra ICP-Etcher',
      code: 'RES-ETCH-007',
      category: 'CLEANROOMS',
      department: 'Materials Science',
      labLocation: 'Engineering Hall B - Cleanroom Bay 100',
      labId: labCleanroom._id,
      ownerId: managerPersona._id,
      hourlyRate: 110,
      safetyLevel: 'LEVEL_3_RESTRICTED',
      approvalMode: 'MANUAL_REVIEW',
      capacity: 1,
      leadTimeHours: 3,
      bufferMinutes: 30,
      cooldownMinutes: 30,
      description: 'Inductively Coupled Plasma reactive ion etcher for deep silicon, GaN, and dielectric thin films.',
      specs: { rfPower: '3000 W ICP, 600 W bias', gases: 'Cl2, BCl3, SF6, C4F8, O2, Ar', chuckTemp: '-150 C to +400 C' },
      checklistItems: [
        { itemId: 'chk-scrubber', itemText: 'Verify toxic gas exhaust scrubbers online', isCritical: true },
        { itemId: 'chk-chamber', itemText: 'Base vacuum pressure < 5e-7 Torr confirmed', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'RF Generator Plasma Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'operatingTemperature', label: 'Backside Helium Cooling Temp', unit: 'Celsius', meterType: 'GAUGE_VALUE' },
        { meterKey: 'spindleCycles', label: 'Loadlock Gate Valve Cycles', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-CLEANROOM-L1', name: 'Cleanroom Protocol Level 1' }],
      minRole: 'RESEARCHER',
      supervisorEndorsementRequired: true,
      projectGrantCodeRequired: true,
    },
    {
      title: 'Suss MicroTec MA6/BA6 Contact Mask Aligner',
      code: 'RES-ALIGN-008',
      category: 'CLEANROOMS',
      department: 'Materials Science',
      labLocation: 'Engineering Hall B - Cleanroom Bay 102',
      labId: labCleanroom._id,
      ownerId: managerPersona._id,
      hourlyRate: 55,
      safetyLevel: 'LEVEL_2_SUPERVISED',
      approvalMode: 'AUTOMATIC',
      capacity: 2,
      leadTimeHours: 1,
      bufferMinutes: 15,
      cooldownMinutes: 15,
      description: 'Top- and bottom-side mask aligner offering sub-micron alignment accuracy for MEMS and microfluidics.',
      specs: { alignmentAccuracy: '0.5 um top side, 1.0 um bottom side', lampPower: '350 W UV broadband (g, h, i-line)' },
      checklistItems: [
        { itemId: 'chk-uv-shutter', itemText: 'UV lamp shutter calibration test passed', isCritical: true },
        { itemId: 'chk-nitrogen-purge', itemText: 'Purge gas pressure > 4 bar verified', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Mercury Arc Lamp Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'spindleCycles', label: 'Exposure Shutter Cycles', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-CLEANROOM-L1', name: 'Cleanroom Protocol Level 1' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },
    {
      title: 'Kurt J. Lesker LAB 18 Thin-Film E-Beam Evaporator',
      code: 'RES-EBEAM-009',
      category: 'CLEANROOMS',
      department: 'Materials Science',
      labLocation: 'Engineering Hall B - Cleanroom Bay 104',
      labId: labCleanroom._id,
      ownerId: managerPersona._id,
      hourlyRate: 85,
      safetyLevel: 'LEVEL_3_RESTRICTED',
      approvalMode: 'MANUAL_REVIEW',
      capacity: 2,
      leadTimeHours: 2,
      bufferMinutes: 30,
      cooldownMinutes: 30,
      description: 'High vacuum multi-pocket electron beam deposition system for precious metal contact pads (Au, Ti, Pt, Al, Ni).',
      specs: { pocketCarousel: '6 x 15cc rotary hearth', highVoltage: '10 kV e-gun power', baseVacuum: '< 1e-7 Torr' },
      checklistItems: [
        { itemId: 'chk-cryo-pump', itemText: 'Cryopump temperature < 14 Kelvin confirmed', isCritical: true },
        { itemId: 'chk-target-inventory', itemText: 'Target crucible melt inventory logged', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'High Voltage Gun Uptime', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'operatingTemperature', label: 'Cryopump Array Temp', unit: 'Kelvin', meterType: 'GAUGE_VALUE' },
      ],
      requiredCertifications: [{ certCode: 'CERT-CLEANROOM-L1', name: 'Cleanroom Protocol Level 1' }],
      minRole: 'RESEARCHER',
      projectGrantCodeRequired: true,
    },
    {
      title: 'Oxford Instruments FlexAL Atomic Layer Deposition (ALD)',
      code: 'RES-ALD-010',
      category: 'CLEANROOMS',
      department: 'Materials Science',
      labLocation: 'Engineering Hall B - Cleanroom Bay 106',
      labId: labCleanroom._id,
      ownerId: managerPersona._id,
      hourlyRate: 90,
      safetyLevel: 'LEVEL_3_RESTRICTED',
      approvalMode: 'MANUAL_REVIEW',
      capacity: 1,
      leadTimeHours: 2,
      bufferMinutes: 30,
      cooldownMinutes: 30,
      description: 'Thermal and plasma-assisted atomic layer deposition for atomic-scale dielectric barriers (Al2O3, HfO2, TiO2).',
      specs: { plasmaSource: 'Remote ICP RF source', precursors: 'TMA, TDMAHf, TDMAT, H2O, O2 plasma', uniformity: '< 1% across 200 mm' },
      checklistItems: [
        { itemId: 'chk-precursor-weight', itemText: 'Precursor cylinder mass and bubbler valves checked', isCritical: true },
        { itemId: 'chk-exhaust-trap', itemText: 'Trapped byproduct filter pressure normal', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Chamber Heating Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'spindleCycles', label: 'Precursor Valve Pulses', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-CLEANROOM-L2', name: 'Advanced Cleanroom Nanofabrication' }],
      minRole: 'RESEARCHER',
      supervisorEndorsementRequired: true,
      projectGrantCodeRequired: true,
    },
    {
      title: 'DektakXT Stylus Profilometer & Surface Metrology',
      code: 'RES-METRO-011',
      category: 'CLEANROOMS',
      department: 'Materials Science',
      labLocation: 'Engineering Hall B - Metrology Suite 108',
      labId: labCleanroom._id,
      ownerId: managerPersona._id,
      hourlyRate: 35,
      safetyLevel: 'LEVEL_1_GENERAL',
      approvalMode: 'AUTOMATIC',
      capacity: 2,
      leadTimeHours: 1,
      bufferMinutes: 10,
      cooldownMinutes: 10,
      description: 'Diamond stylus step height profiler offering angstrom-level thin-film thickness and surface stress verification.',
      specs: { verticalResolution: '0.1 nm (1 Angstrom)', scanLength: 'Up to 55 mm', stylusRadius: '2 um diamond' },
      checklistItems: [
        { itemId: 'chk-calibration-step', itemText: 'Scan standard silicon calibration step (100 nm)', isCritical: true },
      ],
      meters: [
        { meterKey: 'spindleCycles', label: 'Stylus Drops', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-CLEANROOM-L1', name: 'Cleanroom Protocol Level 1' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },

    {
      title: 'Bruker AVANCE III HD 600 MHz NMR Spectrometer',
      code: 'RES-NMR-012',
      category: 'SPECTROMETERS',
      department: 'Biochemistry',
      labLocation: 'Life Sciences Institute - Suite 215',
      labId: labBioSpec._id,
      ownerId: ownerPersona._id,
      hourlyRate: 75,
      safetyLevel: 'LEVEL_2_SUPERVISED',
      approvalMode: 'AUTOMATIC',
      capacity: 1,
      leadTimeHours: 1,
      bufferMinutes: 15,
      cooldownMinutes: 15,
      description: '14.1 Tesla actively shielded magnet equipped with 5mm triple-resonance Prodigy cryoprobe.',
      specs: { fieldStrength: '14.1 Tesla (600.13 MHz)', probe: '5mm TCI CryoProbe with z-gradients', autosampler: 'SampleJet 96-well' },
      checklistItems: [
        { itemId: 'chk-helium', itemText: 'Helium boil-off monitor normal (< 100 mL/day)', isCritical: true },
        { itemId: 'chk-spinner', itemText: 'NMR sample depth gauge confirmed before insertion', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Magnet System Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'operatingTemperature', label: 'Cryoprobe Cold Head Temp', unit: 'Kelvin', meterType: 'GAUGE_VALUE' },
        { meterKey: 'spindleCycles', label: 'Sample Ejections', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-NMR-600-L1', name: '600 MHz NMR Operator' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: true,
    },
    {
      title: 'Agilent 6545 Q-TOF LC/MS Liquid Chromatography',
      code: 'RES-LCMS-013',
      category: 'SPECTROMETERS',
      department: 'Biochemistry',
      labLocation: 'Life Sciences Institute - Suite 218',
      labId: labBioSpec._id,
      ownerId: ownerPersona._id,
      hourlyRate: 80,
      safetyLevel: 'LEVEL_2_SUPERVISED',
      approvalMode: 'AUTOMATIC',
      capacity: 1,
      leadTimeHours: 2,
      bufferMinutes: 20,
      cooldownMinutes: 20,
      description: 'Accurate-mass quadrupole time-of-flight LC/MS for untargeted metabolomics, lipidomics, and peptide mapping.',
      specs: { massAccuracy: '< 0.8 ppm RMS', massRange: 'm/z 20 to 10,000', ionization: 'Dual Jet Stream ESI' },
      checklistItems: [
        { itemId: 'chk-nitrogen-gen', itemText: 'Nitrogen generator delivery pressure > 90 psi', isCritical: true },
        { itemId: 'chk-waste', itemText: 'Solvent waste carboy level below 80% mark', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'TOF Vacuum Pump Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'spindleCycles', label: 'Autosampler Injections', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-RADIATION-L1', name: 'Radiation Safety Level 1' }],
      minRole: 'RESEARCHER',
      projectGrantCodeRequired: true,
    },
    {
      title: 'Thermo Fisher Nicolet iS50 Advanced FTIR Spectrometer',
      code: 'RES-FTIR-014',
      category: 'SPECTROMETERS',
      department: 'Chemical Engineering',
      labLocation: 'Life Sciences Institute - Suite 220',
      labId: labBioSpec._id,
      ownerId: allOwners[1]?._id || ownerPersona._id,
      hourlyRate: 40,
      safetyLevel: 'LEVEL_1_GENERAL',
      approvalMode: 'AUTOMATIC',
      capacity: 2,
      leadTimeHours: 1,
      bufferMinutes: 10,
      cooldownMinutes: 10,
      description: 'Fourier-transform infrared spectrometer with built-in diamond ATR, transmission, and NIR/Far-IR modules.',
      specs: { spectralRange: '15 to 27,000 cm-1', resolution: '0.09 cm-1', purge: 'Automated dry air purge' },
      checklistItems: [
        { itemId: 'chk-desiccant', itemText: 'Humidity indicator card within acceptable green range', isCritical: true },
        { itemId: 'chk-atr-crystal', itemText: 'Diamond ATR crystal inspected for solvent residue', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Interferometer HeNe Laser Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
      ],
      requiredCertifications: [],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },
    {
      title: 'Horiba LabRAM HR Evolution Confocal Raman Microscope',
      code: 'RES-RAMAN-015',
      category: 'SPECTROMETERS',
      department: 'Materials Science',
      labLocation: 'Physical Sciences Complex - Room 048',
      labId: labMicroscopy._id,
      ownerId: ownerPersona._id,
      hourlyRate: 65,
      safetyLevel: 'LEVEL_2_SUPERVISED',
      approvalMode: 'AUTOMATIC',
      capacity: 2,
      leadTimeHours: 1,
      bufferMinutes: 15,
      cooldownMinutes: 15,
      description: 'High resolution confocal Raman spectrometer featuring 532, 633, and 785 nm laser excitation for chemical imaging.',
      specs: { focalLength: '800 mm achromatic', spectralResolution: '0.35 cm-1', stage: 'SWIFT ultra-fast mapping' },
      checklistItems: [
        { itemId: 'chk-silicon-peak', itemText: 'Calibration verification on standard silicon (520.7 cm-1)', isCritical: true },
        { itemId: 'chk-laser-filter', itemText: 'Laser edge filter set matched to excitation wavelength', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Excitation Laser Run Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'spindleCycles', label: 'Grating Turret Rotations', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-LASER-SAFETY-L1', name: 'Laser Safety Level 1' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },
    {
      title: 'Bruker D8 ADVANCE Powder & Thin-Film XRD',
      code: 'RES-XRD-016',
      category: 'SPECTROMETERS',
      department: 'Materials Science',
      labLocation: 'Physical Sciences Complex - Room 052',
      labId: labMicroscopy._id,
      ownerId: ownerPersona._id,
      hourlyRate: 60,
      safetyLevel: 'LEVEL_2_SUPERVISED',
      approvalMode: 'AUTOMATIC',
      capacity: 2,
      leadTimeHours: 1,
      bufferMinutes: 15,
      cooldownMinutes: 15,
      description: 'High-resolution X-ray diffractometer equipped with Cu-target X-ray tube and LYNXEYE XE-T energy-dispersive detector.',
      specs: { xRaySource: 'Cu K-alpha (lambda = 1.5418 A), 3 kW', detector: 'LYNXEYE XE-T (energy resolution < 380 eV)', stage: '9-position carousel' },
      checklistItems: [
        { itemId: 'chk-xray-interlock', itemText: 'Verify radiation leaded glass enclosure door safety interlocks', isCritical: true },
        { itemId: 'chk-chiller-water', itemText: 'X-ray tube cooling water flow rate > 4.5 L/min', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'X-Ray Tube High Voltage Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'spindleCycles', label: 'Goniometer 2-Theta Sweeps', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-RADIATION-L1', name: 'Radiation Safety Level 1' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: true,
    },
    {
      title: 'Malvern Panalytical Zetasizer Nano ZS',
      code: 'RES-ZETA-017',
      category: 'SPECTROMETERS',
      department: 'Chemical Engineering',
      labLocation: 'Life Sciences Institute - Suite 222',
      labId: labBioSpec._id,
      ownerId: allOwners[2]?._id || ownerPersona._id,
      hourlyRate: 35,
      safetyLevel: 'LEVEL_1_GENERAL',
      approvalMode: 'AUTOMATIC',
      capacity: 2,
      leadTimeHours: 1,
      bufferMinutes: 10,
      cooldownMinutes: 10,
      description: 'Dynamic light scattering (DLS) analyzer for nanoparticle size, zeta potential, and molecular weight determination.',
      specs: { sizeRange: '0.3 nm to 10 um', zetaPotential: 'M3-PALS laser Doppler electrophoresis', laser: 'HeNe 633 nm' },
      checklistItems: [
        { itemId: 'chk-cuvette', itemText: 'Folded capillary zeta cell flushed with deionized water', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'HeNe Laser Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
      ],
      requiredCertifications: [],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },

    {
      title: 'Haas VF-2SS 5-Axis Super-Speed CNC Machining Center',
      code: 'RES-CNC-018',
      category: 'CNC_MACHINING',
      department: 'Mechanical Engineering',
      labLocation: 'Innovation Pavilion - Machine Bay 4',
      labId: labMakerspace._id,
      ownerId: ownerPersona._id,
      hourlyRate: 50,
      safetyLevel: 'LEVEL_2_SUPERVISED',
      approvalMode: 'AUTOMATIC',
      capacity: 2,
      leadTimeHours: 1,
      bufferMinutes: 15,
      cooldownMinutes: 15,
      description: 'High-speed vertical milling center with 12,000 RPM spindle and TRT160 dual-axis trunnion table.',
      specs: { travels: '762 x 406 x 508 mm', spindleSpeed: '12,000 RPM, 30 hp direct drive', toolChanger: '30+1 side-mount' },
      checklistItems: [
        { itemId: 'chk-coolant', itemText: 'Check coolant concentration (refractometer 8-10%)', isCritical: true },
        { itemId: 'chk-e-stop', itemText: 'Test physical Emergency Stop button engagement', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Spindle Total Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'spindleCycles', label: 'Tool Changes Completed', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-CNC-MILL-L1', name: 'CNC Milling Certified' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },
    {
      title: 'Datron M8Cube High-Speed Precision CNC Mill',
      code: 'RES-CNC-019',
      category: 'CNC_MACHINING',
      department: 'Mechanical Engineering',
      labLocation: 'Heavy Engineering Annex - High Bay 12',
      labId: labPrecision._id,
      ownerId: allOwners[3]?._id || ownerPersona._id,
      hourlyRate: 55,
      safetyLevel: 'LEVEL_2_SUPERVISED',
      approvalMode: 'AUTOMATIC',
      capacity: 2,
      leadTimeHours: 1,
      bufferMinutes: 15,
      cooldownMinutes: 15,
      description: 'Ultra-high-speed German CNC machining system running up to 60,000 RPM for micro-machining and thin sheet milling.',
      specs: { spindleSpeed: '60,000 RPM, 3 kW HSK-E 25', workArea: '1020 x 830 x 245 mm', clamping: 'Integrated vacuum table' },
      checklistItems: [
        { itemId: 'chk-vacuum-table', itemText: 'Vacuum clamping card seal inspected for leaks', isCritical: true },
        { itemId: 'chk-ethanol-coolant', itemText: 'Ethanol spray mist cooling reservoir level > 50%', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'High Speed Spindle Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'spindleCycles', label: 'Tool Changer Actuations', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-CNC-MILL-L1', name: 'CNC Milling Certified' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },
    {
      title: 'OMAX 55100 Precision Abrasive Waterjet Cutter',
      code: 'RES-WATERJET-020',
      category: 'CNC_MACHINING',
      department: 'Mechanical Engineering',
      labLocation: 'Heavy Engineering Annex - High Bay 12',
      labId: labPrecision._id,
      ownerId: allOwners[3]?._id || ownerPersona._id,
      hourlyRate: 65,
      safetyLevel: 'LEVEL_2_SUPERVISED',
      approvalMode: 'AUTOMATIC',
      capacity: 3,
      leadTimeHours: 1,
      bufferMinutes: 20,
      cooldownMinutes: 20,
      description: 'Direct-drive 50,000 PSI high-pressure abrasive waterjet table cutting any alloy up to 6 inches thick.',
      specs: { cuttingBed: '2540 x 1397 mm', pressure: '50,000 psi EnduroMAX pump', nozzle: 'A-Jet 5-axis taper compensation' },
      checklistItems: [
        { itemId: 'chk-garnet-hopper', itemText: '80-mesh garnet abrasive hopper filled', isCritical: true },
        { itemId: 'chk-water-level', itemText: 'Catcher tank submerged cutting water level verified', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Intensifier Pump Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'spindleCycles', label: 'Jet Pierce Cycles', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-WATERJET-L1', name: 'Abrasive Waterjet Operator' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },
    {
      title: 'Tormach 1100Mx High Precision CNC Mill with 4th Axis',
      code: 'RES-CNC-021',
      category: 'CNC_MACHINING',
      department: 'Mechanical Engineering',
      labLocation: 'Innovation Pavilion - Machine Bay 2',
      labId: labMakerspace._id,
      ownerId: ownerPersona._id,
      hourlyRate: 35,
      safetyLevel: 'LEVEL_1_GENERAL',
      approvalMode: 'AUTOMATIC',
      capacity: 2,
      leadTimeHours: 1,
      bufferMinutes: 10,
      cooldownMinutes: 10,
      description: 'Compact 10,000 RPM BT30 spindle milling station ideal for student mechanical engineering design projects.',
      specs: { travels: '457 x 279 x 413 mm', spindle: '10,000 RPM BT30 taper', rotary: 'Micro-stepping 4th axis rotary table' },
      checklistItems: [
        { itemId: 'chk-way-lube', itemText: 'Automatic way-oil lubrication reservoir checked', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Spindle Run Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
      ],
      requiredCertifications: [{ certCode: 'CERT-CNC-MILL-L1', name: 'CNC Milling Certified' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },

    {
      title: 'EOS M 290 Direct Metal Laser Sintering (DMLS) 3D Printer',
      code: 'RES-3D-DMLS-022',
      category: 'MAKERSPACE_3D_PRINTERS',
      department: 'Mechanical Engineering',
      labLocation: 'Innovation Pavilion - Workshop Floor 1',
      labId: labMakerspace._id,
      ownerId: ownerPersona._id,
      hourlyRate: 65,
      safetyLevel: 'LEVEL_2_SUPERVISED',
      approvalMode: 'AUTOMATIC',
      capacity: 3,
      leadTimeHours: 2,
      bufferMinutes: 20,
      cooldownMinutes: 30,
      description: 'Industrial metal additive manufacturing with 400 W fiber laser processing titanium, aluminum, and stainless steel.',
      specs: { buildVolume: '250 x 250 x 325 mm', laserType: 'Yb-fiber laser, 400 W', materials: 'Ti64, AlSi10Mg, 316L Stainless' },
      checklistItems: [
        { itemId: 'chk-argon', itemText: 'Argon inert atmosphere chamber O2 level < 100 ppm', isCritical: true },
        { itemId: 'chk-filter', itemText: 'Recirculating powder filtration system check', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Fiber Laser Run Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'operatingTemperature', label: 'Build Plate Heater Temp', unit: 'Celsius', meterType: 'GAUGE_VALUE' },
        { meterKey: 'spindleCycles', label: 'Recoater Blade Sweeps', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-3D-DMLS-L1', name: 'Industrial Additive Manufacturing' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },
    {
      title: 'Formlabs Form 4B Medical Stereolithography (SLA) 3D Printer',
      code: 'RES-3D-SLA-023',
      category: 'MAKERSPACE_3D_PRINTERS',
      department: 'Mechanical Engineering',
      labLocation: 'Innovation Pavilion - Rapid Prototyping Bay 2',
      labId: labMakerspace._id,
      ownerId: ownerPersona._id,
      hourlyRate: 30,
      safetyLevel: 'LEVEL_1_GENERAL',
      approvalMode: 'AUTOMATIC',
      capacity: 4,
      leadTimeHours: 1,
      bufferMinutes: 15,
      cooldownMinutes: 15,
      description: 'Next-generation masked SLA resin printer for biocompatible prototypes and rapid micro-fluidic molds.',
      specs: { buildVolume: '200 x 125 x 210 mm', layerThickness: '25 - 100 microns', lightSource: '405 nm Light Processing Unit 4' },
      checklistItems: [
        { itemId: 'chk-resin-tank', itemText: 'Inspect flexible resin tank bottom film for clouding', isCritical: true },
        { itemId: 'chk-build-platform', itemText: 'Clean and degrease quick-release build platform', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'LED Array Exposure Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'spindleCycles', label: 'Z-Axis Peeling Movements', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },
    {
      title: 'Stratasys Fortus 450mc Industrial FDM Production System',
      code: 'RES-3D-FDM-024',
      category: 'MAKERSPACE_3D_PRINTERS',
      department: 'Mechanical Engineering',
      labLocation: 'Innovation Pavilion - Rapid Prototyping Bay 1',
      labId: labMakerspace._id,
      ownerId: ownerPersona._id,
      hourlyRate: 45,
      safetyLevel: 'LEVEL_1_GENERAL',
      approvalMode: 'AUTOMATIC',
      capacity: 3,
      leadTimeHours: 1,
      bufferMinutes: 15,
      cooldownMinutes: 15,
      description: 'Production-grade high-temperature FDM printer processing ULTEM 9085, Antero 800NA PEKK, and carbon-filled nylon.',
      specs: { buildEnvelope: '406 x 355 x 406 mm', chamberTemp: 'Up to 225 C', materials: 'ULTEM 9085, Nylon 12CF, PC-ISO' },
      checklistItems: [
        { itemId: 'chk-oven-vacuum', itemText: 'Oven door seal and build sheet vacuum hold-down confirmed', isCritical: true },
        { itemId: 'chk-canisters', itemText: 'Filament canister drive bay purge and dry air dewpoint < -40 C', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Extrusion Head Run Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'operatingTemperature', label: 'Oven Chamber Temp', unit: 'Celsius', meterType: 'GAUGE_VALUE' },
      ],
      requiredCertifications: [],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },
    {
      title: 'Markforged Mark Two Continuous Carbon Fiber 3D Printer',
      code: 'RES-3D-CF-025',
      category: 'MAKERSPACE_3D_PRINTERS',
      department: 'Mechanical Engineering',
      labLocation: 'Innovation Pavilion - Rapid Prototyping Bay 3',
      labId: labMakerspace._id,
      ownerId: ownerPersona._id,
      hourlyRate: 35,
      safetyLevel: 'LEVEL_1_GENERAL',
      approvalMode: 'AUTOMATIC',
      capacity: 3,
      leadTimeHours: 1,
      bufferMinutes: 10,
      cooldownMinutes: 10,
      description: 'Dual-nozzle composite 3D printer laying continuous strands of high-strength carbon fiber, Kevlar, and fiberglass into Onyx matrix.',
      specs: { buildVolume: '320 x 132 x 154 mm', reinforcement: 'Continuous Carbon Fiber / Kevlar / HSHT Fiberglass', matrix: 'Onyx micro-carbon nylon' },
      checklistItems: [
        { itemId: 'chk-fiber-cutter', itemText: 'Fiber feed cutting blade actuation test', isCritical: true },
        { itemId: 'chk-bed-level', itemText: 'Laser bed scan routine verified prior to print', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Hotend Extrusion Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
      ],
      requiredCertifications: [],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },

    {
      title: 'Beckman Coulter Optima XPN-100 Preparative Ultracentrifuge',
      code: 'RES-CENT-026',
      category: 'GENERAL_LAB',
      department: 'Biochemistry',
      labLocation: 'Life Sciences Institute - Ground Floor Utility Bay',
      labId: labBioSpec._id,
      ownerId: allOwners[2]?._id || ownerPersona._id,
      hourlyRate: 30,
      safetyLevel: 'LEVEL_2_SUPERVISED',
      approvalMode: 'AUTOMATIC',
      capacity: 2,
      leadTimeHours: 1,
      bufferMinutes: 15,
      cooldownMinutes: 15,
      description: '100,000 RPM high-speed preparative ultracentrifuge generating 802,400 x g for nanoparticle and subcellular fraction isolation.',
      specs: { maxSpeed: '100,000 RPM', maxForce: '802,400 x g', rotors: 'Type 70 Ti fixed-angle, SW 41 Ti swinging bucket' },
      checklistItems: [
        { itemId: 'chk-rotor-balance', itemText: 'Analytical balance sample tube pairs balanced within 10 mg', isCritical: true },
        { itemId: 'chk-vacuum-ring', itemText: 'Chamber vacuum O-ring greased and debris-free', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Drive Vacuum Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'spindleCycles', label: 'Centrifuge Spin Cycles', unit: 'cycles', meterType: 'CYCLE_COUNT' },
      ],
      requiredCertifications: [{ certCode: 'CERT-BIO-SAFETY-L2', name: 'Biosafety Level 2 Containment' }],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },
    {
      title: 'Labconco FreeZone 4.5L -84°C Sub-Ambient Freeze Dryer',
      code: 'RES-FREEZE-027',
      category: 'GENERAL_LAB',
      department: 'Biochemistry',
      labLocation: 'Life Sciences Institute - Suite 224',
      labId: labBioSpec._id,
      ownerId: allOwners[2]?._id || ownerPersona._id,
      hourlyRate: 25,
      safetyLevel: 'LEVEL_1_GENERAL',
      approvalMode: 'AUTOMATIC',
      capacity: 4,
      leadTimeHours: 1,
      bufferMinutes: 10,
      cooldownMinutes: 10,
      description: 'Cascade refrigeration benchtop lyophilizer reaching -84 C for processing aqueous and organic solvent biological samples.',
      specs: { collectorTemp: '-84 C (-119 F)', iceCapacity: '4.5 Liters / 24 hours', dryingChamber: '12-port drying manifold with quick-valves' },
      checklistItems: [
        { itemId: 'chk-drain-line', itemText: 'Condenser drain plug closed and vacuum seal seated', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Refrigeration Compressor Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'operatingTemperature', label: 'Collector Coil Temp', unit: 'Celsius', meterType: 'GAUGE_VALUE' },
      ],
      requiredCertifications: [],
      minRole: 'STUDENT',
      projectGrantCodeRequired: false,
    },
    {
      title: 'Oxford TeslatronPT Cryofree Superconducting Magnet System',
      code: 'RES-CRYO-028',
      category: 'GENERAL_LAB',
      department: 'Quantum Information & Nanotechnology',
      labLocation: 'Photonics Research Tower - Enclosure 305',
      labId: labQuantum._id,
      ownerId: allOwners[0]?._id || ownerPersona._id,
      hourlyRate: 110,
      safetyLevel: 'LEVEL_3_RESTRICTED',
      approvalMode: 'MANUAL_REVIEW',
      capacity: 1,
      leadTimeHours: 4,
      bufferMinutes: 45,
      cooldownMinutes: 60,
      description: '14 Tesla cryogen-free superconducting magnet integrated with 1.5 K to 300 K variable temperature sample insert for quantum transport.',
      specs: { magneticField: '14 Tesla solenoidal', tempRange: '1.5 K to 300 K continuously variable', cooling: 'Pulse tube cryocooler' },
      checklistItems: [
        { itemId: 'chk-pulse-tube', itemText: 'Helium compressor water cooling flow and pulse tube pressure normal', isCritical: true },
        { itemId: 'chk-quench-detector', itemText: 'Superconducting magnet quench detector circuit active', isCritical: true },
      ],
      meters: [
        { meterKey: 'laserHours', label: 'Cryocooler Run Hours', unit: 'hours', meterType: 'INCREMENTAL_COUNTER' },
        { meterKey: 'operatingTemperature', label: 'VTI Sample Probe Temp', unit: 'Kelvin', meterType: 'GAUGE_VALUE' },
      ],
      requiredCertifications: [{ certCode: 'CERT-CRYO-101', name: 'Cryogenic Liquid Handling' }],
      minRole: 'RESEARCHER',
      supervisorEndorsementRequired: true,
      projectGrantCodeRequired: true,
    },
  ];

  const createdResources: IResourceDocument[] = [];
  for (const def of instrumentsData) {
    const res = new Resource({
      title: def.title,
      name: def.title,
      code: def.code,
      category: def.category,
      department: def.department,
      labLocation: def.labLocation,
      labId: def.labId,
      ownerId: def.ownerId,
      hourlyRate: def.hourlyRate,
      safetyLevel: def.safetyLevel,
      status: 'AVAILABLE',
      approvalMode: def.approvalMode,
      capacity: def.capacity,
      leadTimeHours: def.leadTimeHours,
      bufferMinutes: def.bufferMinutes,
      cooldownMinutes: def.cooldownMinutes,
      description: def.description,
      calendar: calendarTemplate,
      operatingHours: defaultHours,
      specifications: def.specs,
      customChecklists: {
        preUse: def.checklistItems.map((c: any) => ({ id: c.itemId, text: c.itemText, isCritical: c.isCritical })),
        postUse: [{ id: 'chk-shutdown', text: 'Clean work area and log out of instrument controller software', isCritical: true }],
      },
      inspectionConfig: {
        checklistItems: def.checklistItems,
        meters: def.meters || [],
        requirePhotos: true,
        maxPhotos: 4,
      },
      inspectionChecklist: def.checklistItems,
      prerequisites: {
        minRole: def.minRole || 'STUDENT',
        requiredCertifications: def.requiredCertifications || [],
        requiredSafetyTrainings: ['SAFETY-101'],
        supervisorEndorsementRequired: def.supervisorEndorsementRequired || false,
        projectGrantCodeRequired: def.projectGrantCodeRequired || false,
        requiresInduction: true,
        safetyAgreementRequired: true,
      },
      requiredCertifications: def.requiredCertifications || [],
      accessControl: { method: 'DIGITAL_PIN' },
    });
    const saved = await res.save();
    createdResources.push(saved);
  }

  log(`Created ${createdResources.length} research instruments across all categories.`);

  const semResource = createdResources.find((r) => r.code === 'RES-SEM-001')!;
  const temResource = createdResources.find((r) => r.code === 'RES-TEM-002')!;
  const lithoResource = createdResources.find((r) => r.code === 'RES-LITHO-006')!;
  const etchResource = createdResources.find((r) => r.code === 'RES-ETCH-007')!;
  const nmrResource = createdResources.find((r) => r.code === 'RES-NMR-012')!;
  const lcmsResource = createdResources.find((r) => r.code === 'RES-LCMS-013')!;
  const cncResource = createdResources.find((r) => r.code === 'RES-CNC-018')!;
  const dmlsResource = createdResources.find((r) => r.code === 'RES-3D-DMLS-022')!;
  const cryoResource = createdResources.find((r) => r.code === 'RES-CRYO-028')!;

  log('Generating 55+ bookings spanning all 10 lifecycle states with realistic university grants...');

  const grantCodes = [
    'NSF-DMR-2026-9912',
    'NIH-R01-GM14238',
    'DOE-SC-00213',
    'DARPA-CHIPS-4421',
    'NASA-AERO-2026',
    'AFOSR-FA9550-24',
    'ONR-N00014-25',
    'INTERNAL-SEED-8841',
  ];

  const researchTopics = [
    'Cross-sectional FIB milling and in-situ EDX analysis of perovskite solar cells.',
    'High resolution TEM lattice imaging of quantum dot heterostructures.',
    '1H and 13C 1D NMR characterization of synthesized asymmetric catalyst ligand.',
    'Deep reactive ion etching of silicon microfluidic droplet generation nozzles.',
    'Selective laser sintering of porous titanium bone scaffold implants.',
    'Super-resolution STED imaging of nuclear pore complexes in mammalian cells.',
    '5-axis CNC machining of aerospike nozzle test geometry in 6061-T6 aluminum.',
    'Low-temperature quantum Hall effect magnetotransport in graphene superlattices.',
    'Untargeted LC/MS metabolomic profiling of bacterial secondary metabolites.',
    'Sub-micron direct-write laser lithography of interdigital surface acoustic wave filters.',
    'Continuous carbon fiber reinforced structural bracket for autonomous rover suspension.',
    'Thin-film atomic layer deposition of 5 nm HfO2 high-k gate dielectrics.',
  ];

  const createdBookings: IBookingDocument[] = [];

  async function createBooking(data: any): Promise<IBookingDocument> {
    const booking = new Booking(data);
    const saved = await booking.save();
    createdBookings.push(saved);
    return saved;
  }

  for (let i = 0; i < 4; i++) {
    const user = allStudents[i % allStudents.length];
    const res = createdResources[(i * 3 + 2) % createdResources.length];
    await createBooking({
      resourceId: res._id,
      userId: user._id,
      startTime: new Date(now.getTime() + (24 + i * 12) * 3600 * 1000),
      endTime: new Date(now.getTime() + (26 + i * 12) * 3600 * 1000),
      durationMinutes: 120,
      status: 'DRAFT',
      intendedPurpose: faker.helpers.arrayElement(researchTopics),
      safetyAcknowledgement: true,
      supervisorEndorsed: false,
      allowWaitlist: true,
      bufferMinutes: 15,
    });
  }

  const bookingPendingSem = await createBooking({
    resourceId: semResource._id,
    userId: researcherPersona._id,
    startTime: new Date(now.getTime() + 24 * 3600 * 1000),
    endTime: new Date(now.getTime() + 27 * 3600 * 1000),
    durationMinutes: 180,
    status: 'PENDING_REVIEW',
    projectGrantCode: 'NSF-DMR-2026-9912',
    intendedPurpose: 'Cross-sectional FIB milling and in-situ EDX analysis of perovskite solar cells.',
    supervisorEmail: 'pi.vance@university.edu',
    supervisorEndorsed: true,
    safetyAcknowledgement: true,
    allowWaitlist: true,
    bufferMinutes: 15,
  });

  for (let i = 0; i < 7; i++) {
    const user = allResearchers[i % allResearchers.length];
    const res = createdResources[(i * 2 + 1) % createdResources.length];
    await createBooking({
      resourceId: res._id,
      userId: user._id,
      startTime: new Date(now.getTime() + (30 + i * 8) * 3600 * 1000),
      endTime: new Date(now.getTime() + (33 + i * 8) * 3600 * 1000),
      durationMinutes: 180,
      status: 'PENDING_REVIEW',
      projectGrantCode: faker.helpers.arrayElement(grantCodes),
      intendedPurpose: faker.helpers.arrayElement(researchTopics),
      supervisorEmail: 'pi.vance@university.edu',
      supervisorEndorsed: true,
      safetyAcknowledgement: true,
      allowWaitlist: true,
      bufferMinutes: 15,
    });
  }

  const bookingApprovedNmr = await createBooking({
    resourceId: nmrResource._id,
    userId: studentPersona._id,
    startTime: new Date(now.getTime() + 12 * 3600 * 1000),
    endTime: new Date(now.getTime() + 14 * 3600 * 1000),
    durationMinutes: 120,
    status: 'APPROVED',
    projectGrantCode: 'BIO-GR-8841',
    intendedPurpose: '1H and 13C 1D NMR characterization of synthesized asymmetric catalyst ligand.',
    safetyAcknowledgement: true,
    supervisorEndorsed: true,
    allowWaitlist: false,
    bufferMinutes: 15,
    reviewedBy: ownerPersona._id,
    reviewedAt: new Date(now.getTime() - 2 * 3600 * 1000),
    reviewNotes: 'Certified student operator with active research protocol.',
    accessPin: '4892',
  });

  for (let i = 0; i < 7; i++) {
    const user = allUsers[(i + 3) % allUsers.length];
    const res = createdResources[(i * 4 + 3) % createdResources.length];
    await createBooking({
      resourceId: res._id,
      userId: user._id,
      startTime: new Date(now.getTime() + (8 + i * 6) * 3600 * 1000),
      endTime: new Date(now.getTime() + (10 + i * 6) * 3600 * 1000),
      durationMinutes: 120,
      status: 'APPROVED',
      projectGrantCode: faker.helpers.arrayElement(grantCodes),
      intendedPurpose: faker.helpers.arrayElement(researchTopics),
      safetyAcknowledgement: true,
      supervisorEndorsed: true,
      allowWaitlist: false,
      bufferMinutes: 15,
      reviewedBy: managerPersona._id,
      reviewedAt: new Date(now.getTime() - (i + 1) * 3600 * 1000),
      reviewNotes: 'Prerequisites validated by facility manager.',
      accessPin: faker.string.numeric(4),
    });
  }

  const bookingWaitlistedSem = await createBooking({
    resourceId: semResource._id,
    userId: studentPersona._id,
    startTime: new Date(now.getTime() + 24 * 3600 * 1000),
    endTime: new Date(now.getTime() + 27 * 3600 * 1000),
    durationMinutes: 180,
    status: 'WAITLISTED',
    intendedPurpose: 'Surface topography analysis of electrospun nanofibers.',
    safetyAcknowledgement: true,
    supervisorEndorsed: false,
    allowWaitlist: true,
    bufferMinutes: 15,
    fairnessScore: 82.5,
    waitlistPriority: 1,
  });

  const waitlistEntry1 = new WaitlistEntry({
    resourceId: semResource._id,
    userId: studentPersona._id,
    bookingId: bookingWaitlistedSem._id,
    requestedStart: bookingWaitlistedSem.startTime,
    requestedEnd: bookingWaitlistedSem.endTime,
    priorityScore: 82.5,
    status: 'QUEUED',
  });
  await waitlistEntry1.save();

  for (let i = 0; i < 5; i++) {
    const user = allStudents[(i + 4) % allStudents.length];
    const res = createdResources[i % 5];
    const priorityScore = parseFloat((70 + Math.random() * 25).toFixed(1));
    const waitlistedBk = await createBooking({
      resourceId: res._id,
      userId: user._id,
      startTime: new Date(now.getTime() + (36 + i * 12) * 3600 * 1000),
      endTime: new Date(now.getTime() + (38 + i * 12) * 3600 * 1000),
      durationMinutes: 120,
      status: 'WAITLISTED',
      intendedPurpose: faker.helpers.arrayElement(researchTopics),
      safetyAcknowledgement: true,
      supervisorEndorsed: false,
      allowWaitlist: true,
      bufferMinutes: 15,
      fairnessScore: priorityScore,
      waitlistPriority: i + 2,
    });

    const entry = new WaitlistEntry({
      resourceId: res._id,
      userId: user._id,
      bookingId: waitlistedBk._id,
      requestedStart: waitlistedBk.startTime,
      requestedEnd: waitlistedBk.endTime,
      priorityScore,
      status: 'QUEUED',
    });
    await entry.save();
  }

  const bookingOfferedTem = await createBooking({
    resourceId: temResource._id,
    userId: researcherPersona._id,
    startTime: new Date(now.getTime() + 18 * 3600 * 1000),
    endTime: new Date(now.getTime() + 21 * 3600 * 1000),
    durationMinutes: 180,
    status: 'OFFERED',
    intendedPurpose: 'High resolution TEM lattice imaging of quantum dot heterostructures.',
    safetyAcknowledgement: true,
    supervisorEndorsed: true,
    allowWaitlist: true,
    bufferMinutes: 30,
    fairnessScore: 91.2,
    offerExpiresAt: new Date(now.getTime() + 2 * 3600 * 1000),
  });

  for (let i = 0; i < 2; i++) {
    const user = allResearchers[(i + 5) % allResearchers.length];
    const res = createdResources[(i + 6) % createdResources.length];
    await createBooking({
      resourceId: res._id,
      userId: user._id,
      startTime: new Date(now.getTime() + (14 + i * 4) * 3600 * 1000),
      endTime: new Date(now.getTime() + (16 + i * 4) * 3600 * 1000),
      durationMinutes: 120,
      status: 'OFFERED',
      intendedPurpose: faker.helpers.arrayElement(researchTopics),
      safetyAcknowledgement: true,
      supervisorEndorsed: true,
      allowWaitlist: true,
      bufferMinutes: 15,
      fairnessScore: 88.0,
      offerExpiresAt: new Date(now.getTime() + (3 + i) * 3600 * 1000),
    });
  }

  const bookingCheckedInSem = await createBooking({
    resourceId: semResource._id,
    userId: researcherPersona._id,
    startTime: new Date(now.getTime() - 45 * 60 * 1000),
    endTime: new Date(now.getTime() + 75 * 60 * 1000),
    durationMinutes: 120,
    status: 'CHECKED_IN',
    projectGrantCode: 'NSF-DMR-2026-9912',
    intendedPurpose: 'DualBeam FIB nanotomography session.',
    safetyAcknowledgement: true,
    supervisorEndorsed: true,
    allowWaitlist: false,
    bufferMinutes: 15,
    accessPin: '7391',
    checkInTime: new Date(now.getTime() - 43 * 60 * 1000),
  });

  const checkedInBookings: IBookingDocument[] = [bookingCheckedInSem];
  for (let i = 0; i < 4; i++) {
    const user = allResearchers[(i + 2) % allResearchers.length];
    const res = createdResources[(i * 3 + 4) % createdResources.length];
    const bk = await createBooking({
      resourceId: res._id,
      userId: user._id,
      startTime: new Date(now.getTime() - (30 + i * 15) * 60 * 1000),
      endTime: new Date(now.getTime() + (90 - i * 15) * 60 * 1000),
      durationMinutes: 120,
      status: 'CHECKED_IN',
      projectGrantCode: faker.helpers.arrayElement(grantCodes),
      intendedPurpose: faker.helpers.arrayElement(researchTopics),
      safetyAcknowledgement: true,
      supervisorEndorsed: true,
      allowWaitlist: false,
      bufferMinutes: 15,
      accessPin: faker.string.numeric(4),
      checkInTime: new Date(now.getTime() - (28 + i * 15) * 60 * 1000),
    });
    checkedInBookings.push(bk);
  }

  const bookingReturnedEtch = await createBooking({
    resourceId: etchResource._id,
    userId: researcherPersona._id,
    startTime: new Date(now.getTime() - 180 * 60 * 1000),
    endTime: new Date(now.getTime() - 60 * 60 * 1000),
    durationMinutes: 120,
    status: 'RETURNED',
    projectGrantCode: 'DARPA-CHIPS-4421',
    intendedPurpose: 'ICP deep etching of GaN optical microcavities.',
    safetyAcknowledgement: true,
    supervisorEndorsed: true,
    allowWaitlist: false,
    bufferMinutes: 30,
    accessPin: '5124',
    checkInTime: new Date(now.getTime() - 178 * 60 * 1000),
    returnTime: new Date(now.getTime() - 58 * 60 * 1000),
  });

  const returnedBookings: IBookingDocument[] = [bookingReturnedEtch];
  for (let i = 0; i < 3; i++) {
    const user = allStudents[(i + 1) % allStudents.length];
    const res = createdResources[(i * 2 + 5) % createdResources.length];
    const bk = await createBooking({
      resourceId: res._id,
      userId: user._id,
      startTime: new Date(now.getTime() - (240 + i * 60) * 60 * 1000),
      endTime: new Date(now.getTime() - (120 + i * 60) * 60 * 1000),
      durationMinutes: 120,
      status: 'RETURNED',
      intendedPurpose: faker.helpers.arrayElement(researchTopics),
      safetyAcknowledgement: true,
      supervisorEndorsed: false,
      allowWaitlist: false,
      bufferMinutes: 15,
      accessPin: faker.string.numeric(4),
      checkInTime: new Date(now.getTime() - (238 + i * 60) * 60 * 1000),
      returnTime: new Date(now.getTime() - (118 + i * 60) * 60 * 1000),
    });
    returnedBookings.push(bk);
  }

  const bookingCompletedNmr = await createBooking({
    resourceId: nmrResource._id,
    userId: researcherPersona._id,
    startTime: new Date(now.getTime() - 360 * 60 * 1000),
    endTime: new Date(now.getTime() - 240 * 60 * 1000),
    durationMinutes: 120,
    status: 'COMPLETED',
    projectGrantCode: 'BIO-GR-8841',
    intendedPurpose: '2D HSQC and NOESY NMR data collection for folded protein domain.',
    safetyAcknowledgement: true,
    supervisorEndorsed: true,
    allowWaitlist: false,
    bufferMinutes: 15,
    accessPin: '9012',
    checkInTime: new Date(now.getTime() - 358 * 60 * 1000),
    returnTime: new Date(now.getTime() - 239 * 60 * 1000),
  });

  const completedBookings: IBookingDocument[] = [bookingCompletedNmr];
  for (let i = 0; i < 11; i++) {
    const user = allUsers[(i * 3 + 1) % allUsers.length];
    const res = createdResources[(i * 2 + 3) % createdResources.length];
    const daysAgo = 1 + (i % 6);
    const bk = await createBooking({
      resourceId: res._id,
      userId: user._id,
      startTime: new Date(now.getTime() - (daysAgo * 24 + 4) * 3600 * 1000),
      endTime: new Date(now.getTime() - (daysAgo * 24 + 2) * 3600 * 1000),
      durationMinutes: 120,
      status: 'COMPLETED',
      projectGrantCode: faker.helpers.arrayElement(grantCodes),
      intendedPurpose: faker.helpers.arrayElement(researchTopics),
      safetyAcknowledgement: true,
      supervisorEndorsed: true,
      allowWaitlist: false,
      bufferMinutes: 15,
      accessPin: faker.string.numeric(4),
      checkInTime: new Date(now.getTime() - (daysAgo * 24 + 4) * 3600 * 1000 + 120000),
      returnTime: new Date(now.getTime() - (daysAgo * 24 + 2) * 3600 * 1000 - 60000),
    });
    completedBookings.push(bk);
  }

  const bookingDisputedLitho = await createBooking({
    resourceId: lithoResource._id,
    userId: studentPersona._id,
    startTime: new Date(now.getTime() - 480 * 60 * 1000),
    endTime: new Date(now.getTime() - 360 * 60 * 1000),
    durationMinutes: 120,
    status: 'DISPUTED',
    projectGrantCode: 'NANO-EXP-1099',
    intendedPurpose: 'Sub-micron photomask exposure for microfluidic channels.',
    safetyAcknowledgement: true,
    supervisorEndorsed: false,
    allowWaitlist: false,
    bufferMinutes: 30,
    accessPin: '3381',
    checkInTime: new Date(now.getTime() - 475 * 60 * 1000),
    returnTime: new Date(now.getTime() - 355 * 60 * 1000),
  });

  const disputedBookings: IBookingDocument[] = [bookingDisputedLitho];
  for (let i = 0; i < 2; i++) {
    const user = allStudents[(i + 7) % allStudents.length];
    const res = i === 0 ? cncResource : lcmsResource;
    const bk = await createBooking({
      resourceId: res._id,
      userId: user._id,
      startTime: new Date(now.getTime() - (36 + i * 12) * 3600 * 1000),
      endTime: new Date(now.getTime() - (34 + i * 12) * 3600 * 1000),
      durationMinutes: 120,
      status: 'DISPUTED',
      intendedPurpose: faker.helpers.arrayElement(researchTopics),
      safetyAcknowledgement: true,
      supervisorEndorsed: false,
      allowWaitlist: false,
      bufferMinutes: 15,
      accessPin: faker.string.numeric(4),
      checkInTime: new Date(now.getTime() - (36 + i * 12) * 3600 * 1000 + 180000),
      returnTime: new Date(now.getTime() - (34 + i * 12) * 3600 * 1000 - 120000),
    });
    disputedBookings.push(bk);
  }

  const bookingResolvedEtch = await createBooking({
    resourceId: etchResource._id,
    userId: studentPersona._id,
    startTime: new Date(now.getTime() - 720 * 60 * 1000),
    endTime: new Date(now.getTime() - 600 * 60 * 1000),
    durationMinutes: 120,
    status: 'RESOLVED',
    intendedPurpose: 'Reactive ion etching of silicon dioxide thin films.',
    safetyAcknowledgement: true,
    supervisorEndorsed: false,
    allowWaitlist: false,
    bufferMinutes: 30,
    accessPin: '2194',
    checkInTime: new Date(now.getTime() - 718 * 60 * 1000),
    returnTime: new Date(now.getTime() - 555 * 60 * 1000),
  });

  const resolvedBookings: IBookingDocument[] = [bookingResolvedEtch];
  for (let i = 0; i < 3; i++) {
    const user = allStudents[(i + 9) % allStudents.length];
    const res = createdResources[(i * 4 + 7) % createdResources.length];
    const bk = await createBooking({
      resourceId: res._id,
      userId: user._id,
      startTime: new Date(now.getTime() - (48 + i * 24) * 3600 * 1000),
      endTime: new Date(now.getTime() - (46 + i * 24) * 3600 * 1000),
      durationMinutes: 120,
      status: 'RESOLVED',
      intendedPurpose: faker.helpers.arrayElement(researchTopics),
      safetyAcknowledgement: true,
      supervisorEndorsed: false,
      allowWaitlist: false,
      bufferMinutes: 15,
      accessPin: faker.string.numeric(4),
      checkInTime: new Date(now.getTime() - (48 + i * 24) * 3600 * 1000 + 120000),
      returnTime: new Date(now.getTime() - (46 + i * 24) * 3600 * 1000 + 1800000),
    });
    resolvedBookings.push(bk);
  }

  for (let i = 0; i < 3; i++) {
    const user = allStudents[i];
    await createBooking({
      resourceId: dmlsResource._id,
      userId: user._id,
      startTime: new Date(now.getTime() + (48 + i * 12) * 3600 * 1000),
      endTime: new Date(now.getTime() + (50 + i * 12) * 3600 * 1000),
      durationMinutes: 120,
      status: 'CANCELLED',
      intendedPurpose: 'Cancelled due to material powder restock schedule delay.',
      safetyAcknowledgement: true,
      supervisorEndorsed: false,
      allowWaitlist: false,
      bufferMinutes: 15,
      cancellationReason: 'Scheduled material shipment delayed by vendor',
      cancelledAt: now,
      cancelledBy: user._id,
    });
  }

  for (let i = 0; i < 2; i++) {
    const user = allStudents[i + 3];
    await createBooking({
      resourceId: temResource._id,
      userId: user._id,
      startTime: new Date(now.getTime() + (96 + i * 24) * 3600 * 1000),
      endTime: new Date(now.getTime() + (99 + i * 24) * 3600 * 1000),
      durationMinutes: 180,
      status: 'REJECTED',
      intendedPurpose: 'Uncertified high-voltage TEM operation request.',
      safetyAcknowledgement: true,
      supervisorEndorsed: false,
      allowWaitlist: false,
      bufferMinutes: 30,
      reviewedBy: managerPersona._id,
      reviewedAt: now,
      rejectionReasonCode: 'UNQUALIFIED_PROJECT_SCOPE',
      rejectionMessage: 'Operator lacks mandatory Level 3 Advanced TEM certification.',
    });
  }

  for (let i = 0; i < 2; i++) {
    const user = allStudents[i + 5];
    await createBooking({
      resourceId: dmlsResource._id,
      userId: user._id,
      startTime: new Date(now.getTime() - (120 + i * 60) * 60 * 1000),
      endTime: new Date(now.getTime() - (60 + i * 60) * 60 * 1000),
      durationMinutes: 60,
      status: 'NO_SHOW',
      intendedPurpose: 'Missed reservation slot without cancellation notice.',
      safetyAcknowledgement: true,
      supervisorEndorsed: false,
      allowWaitlist: false,
      bufferMinutes: 15,
    });
  }

  log(`Created ${createdBookings.length} bookings spanning all 10 states.`);

  log('Generating 35+ bilateral check-in and return custody inspection records...');

  const createdInspections: any[] = [];

  async function generateCheckInInspection(booking: IBookingDocument, resource: IResourceDocument, inspector: IUserDocument) {
    const inspection = new Inspection({
      bookingId: booking._id,
      resourceId: resource._id,
      inspectorId: inspector._id,
      inspectorRole: inspector.role,
      type: 'CHECK_IN',
      phase: 'CHECK_IN',
      conditionRating: 'EXCELLENT',
      checklistResponses: (resource.inspectionConfig?.checklistItems || []).map((item: any) => ({
        itemId: item.itemId,
        itemText: item.itemText,
        verified: true,
      })),
      meterReadings: {
        laserHours: 1200.0 + Math.floor(Math.random() * 500),
        operatingTemperature: 21.0 + (Math.random() * 2),
        spindleCycles: 400 + Math.floor(Math.random() * 200),
        runTimeSeconds: 400000 + Math.floor(Math.random() * 100000),
      },
      photos: [
        {
          photoUrl: `/uploads/inspection_pre_${booking._id}.jpg`,
          sha256Hash: faker.git.commitSha(),
          caption: 'Baseline instrument condition verified intact prior to session',
          uploadedAt: booking.checkInTime || now,
        },
      ],
      digitalSignature: {
        signedBy: inspector._id,
        signerName: inspector.name,
        signedAt: booking.checkInTime || now,
        signatureHash: faker.git.commitSha(),
      },
    });
    const saved = await inspection.save();
    createdInspections.push(saved);
    return saved;
  }

  function getMeterValue(meters: any, key: string, fallback: number): number {
    if (!meters) return fallback;
    if (meters instanceof Map) {
      const val = meters.get(key);
      return typeof val === 'number' && !isNaN(val) ? val : fallback;
    }
    const val = meters[key];
    return typeof val === 'number' && !isNaN(val) ? val : fallback;
  }

  async function generateCleanReturnInspection(
    booking: IBookingDocument,
    resource: IResourceDocument,
    inspector: IUserDocument,
    preMeters: any
  ) {
    const hoursDelta = (booking.durationMinutes || 120) / 60;
    const cycleDelta = Math.floor(Math.random() * 8) + 2;
    const secondsDelta = (booking.durationMinutes || 120) * 60;

    const baseLaser = getMeterValue(preMeters, 'laserHours', 1200.0);
    const baseTemp = getMeterValue(preMeters, 'operatingTemperature', 21.0);
    const baseSpindle = getMeterValue(preMeters, 'spindleCycles', 400);
    const baseRunTime = getMeterValue(preMeters, 'runTimeSeconds', 400000);

    const returnMeters = {
      laserHours: parseFloat((baseLaser + hoursDelta).toFixed(1)),
      operatingTemperature: parseFloat(baseTemp.toFixed(1)),
      spindleCycles: baseSpindle + cycleDelta,
      runTimeSeconds: baseRunTime + secondsDelta,
    };

    const inspection = new Inspection({
      bookingId: booking._id,
      resourceId: resource._id,
      inspectorId: inspector._id,
      inspectorRole: inspector.role,
      type: 'RETURN',
      phase: 'RETURN',
      conditionRating: 'EXCELLENT',
      checklistResponses: [
        ...(resource.inspectionConfig?.checklistItems || []).map((item: any) => ({
          itemId: item.itemId,
          itemText: item.itemText,
          verified: true,
        })),
        { itemId: 'chk-shutdown', itemText: 'Clean work area and log out of instrument controller software', verified: true },
      ],
      meterReadings: returnMeters,
      conditionDiff: {
        initialRating: 'EXCELLENT',
        finalRating: 'EXCELLENT',
        ratingDelta: 0,
        meterDeltas: {
          laserHours: hoursDelta,
          operatingTemperature: 0,
          spindleCycles: cycleDelta,
          runTimeSeconds: secondsDelta,
        },
        flaggedAnomaly: false,
        incidentCreated: false,
      },
      notes: 'Clean session completed without hardware or vacuum anomalies.',
      digitalSignature: {
        signedBy: inspector._id,
        signerName: inspector.name,
        signedAt: booking.returnTime || now,
        signatureHash: faker.git.commitSha(),
      },
    });
    const saved = await inspection.save();
    createdInspections.push(saved);
    return saved;
  }

  for (const bk of checkedInBookings) {
    const res = createdResources.find((r) => r._id.equals(bk.resourceId)) || semResource;
    const user = allUsers.find((u) => u._id.equals(bk.userId)) || researcherPersona;
    await generateCheckInInspection(bk, res, user);
  }

  for (const bk of completedBookings) {
    const res = createdResources.find((r) => r._id.equals(bk.resourceId)) || nmrResource;
    const user = allUsers.find((u) => u._id.equals(bk.userId)) || researcherPersona;
    const checkIn = await generateCheckInInspection(bk, res, user);
    await generateCleanReturnInspection(bk, res, user, checkIn.meterReadings);
  }

  for (const bk of returnedBookings) {
    const res = createdResources.find((r) => r._id.equals(bk.resourceId)) || etchResource;
    const user = allUsers.find((u) => u._id.equals(bk.userId)) || researcherPersona;
    await generateCheckInInspection(bk, res, user);
  }

  log('Creating 6 realistic incident tickets and dispute adjudications...');

  const lithoCheckIn = await generateCheckInInspection(bookingDisputedLitho, lithoResource, studentPersona);
  const damageIncident = new Incident({
    incidentNumber: 'INC-2026-0001-442',
    bookingId: bookingDisputedLitho._id,
    resourceId: lithoResource._id,
    reportedBy: managerPersona._id,
    accusedParty: studentPersona._id,
    category: 'PHYSICAL_DAMAGE',
    severity: 'HIGH',
    status: 'INVESTIGATING',
    description: 'During post-use return inspection, a 12mm scratch was observed across the quartz optical chuck surface following high-torque manual wafer clamping.',
    penaltyHours: 10,
    repairCostEstimate: 450,
    evidencePhotos: [
      {
        photoUrl: '/uploads/damage_chuck_scratch.jpg',
        sha256Hash: faker.git.commitSha(),
        caption: 'Microscope close-up of quartz chuck surface scratch',
      },
    ],
    disputeStatement: 'I was using the provided plastic tweezers as instructed; the quartz chuck had hairline fatigue visible even in the pre-checkin photo.',
    disputeDetails: 'I was using the provided plastic tweezers as instructed; the quartz chuck had hairline fatigue visible even in the pre-checkin photo.',
    disputedAt: new Date(now.getTime() - 300 * 60 * 1000),
    managerNotes: 'Inspection photos indicate prior wear, but operator utilized excessive lateral torque during alignment.',
  });
  const savedDamageIncident = await damageIncident.save();

  const lithoReturn = new Inspection({
    bookingId: bookingDisputedLitho._id,
    resourceId: lithoResource._id,
    inspectorId: studentPersona._id,
    inspectorRole: 'STUDENT',
    type: 'RETURN',
    phase: 'RETURN',
    conditionRating: 'DAMAGED',
    checklistResponses: [
      { itemId: 'chk-clean', itemText: 'Verify air shower and yellow lithography lighting active', verified: true },
      { itemId: 'chk-chuck', itemText: 'Vacuum chuck surface inspect for photoresist debris', verified: false, note: 'Scratch discovered on quartz surface' },
      { itemId: 'chk-shutdown', itemText: 'Clean work area and log out of instrument controller software', verified: true },
    ],
    meterReadings: {
      laserHours: parseFloat((getMeterValue(lithoCheckIn.meterReadings, 'laserHours', 920.0) + 2.0).toFixed(1)),
      operatingTemperature: 20.4,
      spindleCycles: getMeterValue(lithoCheckIn.meterReadings, 'spindleCycles', 1540) + 8,
      runTimeSeconds: getMeterValue(lithoCheckIn.meterReadings, 'runTimeSeconds', 3312000) + 7200,
    },
    conditionDiff: {
      initialRating: 'GOOD',
      finalRating: 'DAMAGED',
      ratingDelta: -3,
      meterDeltas: { laserHours: 2.0, operatingTemperature: 0.4, spindleCycles: 8, runTimeSeconds: 7200 },
      flaggedAnomaly: true,
      anomalyDetails: 'Condition dropped from GOOD to DAMAGED. Quartz vacuum chuck scratched.',
      incidentCreated: true,
      incidentId: savedDamageIncident._id,
    },
    notes: 'Scratch appeared during wafer dismount.',
    digitalSignature: {
      signedBy: studentPersona._id,
      signerName: studentPersona.name,
      signedAt: bookingDisputedLitho.returnTime || now,
      signatureHash: faker.git.commitSha(),
    },
  });
  await lithoReturn.save();
  createdInspections.push(lithoReturn);

  const lateIncident = new Incident({
    incidentNumber: 'INC-2026-0002-881',
    bookingId: bookingResolvedEtch._id,
    resourceId: etchResource._id,
    reportedBy: managerPersona._id,
    accusedParty: studentPersona._id,
    category: 'LATE_RETURN',
    severity: 'MEDIUM',
    status: 'RESOLVED',
    description: 'Operator exceeded booked reservation slot by 45 minutes, delaying consecutive research group cleanroom session.',
    penaltyHours: 5,
    repairCostEstimate: 0,
    managerNotes: 'First late return offense. Operator acknowledged timer error and cleaned workspace thoroughly.',
    resolutionOutcome: '5 penalty points assessed; mandatory refresher on cleanroom timekeeping etiquette.',
    adjudication: {
      adjudicatedBy: managerPersona._id,
      adjudicatedAt: new Date(now.getTime() - 500 * 60 * 1000),
      decision: 'USER_LIABLE',
      penaltyPointsAssigned: 5,
      penaltyHours: 5,
      billingChargeAmount: 82.5,
      grantCodeCharged: 'STUDENT-TRAINING-POOL',
      actionItemsRequired: ['Review Cleanroom Timekeeping Policy', 'Log out 10 minutes prior to buffer window'],
      findingsSummary: 'Operator admitted to uncalibrated etch timer resulting in 45-minute overrun.',
    },
  });
  await lateIncident.save();

  const cncIncident = new Incident({
    incidentNumber: 'INC-2026-0003-104',
    bookingId: disputedBookings[1]._id,
    resourceId: cncResource._id,
    reportedBy: managerPersona._id,
    accusedParty: disputedBookings[1].userId,
    category: 'EQUIPMENT_DAMAGE',
    severity: 'MEDIUM',
    status: 'INVESTIGATING',
    description: '1/4 inch 4-flute solid carbide end mill snapped in workpiece due to excessive feed rate override (200% on 304 Stainless Steel).',
    penaltyHours: 3,
    repairCostEstimate: 45,
    disputeStatement: 'The CAM software feeds and speeds were generated from default aluminum library; spindle stalled during plunge.',
    disputeDetails: 'The CAM software feeds and speeds were generated from default aluminum library; spindle stalled during plunge.',
    disputedAt: new Date(now.getTime() - 24 * 3600 * 1000),
    managerNotes: 'Spindle bearings checked and verified undamaged; replacement collet and tool charged to lab account.',
  });
  await cncIncident.save();

  const cleanroomIncident = new Incident({
    incidentNumber: 'INC-2026-0004-912',
    bookingId: resolvedBookings[1]._id,
    resourceId: lithoResource._id,
    reportedBy: managerPersona._id,
    accusedParty: resolvedBookings[1].userId,
    category: 'SAFETY_VIOLATION',
    severity: 'HIGH',
    status: 'RESOLVED',
    description: 'Cleanroom Bay 100 particle counter alarm triggered (spiked to Class 10,000) due to unzipping cleanroom bunny suit inside photolithography bay.',
    penaltyHours: 12,
    repairCostEstimate: 200,
    managerNotes: 'Bay purged and particle counts returned to ISO Class 5 after 4 hours.',
    resolutionOutcome: 'Mandatory Cleanroom Protocol Level 1 recertification required before access reinstated.',
    adjudication: {
      adjudicatedBy: managerPersona._id,
      adjudicatedAt: new Date(now.getTime() - 40 * 3600 * 1000),
      decision: 'USER_LIABLE',
      penaltyPointsAssigned: 10,
      penaltyHours: 12,
      billingChargeAmount: 200.0,
      grantCodeCharged: 'DEPARTMENTAL-OVERHEAD',
      actionItemsRequired: ['Complete Cleanroom Protocol Level 1 Refresher', 'Undergo 1 Supervised Gowning Audit'],
      findingsSummary: 'Operator acknowledged opening suit due to overheating; understood hazard of contaminating mask aligner optics.',
    },
  });
  await cleanroomIncident.save();

  const msIncident = new Incident({
    incidentNumber: 'INC-2026-0005-321',
    bookingId: disputedBookings[2]._id,
    resourceId: lcmsResource._id,
    reportedBy: ownerPersona._id,
    accusedParty: disputedBookings[2].userId,
    category: 'ENVIRONMENTAL_SPILL',
    severity: 'MEDIUM',
    status: 'INVESTIGATING',
    description: 'Detergent signal contamination detected in electrospray ionization source from unwashed PEG surfactant in sample.',
    penaltyHours: 6,
    repairCostEstimate: 150,
    disputeStatement: 'Sample was filtered through standard 0.22 um PTFE syringe filter as recommended in the manual.',
    disputeDetails: 'Sample was filtered through standard 0.22 um PTFE syringe filter as recommended in the manual.',
    disputedAt: new Date(now.getTime() - 12 * 3600 * 1000),
    managerNotes: 'Source spray capillary flushed with 50/50 isopropanol/water to eliminate surfactant adducts.',
  });
  await msIncident.save();

  const dmlsIncident = new Incident({
    incidentNumber: 'INC-2026-0006-554',
    bookingId: resolvedBookings[2]._id,
    resourceId: dmlsResource._id,
    reportedBy: managerPersona._id,
    accusedParty: resolvedBookings[2].userId,
    category: 'EQUIPMENT_DAMAGE',
    severity: 'LOW',
    status: 'RESOLVED',
    description: 'Recoater ceramic blade friction drag detected during metal powder layer spreading; print paused automatically.',
    penaltyHours: 0,
    repairCostEstimate: 0,
    managerNotes: 'Foreign particle trapped in recoater wiper; removed safely without blade damage.',
    resolutionOutcome: 'Determined to be material powder clump defect; operator held harmless.',
    adjudication: {
      adjudicatedBy: managerPersona._id,
      adjudicatedAt: new Date(now.getTime() - 44 * 3600 * 1000),
      decision: 'DISMISSED',
      penaltyPointsAssigned: 0,
      penaltyHours: 0,
      billingChargeAmount: 0,
      actionItemsRequired: ['Sieve titanium powder lot before next build'],
      findingsSummary: 'Powder batch had mild humidity clumping, causing false recoater resistance. Operator followed pause protocol properly.',
    },
  });
  await dmlsIncident.save();

  log('Created 6 incident tickets across physical damage, late returns, contamination, and protocol violations.');

  log('Generating 75+ sequential events in the cryptographic SHA-256 audit ledger...');

  const auditEventsToLog: any[] = [];

  for (const user of allUsers.slice(0, 15)) {
    auditEventsToLog.push({
      action: 'USER_REGISTERED',
      actorId: user._id.toString(),
      actorRole: user.role,
      entityType: 'USER',
      entityId: user._id.toString(),
      metadata: { name: user.name, email: user.email, department: user.department, role: user.role },
    });
  }

  for (const lab of createdLabs) {
    auditEventsToLog.push({
      action: 'LAB_FACILITY_REGISTERED',
      actorId: managerPersona._id.toString(),
      actorRole: 'LAB_MANAGER',
      entityType: 'LAB',
      entityId: lab._id.toString(),
      metadata: { code: lab.code, name: lab.name, safetyLevel: lab.safetyLevel, building: lab.building },
    });
  }

  for (const res of createdResources.slice(0, 15)) {
    auditEventsToLog.push({
      action: 'RESOURCE_LISTED',
      actorId: res.ownerId.toString(),
      actorRole: 'RESOURCE_OWNER',
      entityType: 'RESOURCE',
      entityId: res._id.toString(),
      metadata: { title: res.title, code: res.code, category: res.category, hourlyRate: res.hourlyRate },
    });
  }

  for (const bk of createdBookings.slice(0, 20)) {
    auditEventsToLog.push({
      action: 'BOOKING_SUBMITTED',
      actorId: bk.userId.toString(),
      actorRole: 'STUDENT',
      entityType: 'BOOKING',
      entityId: bk._id.toString(),
      bookingId: bk._id,
      resourceId: bk.resourceId,
      fromState: 'DRAFT',
      toState: bk.status === 'DRAFT' ? 'DRAFT' : 'PENDING_REVIEW',
      metadata: { durationMinutes: bk.durationMinutes, projectGrantCode: bk.projectGrantCode },
    });
  }

  for (const bk of createdBookings.filter((b) => ['APPROVED', 'CHECKED_IN', 'RETURNED', 'COMPLETED', 'DISPUTED', 'RESOLVED'].includes(b.status)).slice(0, 10)) {
    auditEventsToLog.push({
      action: 'BOOKING_APPROVED',
      actorId: managerPersona._id.toString(),
      actorRole: 'LAB_MANAGER',
      entityType: 'BOOKING',
      entityId: bk._id.toString(),
      bookingId: bk._id,
      resourceId: bk.resourceId,
      fromState: 'PENDING_REVIEW',
      toState: 'APPROVED',
      metadata: { accessPinGenerated: true, reviewedAt: bk.reviewedAt || now },
    });
  }

  for (const bk of checkedInBookings.concat(completedBookings.slice(0, 6))) {
    auditEventsToLog.push({
      action: 'BOOKING_CHECKED_IN',
      actorId: bk.userId.toString(),
      actorRole: 'RESEARCHER',
      entityType: 'BOOKING',
      entityId: bk._id.toString(),
      bookingId: bk._id,
      resourceId: bk.resourceId,
      fromState: 'APPROVED',
      toState: 'CHECKED_IN',
      metadata: { checkInTime: bk.checkInTime, digitalSignatureHash: faker.git.commitSha() },
    });
  }

  for (const bk of completedBookings.slice(0, 6)) {
    auditEventsToLog.push({
      action: 'BOOKING_RETURNED',
      actorId: bk.userId.toString(),
      actorRole: 'RESEARCHER',
      entityType: 'BOOKING',
      entityId: bk._id.toString(),
      bookingId: bk._id,
      resourceId: bk.resourceId,
      fromState: 'CHECKED_IN',
      toState: 'COMPLETED',
      metadata: { returnTime: bk.returnTime, conditionRating: 'EXCELLENT', ratingDelta: 0 },
    });
  }

  auditEventsToLog.push(
    {
      action: 'INCIDENT_FILED',
      actorId: managerPersona._id.toString(),
      actorRole: 'LAB_MANAGER',
      entityType: 'INCIDENT',
      entityId: savedDamageIncident._id.toString(),
      bookingId: bookingDisputedLitho._id,
      resourceId: lithoResource._id,
      metadata: { incidentNumber: savedDamageIncident.incidentNumber, category: 'PHYSICAL_DAMAGE', severity: 'HIGH' },
    },
    {
      action: 'INCIDENT_DISPUTED',
      actorId: studentPersona._id.toString(),
      actorRole: 'STUDENT',
      entityType: 'INCIDENT',
      entityId: savedDamageIncident._id.toString(),
      bookingId: bookingDisputedLitho._id,
      resourceId: lithoResource._id,
      metadata: { statement: 'Tweezers used as instructed; pre-existing wear.' },
    },
    {
      action: 'INCIDENT_ADJUDICATED',
      actorId: managerPersona._id.toString(),
      actorRole: 'LAB_MANAGER',
      entityType: 'INCIDENT',
      entityId: lateIncident._id.toString(),
      bookingId: bookingResolvedEtch._id,
      resourceId: etchResource._id,
      metadata: { decision: 'USER_LIABLE', penaltyPointsAssigned: 5, billingChargeAmount: 82.5 },
    },
    {
      action: 'INCIDENT_ADJUDICATED',
      actorId: managerPersona._id.toString(),
      actorRole: 'LAB_MANAGER',
      entityType: 'INCIDENT',
      entityId: cleanroomIncident._id.toString(),
      bookingId: resolvedBookings[1]._id,
      resourceId: lithoResource._id,
      metadata: { decision: 'USER_LIABLE', penaltyPointsAssigned: 10, billingChargeAmount: 200.0 },
    },
    {
      action: 'INCIDENT_ADJUDICATED',
      actorId: managerPersona._id.toString(),
      actorRole: 'LAB_MANAGER',
      entityType: 'INCIDENT',
      entityId: dmlsIncident._id.toString(),
      bookingId: resolvedBookings[2]._id,
      resourceId: dmlsResource._id,
      metadata: { decision: 'DISMISSED', penaltyPointsAssigned: 0, billingChargeAmount: 0 },
    }
  );

  for (const event of auditEventsToLog) {
    await auditService.logEvent(event);
  }

  log('Running SHA-256 cryptographic chain continuity verification across all blocks...');
  const verification = await auditService.verifyAuditChain();

  if (!verification.verified) {
    throw new Error(
      `Audit verification failed in seed: sequence ${verification.tamperedSequence}. Reason: ${verification.reason}`
    );
  }

  log(`Cryptographic SHA-256 chain verified successfully! Total chained records: ${verification.totalRecordsVerified}, tip: ${verification.lastBlockHash}`);
  log('High-fidelity Faker-powered database seeding completed successfully!');

  return {
    success: true,
    usersCount: allUsers.length,
    labsCount: createdLabs.length,
    resourcesCount: createdResources.length,
    bookingsCount: createdBookings.length,
    inspectionsCount: createdInspections.length,
    incidentsCount: 6,
    auditRecordsCount: verification.totalRecordsVerified,
    chainVerified: verification.verified,
  };
}

if (require.main === module || (typeof process !== 'undefined' && process.argv[1]?.endsWith('seed.ts'))) {
  seedDatabase()
    .then((summary) => {
      console.log('\n================ SEED SUMMARY ================');
      console.log(`Users:        ${summary.usersCount} academic profiles (5 fixed core personas + 31 Faker academics)`);
      console.log(`Labs:         ${summary.labsCount} multi-department research facilities`);
      console.log(`Resources:    ${summary.resourcesCount} advanced research instruments`);
      console.log(`Bookings:     ${summary.bookingsCount} spanning all 10 lifecycle states`);
      console.log(`Inspections:  ${summary.inspectionsCount} bilateral check-in & return records with sensor meters`);
      console.log(`Incidents:    ${summary.incidentsCount} realistic dispute tickets & adjudications`);
      console.log(`Audit Ledger: ${summary.auditRecordsCount} cryptographically chained blocks`);
      console.log(`Chain Status: ${summary.chainVerified ? 'VERIFIED (100% Cryptographically Intact)' : 'TAMPERED'}`);
      console.log('==============================================\n');
      return disconnectDatabase();
    })
    .catch(async (err) => {
      console.error('[Seed Error] Failed to seed database:', err);
      try {
        await disconnectDatabase();
      } catch (_) {}
      process.exit(1);
    });
}
