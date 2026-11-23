'use strict';
const { createApp } = require('./app');

const port = Number(process.env.PORT) || 3000;
createApp().listen(port, () => {
  console.log(`Student Task Manager listening on http://localhost:${port}`);
});
