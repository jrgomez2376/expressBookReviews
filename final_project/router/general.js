const express = require('express');
const axios = require('axios'); // Importing Axios for API requests
let books = require("./booksdb.js"); // Local books database (if applicable)
let isValid = require("./auth_users.js").isValid;
let users = require("./auth_users.js").users;
const jwt = require('jsonwebtoken'); // Importing the jwt package
const public_users = express.Router();

// Secret key for JWT signing
const JWT_SECRET_KEY = 'your-secret-key'; // Replace with your secret key

// User Registration Endpoint
public_users.post("/register", (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  if (users[username]) {
    return res.status(409).json({ message: "Username already exists." });
  }

  users[username] = { password };
  return res.status(201).json({ message: "User registered successfully." });
});

// User Login Endpoint (Task 7)
public_users.post("/login", (req, res) => {
  const { username, password } = req.body;

  // Check if the username and password are provided
  if (!username || !password) {
    return res.status(400).json({ message: "Username and password are required." });
  }

  // Check if the username exists in the users object
  if (!users[username]) {
    return res.status(404).json({ message: "User not found." });
  }

  // Validate the password
  if (users[username].password !== password) {
    return res.status(401).json({ message: "Invalid password." });
  }

  // Generate a JWT token for the session
  const token = jwt.sign({ username }, JWT_SECRET_KEY, { expiresIn: '1h' });

  // Return the JWT token to the user
  return res.status(200).json({ message: "Login successful", token });
});

// Middleware to verify the JWT token and extract the user info
const verifyToken = (req, res, next) => {
  const token = req.headers['authorization']?.split(' ')[1]; // Get the token from the 'Authorization' header

  if (!token) {
    return res.status(403).json({ message: "Access denied, no token provided." });
  }

  jwt.verify(token, JWT_SECRET_KEY, (err, decoded) => {
    if (err) {
      return res.status(401).json({ message: "Invalid or expired token." });
    }
    req.username = decoded.username; // Add the username to the request object
    next();
  });
};

// Add or Modify Book Review (Task 8)
public_users.post('/review/:isbn', verifyToken, (req, res) => {
  const { isbn } = req.params;
  const { review } = req.body; // Get the review from the request body

  // Check if a review was provided
  if (!review) {
    return res.status(400).json({ message: "Review content is required." });
  }

  // Check if the book exists in the database
  if (!books[isbn]) {
    return res.status(404).json({ message: "Book not found with the given ISBN." });
  }

  const book = books[isbn];

  // Check if the user has already posted a review for this book
  const existingReviewIndex = book.reviews.findIndex(r => r.username === req.username);

  if (existingReviewIndex !== -1) {
    // Modify the existing review if the user already posted one
    book.reviews[existingReviewIndex].review = review;
    return res.status(200).json({ message: "Review updated successfully." });
  } else {
    // Add a new review if no existing review is found
    book.reviews.push({ username: req.username, review });
    return res.status(201).json({ message: "Review added successfully." });
  }
});

// Delete Book Review (Task 9)
public_users.delete('/review/:isbn', verifyToken, (req, res) => {
  const { isbn } = req.params;

  // Check if the book exists in the database
  if (!books[isbn]) {
    return res.status(404).json({ message: "Book not found with the given ISBN." });
  }

  const book = books[isbn];

  // Find the review by the current logged-in user
  const reviewIndex = book.reviews.findIndex(r => r.username === req.username);

  if (reviewIndex === -1) {
    // If no review is found for the current user
    return res.status(404).json({ message: "You haven't posted a review for this book." });
  }

  // Remove the review from the book's reviews array
  book.reviews.splice(reviewIndex, 1);

  // Return a success message
  return res.status(200).json({ message: "Review deleted successfully." });
});

// Get the book list available in the shop using async-await (Task 10)
public_users.get('/', async (req, res) => {
  try {
    // Fetch book data from an external API (replace the URL with your actual API if needed)
    const response = await axios.get('http://localhost:5000/books'); // External API call

    // Send the book list data received from the API
    return res.status(200).json(response.data); // Send the data returned from the external API
  } catch (error) {
    // In case of error, respond with a detailed message
    return res.status(500).json({ message: "Error fetching the books list", error: error.message });
  }
});

// Get book details based on ISBN
public_users.get('/isbn/:isbn', function (req, res) {
  const isbn = req.params.isbn;

  if (books[isbn]) {
    return res.status(200).send(JSON.stringify(books[isbn], null, 4));
  } else {
    return res.status(404).json({ message: "Book not found with the given ISBN." });
  }
});

// Get book details based on author
public_users.get('/author/:author', function (req, res) {
  const author = req.params.author;
  let matchingBooks = [];
  let bookKeys = Object.keys(books);

  bookKeys.forEach((key) => {
    if (books[key].author.toLowerCase() === author.toLowerCase()) {
      matchingBooks.push(books[key]);
    }
  });

  if (matchingBooks.length > 0) {
    return res.status(200).send(JSON.stringify(matchingBooks, null, 4));
  } else {
    return res.status(404).json({ message: "No books found for the given author." });
  }
});

// Get all books based on title
public_users.get('/title/:title', function (req, res) {
  const title = req.params.title;
  let matchingBooks = [];

  for (let key in books) {
    if (books[key].title.toLowerCase() === title.toLowerCase()) {
      matchingBooks.push(books[key]);
    }
  }

  if (matchingBooks.length > 0) {
    return res.status(200).send(JSON.stringify(matchingBooks, null, 4));
  } else {
    return res.status(404).json({ message: "No books found with the given title." });
  }
});

// Get book review based on ISBN
public_users.get('/review/:isbn', function (req, res) {
  const isbn = req.params.isbn;
  let book = books[isbn];

  if (book) {
    return res.status(200).send(JSON.stringify(book.reviews, null, 4));
  } else {
    return res.status(404).json({ message: "Book not found with the provided ISBN." });
  }
});

module.exports.general = public_users;
