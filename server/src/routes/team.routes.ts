import { Router } from "express";

import {
  teamController,
} from "../controllers/team.controller.js";

import {
  requireAuth,
} from "../middlewares/require-auth.js";

import {
  requireTeamRole,
} from "../middlewares/require-team-role.js";

import {
  validateBody,
  validateParams,
} from "../middlewares/validate.js";

import {
  createTeamSchema,
  updateTeamSchema,
  addMemberSchema,
  updateMemberRoleSchema,
  teamIdParamsSchema,
  teamMemberParamsSchema,
} from "../schemas/team.schemas.js";

import {
  projectController,
} from "../controllers/project.controller.js";

import {
  createProjectSchema,
} from "../schemas/project.schemas.js";

const teamRouter = Router();

teamRouter.use(requireAuth);

/*
 * Equipes do usuário
 */

teamRouter.get(
  "/",
  teamController.list,
);

teamRouter.post(
  "/",
  validateBody(createTeamSchema),
  teamController.create,
);

/*
 * Equipe específica
 */

teamRouter.get(
  "/:teamId",
  validateParams(teamIdParamsSchema),
  requireTeamRole(
    "OWNER",
    "ADMIN",
    "MEMBER",
  ),
  teamController.getById,
);

teamRouter.patch(
  "/:teamId",
  validateParams(teamIdParamsSchema),
  validateBody(updateTeamSchema),
  requireTeamRole(
    "OWNER",
    "ADMIN",
  ),
  teamController.update,
);

teamRouter.delete(
  "/:teamId",
  validateParams(teamIdParamsSchema),
  requireTeamRole("OWNER"),
  teamController.delete,
);

/*
 * Membros
 */

teamRouter.post(
  "/:teamId/members",
  validateParams(teamIdParamsSchema),
  validateBody(addMemberSchema),
  requireTeamRole(
    "OWNER",
    "ADMIN",
  ),
  teamController.addMember,
);

teamRouter.patch(
  "/:teamId/members/:userId",
  validateParams(teamMemberParamsSchema),
  validateBody(updateMemberRoleSchema),
  requireTeamRole("OWNER"),
  teamController.updateMemberRole,
);

teamRouter.delete(
  "/:teamId/members/:userId",
  validateParams(teamMemberParamsSchema),
  requireTeamRole(
    "OWNER",
    "ADMIN",
  ),
  teamController.removeMember,
);

teamRouter.post(
  "/:teamId/projects",
  validateParams(teamIdParamsSchema),
  validateBody(createProjectSchema),
  requireTeamRole(
    "OWNER",
    "ADMIN",
    "MEMBER",
  ),
  projectController.create,
);

export default teamRouter;
