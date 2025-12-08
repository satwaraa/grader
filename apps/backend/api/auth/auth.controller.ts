import { Router, type Request, type Response } from "express";
import { authMiddleware } from "../middleware/auth.middleware";
import { catchAsync } from "../utils/catchAsyncWrapper";
import { authManager } from "./auth.manager";

export class AuthController {
    public router = Router();
    private _authManager = new authManager();

    constructor() {
        this.initializeRouter();
    }

    private initializeRouter() {
        this.router.post("/register", catchAsync(this.register.bind(this)));
        this.router.post("/login", catchAsync(this.login.bind(this)));
        this.router.get(
            "/me",
            authMiddleware,
            catchAsync(this.getCurrentUser.bind(this)),
        );
        this.router.post("/refresh", catchAsync(this.refreshToken.bind(this)));
    }

    public async register(req: Request, res: Response) {
        const { email, password, name, role } = req.body;

        if (!email || !password || !name) {
            return res.status(400).json({
                success: false,
                message: "Email, password, and name are required",
            });
        }

        const result = await this._authManager.register({
            email,
            password,
            name,
            role,
        });

        if (!result.success) {
            return res.status(400).json(result);
        }

        return res.status(201).json(result);
    }

    public async login(req: Request, res: Response) {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({
                success: false,
                message: "Email and password are required",
            });
        }

        const result = await this._authManager.login(email, password);

        if (!result.success) {
            return res.status(401).json(result);
        }

        return res.status(200).json(result);
    }

    public async getCurrentUser(req: Request, res: Response) {
        const userId = (req as any).userId;

        const result = await this._authManager.getCurrentUser(userId);

        if (!result.success) {
            return res.status(404).json(result);
        }

        return res.status(200).json(result);
    }

    public async refreshToken(req: Request, res: Response) {
        const { refreshToken } = req.body;

        if (!refreshToken) {
            return res.status(400).json({
                success: false,
                message: "Refresh token is required",
            });
        }

        const result = await this._authManager.refreshToken(refreshToken);

        if (!result.success) {
            return res.status(401).json(result);
        }

        return res.status(200).json(result);
    }
}
