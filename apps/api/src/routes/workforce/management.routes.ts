import { Router, type Router as ExpressRouter } from "express";
import { departmentsRouter } from "./departments.routes";
import { employeesRouter } from "./employees.routes";
import { schedulesRouter } from "./schedules.routes";
import { locationsRouter } from "./locations.routes";
import { noticesRouter } from "./notices.routes";
export const managementRouter: ExpressRouter = Router();
managementRouter.use(
  departmentsRouter,
  employeesRouter,
  schedulesRouter,
  locationsRouter,
  noticesRouter,
);
