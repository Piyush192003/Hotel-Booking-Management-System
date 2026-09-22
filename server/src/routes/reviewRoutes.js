import { Router } from 'express';
import * as reviewCtrl from '../controllers/reviewController.js';
import { authenticateUser, authorizeRole, optionalAuthenticate } from '../middleware/authMiddleware.js';
import { validate } from '../middleware/validate.js';
import { createReviewValidator, updateReviewValidator, replyReviewValidator, moderateReviewValidator, commentValidator, deleteCommentValidator } from '../validators/reviewValidator.js';

const router = Router();

router.get('/hotels/:hotelId', async (req, res, next) => {
  const { hotelReviews } = await import('../controllers/hotelController.js');
  return hotelReviews(req, res, next);
});

router.post('/', authenticateUser, validate(createReviewValidator), reviewCtrl.createReview);
router.get('/my', authenticateUser, reviewCtrl.myReviews);
router.put('/:id', authenticateUser, validate(updateReviewValidator), reviewCtrl.updateReview);
router.delete('/:id', authenticateUser, reviewCtrl.deleteReview);
router.post('/:id/reply', authenticateUser, authorizeRole('owner'), validate(replyReviewValidator), reviewCtrl.replyReview);
router.patch('/:id/moderate', authenticateUser, authorizeRole('admin'), validate(moderateReviewValidator), reviewCtrl.moderateReview);

// Comments on reviews
router.post('/:id/comments', authenticateUser, validate(commentValidator), reviewCtrl.addComment);
router.put('/:id/comments/:commentId', authenticateUser, validate(commentValidator), reviewCtrl.updateComment);
router.delete('/:id/comments/:commentId', authenticateUser, validate(deleteCommentValidator), reviewCtrl.deleteComment);

export default router;