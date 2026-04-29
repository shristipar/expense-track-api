var express = require('express');
var path = require('path');
var fs = require('fs');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var sass = require('sass');

var index = require('./routes/index');
var user = require('./routes/user');

var app = express();

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

// uncomment after placing your favicon in /public
//app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
    extended: false
}));
app.use(cookieParser());
app.use(function sassCompile(req, res, next) {
    if (req.method !== 'GET') return next();
    var cssMatch = req.path.match(/^(.+)\.css$/i);
    if (!cssMatch) return next();
    var sassPath = path.join(__dirname, 'public', cssMatch[1] + '.sass');
    if (!fs.existsSync(sassPath)) return next();
    try {
        var out = sass.compile(sassPath, { style: 'expanded', sourceMap: true });
        res.type('text/css');
        res.send(out.css);
    } catch (err) {
        next(err);
    }
});
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/user', user);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// error handler
app.use(function (err, req, res, next) {
    // set locals, only providing error in development
    res.locals.message = err.message;
    res.locals.error = req.app.get('env') === 'development' ? err : {};

    // render the error page
    res.status(err.status || 500);
    res.render('error');
});

module.exports = app;
