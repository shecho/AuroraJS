const path = require("path");
const helper = require("../helpers/libs");
const fs = require("fs-extra");
const { software, comment, user } = require("../models/index");
const md5 = require("md5");
const sidebar = require("../helpers/sidebar");
const { DefaultLocale, userSession } = require("../keys");
const userSessionVerification = require("../helpers/userVerification");
const stripe = require("stripe")("sk_test_PbVyc5UdjKaPyLjN1wQrVNOh00GsVyog6c");

const ctrl = {};

ctrl.index = async (req, res) => {
  // First of all load the JSON where's the language to translate the page
  let CurrentLanguage = req.params.language;
  let toTranslateJSON = require(`../locales/${CurrentLanguage}.json`);
  // User session verification
  let actualUserSession = userSession.actualUserSession;
  let userProperties = {};
  userProperties = userSessionVerification.userSessionResponse(
    actualUserSession
  );

  // Search & load 'softwares' with the search of softwares within the MongoDB database
  const softwares = await software.find().sort({ timestamp: -1 });

  // Load viewModel with an array for softwares and title.
  let viewModel = {
    softs: [],
    title: `${toTranslateJSON.software} - Aurora Development`
  };
  viewModel.language = toTranslateJSON;
  viewModel.language.CurrentLanguage = CurrentLanguage;
  viewModel.softs = softwares;
  viewModel.session = userProperties;
  viewModel.session.username = userSession.username;

  // Reassign preferedLanguage to the current selected language.
  DefaultLocale.preferedUserLanguage = CurrentLanguage;

  if (softwares[0] === undefined) {
    res.render("sections/softwareSection/softwareIndex", viewModel);
  } else {
    // Load sidebar with data from db then render it ONLY if there's any existant software.
    viewModel = await sidebar(viewModel);
    res.render("sections/softwareSection/softwareIndex", viewModel);
  }
};

ctrl.view = async (req, res) => {
  let CurrentLanguage = req.params.language;
  let toTranslateJSON = require(`../locales/${CurrentLanguage}.json`);
  let actualUserSession = userSession.actualUserSession;
  let userProperties = {};
  userProperties = userSessionVerification.userSessionResponse(
    actualUserSession
  );

  let viewModel = {
    soft: {},
    comments: {},
    language: {},
    title: `${toTranslateJSON.software} - Aurora Development`
  };
  viewModel.language = toTranslateJSON;
  viewModel.language.CurrentLanguage = CurrentLanguage;
  viewModel.session = userProperties;
  userProperties.nonlogged === true
    ? (viewModel.session.aintLogged = true)
    : null;
  viewModel.session.username = userSession.username;
  viewModel.session.email = userSession.email;

  // Software which will be rendered.
  let softwareToFind = req.params.software_id;

  const soft = await software.findOne({
    filename: { $regex: softwareToFind }
  });

  if (!(userProperties.nonlogged === true)) {
    let userInfo = await user.findOne({
      userId: userSession.userId
    });
    let verifyIfSoftwareIsAlreadyBought = await helper.checkBuy(
      userInfo.software_collection,
      soft.id
    );
    if (
      verifyIfSoftwareIsAlreadyBought ||
      userInfo.userId === soft.userUploaderId ||
      userSession.actualUserSession >= 3
    ) {
      viewModel.session.isAlreadyBought = true;
    }
  }

  // Increase software views whenever page is loaded.
  if (soft) {
    soft.views = soft.views + 1;
    viewModel.soft = soft;
    viewModel.soft.CurrentLanguage = req.params.language;
    await soft.save();
    viewModel.comments = await comment.find({ soft_id: soft._id });
    viewModel = await sidebar(viewModel);
    res.render("sections/softwareSection/softwareView", viewModel);
  } else {
    res.redirect(`/${req.params.language}/software`);
  }
};

ctrl.download = async (req, res) => {
  let softwareInformation = await software.findOne({
    filename: { $regex: req.params.software_id }
  });

  const customer = await stripe.paymentIntents.create({
    amount: softwareInformation.price * 100,
    description: softwareInformation.description,
    currency: "usd",
    payment_method_types: ["card"]
  });

  let saveUserPaymentInformation = await user.findOne({
    userId: userSession.userId
  });

  saveUserPaymentInformation.software_collection.push(softwareInformation);

  await saveUserPaymentInformation
    .save()
    .catch(reason => {
      console.log("Error saving information ", reason);
    })
    .then(data => {
      console.log(data);
    });

  let toTranslateJSON = require(`../locales/${req.params.language}.json`);
  let actualUserSession = userSession.actualUserSession;
  let userProperties = {};
  userProperties = userSessionVerification.userSessionResponse(
    actualUserSession
  );
  let viewModel = {
    title: `${toTranslateJSON.software} - Aurora Development`,
    language: {}
  };
  viewModel.language = toTranslateJSON;
  viewModel.language.CurrentLanguage = req.params.language;
  viewModel.session = userProperties;
  viewModel.session.username = userSession.username;
  res.render("sections/softwareSection/softwareDownload", viewModel);
};

ctrl.create = async (req, res) => {
  let CurrentLanguage = req.params.language;

  // Verification for duplicated softwares within database before renaming one
  let url, result;
  do {
    url = helper.randomName();
    result = await software.find({ filename: url });
  } while (result > 0);

  // Linking the path where to save the software preview image && resolving extensions
  const imageTempPath = req.file.path;
  const ext = path.extname(req.file.originalname).toLowerCase();
  const targetPath = path.resolve(`src/public/upload/${url}${ext}`);

  // Verifying software preview image extensions
  if (ext === ".png" || ext === ".jpg" || ext === ".jpeg" || ext === ".gif") {
    // Therefore filesystem can rename images with their final name within db
    await fs.rename(imageTempPath, targetPath);
    // Model instance
    const file = new software({
      title: req.body.title,
      id: helper.randomId(),
      description: req.body.description,
      princLanguage: req.body.language,
      price: req.body.price.trim() !== "" ? parseInt(req.body.price) : 0,
      timesDownloaded: 0,
      filename: url + ext,
      userUploaderId: userSession.userId,
      userUploaderName: userSession.username
    });

    const savedFile = await file.save().catch(reason => {
      console.log(`Error: ${reason}`);
    });

    res.redirect(`/${CurrentLanguage}/software`);
  } else {
    // Not correct image extension? unlink from marked path before.
    await fs.unlink(imageTempPath);
    res.render("partials/errors/error500");
  }
};

ctrl.like = async (req, res) => {
  // Search for the software where to mark the new like from the params.
  const soft = await software.findOne({
    filename: { $regex: req.params.software_id }
  });

  if (soft) {
    soft.likes = soft.likes + 1;
    await soft.save();
    await res.json({ likes: soft.likes });
  } else {
    res.render("partials/errors/error504");
  }
};

ctrl.comment = async (req, res) => {
  // Search for software where to share the comment
  const soft = await software.findOne({
    filename: { $regex: req.params.software_id }
  });

  // If the software exists, save comment, set a random gravatar image and redirect to the same page.
  if (soft) {
    const newComment = new comment(req.body);
    newComment.gravatar = md5(newComment.email);
    newComment.soft_id = soft._id;
    await newComment.save();
    res.redirect(
      `/${DefaultLocale.preferedUserLanguage}/software/${soft.uniqueId}`
    );
  } else {
    res.render("partials/errors/error504");
  }
};

ctrl.delete = async (req, res) => {
  // Find the software to delete
  const soft = await software.findOne({
    filename: { $regex: req.params.software_id }
  });

  // If found, unlink it from anywhere it could be within the server or database, including its comments.
  if (soft) {
    await fs.unlink(path.resolve(`./src/public/upload/${soft.filename}`));
    await comment.deleteOne({ soft_id: soft._id });
    await soft.remove();
    res.status(200);
    let redirectLink = `/${DefaultLocale.preferedUserLanguage}/software`;
    res.send(JSON.stringify(redirectLink));
  } else {
    res.render("partials/errors/error504");
  }
};

module.exports = ctrl;
