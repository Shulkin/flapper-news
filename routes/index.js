var express = require('express');
var mongoose = require("mongoose");
var passport = require("passport");
var jwt = require("express-jwt");

var router = express.Router();
var Post = mongoose.model("Post");
var Comment = mongoose.model("Comment");
var User = mongoose.model("User");

// middleware for authenticating jwt tokens
var auth = jwt({secret: "SECRET", userProperty: "payload"});

/*
 * Now when we define a route URL with :post in it,
 * this function will be run first.
 */
router.param("post", function(req, res, next, id) {
  var query = Post.findById(id);
  // use mongoose query interface
  query.exec(function(err, post) {
    if (err) { return next(err); }
    if (!post) { return next(new Error("can\'t find post")); }
    req.post = post;
    return next();
  });
});

/* The same param for :comment as for :post */
router.param("comment", function(req, res, next, id) {
  var query = Comment.findById(id);
  query.exec(function(err, comment) {
    if (err) { return next(err); }
    if (!comment) { return next(new Error("can\'t find comment")); }
    req.comment = comment;
    return next();
  })
});

/* Register a new user given a username and password */
router.post("/register", function(req, res, next) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({message: "Please, fill out all fields"});
  }
  var user = new User();
  user.username = req.body.username;
  user.setPassword(req.body.password);
  user.save(function(err) {
    if (err) { return next(err); }
    return res.json({token: user.generateJWT()});
  });
});

/* Authenticate the user and returns a token to the client */
router.post("/login", function(req, res, next) {
  if (!req.body.username || !req.body.password) {
    return res.status(400).json({message: "Please, fill out all fields"});
  }
  /*
   * The passport.authenticate('local') middleware uses the LocalStrategy we
   * created earlier. We're using a custom callback for the authenticate
   * middleware so we can return error messages to the client.
   * If authentication is successful we want to return a JWT token to the
   * client just like our register route does.
   */
  passport.authenticate("local", function(err, user, info) {
    if (err) { return next(err); }
    if (user) {
      return res.json({token: user.generateJWT()});
    } else {
      return res.status(401).json(info);
    }
  })(req, res, next);
});

/*
 * View all posts on board.
 * Order of req, res, next is important!
 */
router.get("/posts", function(req, res, next) {
  // query the database for all posts
  Post.find(function(err, posts) {
    if (err) { return next(err); }
    // send the retrieved posts back to the client
    res.json(posts);
  });
});

/* View a single post and its comments */
router.get("/posts/:post", function(req, res) {
  // use the populate() function to retrieve comments along with posts
  req.post.populate("comments", function(err, post) {
    if (err) { return next(err); }
    res.json(req.post);
  });
});

/*
 * Create new post and save it to database.
 * Require authentication!
 */
router.post("/posts", auth, function(req, res, next) {
  var post = new Post(req.body);
  post.author = req.payload.username;
  post.save(function(err, post) {
    if (err) { return next(err); }
    res.json(post);
  });
});

/*
 * Upvote a single post.
 * Require authentication!
 */
router.put("/posts/:post/upvote", auth, function(req, res, next) {
  req.post.upvote(function(err, post) {
    if (err) { return next(err); }
    res.json(post);
  });
});

/*
 * Create new comment and save it to database.
 * Require authentication!
 */
router.post("/posts/:post/comments", auth, function(req, res, next) {
  var comment = new Comment(req.body);
  comment.post = req.post;
  comment.author = req.payload.username;
  comment.save(function(err, comment) {
    if (err) { return next(err); }
    req.post.comments.push(comment);
    req.post.save(function (err, post) {
      if (err) { return next(err); }
      res.json(comment);
    });
  });
});

/*
 * Upvote a comment in post.
 * Require authentication!
 */
router.put("/posts/:post/comments/:comment/upvote", auth, function(req, res, next) {
  req.comment.upvote(function(err, comment) {
    if (err) { return next(err); }
    res.json(comment);
  });
});

/* GET home page. */
router.get('/', function(req, res, next) {
  res.render('index', { title: 'Express' });
});

module.exports = router;
