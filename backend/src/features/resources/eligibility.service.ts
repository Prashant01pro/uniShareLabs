import mongoose from 'mongoose';
import { User, IUserDocument, UserRole } from '../auth/user.model';
import { Resource, IResourceDocument, IRequiredCertification } from './resource.model';
import { NotFoundError } from '../../middleware/error.middleware';

export interface EligibilityCheckResult {
  name: string;
  passed: boolean;
  message: string;
}

export interface EligibilityEvaluation {
  eligible: boolean;
  isEligible: boolean; 
  reasons: string[];
  blockingReasons: string[]; 
  missingCertifications: string[];
  missingTrainings: string[];
  checks: EligibilityCheckResult[];
  eligibilityScore: number; 
  recommendedRemediation: string[];
}

export interface EligibilityEvaluationOptions {
  checkDate?: Date;
  startTime?: Date;
  endTime?: Date;
  safetyAgreementSigned?: boolean;
}

const ROLE_HIERARCHY: Record<UserRole, number> = {
  STUDENT: 1,
  RESEARCHER: 2,
  RESOURCE_OWNER: 3,
  LAB_MANAGER: 3,
  ADMIN: 4,
};

export class EligibilityService {
  public async evaluateEligibility(
    userOrId: string | mongoose.Types.ObjectId | IUserDocument,
    resourceOrId: string | mongoose.Types.ObjectId | IResourceDocument,
    options: EligibilityEvaluationOptions = {}
  ): Promise<EligibilityEvaluation> {
    const atDate = options.checkDate ? new Date(options.checkDate) : new Date();

    let user: IUserDocument | null = null;
    if (typeof userOrId === 'string' || userOrId instanceof mongoose.Types.ObjectId) {
      user = await User.findById(userOrId);
      if (!user) {
        throw new NotFoundError(`User with ID '${userOrId}' was not found.`, 'USER_NOT_FOUND');
      }
    } else {
      user = userOrId as IUserDocument;
    }

    let resource: IResourceDocument | null = null;
    if (typeof resourceOrId === 'string' || resourceOrId instanceof mongoose.Types.ObjectId) {
      resource = await Resource.findById(resourceOrId);
      if (!resource) {
        throw new NotFoundError(`Resource with ID '${resourceOrId}' was not found.`, 'RESOURCE_NOT_FOUND');
      }
    } else {
      resource = resourceOrId as IResourceDocument;
    }

    const reasons: string[] = [];
    const missingCertifications: string[] = [];
    const missingTrainings: string[] = [];
    const recommendedRemediation: string[] = [];
    const checks: EligibilityCheckResult[] = [];

    let userStandingPassed = true;
    let userStandingMessage = 'User account is active and in good disciplinary standing.';

    if (!user.isActive) {
      userStandingPassed = false;
      userStandingMessage = 'User account has been deactivated.';
      reasons.push(userStandingMessage);
      recommendedRemediation.push('Contact University Administration to reactivate your institutional account.');
    } else if (user.isSuspended) {
      userStandingPassed = false;
      userStandingMessage = `User account is suspended${user.suspensionReason ? ': ' + user.suspensionReason : '.'}`;
      reasons.push(userStandingMessage);
      recommendedRemediation.push('Resolve outstanding safety non-compliances with the Laboratory Safety Board.');
    } else if ((user.activePenaltyPoints || 0) >= 50) {
      userStandingPassed = false;
      userStandingMessage = `User has active disciplinary incident blocks (${user.activePenaltyPoints} penalty points).`;
      reasons.push(userStandingMessage);
      recommendedRemediation.push('Complete designated safety refresher training to adjudicate and clear penalty points.');
    }

    checks.push({
      name: 'ACCOUNT_STANDING',
      passed: userStandingPassed,
      message: userStandingMessage,
    });

    let resourceStatusPassed = true;
    let resourceStatusMessage = `Resource status is ${resource.status}.`;

    if (resource.status !== 'AVAILABLE') {
      resourceStatusPassed = false;
      resourceStatusMessage = `Resource is currently ${resource.status} and unavailable for booking.`;
      reasons.push(resourceStatusMessage);
      recommendedRemediation.push('Select an alternate available instrument or await maintenance completion.');
    }

    if (options.startTime && options.endTime) {
      const s = new Date(options.startTime);
      const e = new Date(options.endTime);
      if (resource.hasMaintenanceCollision(s, e)) {
        resourceStatusPassed = false;
        resourceStatusMessage = 'Requested interval overlaps with a scheduled maintenance blackout window.';
        reasons.push(resourceStatusMessage);
        recommendedRemediation.push('Choose a booking time outside the scheduled maintenance period.');
      }
    }

    checks.push({
      name: 'RESOURCE_AVAILABILITY',
      passed: resourceStatusPassed,
      message: resourceStatusMessage,
    });

    const minRequiredRole: UserRole = resource.prerequisites?.minRole || 'STUDENT';
    const userRoleRank = ROLE_HIERARCHY[user.role] ?? 1;
    const requiredRoleRank = ROLE_HIERARCHY[minRequiredRole] ?? 1;

    let rolePassed = true;
    let roleMessage = `User role '${user.role}' satisfies minimum requirement '${minRequiredRole}'.`;

    if (userRoleRank < requiredRoleRank) {
      rolePassed = false;
      roleMessage = `Insufficient role clearance: requires '${minRequiredRole}', current role is '${user.role}'.`;
      reasons.push(roleMessage);
      recommendedRemediation.push(`Request a role upgrade or submit request under principal investigator sponsorship.`);
    }

    if (resource.safetyLevel === 'LEVEL_3_RESTRICTED' && user.role === 'STUDENT') {
      if (user.trustScore < 70) {
        rolePassed = false;
        const msg = `Restricted Level 3 equipment requires a minimum trust score of 70 (current: ${user.trustScore}).`;
        reasons.push(msg);
        recommendedRemediation.push('Build operational reputation on Level 1 & Level 2 instruments before accessing Level 3.');
      }
    }

    checks.push({
      name: 'ROLE_CLEARANCE',
      passed: rolePassed,
      message: roleMessage,
    });

    const rawRequiredCerts: IRequiredCertification[] = [
      ...(resource.requiredCertifications || []),
      ...(resource.prerequisites?.requiredCertifications || []),
    ];

    const certMap = new Map<string, IRequiredCertification>();
    rawRequiredCerts.forEach((c) => {
      if (c && c.certCode) {
        certMap.set(c.certCode, c);
      }
    });
    const uniqueRequiredCerts = Array.from(certMap.values());

    let certsPassed = true;
    const failedCertMessages: string[] = [];

    for (const reqCert of uniqueRequiredCerts) {
      const heldCert = user.certifications?.find((c) => c.certCode === reqCert.certCode);

      if (!heldCert) {
        certsPassed = false;
        missingCertifications.push(reqCert.certCode);
        const msg = `Missing mandatory safety certification: '${reqCert.name}' (${reqCert.certCode}).`;
        failedCertMessages.push(msg);
        reasons.push(msg);
        recommendedRemediation.push(
          `Enroll and certify in '${reqCert.name}' (${reqCert.certCode}) via Environmental Health & Safety portal.`
        );
      } else {
        const issued = new Date(heldCert.issuedAt);
        const expires = new Date(heldCert.expiresAt);

        if (issued > atDate) {
          certsPassed = false;
          missingCertifications.push(reqCert.certCode);
          const msg = `Certification '${reqCert.name}' (${reqCert.certCode}) is not yet valid (issued: ${issued.toISOString()}).`;
          failedCertMessages.push(msg);
          reasons.push(msg);
        } else if (expires <= atDate) {
          certsPassed = false;
          missingCertifications.push(reqCert.certCode);
          const msg = `Safety certification '${reqCert.name}' (${reqCert.certCode}) expired on ${expires.toISOString().split('T')[0]}.`;
          failedCertMessages.push(msg);
          reasons.push(msg);
          recommendedRemediation.push(
            `Renew expired certification '${reqCert.name}' (${reqCert.certCode}) before booking.`
          );
        }
      }
    }

    checks.push({
      name: 'SAFETY_CERTIFICATIONS',
      passed: certsPassed,
      message: certsPassed
        ? 'All mandatory safety certifications verified and active.'
        : failedCertMessages.join(' '),
    });

    const requiredTrainings: string[] = resource.prerequisites?.requiredSafetyTrainings || [];
    let trainingsPassed = true;
    const failedTrainingMessages: string[] = [];

    for (const trainingCode of requiredTrainings) {
      const completed = user.safetyTrainingsCompleted?.includes(trainingCode);
      if (!completed) {
        trainingsPassed = false;
        missingTrainings.push(trainingCode);
        const msg = `Mandatory safety training module '${trainingCode}' has not been completed.`;
        failedTrainingMessages.push(msg);
        reasons.push(msg);
        recommendedRemediation.push(`Complete online safety training module '${trainingCode}'.`);
      }
    }

    checks.push({
      name: 'SAFETY_TRAININGS',
      passed: trainingsPassed,
      message: trainingsPassed
        ? 'All prerequisite safety trainings completed.'
        : failedTrainingMessages.join(' '),
    });

    let inductionPassed = true;
    let inductionMessage = 'Facility induction verified or not required.';

    if (resource.prerequisites?.requiresInduction) {
      const resourceIdStr = resource._id.toString();
      const hasInduction = user.inductionsCompleted?.some(
        (id) => id.toString() === resourceIdStr
      );

      if (!hasInduction) {
        inductionPassed = false;
        inductionMessage = `On-site physical induction required for '${resource.title || resource.name}'.`;
        reasons.push(inductionMessage);
        recommendedRemediation.push(
          'Contact the resource owner or lab manager to attend a scheduled hands-on induction session.'
        );
      }
    }

    checks.push({
      name: 'FACILITY_INDUCTION',
      passed: inductionPassed,
      message: inductionMessage,
    });

    let agreementPassed = true;
    let agreementMessage = 'Safety agreement acknowledged or not required.';

    if (resource.prerequisites?.safetyAgreementRequired) {
      if (options.safetyAgreementSigned === false) {
        agreementPassed = false;
        agreementMessage = 'Mandatory facility safety terms and hazard protocol agreement was not accepted.';
        reasons.push(agreementMessage);
        recommendedRemediation.push('Sign off on the facility hazard acknowledgement terms.');
      }
    }

    checks.push({
      name: 'SAFETY_AGREEMENT',
      passed: agreementPassed,
      message: agreementMessage,
    });

    const totalChecks = checks.length;
    const passedChecks = checks.filter((c) => c.passed).length;
    const eligibilityScore = Math.round((passedChecks / totalChecks) * 100);
    const eligible = reasons.length === 0;

    return {
      eligible,
      isEligible: eligible,
      reasons,
      blockingReasons: reasons,
      missingCertifications,
      missingTrainings,
      checks,
      eligibilityScore,
      recommendedRemediation: Array.from(new Set(recommendedRemediation)),
    };
  }
}

export const eligibilityService = new EligibilityService();
