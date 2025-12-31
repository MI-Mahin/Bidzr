export * from './auth';
export * from './errorHandler';
export * from './validation';

import authMiddleware from './auth';
import errorMiddleware from './errorHandler';
import validationMiddleware from './validation';

export default {
  ...authMiddleware,
  ...errorMiddleware,
  ...validationMiddleware,
};
