var app = angular.module("flapperNews", ["ui.router"]);

app.factory("posts", ["$http", "auth", function($http, auth) {
  // create empty posts array in object
  var o = {
    posts: []
  };

  // retrieve all posts
  o.getAll = function() {
    /*
     * Query our posts route.
     * Basically, make GET request with http to /posts.
     */
    return $http.get("/posts").success(function(data) {
      /*
       * It's important to use the angular.copy() method to create a deep copy
       * of the returned data. This ensures that the $scope.posts variable in
       * MainCtrl will also be updated, ensuring the new values are reflect in
       * our view.
       */
      angular.copy(data, o.posts);
    });
  };

  // get single post
  o.get = function(id) {
    return $http.get("/posts/" + id).then(function(res) {
      return res.data;
    });
  };

  o.create = function(post) {
    return $http.post("/posts", post, {
      headers: {Authorization: "Bearer " + auth.getToken()}
    }).success(function(data) {
      o.posts.push(data);
    });
  };

  o.upvote = function(post) {
    return $http.put("/posts/" + post._id + "/upvote", null, {
      headers: {Authorization: "Bearer " + auth.getToken()}
    }).success(function(data) {
      post.upvotes += 1;
    });
  }

  o.addComment = function(id, comment) {
    return $http.post("/posts/" + id + "/comments", comment, {
      headers: {Authorization: "Bearer " + auth.getToken()}
    });
  };

  o.upvoteComment = function(post, comment) {
    return $http.put("/posts/" + post._id + "/comments/" + comment._id + "/upvote", null, {
      headers: {Authorization: "Bearer " + auth.getToken()}
    }).success(function(data) {
      comment.upvotes += 1;
    });
  };

  // expose object 'o' to any Angular module
  return o;
}]);

/*
 * We'll need to inject $http for interfacing with our server, and $window
 * for interfacing with localStorage.
 */
app.factory("auth", ["$http", "$window", function($http, $window) {
  var auth = {};

  auth.saveToken = function(token) {
    $window.localStorage["flapper-news-token"] = token;
  };

  auth.getToken = function(token) {
    return $window.localStorage["flapper-news-token"];
  };

  auth.isLoggedIn = function(token) {
    var token = auth.getToken();
    if (token) {
      /*
       * If a token exists, we'll need to check the payload to see if the
       * token has expired, otherwise we can assume the user is logged out.
       */
      var payload = JSON.parse($window.atob(token.split(".")[1]));
      return payload.exp > Date.now() / 1000;
    } else {
      return false;
    }
  };

  auth.currentUser = function() {
    if (auth.isLoggedIn()) {
      var token = auth.getToken();
      var payload = JSON.parse($window.atob(token.split(".")[1]));
      return payload.username;
    }
  };

  auth.register = function(user) {
    return $http.post("/register", user).success(function(data) {
      auth.saveToken(data.token);
    });
  };

  auth.logIn = function(user) {
    return $http.post("/login", user).success(function(data) {
      auth.saveToken(data.token);
    });
  };

  /* Removes the user's token from localStorage, logging the user out */
  auth.logOut = function(user) {
    $window.localStorage.removeItem("flapper-news-token");
  };

  return auth;
}]);

app.controller("MainCtrl", [
  "$scope", "posts", "auth", function($scope, posts, auth) {
    // any modifications to $scope.posts will be stored in the service
    $scope.posts = posts.posts;
    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.addPost = function() {
      if (!$scope.title || $scope.title === "") {
        alert("Please, give your post a title");
        return;
      }
      /*
       * Call create function from posts factory.
       * It will create new post and save it to database.
       */
      posts.create({
        title: $scope.title,
        link: $scope.link
      });
      // clear $scope params
      $scope.title = "";
      $scope.link = "";
    };

    $scope.incrementUpvotes = function(post) {
      posts.upvote(post);
    };
}]);

app.controller("PostsCtrl", [
  "$scope", "posts", "post", "auth", function($scope, posts, post, auth) {
    $scope.post = post; // get directly from PostsCtrl controller
    $scope.isLoggedIn = auth.isLoggedIn;

    $scope.addComment = function() {
      // $scope.body - text of a new comment
      if ($scope.body === "") { return; }
      posts.addComment(post._id, {
        body: $scope.body,
        author: "user"
      }).success(function(comment) {
        $scope.post.comments.push(comment);
      });
      $scope.body = "";
    };

    $scope.incrementUpvotes = function(comment) {
      posts.upvoteComment(post, comment);
    };
}]);

app.controller("AuthCtrl", [
  "$scope", "$state", "auth", function($scope, $state, auth) {
    $scope.user = {};
    $scope.register = function() {
      auth.register($scope.user).error(function(error) {
        // error on register user
        $scope.error = error;
      }).then(function() {
        // return to main page
        $state.go("home");
      });
    };
    $scope.logIn = function() {
      auth.logIn($scope.user).error(function(error) {
        $scope.error = error;
      }).then(function() {
        $state.go("home");
      });
    };
}]);

/*
 * Simple controller for our navbar that exposes the isLoggedIn, currentUser,
 * and logOut methods from our auth factory.
 */
app.controller("NavCtrl", [
  "$scope", "auth", function($scope, auth) {
    $scope.isLoggedIn = auth.isLoggedIn;
    $scope.currentUser = auth.currentUser;
    $scope.logOut = auth.logOut;
}])

app.config([
  "$stateProvider",
  "$urlRouterProvider",
  function($stateProvider, $urlRouterProvider) {
    $stateProvider.state("home", {
      url: "/home",
      templateUrl: "/home.html",
      controller: "MainCtrl",
      resolve: {
        /*
         * By using the resolve property in this way, we are ensuring that
         * anytime our home state is entered, we will automatically query all
         * posts from our backend before the state actually finishes loading.
         */
        postPromise: ["posts", function(posts) {
          return posts.getAll();
        }]
      }
    });
    $stateProvider.state("posts", {
      url: "/posts/{id}", // {id} is important here
      templateUrl: "/posts.html",
      controller: "PostsCtrl",
      resolve: {
        /*
         * To get access to the post object we just retrieved in the PostsCtrl,
         * instead of going through the posts service, the specific object will
         * be directly injected into our PostsCtrl.
         */
        post: ["$stateParams", "posts", function($stateParams, posts) {
          return posts.get($stateParams.id);
        }]
      }
    });
    $stateProvider.state("login", {
      url: "/login",
      templateUrl: "/login.html",
      controller: "AuthCtrl",
      /*
       * Here we're specifying an onEnter function to our states. This gives us
       * the ability to detect if the user is authenticated before entering the
       * state, which allows us to redirect them back to the home state if
       * they're already logged in.
       */
      onEnter: ["$state", "auth", function($state, auth) {
        if (auth.isLoggedIn()) {
          $state.go("home");
        }
      }]
    });
    $stateProvider.state("register", {
      url: "/register",
      templateUrl: "/register.html",
      controller: "AuthCtrl",
      onEnter: ["$state", "auth", function($state, auth) {
        if (auth.isLoggedIn()) {
          $state.go("home");
        }
      }]
    });
    // redirect unspecified routes
    $urlRouterProvider.otherwise("home");
}]);
