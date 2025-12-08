import { Router, type Request, type Response } from "express";
import { catchAsync } from "../utils/catchAsyncWrapper";
import { userManager } from "./user.manager";

export class userController {
    public router = Router();
    private _userManager = new userManager();

    counstructor() {
        this.initializeRouter();
    }
    private initializeRouter() {
        this.router.get("/health", catchAsync(this.health.bind(this)));
    }
    public async health(req: Request, res: Response) {
        return res.status(200).json({ message: "Ok" });
    }
}
