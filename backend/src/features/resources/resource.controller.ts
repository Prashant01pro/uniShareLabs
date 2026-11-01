import { Request, Response } from 'express';
import mongoose from 'mongoose';
import { Resource, IResourceDocument } from './resource.model';
import { Lab } from '../labs/lab.model';
import { eligibilityService } from './eligibility.service';
import {
  ConflictError,
  NotFoundError,
  ForbiddenError,
  BadRequestError,
} from '../../middleware/error.middleware';
import { checkObjectAccess } from '../../middleware/auth.middleware';
import { emitToResource, broadcastEvent, SOCKET_EVENTS } from '../../real-time/socket';
import {
  CreateResourceInput,
  UpdateResourceInput,
  ResourceQueryInput,
  EligibilityQueryInput,
} from './resource.validation';

export class ResourceController {
  public async createResource(req: Request, res: Response): Promise<void> {
    const input: CreateResourceInput = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      throw new ForbiddenError('Authentication required to create equipment listings.');
    }

    let ownerId: string | mongoose.Types.ObjectId = currentUser.id;
    if (input.ownerId && (currentUser.role === 'ADMIN' || currentUser.role === 'LAB_MANAGER')) {
      ownerId = input.ownerId;
    }

    const existingCode = await Resource.findByCode(input.code);
    if (existingCode) {
      throw new ConflictError(
        `A resource with code '${input.code.toUpperCase()}' already exists.`,
        'CONFLICT_ERROR'
      );
    }

    if (input.labId) {
      const labExists = await Lab.findById(input.labId);
      if (!labExists) {
        throw new BadRequestError(
          `Associated laboratory facility with ID '${input.labId}' does not exist.`,
          'RESOURCE_NOT_FOUND'
        );
      }
    }

    const title = input.title || input.name || 'Untitled Resource';
    const name = input.name || input.title || title;

    const resource = new Resource({
      ...input,
      title,
      name,
      code: input.code.toUpperCase(),
      ownerId,
      delegates: input.delegates || [],
    });

    await resource.save();
    await resource.populate([
      { path: 'ownerId', select: 'name email department role' },
      { path: 'labId', select: 'name code building room' },
    ]);

    res.status(201).json({
      success: true,
      data: resource,
      message: 'Research resource cataloged successfully',
    });
  }

  public async listResources(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as ResourceQueryInput;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.category) {
      filter.category = query.category;
    }

    if (query.department) {
      filter.department = { $regex: new RegExp(`^${query.department.trim()}$`, 'i') };
    }

    if (query.status) {
      filter.status = query.status;
    }

    if (query.labId) {
      filter.labId = query.labId;
    }

    if (query.safetyLevel) {
      filter.safetyLevel = query.safetyLevel;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { title: searchRegex },
        { name: searchRegex },
        { code: searchRegex },
        { department: searchRegex },
        { labLocation: searchRegex },
        { description: searchRegex },
      ];
    }

    if (query.eligibleOnly && req.user) {
      const candidateResources = await Resource.find(filter)
        .populate('ownerId', 'name email department role')
        .populate('labId', 'name code building room')
        .sort({ createdAt: -1 });

      const evaluatedResults = await Promise.all(
        candidateResources.map(async (r) => {
          const evalResult = await eligibilityService.evaluateEligibility(req.user!.id, r);
          return { resource: r, eligible: evalResult.eligible };
        })
      );

      const eligibleOnlyList = evaluatedResults
        .filter((item) => item.eligible)
        .map((item) => item.resource);

      const total = eligibleOnlyList.length;
      const paginatedData = eligibleOnlyList.slice(skip, skip + limit);
      const pages = Math.ceil(total / limit) || 1;

      res.status(200).json({
        success: true,
        data: paginatedData,
        pagination: {
          total,
          page,
          pages,
          limit,
        },
      });
      return;
    }

    const [total, resources] = await Promise.all([
      Resource.countDocuments(filter),
      Resource.find(filter)
        .populate('ownerId', 'name email department role')
        .populate('labId', 'name code building room')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: resources,
      pagination: {
        total,
        page,
        pages,
        limit,
      },
    });
  }

  public async getResourceById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const resource = await Resource.findById(id)
      .populate('ownerId', 'name email department role')
      .populate('delegates', 'name email department role')
      .populate('labId', 'name code building room operationalHours');

    if (!resource) {
      throw new NotFoundError(`Resource with ID '${id}' was not found.`, 'RESOURCE_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: resource,
    });
  }

  public async checkEligibility(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const query = req.query as unknown as EligibilityQueryInput;
    const currentUser = req.user;

    if (!currentUser) {
      throw new ForbiddenError('Authentication required to evaluate equipment eligibility.');
    }

    const resource = await Resource.findById(id);
    if (!resource) {
      throw new NotFoundError(`Resource with ID '${id}' was not found.`, 'RESOURCE_NOT_FOUND');
    }

    const evaluation = await eligibilityService.evaluateEligibility(currentUser.id, resource, {
      startTime: query.startTime ? new Date(query.startTime) : undefined,
      endTime: query.endTime ? new Date(query.endTime) : undefined,
      safetyAgreementSigned: query.safetyAgreementSigned,
    });

    res.status(200).json({
      success: true,
      data: evaluation,
      eligible: evaluation.eligible,
      isEligible: evaluation.isEligible,
      eligibilityScore: evaluation.eligibilityScore,
      reasons: evaluation.reasons,
      blockingReasons: evaluation.blockingReasons,
      missingCertifications: evaluation.missingCertifications,
      missingTrainings: evaluation.missingTrainings,
      checks: evaluation.checks,
      recommendedRemediation: evaluation.recommendedRemediation,
    });
  }

  public async updateResource(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const updates: UpdateResourceInput = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      throw new ForbiddenError('Authentication required to update equipment listings.');
    }

    const resource = await Resource.findById(id);
    if (!resource) {
      throw new NotFoundError(`Resource with ID '${id}' was not found.`, 'RESOURCE_NOT_FOUND');
    }

    const hasAccess = checkObjectAccess(currentUser, {
      ownerId: resource.ownerId,
      department: resource.department,
      delegates: resource.delegates,
    });

    if (!hasAccess) {
      throw new ForbiddenError(
        'You do not have permission to modify this resource. Requires Owner, assigned Delegate, Departmental Lab Manager, or Admin.',
        'FORBIDDEN_OBJECT_ACCESS'
      );
    }

    if (updates.code && updates.code.toUpperCase() !== resource.code) {
      const codeCollision = await Resource.findOne({
        code: updates.code.toUpperCase(),
        _id: { $ne: resource._id },
      });
      if (codeCollision) {
        throw new ConflictError(
          `Resource code '${updates.code.toUpperCase()}' is already in use by another instrument.`,
          'CONFLICT_ERROR'
        );
      }
      resource.code = updates.code.toUpperCase();
    }

    if (updates.labId !== undefined) {
      if (updates.labId) {
        const labExists = await Lab.findById(updates.labId);
        if (!labExists) {
          throw new BadRequestError(
            `Associated laboratory facility with ID '${updates.labId}' does not exist.`,
            'RESOURCE_NOT_FOUND'
          );
        }
      }
      resource.labId = updates.labId ? (updates.labId as any) : null;
    }

    const previousStatus = resource.status;

    if (updates.title !== undefined) resource.title = updates.title;
    if (updates.name !== undefined) resource.name = updates.name;
    if (updates.category !== undefined) resource.category = updates.category;
    if (updates.department !== undefined) resource.department = updates.department;
    if (updates.labLocation !== undefined) resource.labLocation = updates.labLocation;
    if (updates.delegates !== undefined) resource.delegates = updates.delegates as any;
    if (updates.description !== undefined) resource.description = updates.description;
    if (updates.specs !== undefined) resource.specs = updates.specs;
    if (updates.specifications !== undefined) resource.specifications = updates.specifications;
    if (updates.status !== undefined) resource.status = updates.status;
    if (updates.approvalMode !== undefined) resource.approvalMode = updates.approvalMode;
    if (updates.hourlyRate !== undefined) resource.hourlyRate = updates.hourlyRate;
    if (updates.safetyLevel !== undefined) resource.safetyLevel = updates.safetyLevel;
    if (updates.capacity !== undefined) resource.capacity = updates.capacity;
    if (updates.leadTimeHours !== undefined) resource.leadTimeHours = updates.leadTimeHours;
    if (updates.bufferMinutes !== undefined) resource.bufferMinutes = updates.bufferMinutes;
    if (updates.cooldownMinutes !== undefined) resource.cooldownMinutes = updates.cooldownMinutes;
    if (updates.operatingHours !== undefined) resource.operatingHours = updates.operatingHours;
    if (updates.calendar !== undefined) resource.calendar = updates.calendar as any;
    if (updates.customChecklists !== undefined) resource.customChecklists = updates.customChecklists as any;
    if (updates.inspectionChecklist !== undefined) resource.inspectionChecklist = updates.inspectionChecklist as any;
    if (updates.inspectionConfig !== undefined) resource.inspectionConfig = updates.inspectionConfig as any;
    if (updates.requiredCertifications !== undefined) resource.requiredCertifications = updates.requiredCertifications as any;
    if (updates.prerequisites !== undefined) resource.prerequisites = updates.prerequisites as any;
    if (updates.maintenanceWindows !== undefined) resource.maintenanceWindows = updates.maintenanceWindows as any;
    if (updates.accessControl !== undefined) resource.accessControl = updates.accessControl as any;

    await resource.save();
    await resource.populate([
      { path: 'ownerId', select: 'name email department role' },
      { path: 'delegates', select: 'name email department role' },
      { path: 'labId', select: 'name code building room' },
    ]);

    if (updates.status && updates.status !== previousStatus) {
      emitToResource(resource._id.toString(), SOCKET_EVENTS.RESOURCE_STATUS_CHANGED, {
        resourceId: resource._id.toString(),
        previousStatus,
        status: resource.status,
        timestamp: new Date().toISOString(),
      });
      broadcastEvent(SOCKET_EVENTS.RESOURCE_STATUS_CHANGED, {
        resourceId: resource._id.toString(),
        status: resource.status,
      });
    }

    res.status(200).json({
      success: true,
      data: resource,
      message: 'Resource profile and operational settings updated successfully',
    });
  }

  public async scheduleMaintenance(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const { title, startTime, endTime, recurrence = 'NONE', blocksBookings = true } = req.body;
    const currentUser = req.user;

    if (!currentUser) {
      throw new ForbiddenError('Authentication required to schedule maintenance.');
    }

    const resource = await Resource.findById(id);
    if (!resource) {
      throw new NotFoundError(`Resource with ID '${id}' was not found.`, 'RESOURCE_NOT_FOUND');
    }

    const hasAccess = checkObjectAccess(currentUser, {
      ownerId: resource.ownerId,
      department: resource.department,
      delegates: resource.delegates,
    });

    if (!hasAccess) {
      throw new ForbiddenError(
        'You do not have permission to schedule maintenance for this resource.',
        'FORBIDDEN_OBJECT_ACCESS'
      );
    }

    if (!title || !startTime || !endTime) {
      throw new BadRequestError('title, startTime, and endTime are required for maintenance.');
    }

    const s = new Date(startTime);
    const e = new Date(endTime);
    if (e <= s) {
      throw new BadRequestError('endTime must be strictly greater than startTime');
    }

    const windowId = `maint-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
    resource.maintenanceWindows.push({
      windowId,
      title,
      startTime: s,
      endTime: e,
      recurrence,
      blocksBookings,
    });

    await resource.save();

    res.status(201).json({
      success: true,
      data: resource.maintenanceWindows,
      message: 'Maintenance window scheduled successfully',
    });
  }
}

export const resourceController = new ResourceController();
