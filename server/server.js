require('./config/config.js');

const express         = require('express');
const mongoose        = require('mongoose');
const hbs             = require('hbs');
const path            = require('path');
const fs              = require('fs');

const routes          = require('./routes/routes');
const {Todo}          = require('./models/todo');
const {User}          = require('./models/user');

const server = express();
const port = process.env.PORT || 3000;
const publicPath = path.join(__dirname, '../public');

mongoose.connect(process.env.MONGODB_URI, { useNewUrlParser: true });
mongoose.set('useCreateIndex', true);
let db = mongoose.connection;
db.on('error', (err) => console.log(err));
db.once('open', () => console.log('Connected to MongoDB'));

server.set('view engine', 'hbs');
server.use(express.static(publicPath));
server.use(routes);

// const navbar = hbs.compile(fs.readFileSync(__dirname + '/../views/navbar.hbs').toString('utf-8'));
// hbs.registerPartial('navbar', navbar);
// const navbar_logout = hbs.compile(fs.readFileSync(__dirname + '/../views/navbar_logout.hbs').toString('utf-8'));
// hbs.registerPartial('navbar_logout', navbar_logout);
hbs.registerPartials(__dirname + '/../views/partials');

server.listen(port, () => console.log(`Server started at port ${port}`));
