import * as jwt from 'jsonwebtoken';
import { Env } from '@/env';

const SECRET = Env.auth.jwtSecret;
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ3dSIsInJvbGUiOiJub3JtYWwiLCJpYXQiOjE2Nzg3ODkwMjl9.q_-q-8Adk14eQ-sLOJJCgw-tByQ8gDlAU9y0LnGbFAI';

test('sign', () => {
  const token = jwt.sign({ userId: 'wu', role: 'normal' }, SECRET, {});
  console.log(token);
});

test('decode', () => {
  const json = jwt.decode(TOKEN, {});
  console.log(json);
  // { uid: 'ac', role: 'normal', iat: 1678767020 }
});

test('verify', () => {
  const result = jwt.verify(TOKEN, SECRET);
  console.log(result);
  // { uid: 'ac', role: 'normal', iat: 1678767020 }
  // {
  //       userId: 'YIHQPoByhp9xXdWV',
  //       role: 'normal',
  //       locale: 'en-US',
  //       iat: 1678675686
  //     }
});
