var mongoose = require("mongoose");

// define schema for posts in database
var postSchema = new mongoose.Schema({
  title: String,
  link: String,
  author: String,
  upvotes: {type: Number, default: 0},
  // array of comments ids
  comments: [{type: mongoose.Schema.Types.ObjectId, ref: "Comment"}]
});

postSchema.methods.upvote = function(cb) {
  this.upvotes += 1;
  this.save(cb);
}

/*
 * In Mongoose, we can create relationships between different data models
 * using the ObjectId type. The ObjectId data type refers to a 12 byte MongoDB
 * ObjectId, which is actually what is stored in the database.
 * The ref property tells Mongoose what type of object the ID references
 * and enables us to retrieve both items simultaneously.
 */
mongoose.model("Post", postSchema);
