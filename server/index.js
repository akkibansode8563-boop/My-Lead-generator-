require('dotenv').config();
const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
const supabase = require('./config/supabase');

// =========================================================
// Global Process Protection & Crash Guards (Never-Fail Mode)
// =========================================================
process.on('uncaughtException', (err) => {
  console.error('🔥 [CRITICAL] Uncaught Exception caught by Crash Guard:', err);
  // Log error but keep process alive
});

process.on('unhandledRejection', (reason, promise) => {
  console.error('⚠️ [CRITICAL] Unhandled Promise Rejection at:', promise, 'reason:', reason);
  // Log error but keep process alive
});

const campaignRoutes = require('./routes/campaigns');
const leadRoutes = require('./routes/leads');
const fixPhonesRoute = require('./routes/fixPhones');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use(morgan('dev'));

// Routes
app.use('/api/campaigns', campaignRoutes);
app.use('/api/leads', leadRoutes);
app.use('/api/fix-phones', fixPhonesRoute);

// Health check endpoint
app.get('/health', async (req, res) => {
  let dbStatus = 'ok';
  try {
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error) dbStatus = `degraded: ${error.message}`;
  } catch (err) {
    dbStatus = `offline: ${err.message}`;
  }

  res.json({
    status: 'ok',
    environment: process.env.NODE_ENV || 'production',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    uptime: process.uptime()
  });
});

// Production Global Express Error Middleware
app.use((err, req, res, next) => {
  console.error('❌ Express Route Error:', err.stack || err.message || err);
  res.status(500).json({
    error: 'Internal Server Error',
    message: err.message || 'An unexpected error occurred.'
  });
});

const server = app.listen(PORT, () => {
  console.log(`🚀 [Production Platform] Server running on port ${PORT}`);
  console.log(`🛡️ Global Exception Guards & Crash Prevention ACTIVE`);

  // Non-blocking database connection diagnostic
  supabase.from('users').select('id').limit(1).then(({ error }) => {
    if (error) {
      console.warn(`⚠️ Supabase DB Connection Warning: ${error.message}`);
    } else {
      console.log(`⚡ Supabase Database Connection VERIFIED`);
    }
  }).catch(err => {
    console.warn(`⚠️ Supabase DB Ping Failed: ${err.message}`);
  });
});

// Graceful Shutdown
function gracefulShutdown(signal) {
  console.log(`\n🛑 ${signal} received. Initiating graceful shutdown...`);
  server.close(() => {
    console.log('✅ HTTP server closed. Process exiting cleanly.');
    process.exit(0);
  });
  // Force exit after 10s if connections refuse to close
  setTimeout(() => {
    console.error('⌛ Forced shutdown timeout exceeded. Terminating process.');
    process.exit(1);
  }, 10000);
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));
