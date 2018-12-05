const express      = require('express');
const bodyParser   = require('body-parser');
const _            = require('lodash');
const jwt          = require('express-jwt');
const cookieParser = require('cookie-parser');

const {ObjectID}   = require('mongodb');

const {Todo}       = require('../models/todo');
const {User}       = require('../models/user');

const router = express.Router();
router.use(bodyParser.urlencoded({ extended: false }));
router.use(bodyParser.json());
router.use(cookieParser());

router.use(jwt({
  secret: process.env.JWT_SECRET,
  credentialsRequired: true,
  getToken: function fromHeaderOrQuerystring (req) {
    if (req.headers.authorization && req.headers.authorization.split(' ')[0] === 'Bearer') {
        return req.headers.authorization.split(' ')[1];
    } else if (req.cookies.authorization) {
      return req.cookies.authorization;
    }
    return null;
  }
}).unless({path: ['/login', '/', '/signup']}));

router.use((err, req, res, next) => {
  if (err.name === 'UnauthorizedError') {
    console.log('Unauthorized!');
    res.status(401).redirect('/');
  }
});

router.get('/', (req, res) => {
  let loggedin = false;
  let email = '';
  if(req.cookies.authorization) {
    console.log(req.user);
    loggedin = true;
    email = req.cookies.email
  }
  res.render('home.hbs', {
    loggedin,
    email
  });
});

router.get('/todo', (req, res) => {

  token = req.cookies.authorization;
  User.findByToken(token).then((user) => {
   Todo.find({_creator: user._id}).then((todos) => {
     res.status(200).render('todo.hbs', {todos, email: req.cookies.email});
   }).catch((e) => console.log(e));
  });
});

router.get('/login', (req, res) => {
  res.render('login.hbs', {
  });
});

router.get('/signup', (req, res) => {
  res.render('signup.hbs', {
    userExist: false
  });
});

router.get('/logout', (req, res) => {
    cookie = req.cookies;
    for (var prop in cookie) {
        if (!cookie.hasOwnProperty(prop)) {
            continue;
        }
        res.cookie(prop, '', {expires: new Date(0)});
    }
    res.redirect('/');
});

router.post('/login', (req, res) => {

  User.findOne({email: req.body.email}).then((user) => {
    if(user) {
      if(user.isValidPassword(req.body.password)) {
        console.log('Success');
        return user.generateAuthToken().then((token) => {
          res.cookie('authorization', token, { maxAge: 60 * 1000});
          res.cookie('email', req.body.email, { maxAge: 60 * 1000});
          res.header('authorization', token).redirect('/todo');
        });
      } else {
        console.log('Invalid Password');
        return res.redirect('/login');
      }
    }
    return res.redirect('/login');
    console.log('No user was found');
  }).catch((e) => console.log(e));
});



router.post('/signup', (req, res) => {
  const body = _.pick(req.body, ['email', 'password']);
  let userExist = false;

  User.findOne({email: req.body.email}).then((result) => {
    if (result) {
      console.log('user was found');
      userExist = true;
      return res.render('signup.hbs', {
        userExist: true
      });
    } else {
      console.log('user was NOT found');
      const user = new User(body);
      user.save().then(() => {
        return user.generateAuthToken();
      }).then((token) => {
          res.cookie('authorization', token, { maxAge: 60 * 1000});
          res.cookie('email', req.body.email, { maxAge: 60 * 1000});
          res.header('x-auth', token).redirect('/');
      }).catch((e) => {
          res.status(400).send(e);
        });
    }

  }).catch((e) => {
      res.status(400).send(e);
    });

});

router.post('/todo', (req, res) => {
  const todo = new Todo({
    text: req.body.text,
    _creator: req.user._id
  });

  todo.save().then((doc) => {
    console.log(doc);
  }).catch((e) => {
      res.status(400).send(e);
    });
    res.redirect('/todo');
});

router.post('/todo/:id', (req, res) => {
  const id = req.params.id;

  if(!ObjectID.isValid(id)) {
    return res.status(404).send({});
    console.log('ID not valid');
  }

  Todo.findOneAndDelete({
    _id: id
  }).then((todo) => {
    if(!todo) {
      return res.status(404).send();
    }
    console.log(`Todo with id ${id} was deleted`);
    res.redirect('/todo');
  }).catch((e) => {
    res.status(400).send();
  });
});

module.exports = router;
