/**
 * Created by Brett on 14/05/2015.
 */

var express = require('express');
var server = express();
var mysql = require('mysql');
server.use(express.static(__dirname + '/public'));


//~~~~~~~~~~LOGIN RELATED STUFF~~~~~~~~~~~//


var bodyParser = require('body-parser');
var cookieParser = require('cookie-parser');
var expressSession = require('express-session');
var passport = require('passport');
var passportlocal = require('passport-local');
var crypto = require('crypto');


server.use(bodyParser.urlencoded({ extended: false }));
server.use(cookieParser());
server.use(expressSession({
    secret: process.env.SESSION_SECRET || crypto.randomBytes(20).toString('hex'),
    resave: false,
    saveUninitialized: false
}));


server.use(passport.initialize());
server.use(passport.session());

passport.use(new passportlocal.Strategy(checkUser));


function checkUser(username, password, done) {
    connection.query('select * from user where id=?;', username, function(err, result) {
        if (err) {
            console.error(err);
        } else if (result.length > 0) {
            var user = result[0];
            var inputPass = crypto.createHash('sha1').update(user.salt + password, 'utf8').digest('hex');
            if (user && inputPass === user.hashsalt) {
                done(null, {id: username, name: username});
            } else {
                done(null, null);
            }

        } else {
            done(null, null);
        }
    });
}


function auth(req, res, next) {
    if (req.isAuthenticated()) {
        next();
    } else {
        res.sendStatus(401);
    }
}


passport.serializeUser(function(user, done) {
    done(null, user.id);
});


passport.deserializeUser(function(id, done) {
    done(null, { id: id })
});


server.post('/login', passport.authenticate('local'), function(req, res) {
    res.redirect('/');
});


server.get('/logout', function(req, res) {
    req.logout();
    res.redirect('/');
});

server.get('/user', auth, function(req, res) {
    res.json(req.user.id);
    //res.json(req.isAuthenticated() ? req.user.id : null);
});


//~~~~~~~~~~~~~~~~~~~~~//


var connection = mysql.createConnection({
    host     : 'localhost',
    user     : 'root',
    password : '',
    database : 'test1'
});


connection.connect(function(err) {
    if (err) {
        console.error(err);
    }
});


server.get('/videos', auth, function(req, res) {
    var query = 'select id, name from video, uservideo where user=? and video=video.id';
    var args = req.user.id;
    queryDB(query, args, res);
});


//-----------------


server.get('/myitems', auth, function(req, res) {
    var query = 'select name, slot from item, useritem where user=? and item=name';
    var args = req.user.id;
    queryDB(query, args, res);
});

server.get('/outfits', auth, function(req, res) {
    var query = 'select name from outfit where user=?';
    var args = req.user.id;
    queryDB(query, args, res);
});

server.get('/outfits/:outfit', auth, function(req, res) {
    var query = 'select * from outfit where user=? and name=?';
    var args = [req.user.id, req.params.outfit];
    queryDB(query, args, res);
});

server.post('/outfits', auth, function(req, res) {
    var query = 'insert into outfit ' +
        '(body, eyes, torso, face, eyewear, hair, hat, name, user)' +
        'values (?)';
    var args = getArgsFromOutfitReq(req);
    queryDB(query, [args], res);
});

server.put('/outfits', auth, function(req, res) {
    var query = 'update outfit set ' +
        'body=?, eyes=?, torso=?, face=?, eyewear=?, hair=?, hat=?' +
        'where name=? and user=?';
    var args = getArgsFromOutfitReq(req);
    queryDB(query, args, res);
});

var getArgsFromOutfitReq = function(req) {
    var args = [];
    for (param in req.body) {
        var arg = req.body[param];
        if (arg === 'null') {
            args.push(null);
        } else {
            args.push(arg);
        }
    }
    args.push(req.user.id);
    return args;
};

server.delete('/outfits/:outfit', auth, function(req, res) {
    var query = 'delete from outfit where user=? and name=?';
    var args = [req.user.id, req.params.outfit];
    queryDB(query, args, res);
});

server.get('/items', auth, function(req, res) {
    var query = 'select * from item';
    var args = [];
    queryDB(query, args, res);
});

server.post('/myitems', auth, function(req, res) {
    var query = 'insert into useritem values (?, ?)';
    var args = [req.user.id, req.body.item];
    queryDB(query, args, res);
});

//-----------------


server.get('/items', auth, function(req, res) {
    var query = 'select name, slot from item';
    var args = req.user.id;
    queryDB(query, args, res);
});


server.get('/score', auth, function(req, res) {
    var query = 'select score from user where id=?';
    var args = req.user.id;
    queryDB(query, args, res);
});

server.put('/score', auth, function(req, res) {
    var query = 'update user set score=score+? where id=?';
    var args = [parseInt(req.body.scoreChange), req.user.id];
    queryDB(query, args, res);
});

server.put('/progress', auth, function(req, res) {
    var query = 'update uservideo set progress=?, finished=? where user=? and video=?';
    var args = [req.body.progress, req.body.finished, req.user.id, req.body.video];
    queryDB(query, args, res);

});

server.get('/progress/:video', auth, function(req, res) {
    var query = 'select progress, finished from uservideo where user=? and video=?';
    var args = [req.user.id, req.params.video];
    queryDB(query, args, res);

});

var queryDB = function(query, args, res) {
    connection.query(query, args,
        function(err, result) {
            if (err) {
                res.status(400).send(err.message);
            } else {
                res.json(result);
            }
        }
    );
};

server.get('/unloadtest/:message', auth, function(req,res) {
    console.log(req.params.message);
    console.log(req.user.id);
});

server.use(function(req, res) {
    res.redirect('/');
});

server.listen(3000, function () {
    console.log('listening on port 3000');
});
