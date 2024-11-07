import * as jwt from 'jsonwebtoken';
import { Env } from '@/env';

const SECRET = Env.auth.jwtSecret;
const TOKEN =
  'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOiJ3dSIsInJvbGUiOiJub3JtYWwiLCJpYXQiOjE3MzQyNDg4MzZ9.TvJlqG4F6eOxbwXYIeKnl5L3ZaHR6moFMDhgvEnzrXQ';

test('sign', () => {
  const token = jwt.sign({ userId: 'wu', role: 'normal' }, SECRET, {});
  console.log(token);
});

test('decode', () => {
  const json = jwt.decode(TOKEN, {});
  console.log(json);
});

test('verify', () => {
  const result = jwt.verify(TOKEN, SECRET);
  console.log(result);
});
