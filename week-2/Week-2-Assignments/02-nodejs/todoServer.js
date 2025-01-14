/**
  You need to create an express HTTP server in Node.js which will handle the logic of a todo list app.
  - Don't use any database, just store all the data in an array to store the todo list data (in-memory)
  - Hard todo: Try to save responses in files, so that even if u exit the app and run it again, the data remains (similar to databases)

  Each todo has a title and a description. The title is a string and the description is a string.
  Each todo should also get an unique autogenerated id every time it is created
  The expected API endpoints are defined below,
  1.GET /todos - Retrieve all todo items
    Description: Returns a list of all todo items.
    Response: 200 OK with an array of todo items in JSON format.
    Example: GET http://localhost:3000/todos
    
  2.GET /todos/:id - Retrieve a specific todo item by ID
    Description: Returns a specific todo item identified by its ID.
    Response: 200 OK with the todo item in JSON format if found, or 404 Not Found if not found.
    Example: GET http://localhost:3000/todos/123
    
  3. POST /todos - Create a new todo item
    Description: Creates a new todo item.
    Request Body: JSON object representing the todo item.
    Response: 201 Created with the ID of the created todo item in JSON format. eg: {id: 1}
    Example: POST http://localhost:3000/todos
    Request Body: { "title": "Buy groceries", "completed": false, description: "I should buy groceries" }
    
  4. PUT /todos/:id - Update an existing todo item by ID
    Description: Updates an existing todo item identified by its ID.
    Request Body: JSON object representing the updated todo item.
    Response: 200 OK if the todo item was found and updated, or 404 Not Found if not found.
    Example: PUT http://localhost:3000/todos/123
    Request Body: { "title": "Buy groceries", "completed": true }
    
  5. DELETE /todos/:id - Delete a todo item by ID
    Description: Deletes a todo item identified by its ID.
    Response: 200 OK if the todo item was found and deleted, or 404 Not Found if not found.
    Example: DELETE http://localhost:3000/todos/123

    - For any other route not defined in the server return 404

  Testing the server - run `npm run test-todoServer` command in terminal
 */
const express = require('express');
const bodyParser = require('body-parser');
const { v4: uuidv4 } = require('uuid');
const fs = require('fs').promises;
const Joi = require('joi');
const cors = require('cors');

const app = express();

app.use(bodyParser.json());
app.use(cors());

const find = () => {
  return new Promise((resolve, reject) => {
    fs.readFile(__dirname + '/todos.json', 'utf-8')
      .then((data) => resolve(JSON.parse(data)))
      .catch((err) => reject(err));
  });
};

const findById = async (id) => {
  const todos = await find();
  return todos.filter((todo) => todo.id === id)[0] ?? null;
};

const save = async (data) => {
  const todos = await find();
  todos.push(data);
  return new Promise((resolve, reject) => {
    fs.writeFile(__dirname + '/todos.json', JSON.stringify(todos), {
      encoding: 'utf-8',
    })
      .then(() => resolve(data))
      .catch((err) => reject(err));
  });
};

const updateByIdAndUpdate = async (todoId, update) => {
  const todo = await findById(todoId);

  if (todo) {
    update = { ...todo, ...update };

    let todos = await find();

    const updateIndex = todos.findIndex((todo) => todo.id === todoId);
    todos.splice(updateIndex, 1, update);

    return new Promise((resolve, reject) => {
      fs.writeFile(__dirname + '/todos.json', JSON.stringify(todos), {
        encoding: 'utf-8',
      })
        .then(() => resolve(update))
        .catch((err) => reject(err));
    });
  } else {
    throw new Error('Todo does not exists.');
  }
};

const deleteById = async (todoId) => {
  const todo = await findById(todoId);

  if (todo) {
    let todos = await find();

    const deleteIndex = todos.findIndex((todo) => todo.id === todoId);
    todos.splice(deleteIndex, 1);

    return new Promise((resolve, reject) => {
      fs.writeFile(__dirname + '/todos.json', JSON.stringify(todos), {
        encoding: 'utf-8',
      })
        .then(() => resolve())
        .catch((err) => reject(err));
    });
  } else {
    throw new Error('Todo does not exists.');
  }
};

//schemas

const todoSchema = Joi.object({
  title: Joi.string().required(),
  completed: Joi.boolean().default(false),
  description: Joi.string().required(),
});

const updateTodoSchema = Joi.object({
  title: Joi.string(),
  completed: Joi.boolean(),
  description: Joi.string(),
});

// schema validators
const validateBody = (schema) => {
  return (req, res, next) => {
    const { error } = schema.validate(req.body);
    if (error) {
      return res.status(400).json({ error: error.details[0].message });
    }
    next();
  };
};

// controllers
const getAllTodos = async (req, res) => {
  const todos = await find();
  res.send(todos);
};

const getTodoById = async (req, res) => {
  const todoId = req.params.id;
  const todo = await findById(todoId);
  if (todo) {
    res.send(todo);
  } else {
    res.sendStatus(404);
  }
};

const createTodo = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const todo = req.body;
  const newTodo = await save({ id: uuidv4(), ...todo });
  res.status(201).json({ ...newTodo });
};

const updateTodo = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const todoId = req.params.id;
  let update = req.body;

  try {
    const updatedTodo = await updateByIdAndUpdate(todoId, update);
    res.status(200).json({ id: updatedTodo.id });
  } catch (err) {
    res.sendStatus(404);
  }
};

const deleteTodo = async (req, res) => {
  res.setHeader('Content-Type', 'application/json');
  const todoId = req.params.id;
  try {
    await deleteById(todoId);
    res.sendStatus(200);
  } catch (err) {
    res.sendStatus(404);
  }
};

// routes
app.get('/todos', getAllTodos);

app.get('/todos/:id', getTodoById);

app.post('/todos', validateBody(todoSchema), createTodo);

app.put('/todos/:id', validateBody(updateTodoSchema), updateTodo);

app.delete('/todos/:id', deleteTodo);

app.listen(3000, () => console.log('server'));

module.exports = app;
