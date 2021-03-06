const express = require('express');
const cors = require('cors');
require('./db/mongoose');
const userRouter = require('./routers/api/user');
const productRouter = require('./routers/api/product');
const authRouter = require('./routers/api/auth');
const postRouter = require('./routers/api/post');
// const followingRouter = require('./routers/api/following');
const notificationRouter = require('./routers/api/notification');

const notFoundRouter = require('./routers/not-found/not-found');
// const errorHandler = require('./middleware/error-handler');
const PORT = process.env.PORT;

// @ts-ignore, Node can upload to firebase
global.XMLHttpRequest = require('xhr2');

const app = express();

//Middleware
app.use(cors());
app.use(express.json());

//Global error handler
// app.use(errorHandler);

app.use('/api/users', userRouter);
app.use('/api/products', productRouter);
app.use('/api/auth', authRouter);
app.use('/api/posts', postRouter);
// app.use('/api/following', followingRouter);
app.use('/api/notification', notificationRouter);
//The 404 Route (ALWAYS Keep this as the last route)
app.use('*', notFoundRouter);

//Start nodejs server
const server = app.listen(PORT, () => {
  console.log('Server is running on port', PORT);
});

process.on('uncaughtException', function (err) {
  console.error(err.stack); // either logs on console or send to other server via api call.
  process.exit(1)
})

// //Settings 8 minutes to automatically shut down server.
// setTimeout(() => {
//   server.close()
// }, 8 * 1000 * 60);
