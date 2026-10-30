import bcrypt from 'bcryptjs';
import cors from 'cors';
import express from 'express';
import jwt from 'jsonwebtoken';
import mongoose from 'mongoose';
import { getAssessmentQuestions } from './assessment.js';
import { cleanPeriodInput, PeriodInputError } from './periods.js';
import { buildAnalytics } from './analytics.js';
import { explainRecommendations } from './recommendations.js';

const userSchema = new mongoose.Schema({
  name: { type: String, trim: true, maxlength: 80 },
  email: { type: String, required: true, unique: true, lowercase: true, trim: true },
  passwordHash: { type: String, required: true },
  tokenVersion: { type: Number, required: true, default: 0 },
}, { timestamps: true });
const businessSchema = new mongoose.Schema({
  ownerId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'User', index: true },
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, trim: true },
  type: { type: String, required: true, trim: true },
  currency: { type: String, required: true, maxlength: 3 },
}, { timestamps: true });
const periodSchema = new mongoose.Schema({
  businessId: { type: mongoose.Schema.Types.ObjectId, required: true, ref: 'Business', index: true },
  month: { type: String, required: true, match: /^\d{4}-\d{2}$/ },
  currency: { type: String, required: true, maxlength: 3 },
  values: { type: mongoose.Schema.Types.Mixed, required: true },
  expenses: [{ category: String, amount: Number, custom: String }],
}, { timestamps: true });
periodSchema.index({ businessId: 1, month: 1 }, { unique: true });
const User = mongoose.models.User || mongoose.model('User', userSchema);
const Business = mongoose.models.Business || mongoose.model('Business', businessSchema);
const Period = mongoose.models.Period || mongoose.model('Period', periodSchema);

const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;
const isText = value => typeof value === 'string' && value.trim().length > 0;
const validPassword = password => typeof password === 'string' && password.length >= 8 && password.length <= 128;

export function createApp(config) {
  const app = express();
  const allowedOrigins = new Set(config.clientOrigins);
  const authAttempts = new Map();
  const assessmentRequests = new Map();
  const explanationRequests = new Map();
  const tokenFor = user => jwt.sign({ userId: user.id, tokenVersion: user.tokenVersion || 0 }, config.jwtSecret, { algorithm: 'HS256', expiresIn: '7d' });

  function limitAuthAttempts(req, res, next) {
    const key = req.ip || req.socket.remoteAddress || 'unknown';
    const now = Date.now();
    const record = authAttempts.get(key);
    if (record && now - record.startedAt < 15 * 60 * 1000 && record.count >= 12) return res.status(429).json({ message: 'Too many account attempts. Please wait a few minutes and try again.' });
    if (!record || now - record.startedAt >= 15 * 60 * 1000) authAttempts.set(key, { startedAt: now, count: 1 });
    else record.count += 1;
    next();
  }

  async function auth(req, res, next) {
    try {
      const header = req.headers.authorization || '';
      const token = header.startsWith('Bearer ') ? header.slice(7) : '';
      const payload = jwt.verify(token, config.jwtSecret, { algorithms: ['HS256'] });
      const user = await User.findById(payload.userId).select('tokenVersion');
      if (!user || payload.tokenVersion !== user.tokenVersion) throw new Error('expired session');
      req.userId = user.id;
      next();
    } catch { res.status(401).json({ message: 'Please log in again.' }); }
  }

  function limitAssessmentRequests(req, res, next) {
    const now = Date.now();
    const record = assessmentRequests.get(req.userId);
    if (record && now - record.startedAt < 60 * 60 * 1000 && record.count >= 8) return res.status(429).json({ message: 'You have requested several question sets. Please wait a little and try again.' });
    if (!record || now - record.startedAt >= 60 * 60 * 1000) assessmentRequests.set(req.userId, { startedAt: now, count: 1 });
    else record.count += 1;
    next();
  }

  function limitExplanationRequests(req, res, next) {
    const now = Date.now();
    const record = explanationRequests.get(req.userId);
    if (record && now - record.startedAt < 60 * 60 * 1000 && record.count >= 6) return res.status(429).json({ message: 'You have requested several AI explanations. Please wait a little and try again.' });
    if (!record || now - record.startedAt >= 60 * 60 * 1000) explanationRequests.set(req.userId, { startedAt: now, count: 1 });
    else record.count += 1;
    next();
  }

  app.disable('x-powered-by');
  // Browsers from CLIENT_URL are allowed. Requests with no Origin header (curl, health checks) are also allowed.
  app.use(cors({ origin: (origin, callback) => callback(null, !origin || allowedOrigins.has(origin)) }));
  app.use(express.json({ limit: '200kb' }));

  app.get('/api/health', (_, res) => res.json({ status: 'ok' }));

  app.post('/api/auth/signup', limitAuthAttempts, async (req, res, next) => {
    try {
      const body = req.body ?? {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!name || name.length > 80 || email.length > 254 || !emailPattern.test(email) || !validPassword(body.password)) return res.status(400).json({ message: 'Enter a name, valid email, and password of at least 8 characters.' });
      if (await User.exists({ email })) return res.status(409).json({ message: 'An account already uses this email.' });
      const user = await User.create({ name, email, passwordHash: await bcrypt.hash(body.password, 12) });
      res.status(201).json({ token: tokenFor(user), user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) {
      if (error?.code === 11000) return res.status(409).json({ message: 'An account already uses this email.' });
      next(error);
    }
  });

  app.post('/api/auth/login', limitAuthAttempts, async (req, res, next) => {
    try {
      const body = req.body ?? {};
      const email = typeof body.email === 'string' ? body.email.trim().toLowerCase() : '';
      if (!email || !validPassword(body.password)) return res.status(400).json({ message: 'Enter your email and password.' });
      const user = await User.findOne({ email });
      if (!user || !(await bcrypt.compare(body.password, user.passwordHash))) return res.status(401).json({ message: 'Email or password is incorrect.' });
      res.json({ token: tokenFor(user), user: { id: user.id, name: user.name, email: user.email } });
    } catch (error) { next(error); }
  });

  app.get('/api/auth/me', auth, async (req, res, next) => {
    try { const user = await User.findById(req.userId).select('name email'); res.json({ user }); } catch (error) { next(error); }
  });

  app.patch('/api/auth/me', auth, async (req, res, next) => {
    try {
      const body = req.body ?? {};
      const name = typeof body.name === 'string' ? body.name.trim() : '';
      if (!name || name.length > 80) return res.status(400).json({ message: 'Enter a name with up to 80 characters.' });
      const user = await User.findByIdAndUpdate(req.userId, { name }, { new: true }).select('name email');
      res.json({ user });
    } catch (error) { next(error); }
  });

  app.patch('/api/auth/password', auth, async (req, res, next) => {
    try {
      const currentPassword = req.body?.currentPassword;
      const newPassword = req.body?.newPassword;
      if (!validPassword(currentPassword) || !validPassword(newPassword)) return res.status(400).json({ message: 'Enter your current password and a new password of at least 8 characters.' });
      if (currentPassword === newPassword) return res.status(400).json({ message: 'Choose a new password that is different from your current password.' });
      const user = await User.findById(req.userId);
      if (!user || !(await bcrypt.compare(currentPassword, user.passwordHash))) return res.status(401).json({ message: 'Your current password is incorrect.' });
      user.passwordHash = await bcrypt.hash(newPassword, 12);
      user.tokenVersion += 1;
      await user.save();
      res.json({ message: 'Your password was updated. Other signed-in sessions were logged out.', token: tokenFor(user) });
    } catch (error) { next(error); }
  });

  app.post('/api/assessment/questions', auth, limitAssessmentRequests, async (req, res, next) => {
    try {
      const category = typeof req.body?.category === 'string' ? req.body.category.trim().slice(0, 60) : '';
      const businessType = typeof req.body?.businessType === 'string' ? req.body.businessType.trim().slice(0, 80) : '';
      if (!category || !businessType) return res.status(400).json({ message: 'Choose a business category and type first.' });
      const assessment = await getAssessmentQuestions({ category, businessType, apiKey: config.geminiApiKey, model: config.geminiModel });
      res.json(assessment);
    } catch (error) { next(error); }
  });

  app.post('/api/businesses', auth, async (req, res, next) => {
    try {
      const { name, category, type, currency } = req.body ?? {};
      if (![name, category, type, currency].every(isText)) return res.status(400).json({ message: 'Business name, category, type, and currency are required.' });
      if (name.trim().length > 120 || category.trim().length > 60 || type.trim().length > 80 || !/^[A-Za-z]{3}$/.test(currency.trim())) return res.status(400).json({ message: 'Check the business name, type, and currency, then try again.' });
      const business = await Business.findOneAndUpdate({ ownerId: req.userId }, { name, category, type, currency: currency.trim().toUpperCase(), ownerId: req.userId }, { new: true, upsert: true, runValidators: true });
      res.status(201).json({ business });
    } catch (error) { next(error); }
  });

  app.get('/api/businesses/current', auth, async (req, res, next) => {
    try {
      const business = await Business.findOne({ ownerId: req.userId });
      res.json({ business });
    } catch (error) { next(error); }
  });

  app.post('/api/periods', auth, async (req, res, next) => {
    try {
      const business = await Business.findOne({ ownerId: req.userId });
      if (!business) return res.status(400).json({ message: 'Create a business before saving a reporting period.' });
      const { month, currency, values = {}, expenses = [] } = req.body ?? {};
      if (typeof month !== 'string' || !monthPattern.test(month)) return res.status(400).json({ message: 'Choose a valid reporting month.' });
      const periodInput = cleanPeriodInput(values, expenses);
      const reportingCurrency = String(currency || business.currency).trim().toUpperCase();
      if (!/^[A-Z]{3}$/.test(reportingCurrency)) return res.status(400).json({ message: 'Choose a valid three-letter currency.' });
      const period = await Period.findOneAndUpdate({ businessId: business.id, month }, { businessId: business.id, month, currency: reportingCurrency, values: periodInput.values, expenses: periodInput.expenses }, { new: true, upsert: true, runValidators: true });
      res.status(201).json({ period });
    } catch (error) { next(error); }
  });

  app.get('/api/periods', auth, async (req, res, next) => {
    try {
      const business = await Business.findOne({ ownerId: req.userId });
      if (!business) return res.json({ periods: [] });
      res.json({ periods: await Period.find({ businessId: business.id }).sort({ month: -1 }) });
    } catch (error) { next(error); }
  });

  app.get('/api/analytics/summary', auth, async (req, res, next) => {
    try {
      const business = await Business.findOne({ ownerId: req.userId });
      if (!business) return res.json({ business: null, summary: null, insights: [] });
      const requestedMonth = typeof req.query.month === 'string' && monthPattern.test(req.query.month) ? req.query.month : null;
      const period = await Period.findOne({ businessId: business.id, ...(requestedMonth ? { month: requestedMonth } : {}) }).sort({ month: -1 });
      if (!period) return res.json({ business, summary: null, insights: [] });
      const recentPeriods = (await Period.find({ businessId: business.id }).sort({ month: -1 }).limit(6)).reverse();
      const analytics = buildAnalytics(period, recentPeriods);
      res.json({ business, period: { id: period.id, month: period.month, currency: period.currency }, ...analytics });
    } catch (error) { next(error); }
  });

  app.post('/api/analytics/explanation', auth, limitExplanationRequests, async (req, res, next) => {
    try {
      const business = await Business.findOne({ ownerId: req.userId });
      if (!business) return res.status(400).json({ message: 'Add your business details before requesting an explanation.' });
      const requestedMonth = typeof req.body?.month === 'string' && monthPattern.test(req.body.month) ? req.body.month : null;
      const period = await Period.findOne({ businessId: business.id, ...(requestedMonth ? { month: requestedMonth } : {}) }).sort({ month: -1 });
      if (!period) return res.status(400).json({ message: 'Save one monthly check-in before requesting an explanation.' });
      const recentPeriods = (await Period.find({ businessId: business.id }).sort({ month: -1 }).limit(6)).reverse();
      const analytics = buildAnalytics(period, recentPeriods);
      const explanation = await explainRecommendations({ businessType: business.type, insights: analytics.insights, apiKey: config.geminiApiKey, model: config.geminiModel });
      res.json(explanation);
    } catch (error) { next(error); }
  });

  app.use('/api', (_, res) => res.status(404).json({ message: 'That API address does not exist.' }));

  // Error replies never include stack traces or database messages.
  // eslint-disable-next-line no-unused-vars
  app.use((error, _req, res, _next) => {
    if (error?.type === 'entity.parse.failed') return res.status(400).json({ message: 'The request could not be read. Please check the details and try again.' });
    if (error?.type === 'entity.too.large') return res.status(413).json({ message: 'That request is too large.' });
    if (error?.code === 11000) return res.status(409).json({ message: 'That record already exists.' });
    if (error instanceof PeriodInputError || error?.name === 'ValidationError' || error?.name === 'CastError') return res.status(400).json({ message: error.message || 'Some details are not valid. Please check them and try again.' });
    console.error('Request failed:', error?.name || 'Error', error?.code ?? '');
    res.status(500).json({ message: 'Something went wrong. Please try again.' });
  });

  return app;
}
