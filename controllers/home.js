const mailer = require("nodemailer");
const { Contactmailer } = require("../keys");
const { software } = require("../models/index");
const sidebar = require("../helpers/sidebar");
const { DefaultLocale } = require("../keys");

const ctrl = {};

ctrl.firstRedirect = (req, res) => {
  res.redirect(`/${DefaultLocale.preferedUserLanguage}`);
};

ctrl.index = async (req, res) => {
  let lang = req.params.language;
  if (lang === "es" || lang === "en" || lang === "de" || lang === "fr") {
    DefaultLocale.preferedUserLanguage = lang;
    let toTranslateJSON = require(`../locales/${req.params.language}.json`);

    let viewModel = { title: "Inicio - Aurora Development" };
    viewModel.language = toTranslateJSON;
    viewModel.language.CurrentLanguage = lang;

    res.render("sections/homeSection/homeIndex", viewModel);
  } else {
    let toTranslateJSON = require(`../locales/${DefaultLocale.preferedUserLanguage}.json`);
    let viewModel = { title: "Error 404", language: {} };
    viewModel.language = toTranslateJSON;
    viewModel.language.CurrentLanguage = DefaultLocale.preferedUserLanguage;
    res.render("partials/errors/error404", viewModel);
  }
};

// For our services section

ctrl.services = (req, res) => {
  let toTranslateJSON = require(`../locales/${req.params.language}.json`);
  let viewModel = {
    title: "Nuestros servicios - Aurora Development",
    language: {}
  };
  viewModel.language = toTranslateJSON;
  viewModel.language.CurrentLanguage = req.params.language;
  res.render("sections/ourServicesSection/ourServicesView", viewModel);
};

ctrl.servicesSend = (req, res) => {
  res.send("sent!");
};

// Mailers

ctrl.contact = (req, res) => {
  let toTranslateJSON = require(`../locales/${req.params.language}.json`);
  let viewModel = { title: "Contacto - Aurora Development", language: {} };
  viewModel.language = toTranslateJSON;
  viewModel.language.CurrentLanguage = req.params.language;
  res.render("sections/contactUsSection/mailer", viewModel);
};

ctrl.contactSend = async (req, res) => {
  let transporter = mailer.createTransport({
    service: "gmail",
    auth: {
      user: Contactmailer.user,
      pass: Contactmailer.pass
    }
  });

  // Regex pattern for email verification
  let pattern = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;

  let email = req.body.sender;

  let mailOptions = {
    from: pattern.test(email) ? email.toLowerCase() : "emailnotavailable",
    to: "jhonatanrg@live.co",
    subject: req.body.subject,
    text: req.body.issue
  };

  if (mailOptions.from === "emailnotavailable") {
    res.render("partials/errors/error500", {
      reason: `El correo electrónico ingresado es incorrecto, por favor ingréselo una vez más`
    });
  } else {
    await transporter.sendMail(mailOptions, function(error, info) {
      if (error) {
        console.log(error);
        res.redirect(`/${DefaultLocale.preferedUserLanguage}/timeout`);
      } else {
        res.redirect(`/${DefaultLocale.preferedUserLanguage}/contact-us`);
        console.log("Email sent: " + info.response);
      }
    });
  }
};

// Errors

ctrl.error404 = (req, res) => {
  let toTranslateJSON = require(`../locales/${DefaultLocale.preferedUserLanguage}.json`);
  let viewModel = { title: "Error 404", language: {} };
  viewModel.language = toTranslateJSON;
  viewModel.language.CurrentLanguage = DefaultLocale.preferedUserLanguage;
  res.render("partials/errors/error404", viewModel);
};

ctrl.error403 = (req, res) => {
  let toTranslateJSON = require(`../locales/${DefaultLocale.preferedUserLanguage}.json`);
  let viewModel = { title: "Error 403", language: {} };
  viewModel.language = toTranslateJSON;
  viewModel.language.CurrentLanguage = DefaultLocale.preferedUserLanguage;
  res.render("partials/errors/error403", viewModel);
};

ctrl.error503 = (req, res) => {
  let toTranslateJSON = require(`../locales/${DefaultLocale.preferedUserLanguage}.json`);
  let viewModel = { title: "Error 503", language: {} };
  viewModel.language = toTranslateJSON;
  viewModel.language.CurrentLanguage = DefaultLocale.preferedUserLanguage;
  res.render("partials/errors/error503", viewModel);
};

ctrl.error504 = (req, res) => {
  let toTranslateJSON = require(`../locales/${DefaultLocale.preferedUserLanguage}.json`);
  let viewModel = { title: "Error 504", language: {} };
  viewModel.language = toTranslateJSON;
  viewModel.language.CurrentLanguage = DefaultLocale.preferedUserLanguage;
  res.render("partials/errors/error504", viewModel);
};

ctrl.unhandledPromise = (req, res) => {
  console.log("Rechazo de promesa sin manejar");
};

module.exports = ctrl;
