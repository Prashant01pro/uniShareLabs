import { Request, Response } from 'express';
import { Lab } from './lab.model';
import { User } from '../auth/user.model';
import { ConflictError, NotFoundError, ForbiddenError, BadRequestError } from '../../middleware/error.middleware';
import { CreateLabInput, UpdateLabInput, LabQueryInput } from './lab.validation';

export class LabController {
  public async createLab(req: Request, res: Response): Promise<void> {
    const input: CreateLabInput = req.body;

    const existingLab = await Lab.findByCode(input.code);
    if (existingLab) {
      throw new ConflictError(
        `A laboratory with code '${input.code.toUpperCase()}' already exists.`,
        'CONFLICT_ERROR'
      );
    }

    if (input.safetyOfficerId) {
      const officer = await User.findById(input.safetyOfficerId);
      if (!officer) {
        throw new BadRequestError(
          `Designated safety officer with ID '${input.safetyOfficerId}' was not found.`,
          'USER_NOT_FOUND'
        );
      }
    }

    const lab = new Lab({
      ...input,
      code: input.code.toUpperCase(),
    });

    await lab.save();
    await lab.populate('safetyOfficerId', 'name email department role');

    res.status(201).json({
      success: true,
      data: lab,
      message: 'Laboratory facility registered successfully',
    });
  }

  public async listLabs(req: Request, res: Response): Promise<void> {
    const query = req.query as unknown as LabQueryInput;
    const page = Math.max(1, Number(query.page) || 1);
    const limit = Math.min(100, Math.max(1, Number(query.limit) || 20));
    const skip = (page - 1) * limit;

    const filter: Record<string, any> = {};

    if (query.department) {
      filter.department = { $regex: new RegExp(`^${query.department.trim()}$`, 'i') };
    }

    if (query.building) {
      filter.building = { $regex: new RegExp(query.building.trim(), 'i') };
    }

    if (query.isActive !== undefined) {
      filter.isActive = query.isActive;
    }

    if (query.search) {
      const searchRegex = new RegExp(query.search.trim(), 'i');
      filter.$or = [
        { name: searchRegex },
        { code: searchRegex },
        { department: searchRegex },
        { building: searchRegex },
        { room: searchRegex },
        { description: searchRegex },
      ];
    }

    const [total, labs] = await Promise.all([
      Lab.countDocuments(filter),
      Lab.find(filter)
        .populate('safetyOfficerId', 'name email department role')
        .sort({ department: 1, name: 1 })
        .skip(skip)
        .limit(limit)
        .lean(),
    ]);

    const pages = Math.ceil(total / limit) || 1;

    res.status(200).json({
      success: true,
      data: labs,
      pagination: {
        total,
        page,
        pages,
        limit,
      },
    });
  }

  public async getLabById(req: Request, res: Response): Promise<void> {
    const { id } = req.params;

    const lab = await Lab.findById(id).populate('safetyOfficerId', 'name email department role');
    if (!lab) {
      throw new NotFoundError(`Laboratory with ID '${id}' was not found.`, 'RESOURCE_NOT_FOUND');
    }

    res.status(200).json({
      success: true,
      data: lab,
    });
  }

  public async updateLab(req: Request, res: Response): Promise<void> {
    const { id } = req.params;
    const updates: UpdateLabInput = req.body;
    const currentUser = req.user;

    const lab = await Lab.findById(id);
    if (!lab) {
      throw new NotFoundError(`Laboratory with ID '${id}' was not found.`, 'RESOURCE_NOT_FOUND');
    }

    if (currentUser && currentUser.role !== 'ADMIN') {
      const isDeptManager =
        currentUser.role === 'LAB_MANAGER' &&
        currentUser.department.toLowerCase() === lab.department.toLowerCase();
      const isSafetyOfficer = lab.safetyOfficerId?.toString() === currentUser.id;

      if (!isDeptManager && !isSafetyOfficer) {
        throw new ForbiddenError(
          'You do not have permission to modify this laboratory. Requires ADMIN, departmental LAB_MANAGER, or assigned Safety Officer.',
          'FORBIDDEN_OBJECT_ACCESS'
        );
      }
    }

    if (updates.code && updates.code.toUpperCase() !== lab.code) {
      const codeCollision = await Lab.findOne({
        code: updates.code.toUpperCase(),
        _id: { $ne: lab._id },
      });
      if (codeCollision) {
        throw new ConflictError(
          `Laboratory code '${updates.code.toUpperCase()}' is already in use by another facility.`,
          'CONFLICT_ERROR'
        );
      }
      lab.code = updates.code.toUpperCase();
    }

    if (updates.safetyOfficerId !== undefined) {
      if (updates.safetyOfficerId) {
        const officer = await User.findById(updates.safetyOfficerId);
        if (!officer) {
          throw new BadRequestError(
            `Designated safety officer with ID '${updates.safetyOfficerId}' was not found.`,
            'USER_NOT_FOUND'
          );
        }
      }
      lab.safetyOfficerId = updates.safetyOfficerId ? (updates.safetyOfficerId as any) : null;
    }

    if (updates.name !== undefined) lab.name = updates.name;
    if (updates.institution !== undefined) lab.institution = updates.institution;
    if (updates.department !== undefined) lab.department = updates.department;
    if (updates.building !== undefined) lab.building = updates.building;
    if (updates.room !== undefined) lab.room = updates.room;
    if (updates.contactEmail !== undefined) lab.contactEmail = updates.contactEmail;
    if (updates.operationalHours !== undefined) lab.operationalHours = updates.operationalHours;
    if (updates.certificationsSupported !== undefined) lab.certificationsSupported = updates.certificationsSupported;
    if (updates.description !== undefined) lab.description = updates.description;
    if (updates.capacity !== undefined) lab.capacity = updates.capacity;
    if (updates.safetyLevel !== undefined) lab.safetyLevel = updates.safetyLevel;
    if (updates.isActive !== undefined) lab.isActive = updates.isActive;

    await lab.save();
    await lab.populate('safetyOfficerId', 'name email department role');

    res.status(200).json({
      success: true,
      data: lab,
      message: 'Laboratory facility updated successfully',
    });
  }
}

export const labController = new LabController();
