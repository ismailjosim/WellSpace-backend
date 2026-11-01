import type { Request, Response } from 'express';
import StatusCode from '@/utils/statusCode';
import sendResponse from '@/shared/sendResponse';
import { AuthServices } from './auth.services';
import { setAuthCookie } from '@/utils/setAuthCookie';
import AppError from '@/helpers/AppError';
import catchAsync from '../../shared/catchAsync';

const login = async (req: Request, res: Response) => {
  const result = await AuthServices.loginIntoDB(req.body);

  if ('mfaRequired' in result && result.mfaRequired) {
    sendResponse(res, {
      success: true,
      statusCode: StatusCode.OK,
      message: 'Two-factor authentication required',
      data: {
        mfaRequired: true,
        mfaToken: result.mfaToken,
        user: result.user,
      },
    });
    return;
  }

  setAuthCookie(res, {
    accessToken: result.accessToken as string,
    refreshToken: result.refreshToken as string,
  });
  sendResponse(res, {
    success: true,
    statusCode: StatusCode.OK,
    message: 'User logged in successfully',
    data: {
      ...result,
    },
  });
};
const getMe = async (req: Request, res: Response) => {
  let accessToken = req.cookies?.accessToken || req.headers.authorization;
  if (accessToken && accessToken.startsWith('Bearer ')) {
    accessToken = accessToken.slice(7);
  }

  if (!accessToken) {
    throw new AppError(StatusCode.UNAUTHORIZED, 'Authentication token not provided');
  }

  const result = await AuthServices.getMeFromDB(accessToken);

  sendResponse(res, {
    success: true,
    statusCode: StatusCode.OK,
    message: 'User profile retrieved successfully',
    data: result,
  });
};

const refreshToken = async (req: Request, res: Response) => {
  const refreshToken = req.body.refreshToken || req.cookies.refreshToken;
  // console.log({ refreshController: refreshToken })
  if (!refreshToken) {
    throw new AppError(StatusCode.BAD_REQUEST, 'No Refresh Token received');
  }

  const loginInfo = await AuthServices.refreshTokenFromDB(refreshToken);
  // console.log({ loginInfo })

  setAuthCookie(res, loginInfo);

  sendResponse(res, {
    success: true,
    statusCode: StatusCode.CREATED,
    message: 'New Access Token Generate successfully',
    data: {
      accessToken: loginInfo.accessToken,
    },
  });
};

const changePassword = async (req: Request, res: Response) => {
  const { newPassword, oldPassword } = req.body;
  const user = req.user;
  await AuthServices.changePasswordIntoDB(oldPassword, newPassword, user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCode.OK,
    message: 'Password reset Successfully',
    data: null,
  });
};
const forgetPassword = async (req: Request, res: Response) => {
  const result = await AuthServices.loginIntoDB(req.body);
  setAuthCookie(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });
  sendResponse(res, {
    success: true,
    statusCode: StatusCode.OK,
    message: 'User logged in successfully',
    data: {
      ...result,
    },
  });
};
const resetPassword = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  // Extract token from Authorization header (remove "Bearer " prefix)
  const authHeader = req.headers.authorization;
  // console.log({ authHeader })
  const token = authHeader ? authHeader.replace('Bearer ', '') : null;
  const user = req.user; // Will be populated if authenticated via middleware

  await AuthServices.resetPasswordIntoDB(token, req.body, user);

  sendResponse(res, {
    success: true,
    statusCode: StatusCode.OK,
    message: 'Password Reset!',
    data: null,
  });
});

const mfaSetup = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await AuthServices.mfaSetupIntoDB(req.user);
  sendResponse(res, {
    success: true,
    statusCode: StatusCode.OK,
    message: 'MFA setup initiated. Scan QR code or enter secret key.',
    data: result,
  });
});

const mfaVerifySetup = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await AuthServices.mfaVerifySetupIntoDB(req.user, req.body.token);
  sendResponse(res, {
    success: true,
    statusCode: StatusCode.OK,
    message: result.message,
    data: null,
  });
});

const mfaChallenge = catchAsync(async (req: Request, res: Response) => {
  const { mfaToken, code, isBackupCode } = req.body;
  if (!mfaToken || !code) {
    throw new AppError(StatusCode.BAD_REQUEST, 'MFA token and verification code are required');
  }

  const result = await AuthServices.mfaChallengeIntoDB(mfaToken, code, isBackupCode);

  setAuthCookie(res, {
    accessToken: result.accessToken,
    refreshToken: result.refreshToken,
  });

  sendResponse(res, {
    success: true,
    statusCode: StatusCode.OK,
    message: 'Two-factor authentication verified successfully',
    data: {
      ...result,
    },
  });
});

const mfaDisable = catchAsync(async (req: Request & { user?: any }, res: Response) => {
  const result = await AuthServices.mfaDisableIntoDB(req.user, req.body.token);
  sendResponse(res, {
    success: true,
    statusCode: StatusCode.OK,
    message: result.message,
    data: null,
  });
});

export const AuthControllers = {
  login,
  refreshToken,
  changePassword,
  forgetPassword,
  resetPassword,
  getMe,
  mfaSetup,
  mfaVerifySetup,
  mfaChallenge,
  mfaDisable,
};
