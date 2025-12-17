import type { Request, Response } from "express";
import { Router } from "express";
import { successResponse } from "../../lib/apiResponse";
import { authMiddleware } from "../middleware/auth.middleware";
import { catchAsync } from "../utils/catchAsyncWrapper";
import { RubricManager } from "./rubric.manager";

export class RubricController {
    public router: Router;
    private rubricManager: RubricManager;

    constructor() {
        this.router = Router();
        this.rubricManager = new RubricManager();
        this.initializeRoutes();
    }

    private initializeRoutes() {
        this.router.post("/", authMiddleware, catchAsync(this.createRubric.bind(this)));

        this.router.get("/", authMiddleware, catchAsync(this.getRubrics.bind(this)));

        this.router.get("/:id", authMiddleware, catchAsync(this.getRubric.bind(this)));

        this.router.put("/:id", authMiddleware, catchAsync(this.updateRubric.bind(this)));

        this.router.delete(
            "/:id",
            authMiddleware,
            catchAsync(this.deleteRubric.bind(this)),
        );
    }

    private async createRubric(req: Request, res: Response) {
        const { name, criteria } = req.body;
        const teacherId = req.user!.id;

        const rubric = await this.rubricManager.createRubric({
            name,
            criteria,
            teacherId,
        });

        return res
            .status(201)
            .json(successResponse(rubric, "Rubric created successfully"));
    }

    private async getRubrics(req: Request, res: Response) {
        const teacherId = req.user!.id;
        const rubrics = await this.rubricManager.getRubricsByTeacher(teacherId);
        return res
            .status(200)
            .json(successResponse(rubrics, "Rubrics fetched successfully"));
    }

    private async getRubric(req: Request, res: Response) {
        const { id } = req.params;
        if (id) {
            const rubric = await this.rubricManager.getRubricById(id);
            return res
                .status(200)
                .json(successResponse(rubric, "Rubric fetched successfully"));
        }
        return res.status(401).json({ message: "cant find id" });
    }

    private async updateRubric(req: Request, res: Response) {
        const { id } = req.params;
        const { name, criteria } = req.body;
        if (!id) {
            return res.status(401).json({ message: "Can't find id" });
        }
        const rubric = await this.rubricManager.updateRubric(id, { name, criteria });
        return res
            .status(200)
            .json(successResponse(rubric, "Rubric updated successfully"));
    }

    private async deleteRubric(req: Request, res: Response) {
        const { id } = req.params;
        if (!id) {
            return res.status(401).json({ message: "Can't find id" });
        }
        await this.rubricManager.deleteRubric(id);
        return res.status(200).json(successResponse(null, "Rubric deleted successfully"));
    }
}
