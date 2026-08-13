import { ObjectId } from 'mongodb';

import { AppError } from '../errors/app-error.js';

export const parseObjectId = (value: string, fieldName = 'id') => {
  if (!ObjectId.isValid(value)) {
    throw new AppError('INVALID_ID', `${fieldName} must be a valid identifier.`, 400);
  }

  return new ObjectId(value);
};
