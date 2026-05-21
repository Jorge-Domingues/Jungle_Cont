const bcrypt = require('bcryptjs');
const hash = '$2y$10$S.vI8tmv9v76L87XkO1r98/.S016U1r.vI8tmv9v76L87XkO1r98/';
const password = 'admin';

bcrypt.compare(password, hash.replace('$2y$', '$2a$'), (err, res) => {
    console.log('Result with $2a$:', res);
});

bcrypt.compare(password, hash, (err, res) => {
    console.log('Result with original $2y$:', res);
});
