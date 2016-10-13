var mongoose = require("mongoose");

// comments for post
var commentSchema = new mongoose.Schema({
  body: String,
  author: String,
  upvotes: {type: Number, default: 0},
  // link to corresponding post
  post: {type: mongoose.Schema.Types.ObjectId, ref: "Post"}
});

commentSchema.methods.upvote = function(cb) {
  this.upvotes += 1;
  this.save(cb);
}

mongoose.model("Comment", commentSchema);
