import { Router } from 'express';
import { teamController } from '../controllers';
import { authenticate, teamOwnerOnly, teamOwnerOrAdmin } from '../middleware/auth';
import { registerTeamValidation, mongoIdValidation } from '../middleware/validation';

const router = Router();

/**
 * @route   POST /api/teams/register
 * @desc    Register a new team for an auction
 * @access  Private (Team Owner)
 */
router.post(
  '/register',
  authenticate,
  teamOwnerOnly,
  registerTeamValidation,
  teamController.registerTeam
);

/**
 * @route   GET /api/teams/my-teams
 * @desc    Get current user's teams
 * @access  Private (Team Owner)
 */
router.get('/my-teams', authenticate, teamOwnerOnly, teamController.getMyTeams);

/**
 * @route   GET /api/teams/auction/:auctionId
 * @desc    Get teams for an auction
 * @access  Private
 */
router.get(
  '/auction/:auctionId',
  authenticate,
  mongoIdValidation('auctionId'),
  teamController.getTeamsByAuction
);

/**
 * @route   GET /api/teams/:id
 * @desc    Get team by ID
 * @access  Private
 */
router.get('/:id', authenticate, mongoIdValidation(), teamController.getTeamById);

/**
 * @route   GET /api/teams/:id/players
 * @desc    Get team's acquired players
 * @access  Private
 */
router.get(
  '/:id/players',
  authenticate,
  mongoIdValidation(),
  teamController.getTeamPlayers
);

/**
 * @route   PUT /api/teams/:id
 * @desc    Update team
 * @access  Private (Team Owner)
 */
router.put(
  '/:id',
  authenticate,
  teamOwnerOnly,
  mongoIdValidation(),
  teamController.updateTeam
);

/**
 * @route   DELETE /api/teams/:id
 * @desc    Withdraw team from auction
 * @access  Private (Team Owner)
 */
router.delete(
  '/:id',
  authenticate,
  teamOwnerOnly,
  mongoIdValidation(),
  teamController.withdrawTeam
);

export default router;
