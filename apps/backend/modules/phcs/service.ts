import { UserStatus } from "@prisma/client";
import type { AccessPolicy } from "../../common/policies/access.policy.js";
import { AppError } from "../../utils/app-error.js";
import type { PhcRepository } from "./repository.js";
import type { StatisticsQuery, UpdateAshaWorkerInput, UpdatePhcInput } from "./validation.js";

export class PhcService {
  public constructor(
    private readonly repository: PhcRepository,
    private readonly access: AccessPolicy,
  ) {}

  public async me(userId: string) {
    const admin = await this.access.requireAdminPhc(userId);
    const phc = await this.repository.find(admin.phcId);
    if (!phc) throw new AppError("PHC not found.", 404, "RESOURCE_NOT_FOUND");
    return phc;
  }

  public async update(userId: string, input: UpdatePhcInput) {
    const admin = await this.access.requireAdminPhc(userId);
    return this.repository.update(admin.phcId, input, userId);
  }

  public async villages(userId: string) {
    const admin = await this.access.requireAdminPhc(userId);
    return { items: await this.repository.villages(admin.phcId) };
  }

  public async village(userId: string, villageId: string) {
    const admin = await this.access.requireAdminPhc(userId);
    const village = await this.repository.village(admin.phcId, villageId);
    if (!village) throw new AppError("Village not found.", 404, "RESOURCE_NOT_FOUND");
    return village;
  }

  public async overview(userId: string) {
    const admin = await this.access.requireAdminPhc(userId);
    return this.repository.overview(admin.phcId, this.today());
  }

  public async statistics(userId: string, query: StatisticsQuery) {
    const phcId = await this.phcWithVillage(userId, query.villageId);
    return this.repository.statistics(phcId, query.villageId, query.from, query.to);
  }

  public async diseaseStatistics(userId: string, query: StatisticsQuery) {
    const phcId = await this.phcWithVillage(userId, query.villageId);
    return this.repository.diseaseStatistics(phcId, query.villageId, query.from, query.to);
  }

  public async villageStatistics(userId: string) {
    const admin = await this.access.requireAdminPhc(userId);
    return this.repository.villageStatistics(admin.phcId);
  }

  public async ashaWorkers(userId: string) {
    const admin = await this.access.requireAdminPhc(userId);
    const workers = await this.repository.ashaWorkers(admin.phcId);
    return {
      items: workers.map((worker) => ({
        id: worker.id,
        userId: worker.userId,
        fullName: worker.fullName,
        employeeCode: worker.employeeCode,
        status: worker.user.status,
        village: { id: worker.village.id, name: worker.village.name },
        createdAt: worker.createdAt,
      })),
    };
  }

  public async updateAshaWorker(
    userId: string,
    workerId: string,
    input: UpdateAshaWorkerInput,
  ) {
    const admin = await this.access.requireAdminPhc(userId);
    const worker = await this.repository.findAshaWorker(admin.phcId, workerId);
    if (!worker) throw new AppError("ASHA worker not found in your PHC.", 404, "RESOURCE_NOT_FOUND");
    if (input.villageId) {
      const village = await this.repository.village(admin.phcId, input.villageId);
      if (!village) throw new AppError("Village not found in your PHC.", 404, "RESOURCE_NOT_FOUND");
    }
    const updated = await this.repository.updateAshaWorker(workerId, input);
    return {
      id: updated.id,
      userId: updated.userId,
      fullName: updated.fullName,
      employeeCode: updated.employeeCode,
      status: updated.user.status,
      village: { id: updated.village.id, name: updated.village.name },
      createdAt: updated.createdAt,
    };
  }

  public async activateAshaWorker(userId: string, workerId: string) {
    const admin = await this.access.requireAdminPhc(userId);
    const updated = await this.repository.updateAshaWorkerStatus(workerId, UserStatus.ACTIVE, admin.phcId);
    if (!updated) throw new AppError("ASHA worker not found in your PHC.", 404, "RESOURCE_NOT_FOUND");
    return {
      id: updated.id,
      userId: updated.userId,
      fullName: updated.fullName,
      employeeCode: updated.employeeCode,
      status: updated.user.status,
      village: { id: updated.village.id, name: updated.village.name },
      createdAt: updated.createdAt,
    };
  }

  public async deactivateAshaWorker(userId: string, workerId: string) {
    const admin = await this.access.requireAdminPhc(userId);
    const updated = await this.repository.updateAshaWorkerStatus(workerId, UserStatus.INACTIVE, admin.phcId);
    if (!updated) throw new AppError("ASHA worker not found in your PHC.", 404, "RESOURCE_NOT_FOUND");
    return {
      id: updated.id,
      userId: updated.userId,
      fullName: updated.fullName,
      employeeCode: updated.employeeCode,
      status: updated.user.status,
      village: { id: updated.village.id, name: updated.village.name },
      createdAt: updated.createdAt,
    };
  }

  public async deleteAshaWorker(userId: string, workerId: string) {
    const admin = await this.access.requireAdminPhc(userId);
    const result = await this.repository.deleteAshaWorker(admin.phcId, workerId);
    if (!result) throw new AppError("ASHA worker not found in your PHC.", 404, "RESOURCE_NOT_FOUND");
    return { success: true };
  }

  public async operations(userId: string) {
    const admin = await this.access.requireAdminPhc(userId);
    return this.repository.operations(admin.phcId, this.today());
  }

  private async phcWithVillage(userId: string, villageId?: string) {
    const admin = await this.access.requireAdminPhc(userId);
    if (villageId && !(await this.repository.village(admin.phcId, villageId))) {
      throw new AppError("Village not found.", 404, "RESOURCE_NOT_FOUND");
    }
    return admin.phcId;
  }

  private today(): Date {
    const date = new Date();
    date.setUTCHours(0, 0, 0, 0);
    return date;
  }
}
