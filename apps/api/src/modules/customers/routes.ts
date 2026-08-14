import { Router } from 'express';

import { requireAuth } from '../../auth/auth.middleware.js';
import { asyncHandler } from '../../common/utils/async-handler.js';
import { createCustomer, deleteCustomer, getCustomer, listCustomers, updateCustomer } from './controller.js';

const customersRouter = Router();

customersRouter.use(requireAuth);
customersRouter.get('/', asyncHandler(listCustomers));
customersRouter.post('/', asyncHandler(createCustomer));
customersRouter.get('/:customerId', asyncHandler(getCustomer));
customersRouter.patch('/:customerId', asyncHandler(updateCustomer));
customersRouter.delete('/:customerId', asyncHandler(deleteCustomer));

export { customersRouter };
