const User = require('./../models/userModel');
const catchAsync = require('./../utils/catchAsync');
const AppError = require('./../utils/appError');

filterObj = (data, ...allowedFields) => {
  const newObj = {};
  Object.keys(data).forEach((el) => {
    if (allowedFields.includes(el)) newObj[el] = data[el];
  });
  return newObj;
};

exports.getAllUsers = catchAsync(async (req, res, next) => {
  //EXECUTE QUERY
  const users = await User.find();
  res.status(200).json({
    status: 'success',
    results: users.length,
    data: {
      users,
    },
  });
});

exports.updateMe = catchAsync(async (req, res, next) => {
  // 1) Create error if user POSTs password data
  if (req.body.password || req.body.passwordConfirm) {
    return next(
      new AppError(
        'This route is not for password updates. Please user /udpateMyPassword',
        400
      )
    );
  }

  const filteredData = filterObj(req.body, 'name', 'email');
  // 2) update user document
  const updatedUser = await User.findByIdAndUpdate(req.user.id, filteredData, {
    new: true,
    runValidators: true,
  });
  res.status(200).json({
    status: 'success',
    data: {
      users: updatedUser,
    },
  });
});

exports.deleteMe = async (req, res, next) => {
  await User.findByIdAndUpdate(req.user.id, { active: false });

  res.status(204).json({
    status: 'success',
    data: null,
  });
};

exports.getUser = (req, res) => {
  res.status(500).json({
    status: 'err',
    message: 'This route is not yet defined!',
  });
};
exports.createUser = (req, res) => {
  res.status(500).json({
    status: 'err',
    message: 'This route is not yet defined!',
  });
};
exports.updateUser = (req, res) => {
  res.status(500).json({
    status: 'err',
    message: 'This route is not yet defined!',
  });
};
exports.deleteUser = (req, res) => {
  res.status(500).json({
    status: 'err',
    message: 'This route is not yet defined!',
  });
};
