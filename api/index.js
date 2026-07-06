import app, { initializeApp } from '../backend/src/index.js';

let appReady;

export default async function handler(req, res) {
  appReady ||= initializeApp();
  await appReady;

  return app(req, res);
}
