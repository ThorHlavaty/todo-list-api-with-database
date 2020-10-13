const express = require('express');
const bodyParser = require('body-parser');
const db = require('./models');
const es6Renederer = require('express-es6-template-engine')
const app = express();
const bcrypt = require('bcrypt')
const session = require('express-session')
const cookieParser = require('cookie-parser')
const SequelizeStore = require('connect-session-sequelize')(session.Store);
const store = new SequelizeStore({
  db: db.sequelize
})


app.use(cookieParser());
app.use(
  session({
    secret: 'secret', // used to sign the cookie
    resave: false, // update session even w/ no changes
    saveUninitialized: true, // always create a session
    cookie: {
      store: store
    },
  }));

store.sync();
app.use((req, res, next) => {
  console.log('==== USER ====');
  console.log(req.session.user);
  console.log('==============');
  next();
})
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));

app.use(express.static('./public'));

app.engine('html', es6Renederer);
app.set('views', 'templates');
app.set('view engine', 'html');

function checkAuth(req, res, next) {
  if (req.session.user) {
    next();
  } else {
    res.redirect('/login')
  }
}

app.get('/', checkAuth, (req, res) => {
  res.render('index', {
    locals: {
      user: req.session.user
    }
  })
})

app.get('/register', (req, res) => {
  res.render('register', {
    locals: {
      error: null,
    }
  });
})

app.post('/register', (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.render('register', {
      locals: {
        error: "Come on, you can't be doing that!"
      }
    })
  }
  const {
    email,
    password
  } = req.body;
  bcrypt.hash(password, 10, (err, hash) => {
    db.User.create({
        email: email,
        password: hash
      })
      .then((user) => {
        res.redirect('/login');
      })
  })
})

let todoList = [{
  id: 1,
  todo: 'Implement a REST API',
}, ];

app.get('/login', (req, res) => {
  res.render('login', {
    locals: {
      error: null
    }
  })
})

app.post('/login', (req, res) => {
  if (!req.body.email || !req.body.password) {
    res.render('login', {
      locals: {
        error: "Come on, you can't be doing that!"
      }
    })
  }
  db.User.findOne({
    where: {
      email: req.body.email
    }
  }).then((user) => {
    if (!user) {
      res.render('login', {
        locals: {
          error: 'No user with that email!'
        }
      })
      return;
    }
    bcrypt.compare(req.body.password, user.password, (err, matched) => {
      if (matched) {
        req.session.user = user;
        res.redirect('/')
      } else {
        res.render('login', {
          locals: {
            error: 'Bad password.'
          }
        })
      }
    })
    return;
  })
})

app.get('/logout', (req, res) => {
  req.session.user = null;
  res.redirect('/login')
})
// GET /api/todos
app.get('/api/todos', (req, res) => {
  db.Todo.findAll()
    .then((todos) => {
      res.json(todos);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        error: 'A Database Error Occurred'
      });
    })
});

// GET /api/todos/:id
app.get('/api/todos/:id', (req, res) => {
  const {
    id
  } = req.params;
  db.Todo.findByPk(id)
    .then((todo) => {
      if (!todo) {
        res.status(404).json({
          error: `Could not find Todo with id: ${id}`
        })
        return;
      }
      res.json(todo);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        error: 'A Database Error Occurred'
      });
    })
});


// POST /api/todos
app.post('/api/todos', (req, res) => {
  if (!req.body || !req.body.name) {
    res.status(400).json({
      error: 'Provide todo text',
    });
    return;
  }

  db.Todo.create({
      name: req.body.name
    })
    .then((newTodo) => {
      res.json(newTodo);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        error: 'A Database Error Occurred'
      });
    })

});

// PUT /api/todos/:id
app.put('/api/todos/:id', (req, res) => {
  if (!req.body || !req.body.name) {
    res.status(400).json({
      error: 'Provide todo text',
    });
    return;
  }
  const {
    id
  } = req.params;
  db.Todo.findByPk(id)
    .then((todo) => {
      if (!todo) {
        res.status(404).json({
          error: `Could not find Todo with id: ${id}`
        })
        return;
      }
      todo.name = req.body.name;
      todo.save()
      res.json(todo);
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        error: 'A Database Error Occurred'
      });
    })
});

// DELETE /api/todos/:id
app.delete('/api/todos/:id', (req, res) => {
  const {
    id
  } = req.params;
  db.Todo.destroy({
      where: {
        id: id
      }
    })
    .then((deleted) => {
      if (deleted === 0) {
        res.status(404).json({
          error: `Could not find Todo with id: ${id}`
        })
        return
      }
      res.status(204).json()
    })
    .catch((error) => {
      console.error(error);
      res.status(500).json({
        error: 'A Database Error Occurred'
      });
    })
});

app.listen(3000, function () {
  console.log('Todo List API is now listening on port 3000...');
});