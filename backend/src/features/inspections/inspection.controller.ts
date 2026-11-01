import { Request, Response, NextFunction } from 'express';
import { inspectionService } from './inspection.service';

export class InspectionController {
  async checkIn(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const result = await inspectionService.checkIn(req.body, user);

      res.status(200).json({
        success: true,
        status: result.status,
        accessPin: result.accessPin,
        sessionStartTime: result.sessionStartTime,
        inspection: result.inspection,
        initialInspection: result.initialInspection,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async return(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const result = await inspectionService.returnResource(req.body, user);

      res.status(200).json({
        success: true,
        status: result.bookingStatus,
        bookingStatus: result.bookingStatus,
        sessionSummary: result.sessionSummary,
        diff: result.diff,
        initialInspection: result.initialInspection,
        finalInspection: result.finalInspection,
        incident: result.incident,
        data: result,
      });
    } catch (err) {
      next(err);
    }
  }

  async getByBookingId(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const bookingId = String(req.params.bookingId);
      const result = await inspectionService.getByBookingId(bookingId);

      res.status(200).json({
        success: true,
        data: result,
        initialInspection: result.initialInspection,
        finalInspection: result.finalInspection,
        diff: result.diff,
      });
    } catch (err) {
      next(err);
    }
  }
}

export const inspectionController = new InspectionController();
